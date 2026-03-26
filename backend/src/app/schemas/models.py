from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Literal
from pydantic import BaseModel, Field
from enum import Enum

OLLAMA_MODEL = "llama3.2"
QWEN_MODEL = "qwen2.5"

type LLMResponse = Dict[str, Any]

type History = List[Dict[str, str]]


class Language(str, Enum):
    ENGLISH = "english"
    SPANISH = "spanish"
    UNKNOWN = "unknown"


@dataclass
class TutorResult:
    is_correct: bool
    learned_words: set[str]


@dataclass
class UserInputAnalysis:
    set_of_words: set[str]
    misused_words: set[str]


class Topic(BaseModel):
    display_name: str
    description: str
    suggested_goals: list[str]
    difficulty: Literal["easy", "medium", "hard"]


class Topics(BaseModel):
    topics: list[Topic]


class ErrorCandidate(BaseModel):
    word: str
    span: list[int]
    error_type: str
    suggested_correction: str
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
        default=None, description="Present only if the user made a mistake."
    )


class HighFrequencyWords(BaseModel):
    high_frequency_words: list[str]


class UserInput(BaseModel):
    user_sentence: str


class ChatResponse(BaseModel):
    response: str
    tutor_response: TutorResponse
