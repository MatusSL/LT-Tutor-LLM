from fastapi import APIRouter, HTTPException

from postgrest.exceptions import APIError
from httpx import HTTPError

from app.core.build_tutor_core import _tutor_core_instance
from app.schemas.api import (
    CurrentEpisodeResponse,
    EpisodeRequest,
    EpisodeResponse,
    SavedEpisodeResponse,
)
from app.schemas.llm import Topics

router = APIRouter()


def load_episode_vocabulary_into_session(episode: int) -> None:
    unlocked_words = (
        _tutor_core_instance
        .session_manager
        .get_unlocked_words_from_episodes(
            start=1, end=episode
    ))
    _tutor_core_instance.session_state.vocabulary = unlocked_words


def build_episode_response(episode: int) -> EpisodeResponse:
    load_episode_vocabulary_into_session(episode)
    return EpisodeResponse(status="ok", episode=episode, topics=Topics(topics=[]))


def build_saved_episode_response() -> SavedEpisodeResponse:
    try:
        episode = _tutor_core_instance.vocabulary.get_max_episode_completed()
        if episode <= 0:
            raise HTTPException(status_code=404, detail="No completed episode has been saved yet.")

        episode_response = build_episode_response(episode)
        return SavedEpisodeResponse(**episode_response.model_dump(mode="json"))
    
    except (HTTPError, APIError):
        raise HTTPException(status_code=503, detail="Database unavailable")


@router.post("/episode", response_model=EpisodeResponse)
def set_episode(request: EpisodeRequest) -> EpisodeResponse:
    _tutor_core_instance.vocabulary.update_max_episode_completed(request.episode)
    return build_episode_response(request.episode)


@router.get("/episode/saved", response_model=SavedEpisodeResponse)
def load_saved_episode() -> SavedEpisodeResponse:
    return build_saved_episode_response()


@router.get("/episode/current", response_model=CurrentEpisodeResponse)
def get_current_episode() -> CurrentEpisodeResponse:
    try:
        current_episode = _tutor_core_instance.vocabulary.get_max_episode_completed()
        return CurrentEpisodeResponse(episode=current_episode)
    
    except (HTTPError, APIError):
        raise HTTPException(status_code=503, detail="Database unavailable")
