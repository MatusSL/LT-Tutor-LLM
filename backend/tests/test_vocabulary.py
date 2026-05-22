from unittest.mock import MagicMock, patch

import pytest

from app.schemas.types import UserInputAnalysis


# ---------------------------------------------------------------------------
# Stubs
# A stub is a handwritten class that replaces a real dependency and returns
# pre-defined (canned) data.  Unlike a Mock it does not track calls — its
# only job is to feed the system-under-test a known dataset so we can verify
# the logic that depends on that data.
# ---------------------------------------------------------------------------


class StubSupabaseResponse:
    """Stub for a Supabase query response — always returns the same rows."""

    def __init__(self, words: list[str]):
        # Mimic the .data attribute that Vocabulary.get_words_from_response reads
        self.data = [
            {"word": w, "updated_at": "2024-01-01T00:00:00+00:00"} for w in words
        ]


class StubSupabaseClient:
    """
    Stub for the Supabase client.

    Implements the fluent query interface used in load_vocabulary():
        get_supabase().table(...).select("*").execute()

    Each method returns `self` so chaining works, and execute() returns the
    canned StubSupabaseResponse.
    """

    def __init__(self, words: list[str]):
        self._response = StubSupabaseResponse(words)

    def table(self, _name: str) -> "StubSupabaseClient":
        return self

    def select(self, *_args) -> "StubSupabaseClient":
        return self

    def execute(self) -> StubSupabaseResponse:
        return self._response


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


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


# ---------------------------------------------------------------------------
# Tests — load_vocabulary using a stub
# ---------------------------------------------------------------------------


class TestLoadVocabularyWithStub:
    """
    These tests replace the Supabase database with a stub.

    The goal is to isolate load_vocabulary() from the real network/database
    and verify that it correctly transforms the raw DB rows into a Python set.
    Each test seeds the stub with a different dataset and checks the output.
    """

    def _make_vocab(self, stub: StubSupabaseClient):
        """Helper: patch get_supabase and return a fresh Vocabulary instance."""
        with patch("app.services.vocabulary.get_supabase", return_value=stub):
            from app.services.vocabulary import Vocabulary

            return Vocabulary()

    # -- load_vocabulary() ---------------------------------------------------

    def test_returns_set_of_words_from_db(self):
        """Stub returns three rows → load_vocabulary produces a matching set."""
        stub = StubSupabaseClient(["hablar", "comer", "vivir"])
        vocab = self._make_vocab(stub)

        with patch("app.services.vocabulary.get_supabase", return_value=stub):
            result = vocab.load_vocabulary()

        assert result == {"hablar", "comer", "vivir"}

    def test_empty_database_returns_empty_set(self):
        """When the DB has no words, load_vocabulary returns an empty set."""
        stub = StubSupabaseClient([])
        vocab = self._make_vocab(stub)

        with patch("app.services.vocabulary.get_supabase", return_value=stub):
            result = vocab.load_vocabulary()

        assert result == set()

    def test_single_word_database(self):
        """Stub with one row → set with exactly one word."""
        stub = StubSupabaseClient(["yo"])
        vocab = self._make_vocab(stub)

        with patch("app.services.vocabulary.get_supabase", return_value=stub):
            result = vocab.load_vocabulary()

        assert result == {"yo"}

    def test_duplicate_words_collapsed_into_set(self):
        """
        Even if the DB somehow returns the same word twice, a set deduplicates.
        This tests that our data structure choice (set[str]) is correct.
        """
        stub = StubSupabaseClient(["hablar", "hablar", "comer"])
        vocab = self._make_vocab(stub)

        with patch("app.services.vocabulary.get_supabase", return_value=stub):
            result = vocab.load_vocabulary()

        assert result == {"hablar", "comer"}
        assert len(result) == 2

    # -- load_vocabulary() feeds find_new_words() ----------------------------
    # These tests show the stub doing real work: the loaded vocabulary becomes
    # the baseline for detecting words the user has never used before.

    def test_find_new_words_after_loading_from_stub(self):
        """
        Chain test: stub loads known words from 'DB', then find_new_words
        correctly flags only words that are not in that loaded set.
        """
        stub = StubSupabaseClient(["hablar", "comer"])
        vocab = self._make_vocab(stub)

        with patch("app.services.vocabulary.get_supabase", return_value=stub):
            vocab._words = vocab.load_vocabulary()  # seed from stub

        new = vocab.find_new_words({"hablar", "vivir", "correr"})
        assert new == {"vivir", "correr"}

    def test_no_new_words_when_all_already_in_stub(self):
        """If every word the user used was already in the DB, nothing is new."""
        stub = StubSupabaseClient(["hablar", "comer", "vivir"])
        vocab = self._make_vocab(stub)

        with patch("app.services.vocabulary.get_supabase", return_value=stub):
            vocab._words = vocab.load_vocabulary()

        new = vocab.find_new_words({"hablar", "comer"})
        assert new == set()

    def test_all_words_new_when_db_was_empty(self):
        """Empty DB → every word the user produces counts as new."""
        stub = StubSupabaseClient([])
        vocab = self._make_vocab(stub)

        with patch("app.services.vocabulary.get_supabase", return_value=stub):
            vocab._words = vocab.load_vocabulary()

        new = vocab.find_new_words({"soy", "bien"})
        assert new == {"soy", "bien"}
