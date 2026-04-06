import json
import re
from typing import List

from app.agents.runner import Runner
from app.schemas.models import BlankWord
from langchain.agents import create_agent
from langchain_mistralai import ChatMistralAI

SYSTEM_PROMPT = """\
You are a Spanish language exercise designer.

TASK:
Given a Spanish sentence and the correct word that fills the blank, \
suggest exactly 2 plausible but WRONG alternative words.

RULES:
- Each candidate must be a real Spanish word.
- Each candidate must be the same part of speech as the correct word.
- Each candidate must be grammatically tempting in the context but semantically or grammatically incorrect.
- Do NOT repeat the correct word.
- Do NOT use obscure or rare words — pick common vocabulary a learner would know.

OUTPUT FORMAT — return ONLY valid JSON, nothing else:
{"error_candidates": ["wrong_word_1", "wrong_word_2"]}
"""


class GapFiller:
    def __init__(self, runner: Runner, model: ChatMistralAI) -> None:
        self.agent = create_agent(model=model, system_prompt=SYSTEM_PROMPT)
        self.runner = runner
        self.blank_words: List[BlankWord] = []

    def add_word(self, origin: str, corrected: str, sentence: str):
        error_candidates = self.propose_two_error_candidates(corrected, sentence)

        payload = BlankWord(
            origin=origin,
            corrected=corrected,
            sentence=sentence,
            error_candidates=error_candidates,
        )

        self.blank_words.append(payload)

    def propose_two_error_candidates(self, correct_word: str, sentence: str) -> List[str]:
        user_input = (
            f"Sentence: \"{sentence}\"\n"
            f"Correct word: \"{correct_word}\""
        )

        MAX_RETRIES = 3
        for attempt in range(MAX_RETRIES):
            response = self.runner.run_agent(self.agent, user_input)
            try:
                return self._parse_candidates(response)
            except Exception:
                if attempt == MAX_RETRIES - 1:
                    pass

        return []

    def _parse_candidates(self, response_text: str) -> List[str]:
        try:
            data = json.loads(response_text)
            return data["error_candidates"][:2]
        except Exception:
            pass

        match = re.search(r"\{.*\}", response_text, re.DOTALL)
        if match:
            data = json.loads(match.group(0))
            return data["error_candidates"][:2]

        raise ValueError("Failed to parse error candidates")
