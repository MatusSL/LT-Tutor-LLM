import logging
from typing import List

from concurrent.futures import ThreadPoolExecutor
import threading

from app.schemas.constants import Context, CoreServices
from app.core.session_state import SessionState
from app.core.session_manager import SessionManager

from app.schemas.api import ChatResponse
from app.schemas.db import Language, MistakeModel
from app.schemas.llm import Correction, TutorResponse
from app.schemas.session import UserInputAnalysis

logger = logging.getLogger(__name__)


class TutorCore:
    def __init__(self, core_services: CoreServices):
        self.tutor = core_services.tutor
        self.vocabulary = core_services.vocabulary
        self.reviewer = core_services.reviewer
        self.session_manager = SessionManager(core_services.episodes_dir)

        self.session_state = SessionState()
        self._vocab_lock = threading.Lock()
        self._executor = ThreadPoolExecutor(max_workers=1)


    def handle_message(self, user_input: str) -> ChatResponse:
        if len(self.session_state.vocabulary) == 0:
            self.session_state.vocabulary = self.vocabulary.words

        reply, response = self.tutor.reply(
            user_input=user_input,
            context=self.session_state.context,
            vocabulary=self.session_state.vocabulary,
        )

        logger.debug(f"---- Reply ---- \n{reply}\n")

        logger.debug(f"---- Response ---- \n{response}\n")

        self.add_messages_to_state(user_message=user_input, reply_message=reply)
        
        self.session_state.language = response.input_language
        if self.session_state.language == Language.UNKNOWN:
            return self.get_chat_response_fallback()

        if self.session_state.language == Language.SPANISH:
            self.handle_spanish_input(response=response)

        return ChatResponse(response=reply, tutor_response=response)
    

    def add_messages_to_state(self, user_message: str, reply_message: str) -> None:
        self.session_state.context.extend([
            Context(role="user", content=user_message),
            Context(role="response", content=reply_message)
        ])


    def handle_spanish_input(self, response: TutorResponse) -> None:
        correction = response.correction

        if correction is None:
            self.update_user_vocabulary(response=response)
            return

        error_count = len(correction.error_candidates)

        if error_count <= 1:
            self.update_user_vocabulary(response=response)

        if error_count > 0:
            self._executor.submit(self.update_error_words, correction)
        # self.update_error_words(correction=correction)      #? Debugging purposes


    def update_error_words(self, correction: Correction) -> None:
        mistake_models = self.get_mistake_models_for_correction(correction=correction)
        with self._vocab_lock:
            self.vocabulary.update_all_mistakes(mistakes=mistake_models)
    

    def get_mistake_models_for_correction(self, correction: Correction) -> List[MistakeModel]:
        mistake_models: List[MistakeModel] = []
        
        for mistake in correction.error_candidates:
            try:
                distractions = self.reviewer.generate_distractions(
                    word=mistake.word,
                    sentence=correction.original
                )
            except RuntimeError as e:
                logger.warning(f"Skipping mistake '{mistake.word}'", exc_info=e)
                continue

            mistake_model = MistakeModel(
                origin=mistake.word,
                corrected=mistake.correction,
                sentence=correction.original,
                translation=mistake.translation,
                distractions=distractions
            )

            mistake_models.append(mistake_model)
        
        return mistake_models


    def update_user_vocabulary(self, response: TutorResponse):
        analysis = self.analyze_response(response)
        with self._vocab_lock:
            verified_new_words = self.vocabulary.verify_and_update_vocabulary(analysis)

        self.session_state.vocabulary.update(verified_new_words)


    def analyze_response(self, tutor_response: TutorResponse) -> UserInputAnalysis:
        used_words = set(tutor_response.input_spanish.split())
        correction = tutor_response.correction

        if correction is None:
            return UserInputAnalysis(set_of_words=used_words, misused_words=set())

        misused_words: set[str] = set()
        for error_candidate in correction.error_candidates:
            candidate_word = error_candidate.word
            misused_words.add(candidate_word)

        return UserInputAnalysis(set_of_words=used_words, misused_words=misused_words)


    def get_chat_response_fallback(self):
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
