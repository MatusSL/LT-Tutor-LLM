from unittest.mock import MagicMock, patch

import pytest

from app.schemas.session import UserInputAnalysis


@pytest.fixture
def vocab():
    mock_supabase = MagicMock()
    mock_supabase.table.return_value.select.return_value.execute.return_value.data = []
    with patch("app.services.vocabulary.get_supabase", return_value=mock_supabase):
        from app.services.vocabulary import Vocabulary

        v = Vocabulary()
        v._words = set()
        yield v


class TestFindNewWords:
    def test_returns_only_unseen_words(self, vocab):
        vocab._words = {"yo", "tu"}
        result = vocab.find_new_words({"yo", "ella", "nosotros"})
        assert result == {"ella", "nosotros"}

    def test_returns_empty_when_all_words_known(self, vocab):
        vocab._words = {"yo", "tu", "el"}
        result = vocab.find_new_words({"yo", "tu"})
        assert result == set()

    def test_returns_all_when_nothing_known(self, vocab):
        vocab._words = set()
        result = vocab.find_new_words({"hablar", "comer"})
        assert result == {"hablar", "comer"}

    def test_empty_input_returns_empty(self, vocab):
        vocab._words = {"yo"}
        assert vocab.find_new_words(set()) == set()


class TestVerifyNewWords:
    def test_excludes_misused_words(self, vocab):
        result = vocab.verify_new_words({"hablar", "comer", "vivir"}, {"comer"})
        assert result == {"hablar", "vivir"}

    def test_no_misused_returns_all_new_words(self, vocab):
        result = vocab.verify_new_words({"hablar", "correr"}, set())
        assert result == {"hablar", "correr"}

    def test_all_misused_returns_empty(self, vocab):
        result = vocab.verify_new_words({"hablar", "comer"}, {"hablar", "comer"})
        assert result == set()

    def test_misused_not_in_new_words_has_no_effect(self, vocab):
        result = vocab.verify_new_words({"hablar"}, {"irrelevant"})
        assert result == {"hablar"}


class TestVerifyAndUpdateVocabulary:
    def test_returns_genuinely_new_correctly_used_words(self, vocab):
        vocab._words = {"yo"}
        with patch.object(vocab, "update_all_words"):
            analysis = UserInputAnalysis(
                set_of_words={"yo", "hablar", "comer"},
                misused_words={"comer"},
            )
            learned = vocab.verify_and_update_vocabulary(analysis)
        assert learned == {"hablar"}

    def test_returns_empty_when_all_words_already_known(self, vocab):
        vocab._words = {"yo", "hablar"}
        with patch.object(vocab, "update_all_words"):
            analysis = UserInputAnalysis(
                set_of_words={"yo", "hablar"},
                misused_words=set(),
            )
            learned = vocab.verify_and_update_vocabulary(analysis)
        assert learned == set()

    def test_returns_empty_when_all_new_words_are_misused(self, vocab):
        vocab._words = set()
        with patch.object(vocab, "update_all_words"):
            analysis = UserInputAnalysis(
                set_of_words={"soy", "bien"},
                misused_words={"soy", "bien"},
            )
            learned = vocab.verify_and_update_vocabulary(analysis)
        assert learned == set()

    def test_normalizes_casing_before_lookup(self, vocab):
        vocab._words = {"yo"}
        with patch.object(vocab, "update_all_words"):
            analysis = UserInputAnalysis(
                set_of_words={"YO", "HABLAR"},
                misused_words=set(),
            )
            learned = vocab.verify_and_update_vocabulary(analysis)
        assert "hablar" in learned
        assert "yo" not in learned

    def test_normalizes_punctuation_before_lookup(self, vocab):
        vocab._words = set()
        with patch.object(vocab, "update_all_words"):
            analysis = UserInputAnalysis(
                set_of_words={"hola!", "¿qué?"},
                misused_words=set(),
            )
            learned = vocab.verify_and_update_vocabulary(analysis)
        assert "hola" in learned

    def test_calls_insert_all_words(self, vocab):
        vocab._words = set()
        with patch.object(vocab, "update_all_words") as mock_insert:
            analysis = UserInputAnalysis(
                set_of_words={"soy"},
                misused_words={"soy"},
            )
            vocab.verify_and_update_vocabulary(analysis)
        mock_insert.assert_called_once()
