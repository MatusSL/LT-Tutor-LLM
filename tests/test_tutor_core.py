import unittest
from unittest.mock import MagicMock

from app.core.tutor_core import TutorCore
from app.domain.schemas.models import (
    TutorResponse,
    Correction,
    ErrorCandidate,
    Language,
)


class TestTutorCore(unittest.TestCase):
    def setUp(self):
        self.analyzer = MagicMock()
        self.tutor = TutorCore()

    def test_empty_explanations(self):
        res = self.tutor.get_explanations_from_analysis(
            TutorResponse(
                input_spanish="",
                input_language=Language.SPANISH,
                input_english="",
                response_spanish="",
                response_english="",
                correction=None,
            )
        )

        self.assertEqual(len(res), 0)

    def test_single_explanation(self):
        res = self.tutor.get_explanations_from_analysis(
            TutorResponse(
                input_spanish="",
                input_language=Language.SPANISH,
                input_english="",
                response_spanish="",
                response_english="",
                correction=Correction(
                    original="",
                    corrected="",
                    error_candidates=[
                        ErrorCandidate(
                            word="",
                            span=[],
                            error_type="",
                            suggested_correction="",
                            explanation="You can't use 'tiene' here",
                        )
                    ],
                ),
            )
        )

        self.assertIn("'tiene'", res[0].split())

    def test_multiple_explanations(self):
        res = self.tutor.get_explanations_from_analysis(
            TutorResponse(
                input_spanish="",
                input_language=Language.SPANISH,
                input_english="",
                response_spanish="",
                response_english="",
                correction=Correction(
                    original="",
                    corrected="",
                    error_candidates=[
                        ErrorCandidate(
                            word="",
                            span=[],
                            error_type="",
                            suggested_correction="",
                            explanation="Explanation number 1.",
                        ),
                        ErrorCandidate(
                            word="",
                            span=[],
                            error_type="",
                            suggested_correction="",
                            explanation="Explanation number 2.",
                        ),
                    ],
                ),
            )
        )

        found_first = any("1" in item for item in res)
        found_second = any("2" in item for item in res)
        found_explanation = any("Explanation" in item for item in res)
        self.assertTrue(found_first)
        self.assertTrue(found_second)
        self.assertTrue(found_explanation)

    def test_get_user_input_analysis_no_error_candidate(self):
        response = TutorResponse(
            input_spanish="",
            input_language=Language.SPANISH,
            input_english="",
            response_spanish="",
            response_english="",
            correction=None,
        )

        user_analysis = self.tutor.analyize_response(response)
        self.assertEqual(user_analysis.set_of_words, set())
        self.assertEqual(user_analysis.misused_words, set())

    def test_get_user_input_analysis_one_error_candidate(self):
        response = TutorResponse(
            input_spanish="Como agua",
            input_language=Language.SPANISH,
            input_english="",
            response_spanish="",
            response_english="",
            correction=Correction(
                original="",
                corrected="",
                error_candidates=[
                    ErrorCandidate(
                        word="Como",
                        span=[],
                        error_type="",
                        suggested_correction="Beber",
                        explanation="",
                    )
                ],
            ),
        )

        user_analysis = self.tutor.analyize_response(response)
        self.assertEqual(user_analysis.set_of_words, {"Como", "agua"})
        self.assertEqual(user_analysis.misused_words, {"Como"})

    def test_get_user_input_analysis_no_multiple_candidate(self):
        response = TutorResponse(
            input_spanish="Yo no se tu sabes?",
            input_language=Language.SPANISH,
            input_english="",
            response_spanish="",
            response_english="",
            correction=Correction(
                original="",
                corrected="",
                error_candidates=[
                    ErrorCandidate(
                        word="Yo",
                        span=[],
                        error_type="",
                        suggested_correction="",
                        explanation="",
                    ),
                    ErrorCandidate(
                        word="tu",
                        span=[],
                        error_type="",
                        suggested_correction="",
                        explanation="",
                    ),
                ],
            ),
        )

        user_analysis = self.tutor.analyize_response(response)
        self.assertEqual(user_analysis.set_of_words, {"Yo", "no", "se", "tu", "sabes?"})
        self.assertEqual(user_analysis.misused_words, {"Yo", "tu"})

    def test_fallback_for_english_input(self):
        res = self.tutor.handle_message(
            TutorResponse(
                input_spanish="",
                input_language=Language.ENGLISH,
                input_english="",
                response_spanish="",
                response_english="",
                correction=Correction(
                    original="",
                    corrected="",
                    error_candidates=[
                        ErrorCandidate(
                            word="",
                            span=[],
                            error_type="",
                            suggested_correction="",
                            explanation="You can't use 'tiene' here",
                        )
                    ],
                ),
            )
        )

        self.assertTrue(res.is_correct)
        self.assertEqual(res.learned_words, set())

    def test_fallback_for_unknown_input(self):
        res = self.tutor.handle_message(
            TutorResponse(
                input_spanish="",
                input_language=Language.UNKNOWN,
                input_english="",
                response_spanish="",
                response_english="",
                correction=Correction(
                    original="",
                    corrected="",
                    error_candidates=[
                        ErrorCandidate(
                            word="",
                            span=[],
                            error_type="",
                            suggested_correction="",
                            explanation="You can't use 'tiene' here",
                        )
                    ],
                ),
            )
        )

        self.assertTrue(res.is_correct)
        self.assertEqual(res.learned_words, set())

    def test_process_input_no_error(self):
        res = self.tutor.handle_message(
            TutorResponse(
                input_spanish="no quiero ir",
                input_language=Language.SPANISH,
                input_english="",
                response_spanish="",
                response_english="",
                correction=None,
            )
        )

        self.assertTrue(res.is_correct)

        actual = res.learned_words
        expected = {"no", "quiero", "ir"}
        msg = f"Learned words mismatch, expected: {expected}, got: {actual}"
        self.assertEqual(actual, expected, msg)

    def test_one_mistake_process_input(self):
        res = self.tutor.handle_message(
            TutorResponse(
                input_spanish="una dos",
                input_language=Language.SPANISH,
                input_english="",
                response_spanish="",
                response_english="",
                correction=Correction(
                    original="",
                    corrected="",
                    error_candidates=[
                        ErrorCandidate(
                            word="una",
                            span=[],
                            error_type="",
                            suggested_correction="",
                            explanation="",
                        )
                    ],
                ),
            )
        )

        self.assertTrue(res.is_correct)

        actual = res.learned_words
        expected = {"dos"}
        msg = f"Learned words mismatch, expected: {expected}, got: {actual}"
        self.assertEqual(expected, actual, msg)

    def test_multiple_mistake_process_input(self):
        res = self.tutor.handle_message(
            TutorResponse(
                input_spanish="uno dos tres quatro",
                input_language=Language.SPANISH,
                input_english="",
                response_spanish="",
                response_english="",
                correction=Correction(
                    original="",
                    corrected="",
                    error_candidates=[
                        ErrorCandidate(
                            word="",
                            span=[],
                            error_type="",
                            suggested_correction="",
                            explanation="",
                        ),
                        ErrorCandidate(
                            word="",
                            span=[],
                            error_type="",
                            suggested_correction="",
                            explanation="",
                        ),
                    ],
                ),
            )
        )

        self.assertFalse(res.is_correct)

        actual = res.learned_words
        expected: set[str] = set()
        msg = f"Learned words mismatch, expected: {expected}, got: {actual}"
        self.assertEqual(expected, actual, msg)


if __name__ == "__main__":
    unittest.main()
