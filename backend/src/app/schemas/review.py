from typing import List

from pydantic import BaseModel


class PhraseQuiz(BaseModel):
    phrase: str
    correct_answer: str
    options: List[str]

class FillBlank(BaseModel):
    sentence: str
    blank_index: int
    correct_word: str
    options: List[str]
    translation: str

class Flashcard(BaseModel):
    origin: str
    translation: str

class ErrorCorrection(BaseModel):
    sentence: str
    error_index: int
    corrected_word: str
    error_type: str
    explanation: str