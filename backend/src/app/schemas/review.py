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
    origin: str
    translation: str

@dataclass
class PhraseQuiz:
    correct: str
    wrong: List[str]

@dataclass
class ErrorCorrection:
    sentence: str
    wrong_word: str