from pathlib import Path

from app.agents.tutor import Tutor
from app.agents.topic_generator import TopicGenerator
from app.agents.word_recommender import WordRecommender

from app.core.session_state import SessionState
from app.core.session_manager import SessionManager

from app.schemas.models import ChatResponse, UserInputAnalysis, TutorResponse, Language

from app.services.vocabulary import Vocabulary


class TutorCore:
    def __init__(
        self,
        tutor: Tutor,
        topic_generator: TopicGenerator,
        word_recommender: WordRecommender,
        vocabulary: Vocabulary,
        episodes_dir: Path,
    ):
        self.tutor = tutor
        self.vocabulary = vocabulary
        self.topic_generator = topic_generator
        self.word_recommender = word_recommender
        self.session_manager = SessionManager(episodes_dir)
        self.session_state = SessionState()

    def handle_message(self, user_input: str) -> ChatResponse:
        if len(self.session_state.vocabulary) == 0:
            # User didn't update completed episodes UI
            self.session_state.vocabulary = self.vocabulary.words

        reply, response_json = self.tutor.reply(
            user_input=user_input,
            history=self.session_state.history,
            vocabulary=self.session_state.vocabulary,
        )

        self.session_state.history.append({"role": "user", "content": user_input})
        self.session_state.history.append({"role": "response", "content": reply})

        self.session_state.language = response_json.input_language

        if self.session_state.language == Language.UNKNOWN:
            return self.get_chat_response_fallback()

        if self.session_state.language == Language.SPANISH:
            correction = response_json.correction
            is_correct = correction is None

            if is_correct or len(correction.error_candidates) == 1:
                analysis = self.analyize_response(response_json)
                verified_new_words = self.vocabulary.verify_and_update_vocabulary(
                    analysis
                )

                self.session_state.vocabulary.update(verified_new_words)

        return ChatResponse(response=reply, tutor_response=response_json)

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
