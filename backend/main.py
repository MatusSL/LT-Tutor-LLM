import os
import tempfile
from pathlib import Path
import random
from typing import List

from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from app.core.build_tutor_core import build_tutor_core
from app.schemas.api import (
    ChatResponse,
    CurrentEpisodeResponse,
    EpisodeRequest,
    EpisodeResponse,
    ReviewCorrectionResponse,
    ReviewBlankResponse,
    HealthResponse,
    ReviewFlashcardsResponse,
    ReviewPhraseResponse,
    SavedEpisodeResponse,
    UserInput,
)
from app.schemas.db import MistakeModel
from app.schemas.llm import Topics
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


tutor_core.handle_message(user_input="Te voy a digo algo nuevo!")


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


def pick_random_n_mistakes(mistakes: List[MistakeModel], n: int) -> List[MistakeModel]:
    if len(mistakes) <= n:
        return mistakes[:]
    return random.sample(mistakes, 15)


@app.get("/review/flashcards", response_model=ReviewFlashcardsResponse)
def get_flashcards_review() -> ReviewFlashcardsResponse:
    mistakes = tutor_core.vocabulary.get_all_mistakes()
    random_mistakes = pick_random_n_mistakes(mistakes=mistakes, n=15)
    flashcards = tutor_core.reviewer.generate_flashcards(mistakes=random_mistakes)
    return ReviewFlashcardsResponse(flashcards=flashcards)


@app.get("/review/phrase-quiz", response_model=ReviewPhraseResponse)
def get_phrase_quiz_review() -> ReviewPhraseResponse:
    mistakes = tutor_core.vocabulary.get_all_mistakes()
    random_mistakes = pick_random_n_mistakes(mistakes=mistakes, n=10)
    phrase_quiz = tutor_core.reviewer.generate_phrase_quiz(mistakes=random_mistakes)
    return ReviewPhraseResponse(phrase_quiz=phrase_quiz)


@app.get("/review/fill-in-the-blank", response_model=ReviewBlankResponse)
def get_fill_in_the_blank_review() -> ReviewBlankResponse:
    mistakes = tutor_core.vocabulary.get_all_mistakes()
    random_mistakes = pick_random_n_mistakes(mistakes=mistakes, n=10)
    blank_words = tutor_core.reviewer.generate_fill_in_the_blank(mistakes=random_mistakes)
    return ReviewBlankResponse(blank_words=blank_words)


@app.get("/review/error-correction", response_model=ReviewCorrectionResponse)
def get_error_correction_review() -> ReviewCorrectionResponse:
    mistakes = tutor_core.vocabulary.get_all_mistakes()
    random_mistakes = pick_random_n_mistakes(mistakes=mistakes, n=10)
    error_corrections = tutor_core.reviewer.generate_error_correction(mistakes=random_mistakes)
    return ReviewCorrectionResponse(error_corrections=error_corrections)