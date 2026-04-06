from dataclasses import dataclass
from typing import List


@dataclass
class BlankWord:
    origin: str
    corrected: str
    sentence: str
    error_candidates: List[str]


@dataclass
class Flashcard:
    word: str
    translation: str
