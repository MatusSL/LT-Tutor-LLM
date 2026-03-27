from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.core.build_tutor_core import build_tutor_core
from app.schemas.models import ChatResponse, Topics, UserInput

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

tutor_core = build_tutor_core()


class HealthResponse(BaseModel):
    status: str


@app.get("/health", response_model=HealthResponse)
def health_check():
    return HealthResponse(status="ok")


@app.post("/chat", response_model=ChatResponse)
def chat_endpoint(user_input: UserInput):
    result = tutor_core.handle_message(user_input=user_input.user_sentence)
    print(f"\nCHAT RESPONSE: --------{result}\n")
    return result



class EpisodeRequest(BaseModel):
    episode: int


class EpisodeResponse(BaseModel):
    status: str
    episode: int
    topics: Topics


class SavedEpisodeResponse(BaseModel):
    status: str
    episode: int
    topics: Topics


def load_episode_vocabulary_into_session(active_tutor_core, episode: int) -> None:
    unlocked_words = active_tutor_core.session_manager.get_unlocked_words_from_episodes(
        1, episode
    )
    active_tutor_core.session_state.vocabulary = unlocked_words


def build_episode_response(active_tutor_core, episode: int) -> EpisodeResponse:
    load_episode_vocabulary_into_session(active_tutor_core, episode)
    return EpisodeResponse(status="ok", episode=episode, topics=Topics(topics=[]))


def build_saved_episode_response(active_tutor_core) -> SavedEpisodeResponse:
    episode = active_tutor_core.vocabulary.get_max_episode_completed()
    if episode <= 0:
        raise ValueError("No completed episode has been saved yet.")

    episode_response = build_episode_response(active_tutor_core, episode)
    return SavedEpisodeResponse(**episode_response.model_dump(mode="json"))


@app.post("/episode", response_model=EpisodeResponse)
def set_episode(request: EpisodeRequest):
    tutor_core.vocabulary.set_max_episode_completed(request.episode)
    return build_episode_response(tutor_core, request.episode)


@app.get("/episode/saved", response_model=SavedEpisodeResponse)
def load_saved_episode():
    return build_saved_episode_response(tutor_core)
