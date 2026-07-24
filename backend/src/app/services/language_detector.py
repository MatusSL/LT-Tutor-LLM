from lingua import Language as LinguaLang, LanguageDetectorBuilder

from app.schemas.db import Language
from app.schemas.protocols import LanguageDetectorProtocol


class LanguageDetector(LanguageDetectorProtocol):
    def __init__(self) -> None:
        self.detector = LanguageDetectorBuilder.from_languages(
            LinguaLang.SPANISH, LinguaLang.ENGLISH
        ).build()

    def detect_language(self, text: str) -> Language:
        detected = self.detector.detect_language_of(text)

        if detected == LinguaLang.SPANISH:
            return Language.SPANISH

        if detected == LinguaLang.ENGLISH:
            return Language.ENGLISH

        return Language.UNKNOWN
