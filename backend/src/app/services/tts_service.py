import base64
import io

from gtts import gTTS


def text_to_speech_base64(text: str, lang: str = "es") -> str:
    tts = gTTS(text=text, lang=lang, slow=False)
    buf = io.BytesIO()
    tts.write_to_fp(buf)
    buf.seek(0)
    return base64.b64encode(buf.read()).decode("utf-8")
