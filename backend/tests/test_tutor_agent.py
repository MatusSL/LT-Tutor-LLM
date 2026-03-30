import json
import pytest

from app.agents.tutor import Tutor
from app.schemas.models import Language


@pytest.fixture
def tutor() -> Tutor:
    """Instantiate Tutor without an LLM model for pure parsing tests."""
    return Tutor.__new__(Tutor)


class TestExtractReplySection:
    def test_extracts_text_between_delimiters(self, tutor):
        raw = "---REPLY---\nHola! ¿Cómo estás?\n---JSON---\n{}"
        assert tutor.extract_reply_section(raw) == "Hola! ¿Cómo estás?"

    def test_strips_surrounding_whitespace(self, tutor):
        raw = "---REPLY---\n\n  Bueno, que tal.  \n\n---JSON---\n{}"
        assert tutor.extract_reply_section(raw) == "Bueno, que tal."

    def test_falls_back_to_text_before_json_delimiter(self, tutor):
        raw = "Mira, interesante.\n---JSON---\n{}"
        assert tutor.extract_reply_section(raw) == "Mira, interesante."

    def test_returns_full_raw_when_no_delimiters(self, tutor):
        raw = "  Pues, no sé.  "
        assert tutor.extract_reply_section(raw) == "Pues, no sé."

    def test_multiline_reply_preserved(self, tutor):
        raw = "---REPLY---\nLine one.\nLine two.\n---JSON---\n{}"
        assert tutor.extract_reply_section(raw) == "Line one.\nLine two."


class TestExtractJsonSection:
    def test_extracts_text_after_json_delimiter(self, tutor):
        raw = "---REPLY---\nHola\n---JSON---\n{\"key\": 1}"
        assert tutor.extract_json_section(raw).strip() == '{"key": 1}'

    def test_returns_full_text_when_no_delimiter(self, tutor):
        raw = "{\"key\": 1}"
        assert tutor.extract_json_section(raw) == '{"key": 1}'


class TestExtractJsonPayload:
    def test_parses_clean_json_object(self, tutor):
        text = '{"input_spanish": "hola"}'
        result = tutor.extract_json_payload(text)
        assert result == {"input_spanish": "hola"}

    def test_extracts_json_embedded_in_text(self, tutor):
        text = 'Some preamble\n{"input_spanish": "hola"}\ntrailing text'
        result = tutor.extract_json_payload(text)
        assert result is not None
        assert result["input_spanish"] == "hola"

    def test_returns_none_for_broken_json(self, tutor):
        assert tutor.extract_json_payload("{broken") is None

    def test_returns_none_for_empty_string(self, tutor):
        assert tutor.extract_json_payload("") is None

    def test_returns_none_for_json_array(self, tutor):
        assert tutor.extract_json_payload("[1, 2, 3]") is None

    def test_handles_nested_json(self, tutor):
        payload = {
            "input_spanish": "hola",
            "correction": {"original": "x", "corrected": "y", "error_candidates": []},
        }
        result = tutor.extract_json_payload(json.dumps(payload))
        assert result["correction"]["original"] == "x"


class TestInferInputLanguage:
    def test_detects_english_when_input_matches_english_field(self, tutor):
        payload = {
            "input_english": "i like coffee",
            "input_spanish": "me gusta el café",
        }
        lang = tutor.infer_input_language(payload, "I like coffee")
        assert lang == Language.ENGLISH

    def test_defaults_to_spanish_when_input_matches_spanish_field(self, tutor):
        payload = {
            "input_english": "i am well",
            "input_spanish": "estoy bien",
        }
        lang = tutor.infer_input_language(payload, "estoy bien")
        assert lang == Language.SPANISH

    def test_defaults_to_spanish_on_ambiguous_input(self, tutor):
        payload = {"input_english": "", "input_spanish": ""}
        lang = tutor.infer_input_language(payload, "hello")
        assert lang == Language.SPANISH

    def test_case_insensitive_english_match(self, tutor):
        payload = {
            "input_english": "i like coffee",
            "input_spanish": "me gusta el café",
        }
        lang = tutor.infer_input_language(payload, "I LIKE COFFEE")
        assert lang == Language.ENGLISH


class TestNormalizePayload:
    def test_adds_missing_input_language(self, tutor):
        payload = {
            "input_spanish": "estoy bien",
            "input_english": "i am well",
            "response_spanish": "ok",
            "response_english": "ok",
        }
        result = tutor.normalize_payload(payload, "estoy bien")
        assert "input_language" in result

    def test_adds_null_correction_when_missing(self, tutor):
        payload = {
            "input_spanish": "hola",
            "input_english": "hello",
            "input_language": "spanish",
            "response_spanish": "hola",
            "response_english": "hello",
        }
        result = tutor.normalize_payload(payload, "hola")
        assert result["correction"] is None

    def test_preserves_existing_input_language(self, tutor):
        payload = {
            "input_spanish": "hola",
            "input_english": "hello",
            "input_language": "english",
            "response_spanish": "hola",
            "response_english": "hello",
        }
        result = tutor.normalize_payload(payload, "hello")
        assert result["input_language"] == "english"

    def test_preserves_existing_correction(self, tutor):
        correction = {
            "original": "yo soy bien",
            "corrected": "yo estoy bien",
            "error_candidates": [],
        }
        payload = {
            "input_spanish": "yo estoy bien",
            "input_english": "i am well",
            "input_language": "spanish",
            "response_spanish": "bueno",
            "response_english": "ok",
            "correction": correction,
        }
        result = tutor.normalize_payload(payload, "yo soy bien")
        assert result["correction"] == correction


VALID_RESPONSE_NO_CORRECTION = """\
---REPLY---
Ah, qué bien! Me alegra escucharlo.
---JSON---
{
  "input_spanish": "Estoy bien",
  "input_english": "I am well",
  "input_language": "spanish",
  "response_spanish": "Ah, qué bien! Me alegra escucharlo.",
  "response_english": "Ah, how nice! I'm glad to hear that.",
  "correction": null
}"""

VALID_RESPONSE_WITH_CORRECTION = """\
---REPLY---
Pues, deberías decir 'estoy bien'.
---JSON---
{
  "input_spanish": "Yo estoy bien",
  "input_english": "I am well",
  "input_language": "spanish",
  "response_spanish": "Pues, deberías decir 'estoy bien'.",
  "response_english": "Well, you should say 'I am well'.",
  "correction": {
    "original": "yo soy bien",
    "corrected": "yo estoy bien",
    "error_candidates": [
      {
        "word": "soy",
        "span": [3, 6],
        "error_type": "grammar",
        "suggested_correction": "estoy",
        "explanation": "Use 'estoy' for temporary states like health."
      }
    ]
  }
}"""

class TestParseMergedResponse:
    def test_parses_reply_without_correction(self, tutor):
        reply, resp = tutor.parse_merged_response(
            VALID_RESPONSE_NO_CORRECTION, "Estoy bien"
        )
        assert reply == "Ah, qué bien! Me alegra escucharlo."
        assert resp.correction is None
        assert resp.input_language == Language.SPANISH

    def test_parses_reply_with_correction(self, tutor):
        reply, resp = tutor.parse_merged_response(
            VALID_RESPONSE_WITH_CORRECTION, "yo soy bien"
        )
        assert reply == "Pues, deberías decir 'estoy bien'."
        assert resp.correction is not None
        assert resp.correction.corrected == "yo estoy bien"
        assert len(resp.correction.error_candidates) == 1
        assert resp.correction.error_candidates[0].word == "soy"
        assert resp.correction.error_candidates[0].suggested_correction == "estoy"

    def test_parses_bilingual_fields(self, tutor):
        _, resp = tutor.parse_merged_response(
            VALID_RESPONSE_NO_CORRECTION, "Estoy bien"
        )
        assert resp.input_spanish == "Estoy bien"
        assert resp.input_english == "I am well"
        assert resp.response_spanish == "Ah, qué bien! Me alegra escucharlo."
        assert resp.response_english == "Ah, how nice! I'm glad to hear that."

    def test_raises_on_completely_broken_response(self, tutor):
        with pytest.raises(Exception):
            tutor.parse_merged_response("no json here at all !!!!", "hola")

    def test_raises_when_json_section_missing_required_fields(self, tutor):
        raw = "---REPLY---\nHola\n---JSON---\n{\"only_key\": \"value\"}"
        with pytest.raises(Exception):
            tutor.parse_merged_response(raw, "hola")


class TestGetFallback:
    def test_uses_reply_section_from_raw_when_json_fails(self, tutor):
        raw = "---REPLY---\nHola amigo!\n---JSON---\n{broken}"
        reply, resp = tutor.get_fallback("hola", raw)
        assert reply == "Hola amigo!"
        assert resp.response_spanish == "Hola amigo!"

    def test_uses_default_message_when_no_raw(self, tutor):
        reply, resp = tutor.get_fallback("hola", None)
        assert "problema" in reply.lower() or "sorry" in reply.lower()

    def test_correction_is_none_in_fallback(self, tutor):
        _, resp = tutor.get_fallback("algo", None)
        assert resp.correction is None

    def test_fallback_language_is_spanish(self, tutor):
        _, resp = tutor.get_fallback("algo", None)
        assert resp.input_language == Language.SPANISH

    def test_fallback_preserves_user_input_in_spanish_field(self, tutor):
        _, resp = tutor.get_fallback("yo quiero comer", None)
        assert resp.input_spanish == "yo quiero comer"
