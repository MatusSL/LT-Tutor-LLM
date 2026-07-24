from typing import Optional
from pydantic import BaseModel, Field

from app.schemas.db import Language


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
    response_spanish: str = Field(
        description="The main conversational response in Spanish."
    )
    response_english: str = Field(
        description="The main conversational response in English."
    )
    correction: Optional[Correction] = Field(
        default=None,
        description="Grammar errors. Populated by the core from language-tool, not by the model.",
    )
    native_feedback: Optional[str] = Field(
        default=None,
        description="One short note on how a native would phrase the sentence more naturally. Null if the sentence is already natural.",
    )


class HighFrequencyWords(BaseModel):
    high_frequency_words: list[str]


class OpenerResponse(BaseModel):
    response_spanish: str = Field(
        description="One short Spanish question that opens the conversation."
    )
    response_english: str = Field(
        description="English translation of response_spanish."
    )
