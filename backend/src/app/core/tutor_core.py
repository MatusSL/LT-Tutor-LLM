from pathlib import Path
from typing import List
import threading

from app.schemas.constants import Context
from app.schemas.protocols import (
    TutorProtocol,
    ReviewerProtocol,
    VocabularyProtocol
)
from app.core.session_state import SessionState
from app.core.session_manager import SessionManager

from app.schemas.api import ChatResponse
from app.schemas.db import Language, MistakeModel
from app.schemas.llm import Correction, TutorResponse
from app.schemas.session import UserInputAnalysis


class TutorCore:
    def __init__(
        self,
        tutor: TutorProtocol,
        reviewer: ReviewerProtocol,
        vocabulary: VocabularyProtocol,
        episodes_dir: Path,
    ):
        self.tutor = tutor
        self.vocabulary = vocabulary
        self.reviewer = reviewer
        self.session_manager = SessionManager(episodes_dir)
        self.session_state = SessionState()


    def handle_message(self, user_input: str) -> ChatResponse:
        if len(self.session_state.vocabulary) == 0:
            self.session_state.vocabulary = self.vocabulary.words

        reply, response = self.tutor.reply(
            user_input=user_input,
            context=self.session_state.context,
            vocabulary=self.session_state.vocabulary,
        )

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

        thread = threading.Thread(target=self.update_error_words, args=(correction,), daemon=True)
        thread.start()


    def update_error_words(self, correction: Correction) -> None:
        mistake_models = self.get_mistake_models_for_correction(correction=correction)
        self.vocabulary.update_all_mistakes(mistakes=mistake_models)
    

    def get_mistake_models_for_correction(self, correction: Correction) -> List[MistakeModel]:
        mistake_models: List[MistakeModel] = []
        
        for mistake in correction.error_candidates:
            distractions = self.reviewer.generate_distractions(
                word=mistake.word,
                sentence=correction.original
            )

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
        analysis = self.analyize_response(response)
        verified_new_words = self.vocabulary.verify_and_update_vocabulary(
            analysis
        )

        self.session_state.vocabulary.update(verified_new_words)


    def analyize_response(self, tutor_response: TutorResponse) -> UserInputAnalysis:
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
