import json
import re

from langchain.agents import create_agent
from langchain_ollama import ChatOllama

from app.agents.runner import Runner

from app.schemas.models import History, Language, TutorResponse
from app.prompts.tutor_response_generator import TUTOR_RESPONSE_PROMPT

class TutorResponseGenerator:
    def __init__(self, runner: Runner, model: ChatOllama) -> None:
        self.agent = create_agent(model=model)
        self.runner = runner
        self.turn: History = []

    def generate_tutor_response_json(self, turn: History) -> TutorResponse:
        self.turn = turn
        MAX_RETRIES = 3

        conversation = "\n".join(f"{msg['role']}: {msg['content']}" for msg in turn)
        prompt = TUTOR_RESPONSE_PROMPT.format(conversation=conversation)

        for _ in range(MAX_RETRIES):
            response = self.runner.run_agent(self.agent, prompt)

            try:
                response_json = self.parse_response(response)
                return response_json

            except Exception:
                pass

        return self.get_tutor_response_fallback()

    def parse_response(self, response_text: str) -> TutorResponse:
        response_payload = self.extract_json_payload(response_text)
        if response_payload is not None:
            normalized_payload = self.normalize_payload(response_payload)
            try:
                return TutorResponse.model_validate(normalized_payload)
            except Exception:
                pass

        return self.get_tutor_response_fallback()

    def extract_json_payload(self, response_text: str) -> dict | None:
        try:
            payload = json.loads(response_text)
            if isinstance(payload, dict):
                return payload
        except Exception:
            pass

        match = re.search(r"\{.*\}", response_text, re.DOTALL)
        if match:
            try:
                payload = json.loads(match.group(0))
                if isinstance(payload, dict):
                    return payload
            except Exception:
                pass

        return None

    def normalize_payload(self, payload: dict) -> dict:
        normalized = dict(payload)
        normalized.setdefault("input_language", self.infer_input_language(normalized))
        normalized.setdefault("correction", None)
        return normalized

    def infer_input_language(self, payload: dict) -> Language:
        user_sentence = self.turn[0]["content"].strip().casefold()
        input_spanish = str(payload.get("input_spanish", "")).strip().casefold()
        input_english = str(payload.get("input_english", "")).strip().casefold()

        if user_sentence and user_sentence == input_english and user_sentence != input_spanish:
            return Language.ENGLISH

        return Language.SPANISH

    def get_tutor_response_fallback(self) -> TutorResponse:
        user_sentence = self.turn[0]["content"]

        return TutorResponse(
            input_spanish=user_sentence,
            input_english=user_sentence,
            input_language=Language.SPANISH,
            response_spanish="Lo siento, hubo un problema procesando el mensaje. ¿Puedes intentarlo otra vez?",
            response_english="Sorry, there was a problem processing the message. Could you try again?",
            correction=None,
        )
