from typing import List

from pydantic import BaseModel

from app.schemas.llm import TutorResponse, Topics
from app.schemas.review import BlankWord, ErrorCorrection, Flashcard, PhraseQuiz


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


class ReviewFlashcardsResponse(BaseModel):
    flashcards: List[Flashcard]


class ReviewPhraseResponse(BaseModel):
    phrase_quiz: List[PhraseQuiz]


class ReviewBlankResponse(BaseModel):
    blank_words: List[BlankWord]


class ReviewCorrectionResponse(BaseModel):
    error_corrections: List[ErrorCorrection]