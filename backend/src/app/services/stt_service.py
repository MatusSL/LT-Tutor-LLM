import os
from openai import OpenAI

_client: OpenAI | None = None


def _get_client() -> OpenAI:
    global _client
    if _client is None:
        _client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    return _client


def transcribe(audio_path: str, language: str) -> str:
    with open(audio_path, "rb") as f:
        result = _get_client().audio.transcriptions.create(
            model="whisper-1",
            file=f,
            language=language,
        )
    return result.text.strip()
