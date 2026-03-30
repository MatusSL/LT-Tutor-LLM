from unittest.mock import MagicMock

import pytest

from app.core.tutor_core import TutorCore
from app.schemas.models import (
    ChatResponse,
    Correction,
    ErrorCandidate,
    Language,
    TutorResponse,
)


def make_tutor_response(
    input_spanish: str = "hola",
    input_english: str = "hello",
    input_language: Language = Language.SPANISH,
    response_spanish: str = "Hola!",
    response_english: str = "Hello!",
    correction: Correction | None = None,
) -> TutorResponse:
    return TutorResponse(
        input_spanish=input_spanish,
        input_english=input_english,
        input_language=input_language,
        response_spanish=response_spanish,
        response_english=response_english,
        correction=correction,
    )


def make_correction(
    original: str = "yo soy bien",
    corrected: str = "yo estoy bien",
    errors: list[ErrorCandidate] | None = None,
) -> Correction:
    if errors is None:
        errors = [
            ErrorCandidate(
                word="soy",
                span=[3, 6],
                error_type="grammar",
                suggested_correction="estoy",
                explanation="Use 'estoy' for temporary states.",
            )
        ]
    return Correction(original=original, corrected=corrected, error_candidates=errors)


@pytest.fixture
def core(tmp_path) -> TutorCore:
    """TutorCore with all dependencies mocked."""
    mock_tutor = MagicMock()
    mock_topic_generator = MagicMock()
    mock_word_recommender = MagicMock()
    mock_vocabulary = MagicMock()
    mock_vocabulary.words = {"yo", "hola", "bien"}

    return TutorCore(
        tutor=mock_tutor,
        topic_generator=mock_topic_generator,
        word_recommender=mock_word_recommender,
        vocabulary=mock_vocabulary,
        episodes_dir=tmp_path,
    )



class TestAnalyizeResponse:
    def test_no_correction_returns_all_words_with_no_misused(self, core):
        resp = make_tutor_response(input_spanish="yo quiero ir")
        analysis = core.analyize_response(resp)
        assert analysis.set_of_words == {"yo", "quiero", "ir"}
        assert analysis.misused_words == set()

    def test_single_error_candidate_added_to_misused(self, core):
        correction = make_correction(
            errors=[
                ErrorCandidate(
                    word="soy",
                    span=[3, 6],
                    error_type="grammar",
                    suggested_correction="estoy",
                    explanation="",
                )
            ]
        )
        resp = make_tutor_response(input_spanish="yo soy bien", correction=correction)
        analysis = core.analyize_response(resp)
        assert "soy" in analysis.misused_words
        assert analysis.set_of_words == {"yo", "soy", "bien"}

    def test_multiple_error_candidates_all_added(self, core):
        correction = make_correction(
            errors=[
                ErrorCandidate(word="una", span=[0, 3], error_type="agreement", suggested_correction="un", explanation=""),
                ErrorCandidate(word="problema", span=[4, 12], error_type="vocabulary", suggested_correction="error", explanation=""),
            ]
        )
        resp = make_tutor_response(input_spanish="una problema grande", correction=correction)
        analysis = core.analyize_response(resp)
        assert analysis.misused_words == {"una", "problema"}
        assert "grande" in analysis.set_of_words

    def test_empty_input_spanish_returns_empty_sets(self, core):
        resp = make_tutor_response(input_spanish="")
        analysis = core.analyize_response(resp)
        assert analysis.set_of_words == set()  
        assert analysis.misused_words == set()


class TestGetExplanations:
    def test_no_correction_returns_empty_list(self, core):
        resp = make_tutor_response()
        assert core.get_explanations_from_analysis(resp) == []

    def test_single_explanation_extracted(self, core):
        correction = make_correction(
            errors=[
                ErrorCandidate(
                    word="soy",
                    span=[3, 6],
                    error_type="grammar",
                    suggested_correction="estoy",
                    explanation="Use 'estoy' not 'soy' for conditions.",
                )
            ]
        )
        resp = make_tutor_response(correction=correction)
        explanations = core.get_explanations_from_analysis(resp)
        assert len(explanations) == 1
        assert "estoy" in explanations[0]

    def test_multiple_explanations_all_returned(self, core):
        correction = make_correction(
            errors=[
                ErrorCandidate(word="a", span=[0, 1], error_type="grammar", suggested_correction="b", explanation="Explanation A"),
                ErrorCandidate(word="c", span=[2, 3], error_type="spelling", suggested_correction="d", explanation="Explanation B"),
            ]
        )
        resp = make_tutor_response(correction=correction)
        explanations = core.get_explanations_from_analysis(resp)
        assert len(explanations) == 2
        assert any("A" in e for e in explanations)
        assert any("B" in e for e in explanations)

    def test_returns_empty_for_correction_with_no_candidates(self, core):
        correction = Correction(original="x", corrected="y", error_candidates=[])
        resp = make_tutor_response(correction=correction)
        assert core.get_explanations_from_analysis(resp) == []


class TestGetChatResponseFallback:
    def test_returns_chat_response_instance(self, core):
        result = core.get_chat_response_fallback()
        assert isinstance(result, ChatResponse)

    def test_fallback_language_is_unknown(self, core):
        result = core.get_chat_response_fallback()
        assert result.tutor_response.input_language == Language.UNKNOWN

    def test_fallback_response_is_non_empty_string(self, core):
        result = core.get_chat_response_fallback()
        assert isinstance(result.response, str)
        assert len(result.response) > 0

    def test_fallback_has_empty_spanish_fields(self, core):
        result = core.get_chat_response_fallback()
        assert result.tutor_response.input_spanish == ""
        assert result.tutor_response.response_spanish == ""


class TestHandleMessage:
    def _setup_tutor_reply(self, core, input_spanish, input_language=Language.SPANISH, correction=None):
        reply_text = "Ah, interesante!"
        tutor_response = make_tutor_response(
            input_spanish=input_spanish,
            input_language=input_language,
            correction=correction,
        )
        core.tutor.reply.return_value = (reply_text, tutor_response)
        core.vocabulary.verify_and_update_vocabulary.return_value = set()
        return reply_text, tutor_response

    def test_returns_chat_response(self, core):
        self._setup_tutor_reply(core, "hola")
        result = core.handle_message("hola")
        assert isinstance(result, ChatResponse)

    def test_reply_text_in_response(self, core):
        reply_text, _ = self._setup_tutor_reply(core, "hola")
        result = core.handle_message("hola")
        assert result.response == reply_text

    def test_history_updated_after_message(self, core):
        self._setup_tutor_reply(core, "hola")
        core.handle_message("hola")
        assert len(core.session_state.history) == 2
        assert core.session_state.history[0]["role"] == "user"
        assert core.session_state.history[0]["content"] == "hola"

    def test_vocabulary_updated_when_correct_spanish(self, core):
        self._setup_tutor_reply(core, "estoy bien", Language.SPANISH, correction=None)
        core.vocabulary.verify_and_update_vocabulary.return_value = {"bien"}
        core.handle_message("estoy bien")
        core.vocabulary.verify_and_update_vocabulary.assert_called_once()

    def test_vocabulary_not_updated_for_english_input(self, core):
        self._setup_tutor_reply(core, "i am well", Language.ENGLISH)
        core.handle_message("i am well")
        core.vocabulary.verify_and_update_vocabulary.assert_not_called()

    def test_fallback_returned_for_unknown_language(self, core):
        reply_text = "?"
        tr = make_tutor_response(input_language=Language.UNKNOWN)
        core.tutor.reply.return_value = (reply_text, tr)
        result = core.handle_message("???")
        assert result.tutor_response.input_language == Language.UNKNOWN

    def test_vocabulary_skipped_when_multiple_errors(self, core):
        correction = make_correction(
            errors=[
                ErrorCandidate(word="a", span=[0,1], error_type="grammar", suggested_correction="b", explanation=""),
                ErrorCandidate(word="c", span=[2,3], error_type="grammar", suggested_correction="d", explanation=""),
            ]
        )
        self._setup_tutor_reply(core, "mal input", Language.SPANISH, correction=correction)
        core.handle_message("mal input")
        core.vocabulary.verify_and_update_vocabulary.assert_not_called()

    def test_vocabulary_updated_when_exactly_one_error(self, core):
        correction = make_correction(
            errors=[
                ErrorCandidate(word="soy", span=[3,6], error_type="grammar", suggested_correction="estoy", explanation=""),
            ]
        )
        self._setup_tutor_reply(core, "yo soy bien", Language.SPANISH, correction=correction)
        core.vocabulary.verify_and_update_vocabulary.return_value = set()
        core.handle_message("yo soy bien")
        core.vocabulary.verify_and_update_vocabulary.assert_called_once()

    def test_session_vocabulary_seeded_from_db_when_empty(self, core):
        core.vocabulary.words = {"base_word"}
        core.session_state.vocabulary = set()  
        self._setup_tutor_reply(core, "hola")
        core.handle_message("hola")
        assert "base_word" in core.session_state.vocabulary
