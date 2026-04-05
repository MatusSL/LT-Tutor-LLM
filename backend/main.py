import os
import tempfile
from pathlib import Path

from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from app.core.build_tutor_core import build_tutor_core
from app.schemas.models import ChatResponse, CurrentEpisodeResponse, EpisodeRequest, EpisodeResponse, HealthResponse, SavedEpisodeResponse, Topics, UserInput
from app.services import stt_service, tts_service

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

tutor_core = build_tutor_core()


@app.get("/health", response_model=HealthResponse)
def health_check():
    return HealthResponse(status="ok")


tutor_core.handle_message(user_input="Hola, como estas?")


@app.post("/chat", response_model=ChatResponse)
def chat_endpoint(user_input: UserInput):
    result = tutor_core.handle_message(user_input=user_input.user_sentence)
    print(f"\nCHAT RESPONSE: --------{result}\n")
    if result.tutor_response.response_spanish:
        result.response_audio = tts_service.text_to_speech(
            result.tutor_response.response_spanish
        )
    return result


@app.post("/transcribe")
async def transcribe_endpoint(audio: UploadFile = File(...)):
    suffix = Path(audio.filename or "audio.m4a").suffix or ".m4a"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(await audio.read())
        tmp_path = tmp.name
    try:
        text = stt_service.transcribe(tmp_path)
        return {"text": text}
    finally:
        os.unlink(tmp_path)


def load_episode_vocabulary_into_session(active_tutor_core, episode: int) -> None:
    unlocked_words = active_tutor_core.session_manager.get_unlocked_words_from_episodes(
        1, episode
    )
    active_tutor_core.session_state.vocabulary = unlocked_words
    active_tutor_core.vocabulary.insert_all_words(unlocked_words)


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
    tutor_core.vocabulary.update_max_episode_completed(request.episode)
    return build_episode_response(tutor_core, request.episode)


@app.get("/episode/saved", response_model=SavedEpisodeResponse)
def load_saved_episode():
    return build_saved_episode_response(tutor_core)


@app.get("/episode/current", response_model=CurrentEpisodeResponse)
def get_current_episode():
    current_episode = tutor_core.vocabulary.get_max_episode_completed()
    return CurrentEpisodeResponse(episode=current_episode)