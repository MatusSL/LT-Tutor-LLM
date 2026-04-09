import json
import re
from typing import List, Set, Tuple

from langchain_core.language_models import BaseChatModel
from langchain.agents import create_agent

from app.agents.runner import Runner
from app.prompts.merged_tutor_prompt import MERGED_TUTOR_PROMPT
from app.schemas.constants import Context
from app.schemas.db import Language
from app.schemas.llm import TutorResponse
from app.schemas.protocols import TutorProtocol


REPLY_DELIMITER = "---REPLY---"
JSON_DELIMITER = "---JSON---"
MAX_RETRIES = 3


class Tutor(TutorProtocol):
    def __init__(self, runner: Runner, model: BaseChatModel) -> None:
        self.agent = create_agent(model=model)
        self.runner = runner

    def reply(self, user_input: str, context: List[Context], vocabulary: Set[str]) -> Tuple[str, TutorResponse]:
        conversation = "\n".join(f"{m.role}: {m.content}" for m in context)

        prompt = MERGED_TUTOR_PROMPT.format(
            vocabulary=vocabulary, history=conversation, user_input=user_input
        )

        last_raw_response = None
        for _ in range(MAX_RETRIES):
            try:
                last_raw_response = self.runner.run_agent(self.agent, prompt)
            except RuntimeError:
                continue

            try:
                reply_text, tutor_response = self.parse_merged_response(
                    last_raw_response, user_input
                )
                return reply_text, tutor_response
            except Exception:
                pass

        return self.get_fallback(user_input, last_raw_response)

    def parse_merged_response(self, raw: str, user_input: str) -> Tuple[str, TutorResponse]:
        reply_text = self.extract_reply_section(raw)
        json_text = self.extract_json_section(raw)

        payload = self.extract_json_payload(json_text)
        if payload is None:
            raise ValueError("Could not parse JSON from response")

        normalized = self.normalize_payload(payload, user_input)
        tutor_response = TutorResponse.model_validate(normalized)

        return reply_text, tutor_response

    def extract_reply_section(self, raw: str) -> str:
        if REPLY_DELIMITER in raw and JSON_DELIMITER in raw:
            reply_start = raw.index(REPLY_DELIMITER) + len(REPLY_DELIMITER)
            json_start = raw.index(JSON_DELIMITER)
            return raw[reply_start:json_start].strip()

        if JSON_DELIMITER in raw:
            return raw[: raw.index(JSON_DELIMITER)].strip()

        return raw.strip()

    def extract_json_section(self, raw: str) -> str:
        if JSON_DELIMITER in raw:
            return raw[raw.index(JSON_DELIMITER) + len(JSON_DELIMITER) :].strip()
        return raw

    def extract_json_payload(self, text: str) -> dict | None:
        try:
            payload = json.loads(text)
            if isinstance(payload, dict):
                return payload
        except Exception:
            pass

        match = re.search(r"\{.*\}", text, re.DOTALL)
        if match:
            try:
                payload = json.loads(match.group(0))
                if isinstance(payload, dict):
                    return payload
            except Exception:
                pass

        return None

    def normalize_payload(self, payload: dict, user_input: str) -> dict:
        normalized = dict(payload)
        normalized.setdefault(
            "input_language", self.infer_input_language(normalized, user_input)
        )
        normalized.setdefault("correction", None)
        return normalized

    def infer_input_language(self, payload: dict, user_input: str) -> Language:
        user_sentence = user_input.strip().casefold()
        input_spanish = str(payload.get("input_spanish", "")).strip().casefold()
        input_english = str(payload.get("input_english", "")).strip().casefold()

        if (
            user_sentence
            and user_sentence == input_english
            and user_sentence != input_spanish
        ):
            return Language.ENGLISH

        return Language.SPANISH

    def get_fallback(self, user_input: str, raw_response: str | None = None) -> Tuple[str, TutorResponse]:
        reply_text = (
            self.extract_reply_section(raw_response)
            if raw_response
            else "Lo siento, hubo un problema. ¿Puedes intentarlo otra vez?"
        )

        if not reply_text:
            reply_text = "Lo siento, hubo un problema. ¿Puedes intentarlo otra vez?"

        return reply_text, TutorResponse(
            input_spanish=user_input,
            input_english=user_input,
            input_language=Language.SPANISH,
            response_spanish=reply_text,
            response_english="Sorry, there was a problem processing the message. Could you try again?",
            correction=None,
        )
