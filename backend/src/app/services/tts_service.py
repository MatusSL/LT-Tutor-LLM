import base64

from google.cloud import texttospeech

_client = None


def _get_client() -> texttospeech.TextToSpeechClient:
    global _client
    if _client is None:
        _client = texttospeech.TextToSpeechClient()
    return _client


def text_to_speech_base64(text: str) -> str:
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
