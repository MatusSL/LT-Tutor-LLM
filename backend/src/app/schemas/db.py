from datetime import datetime, timezone
from typing import Literal
from pydantic import BaseModel, Field
from enum import Enum

from app.schemas.review import ErrorCorrection, FillBlank, PhraseQuiz


class Language(str, Enum):
    ENGLISH = "english"
    SPANISH = "spanish"
    ARABIC = "arabic"
    FRENCH = "french"
    GERMAN = "german"
    GREEK = "greek"
    ITALIAN = "italian"
    UNKNOWN = "unknown"


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


class WordModel(BaseModel):
    word: str
    translation: str | None = Field(default=None)
    is_high_frequency: bool = Field(default=False)
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

type DistractionType = Literal["flashcards", "quiz", "phrase", "blank"]


class UserModel(BaseModel):
    display_name: str
    max_episode: int = Field(default=1, ge=0)
    language: Language


class DistractionModel(BaseModel):
    phrase_quiz: PhraseQuiz
    fill_blank: FillBlank
    correction: ErrorCorrection


class MistakeModel(BaseModel):
    origin: str
    corrected: str
    sentence: str
    translation: str
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    distractions: DistractionModel