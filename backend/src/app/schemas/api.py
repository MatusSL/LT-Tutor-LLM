from typing import Literal

from pydantic import BaseModel

from app.schemas.llm import TutorResponse
from app.schemas.db import ReviewData

type Mode = Literal["conversation", "lt"]


class ChatRequest(BaseModel):
    mode: Mode
    user_sentence: str


class ChatResponse(BaseModel):
    response: str
    tutor_response: TutorResponse
    response_audio: str | None = None


class EpisodeRequest(BaseModel):
    episode: int


class OpenerPayload(BaseModel):
    response_spanish: str
    response_english: str
    response_audio: str | None = None


class EpisodeResponse(BaseModel):
    episode: int
    opener: OpenerPayload | None = None


class CurrentEpisodeResponse(BaseModel):
    episode: int


class HealthResponse(BaseModel):
    status: str


class ReviewDataResponse(BaseModel):
    review_data: ReviewData


class TranscribeResponse(BaseModel):
    text: str
