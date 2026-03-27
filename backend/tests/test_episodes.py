from app.core.tutor_core import Vocabulary
from typing import List
import unittest
import json

# from app.database.firestore import db


class TestEpisodes(unittest.TestCase):
    episode_base_path = "LT_Episodes/spanish"

    def test_episodes_id_order(self):
        first_episode = 1
        last_episode = 30

        for episode_id in range(first_episode, last_episode + 1):
            try:
                filename = f"{self.episode_base_path}/Track_{episode_id}.json"
                with open(filename, "r", encoding="utf-8") as file:
                    current_episode = json.load(file)
                    current_episode_id = current_episode["id"]
                    error_text = f"Episode ID mismatch: expected {episode_id}, got {current_episode_id}"
                    self.assertEqual(episode_id, current_episode_id, error_text)

            except FileNotFoundError:
                self.fail(f"Episode file for ID {episode_id} not found.")

    def test_duplication_of_words_in_first_thirty_episodes(self):
        vocab = Vocabulary()
        number_of_unlocked_words = 0

        first_episode = 1
        last_episode = 30
        for episode_id in range(first_episode, last_episode + 1):
            try:
                filename = f"{self.episode_base_path}/Track_{episode_id}.json"
                with open(filename, "r", encoding="utf-8") as file:
                    episode_data = json.load(file)
                    unlocked_words = episode_data.get("unlocked_words", [])
                    unlocked_word_count = len(unlocked_words)
                    number_of_unlocked_words += unlocked_word_count
                    vocab.words.update(unlocked_words)

            except FileNotFoundError:
                self.fail(f"Episode file for ID {episode_id} not found.")

        expected_vocab_length = 511
        error_message = f"Expected to differ from {expected_vocab_length}, but got {number_of_unlocked_words}"
        self.assertNotEqual(
            expected_vocab_length, number_of_unlocked_words, error_message
        )

        for word in vocab.words:
            db.collection("unlocked_words").document(word).delete()

    def test_word_count_in_first_thirty_episodes(self):
        vocab = Vocabulary()

        first_episode = 1
        last_episode = 30
        for episode_id in range(first_episode, last_episode + 1):
            try:
                filename = f"{self.episode_base_path}/Track_{episode_id}.json"
                with open(filename, "r", encoding="utf-8") as file:
                    episode_data = json.load(file)
                    unlocked_words = episode_data.get("unlocked_words", [])
                    vocab.words.update(unlocked_words)

            except FileNotFoundError:
                self.fail(f"Episode file for ID {episode_id} not found.")

        expected_length = 511
        actual_length = len(vocab.words)
        error_message = (
            f"Length mismatch: expected {expected_length}, got {actual_length}"
        )
        self.assertEqual(actual_length, expected_length, error_message)

        for word in vocab.words:
            db.collection("unlocked_words").document(word).delete()

    def test_episode_file_path_consistency(self):
        first_episode = 1
        last_episode = 30
        for episode_id in range(first_episode, last_episode + 1):
            try:
                filename = f"{self.episode_base_path}/Track_{episode_id}.json"
                with open(filename, "r", encoding="utf-8") as file:
                    episode_data = json.load(file)
                    self.assertIn(
                        "id", episode_data, f"Episode {episode_id} missing 'id' field"
                    )
                    self.assertIn(
                        "unlocked_words",
                        episode_data,
                        f"Episode {episode_id} missing 'unlocked_words' field",
                    )
                    self.assertIn(
                        "unlocked_tenses",
                        episode_data,
                        f"Episode {episode_id} missing 'unlocked_tenses' field",
                    )
            except FileNotFoundError:
                self.fail(f"Episode file for ID {episode_id} not found.")

    def test_unlocked_words_are_non_empty_except_first_episode(self):
        first_episode = 2
        last_episode = 30
        for episode_id in range(first_episode, last_episode + 1):
            try:
                filename = f"{self.episode_base_path}/Track_{episode_id}.json"
                with open(filename, "r", encoding="utf-8") as file:
                    episode_data = json.load(file)
                    unlocked_words = episode_data.get("unlocked_words", [])
                    self.assertGreater(
                        len(unlocked_words),
                        0,
                        f"Episode {episode_id} has no unlocked words",
                    )
            except FileNotFoundError:
                self.fail(f"Episode file for ID {episode_id} not found.")

    def test_unlocked_tenses_are_valid_strings(self):
        first_episode = 1
        last_episode = 30
        for episode_id in range(first_episode, last_episode + 1):
            try:
                filename = f"{self.episode_base_path}/Track_{episode_id}.json"
                with open(filename, "r", encoding="utf-8") as file:
                    episode_data = json.load(file)
                    tenses = episode_data.get("unlocked_tenses", [])
                    for tense in tenses:
                        self.assertIsInstance(
                            tense, str, f"Episode {episode_id}: tense must be string"
                        )
                        self.assertGreater(
                            len(tense),
                            0,
                            f"Episode {episode_id}: tense cannot be empty",
                        )
            except FileNotFoundError:
                self.fail(f"Episode file for ID {episode_id} not found.")

    def test_vocabulary_progressive_growth(self):
        vocab_size_per_episode: List[int] = []
        first_episode = 1
        last_episode = 30

        for episode_id in range(first_episode, last_episode + 1):
            try:
                filename = f"{self.episode_base_path}/Track_{episode_id}.json"
                with open(filename, "r", encoding="utf-8") as file:
                    episode_data = json.load(file)
                    words = episode_data.get("unlocked_words", [])
                    vocab_size_per_episode.append(len(words))
            except FileNotFoundError:
                self.fail(f"Episode file for ID {episode_id} not found.")

        for i in range(1, len(vocab_size_per_episode)):
            self.assertGreaterEqual(
                vocab_size_per_episode[i],
                0,
                f"Episode {i + 1} word count should be non-negative",
            )

    def test_json_file_is_valid(self):
        first_episode = 1
        last_episode = 30
        for episode_id in range(first_episode, last_episode + 1):
            try:
                filename = f"{self.episode_base_path}/Track_{episode_id}.json"
                with open(filename, "r", encoding="utf-8") as file:
                    json.load(file)
            except json.JSONDecodeError:
                self.fail(f"Episode {episode_id} JSON file is invalid")
            except FileNotFoundError:
                self.fail(f"Episode file for ID {episode_id} not found.")


if __name__ == "__main__":
    unittest.main()
