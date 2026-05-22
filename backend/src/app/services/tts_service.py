import base64
from openai import OpenAI

_openai_client: OpenAI | None = None

OPENAI_TTS_MODEL = "tts-1"
OPENAI_TTS_VOICE = "nova"


def text_to_speech(text: str) -> str:
    return text_to_speech_openai(text)


def _get_openai_client() -> OpenAI:
    global _openai_client
    if _openai_client is None:
        _openai_client = OpenAI()
    return _openai_client


def text_to_speech_openai(text: str) -> str:
    response = _get_openai_client().audio.speech.create(
        model=OPENAI_TTS_MODEL,
        voice=OPENAI_TTS_VOICE,
        input=text,
        response_format="mp3",
    )
    return base64.b64encode(response.content).decode("utf-8")
