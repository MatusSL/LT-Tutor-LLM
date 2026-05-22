import os
from openai import OpenAI

_client: OpenAI | None = None

# Whisper falls back to these memorized YouTube-subtitle credit lines when fed
# silence or noise (no real speech). Treat them as empty transcriptions.
_HALLUCINATIONS = {
    "subtitulos realizados por la comunidad de amara.org",
    "subtitulos por la comunidad de amara.org",
    "subtitles by the amara.org community",
    "gracias por ver el video",
    "thanks for watching",
}


def _get_client() -> OpenAI:
    global _client
    if _client is None:
        _client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    return _client


def _is_hallucination(text: str) -> bool:
    normalized = (
        text.lower()
        .strip()
        .strip(".!?¡¿ ")
        .translate(str.maketrans("áéíóúü", "aeiouu"))
    )
    return normalized in _HALLUCINATIONS


def transcribe(audio_path: str, language: str) -> str:
    with open(audio_path, "rb") as f:
        result = _get_client().audio.transcriptions.create(
            model="whisper-1",
            file=f,
            language=language,
            temperature=0,
        )
    text = result.text.strip()
    if _is_hallucination(text):
        return ""
    return text
