from app.services.vocabulary import Vocabulary
from app.domain.schemas.models import (
    TutorResult,
    UserInputAnalysis,
    TutorResponse,
    Language
)

class TutorCore:
    def __init__(self):
        self.vocabulary = Vocabulary()


    def process_user_input(self, tutor_response: TutorResponse) -> TutorResult:
        if tutor_response.input_language != Language.SPANISH:
            return TutorResult(
                is_correct=True,
                learned_words=set()
            )

        correction = tutor_response.correction
        is_correct = correction is None

        if is_correct or len(correction.error_candidates) == 1:
            user_input_analysis = self.analyize_response(tutor_response)
            learnable_words = self.vocabulary.verify_and_update_vocabulary(user_input_analysis)

            return TutorResult(
                is_correct=True,
                learned_words=learnable_words
            )

        return TutorResult(
            is_correct=False,
            learned_words=set()
        )


    def analyize_response(self, tutor_response: TutorResponse) -> UserInputAnalysis:
        used_words = set(tutor_response.input_spanish.split())
        correction = tutor_response.correction

        if correction is None:
            return UserInputAnalysis(
                set_of_words=used_words,
                misused_words=set()
            )
        
        misused_words: set[str] = set()

        for error_candidate in correction.error_candidates:
            candidate_word = error_candidate.word
            misused_words.add(candidate_word)
        
        return UserInputAnalysis(
            set_of_words=used_words,
            misused_words=misused_words
        )
    

    def get_explanations_from_analysis(self, tutor_response: TutorResponse) -> list[str]:
        correction = tutor_response.correction

        if correction is None:
            return []
        
        explanations: list[str] = []
        for candidate in correction.error_candidates:
            explanation = candidate.explanation
            explanations.append(explanation)

        return explanations