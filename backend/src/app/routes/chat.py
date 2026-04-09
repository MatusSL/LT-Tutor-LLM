import os
import tempfile
from pathlib import Path

from fastapi import APIRouter, File, UploadFile

from app.core.build_tutor_core import _tutor_core_instance
from app.schemas.api import ChatResponse, UserInput
from app.services import stt_service, tts_service

router = APIRouter()


@router.post("/chat", response_model=ChatResponse)
def chat_endpoint(user_input: UserInput):
    result = _tutor_core_instance.handle_message(user_input=user_input.user_sentence)

    if result.tutor_response.response_spanish:
        result.response_audio = tts_service.text_to_speech(
            result.tutor_response.response_spanish
        )
    return result


@router.post("/transcribe")
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
