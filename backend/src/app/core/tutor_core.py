import logging

import threading
from concurrent.futures import ThreadPoolExecutor

from app.core.session_state import SessionState
from app.core.session_manager import SessionManager

from app.schemas.api import ChatResponse, Mode
from app.schemas.constants import CoreServices
from app.schemas.db import Language, MistakeModel
from app.schemas.llm import Correction, ErrorCandidate, OpenerResponse, TutorResponse
from app.schemas.types import (
    Context,
    CorrectionFeedback,
    UserContextData,
    UserInputAnalysis,
)

logger = logging.getLogger(__name__)


class TutorCore:
    def __init__(self, core_services: CoreServices):
        self.tutor = core_services.tutor
        self.opener = core_services.opener
        self.review_builder = core_services.review_builder
        self.reviewer = core_services.reviewer
        self.language_detector = core_services.language_detector

        self.vocabulary = core_services.vocabulary
        self.session_manager = SessionManager(core_services.episodes_dir)
        self.session_state = SessionState()
        self._vocab_lock = threading.Lock()
        self._executor = ThreadPoolExecutor(max_workers=1)

    def generate_opener(self) -> OpenerResponse:
        self.session_state.context = []
        opener = self.opener.generate(self.session_state.episode_vocabulary)
        self.session_state.context.append(
            Context(role="response", content=opener.response_spanish)
        )
        return opener

    def handle_message(self, mode: Mode, user_input: str) -> ChatResponse:
        self.session_state.language = self.language_detector.detect_language(user_input)

        if self.session_state.language == Language.UNKNOWN:
            return self.get_chat_response_fallback()

        if self.session_state.language == Language.SPANISH:
            feedback = self.handle_spanish_input(user_input)
        else:
            feedback = self.handle_english_input(user_input)

        corrected_input = feedback.correction.corrected if feedback.correction else None

        reply, response = self.tutor.reply(
            UserContextData(
                mode=mode,
                user_input=user_input,
                context=self.session_state.context,
                scope=self.session_state.scope,
                corrected_input=corrected_input,
            )
        )

        # Grammar errors come from LanguageTool, not the LLM.
        response.correction = feedback.correction

        logger.debug(f"---- Reply ---- \n{reply}\n")
        logger.debug(f"---- Response ---- \n{response}\n")

        self.add_messages_to_state(user_message=user_input, reply_message=reply)

        return ChatResponse(response=reply, tutor_response=response)

    def add_messages_to_state(self, user_message: str, reply_message: str) -> None:
        self.session_state.context.extend(
            [
                Context(role="user", content=user_message),
                Context(role="response", content=reply_message),
            ]
        )

    def correct_user_sentence(self, sentence: str) -> Correction | None:
        err_candidates = self.reviewer.review_sentence(sentence)

        if not err_candidates:
            return None

        return Correction(
            original=sentence,
            corrected=self._apply_corrections(sentence, err_candidates),
            error_candidates=err_candidates,
        )

    @staticmethod
    def _apply_corrections(sentence: str, candidates: list[ErrorCandidate]) -> str:
        # Apply right-to-left so earlier spans stay valid as we splice.
        corrected = sentence
        for candidate in sorted(candidates, key=lambda c: c.span[0], reverse=True):
            if not candidate.correction:
                continue
            start, end = candidate.span
            corrected = corrected[:start] + candidate.correction + corrected[end:]
        return corrected

    def handle_spanish_input(self, sentence: str) -> CorrectionFeedback:
        correction = self.correct_user_sentence(sentence)

        feedback = CorrectionFeedback(
            input_spanish=sentence,
            input_english=None,
            input_language=self.session_state.language,
            correction=correction,
        )

        if correction and len(correction.error_candidates) > 0:
            self._executor.submit(self.update_error_words, correction)

        return feedback

    def handle_english_input(self, sentence: str) -> CorrectionFeedback:
        return CorrectionFeedback(
            input_spanish=None,
            input_english=sentence,
            input_language=self.session_state.language,
            correction=None,
        )

    def update_error_words(self, correction: Correction) -> None:
        mistake_models = self.get_mistake_models_for_correction(correction=correction)
        with self._vocab_lock:
            self.vocabulary.update_all_mistakes(mistakes=mistake_models)

    def get_mistake_models_for_correction(
        self, correction: Correction
    ) -> list[MistakeModel]:
        mistake_models: list[MistakeModel] = []

        for mistake in correction.error_candidates:
            try:
                distractions = self.review_builder.generate_distractions(
                    word=mistake.word, sentence=correction.original
                )
            except RuntimeError as e:
                logger.warning("Skipping mistake %s", mistake.word, exc_info=e)
                continue

            mistake_model = MistakeModel(
                origin=mistake.word,
                corrected=mistake.correction,
                sentence=correction.original,
                translation=mistake.translation,
                distractions=distractions,
            )

            mistake_models.append(mistake_model)

        return mistake_models

    @staticmethod
    def analyze_response(tutor_response: TutorResponse) -> UserInputAnalysis:
        used_words = set(tutor_response.input_spanish.split())
        correction = tutor_response.correction

        if correction is None:
            return UserInputAnalysis(set_of_words=used_words, misused_words=set())

        misused_words: set[str] = set()
        for error_candidate in correction.error_candidates:
            candidate_word = error_candidate.word
            misused_words.add(candidate_word)

        return UserInputAnalysis(set_of_words=used_words, misused_words=misused_words)

    @staticmethod
    def get_chat_response_fallback():
        return ChatResponse(
            response="Sorry, I couldn't understand that. Could you repeat it?",
            tutor_response=TutorResponse(
                input_english="",
                input_spanish="",
                input_language=Language.UNKNOWN,
                response_spanish="",
                response_english="",
                correction=None,
            ),
        )
