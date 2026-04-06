from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Literal
from pydantic import BaseModel, Field
from enum import Enum

QWEN25_7B_MODEL = "qwen2.5:7b"
QWEN25_14B_MODEL = "qwen2.5:14b"
LLAMA32_MODEL = "llama3.2:latest"
LLAMA31 = "llama3.1:8b"

# type ReviewType = Literal["flashcards", "quiz", "blank", "correction"]
type LLMResponse = Dict[str, Any]
# type ReviewMap = Dict[ReviewType, str]
type History = List[Dict[str, str]]

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

class Language(str, Enum):
    ENGLISH = "english"
    SPANISH = "spanish"
    ARABIC = "arabic"
    FRENCH = "french"
    GERMAN = "german"
    GREEK = "greek"
    ITALIAN = "italian"
    UNKNOWN = "unknown"
    # JAPANEESE = "japaneese"


class Table(str, Enum):
    USERS = "users"
    WORDS = "words"
    MISTAKES = "mistakes"
    def __str__(self) -> str:
        return self.value


class User(str, Enum):
    ID = "id"
    DISPLAY_NAME = "display_name"
    MAX_EPISODE = "max_episode"
    LANGUAGE = "language"
    CREATED_AT = "created_at"
    def __str__(self) -> str:
        return self.value


class Word(str, Enum):
    ID = "id"
    WORD = "word"
    TRANSLATION = "translation"
    IS_HIGH_FREQUENCY = "is_high_frequency"
    CREATED_AT = "created_at"
    UPDATED_AT = "updated_at"
    def __str__(self) -> str:
        return self.value


class Mistake(str, Enum):
    ID = "id"
    ORIGIN = "origin"
    CORRECTED = "corrected"
    SENTENCE = "sentence"
    TRANSLATION = "translation"
    CREATED_AT = "created_at"
    UPDATED_AT = "updated_at"
    DISTRACTIONS = "distractions"
    def __str__(self) -> str:
        return self.value


class MistakeModel(BaseModel):
    origin: str
    corrected: str
    sentence: str
    translation: str
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    distractions: List[str] | None = None


class WordModel(BaseModel):
    word: str
    translation: str | None = Field(default=None)
    is_high_frequency: bool = Field(default=False)
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class UserModel(BaseModel):
    display_name: str
    max_episode: int = Field(default=1, ge=0)
    language: Language


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
        default=None, description="Present only if the user made a mistake."
    )


class HighFrequencyWords(BaseModel):
    high_frequency_words: list[str]


class UserInput(BaseModel):
    user_sentence: str


class ChatResponse(BaseModel):
    response: str
    tutor_response: TutorResponse
    response_audio: str | None = None


class EpisodeRequest(BaseModel):
    episode: int


class EpisodeResponse(BaseModel):
    status: str
    episode: int
    topics: Topics

class CurrentEpisodeResponse(BaseModel):
    episode: int

class SavedEpisodeResponse(BaseModel):
    status: str
    episode: int
    topics: Topics


class HealthResponse(BaseModel):
    status: str
