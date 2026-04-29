import asyncio
import base64
import io

from google.cloud import texttospeech
import edge_tts

_client = None


def text_to_speech(text: str) -> str:
    # tts = text_to_speech_google(text)
    tts = text_to_speech_edge(text)
    return tts


def _get_client() -> texttospeech.TextToSpeechClient:
    global _client
    if _client is None:
        _client = texttospeech.TextToSpeechClient()
    return _client


def text_to_speech_google(text: str) -> str:
    response = _get_client().synthesize_speech(
        input=texttospeech.SynthesisInput(text=text),
        voice=texttospeech.VoiceSelectionParams(
            language_code="es-ES",
            name="es-ES-Neural2-F",
        ),
        audio_config=texttospeech.AudioConfig(
            audio_encoding=texttospeech.AudioEncoding.MP3,
        ),
    )
    return base64.b64encode(response.audio_content).decode("utf-8")


# EDGE_VOICE = "es-ES-ElviraNeural"
EDGE_VOICE = "es-ES-AlvaroNeural"


async def _synthesize_edge(text: str) -> bytes:
    audio = io.BytesIO()
    async for chunk in edge_tts.Communicate(text, EDGE_VOICE).stream():
        if chunk["type"] == "audio" and (data := chunk.get("data")):
            audio.write(data)
    return audio.getvalue()


def text_to_speech_edge(text: str) -> str:
    audio_bytes = asyncio.run(_synthesize_edge(text))
    return base64.b64encode(audio_bytes).decode("utf-8")
