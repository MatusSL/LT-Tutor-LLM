from typing import List, Set

from app.schemas.db import MistakeModel
from app.schemas.llm import ErrorCandidate
from app.schemas.review import BlankWord

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
    def __init__(self, mistakes: Set[MistakeModel]) -> None:
        self.blank_words: List[BlankWord] = []

    def add_word(self, error: ErrorCandidate, sentence: str):
        ...
