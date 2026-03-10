import unittest

from app.core.vocabulary import Vocabulary
from app.core.schemas.models import UserInputAnalysis

class TestVocabulary(unittest.TestCase):
    
    def test_unique_word_count_simple_sentence(self):
        vocab = Vocabulary()
        vocab.words = set(
            "Yo quiero comer carne Mi amigo no le gusta agua"
            .split()
        )
        
        self.assertEqual(len(vocab.words), 10)


    def test_unique_word_count_with_duplicates(self):
        vocab = Vocabulary()
        vocab.words = set(
            "Me gusta gente que yo llamo mis amigos Me gusta mis amigos".split()
        )
        self.assertEqual(len(vocab.words), 8)


    def test_find_new_words_returns_only_unseen_words(self):
        vocab = Vocabulary()
        vocab.words = {"yo", "tú"}

        result = vocab.find_new_words({"yo", "ella", "nosotros"})

        self.assertEqual(result, {"ella", "nosotros"})


    def test_verify_new_words_excludes_misused(self):
        vocab = Vocabulary()

        new_words = {"hablar", "comer", "vivir"}
        misused = {"comer"}

        result = vocab.verify_new_words(new_words, misused)

        self.assertEqual(result, {"hablar", "vivir"})


    def test_verify_and_update_vocabulary_updates_internal_words(self):
        vocab = Vocabulary()
        vocab.words = {"yo"}

        analysis = UserInputAnalysis(
            set_of_words={"yo", "hablar", "comer"},
            misused_words={"comer"}
        )

        learned = vocab.verify_and_update_vocabulary(analysis)
    
        self.assertEqual(learned, {"hablar"})
        self.assertEqual(vocab.words, {"yo", "hablar"})


    def test_verify_and_update_vocabulary_with_no_new_words(self):
        vocab = Vocabulary()
        vocab.words = {"yo", "hablar"}

        analysis = UserInputAnalysis(
            set_of_words={"yo", "hablar", "comer"},
            misused_words={"yo", "comer"}
        )
        learned = vocab.verify_and_update_vocabulary(analysis)
        self.assertEqual(learned, set())
        self.assertEqual(vocab.words, {"yo", "hablar"})


if __name__ == "__main__":
    unittest.main()
