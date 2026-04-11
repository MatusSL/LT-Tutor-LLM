from typing import Literal, Optional
from pydantic import BaseModel, Field

from app.schemas.db import Language


class Topic(BaseModel):
    display_name: str
    description: str
    suggested_goals: list[str]
    difficulty: Literal["easy", "medium", "hard"]


class Topics(BaseModel):
    topics: list[Topic]


class ErrorCandidate(BaseModel):
    word: str
    translation: str
    span: list[int]
    error_type: str
    correction: str
    explanation: str


class Correction(BaseModel):
    original: str = Field(description="The user's incorrect sentence.")
    corrected: str = Field(description="The corrected version of the sentence.")
    error_candidates: list[ErrorCandidate]


class TutorResponse(BaseModel):
    input_spanish: str = Field(description="User's input in Spanish.")
    input_english: str = Field(description="User's input in English.")
    input_language: Language = Field(description="Detected input language")
    response_spanish: str = Field(description="The main conversational response in Spanish.")
    response_english: str = Field(description="The main conversational response in English.")
    correction: Optional[Correction] = Field(
        default=None, description="Present only if the user made a mistake."
    )


class HighFrequencyWords(BaseModel):
    high_frequency_words: list[str]