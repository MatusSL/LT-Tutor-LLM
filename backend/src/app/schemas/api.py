from pydantic import BaseModel

from app.schemas.llm import TutorResponse, Topics
from app.schemas.db import ReviewData


class UserInput(BaseModel):
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
    status: str
    episode: int
    topics: Topics
    opener: OpenerPayload | None = None


class CurrentEpisodeResponse(BaseModel):
    episode: int


class SavedEpisodeResponse(BaseModel):
    status: str
    episode: int
    topics: Topics
    opener: OpenerPayload | None = None


class HealthResponse(BaseModel):
    status: str


class ReviewDataResponse(BaseModel):
    review_data: ReviewData


class TranscribeResponse(BaseModel):
    text: str
