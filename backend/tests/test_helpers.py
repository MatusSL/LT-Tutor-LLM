from app.utils.helpers import (
    normalize_user_input,
    remove_punctuation,
    turn_text_to_lowercase,
)


class TestRemovePunctuation:
    def test_removes_trailing_exclamation(self):
        assert remove_punctuation("hola!") == "hola"

    def test_removes_ascii_question_mark(self):
        assert remove_punctuation("que?") == "que"

    def test_removes_comma(self):
        assert remove_punctuation("hola, amigo") == "hola amigo"

    def test_removes_period(self):
        assert remove_punctuation("bien.") == "bien"

    def test_no_punctuation_unchanged(self):
        assert remove_punctuation("hola amigo") == "hola amigo"

    def test_empty_string_unchanged(self):
        assert remove_punctuation("") == ""

    def test_multiple_ascii_punctuation_marks(self):
        assert remove_punctuation("Hola! Como estas?") == "Hola Como estas"



class TestTurnTextToLowercase:
    def test_lowercases_all_words(self):
        assert turn_text_to_lowercase("YO QUIERO") == "yo quiero"

    def test_mixed_case(self):
        assert turn_text_to_lowercase("Hola Amigo") == "hola amigo"

    def test_already_lowercase_unchanged(self):
        assert turn_text_to_lowercase("yo soy") == "yo soy"

    def test_single_word(self):
        assert turn_text_to_lowercase("HOLA") == "hola"

    def test_empty_string(self):
        assert turn_text_to_lowercase("") == ""


class TestNormalizeUserInput:
    def test_lowercases_words(self):
        result = normalize_user_input({"YO", "QUIERO"})
        assert "yo" in result
        assert "quiero" in result

    def test_strips_punctuation(self):
        result = normalize_user_input({"hola!", "bien."})
        assert "hola" in result
        assert "bien" in result

    def test_deduplicates_words(self):
        result = normalize_user_input({"Hola", "hola"})
        assert len(result) == 1
        assert "hola" in result

    def test_empty_set_returns_set_with_empty_string(self):
        result = normalize_user_input(set())
        assert result == {""}

    def test_preserves_accented_characters(self):
        result = normalize_user_input({"ESTÁS"})
        assert "estás" in result

    def test_multiple_words_in_one_element(self):
        result = normalize_user_input({"yo quiero"})
        assert "yo" in result
        assert "quiero" in result
