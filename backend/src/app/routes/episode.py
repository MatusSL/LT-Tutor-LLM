from fastapi import APIRouter, HTTPException

from postgrest.exceptions import APIError
from httpx import HTTPError

from app.core.build_tutor_core import _tutor_core_instance
from app.schemas.api import EpisodeRequest, EpisodeResponse, OpenerPayload
from app.services import tts_service

router = APIRouter()


@router.post("/episode/selected", response_model=EpisodeResponse)
def set_episode(request: EpisodeRequest) -> EpisodeResponse:
    episode = request.episode
    _tutor_core_instance.vocabulary.update_max_episode_completed(episode)
    _tutor_core_instance.session_state.max_episode_completed = episode
    load_tutor_scope_for_episode(episode)
    return build_episode_response(episode)


@router.get("/episode/saved", response_model=EpisodeResponse)
def load_saved_episode() -> EpisodeResponse:
    return build_saved_episode_response()


def build_episode_response(episode: int) -> EpisodeResponse:
    opener = build_opener_payload()
    return EpisodeResponse(
        episode=episode,
        opener=opener,
    )


def build_opener_payload() -> OpenerPayload:
    opener = _tutor_core_instance.generate_opener()
    audio = tts_service.text_to_speech(opener.response_spanish)
    return OpenerPayload(
        response_spanish=opener.response_spanish,
        response_english=opener.response_english,
        response_audio=audio,
    )


def build_saved_episode_response() -> EpisodeResponse:
    try:
        episode = _tutor_core_instance.vocabulary.get_max_episode_completed()
        _tutor_core_instance.session_state.max_episode_completed = episode
        load_tutor_scope_for_episode(episode)

        if episode <= 0:
            raise HTTPException(
                status_code=404, detail="No completed episode has been saved yet."
            )

        episode_response = build_episode_response(episode)
        return EpisodeResponse(**episode_response.model_dump(mode="json"))

    except (HTTPError, APIError):
        raise HTTPException(status_code=503, detail="Database unavailable")


def load_tutor_scope_for_episode(episode: int):
    scope = _tutor_core_instance.session_manager.get_unlocked_scope(episode)
    _tutor_core_instance.session_state.scope = scope
