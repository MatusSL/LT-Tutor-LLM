from app.database.firestore import db
from google.cloud.firestore_v1 import Increment, SERVER_TIMESTAMP
from app.schemas.models import UserInputAnalysis

from app.utils.helpers import normalize_user_input


UNLOCKED_WORDS = "unlocked_words"
EPISODES = "episodes"


class Vocabulary:
    def __init__(self):
        self.words: set[str] = self.load_vocabulary()

    # * Database operation
    def load_vocabulary(self) -> set[str]:
        docs = db.collection(UNLOCKED_WORDS).stream()
        return {doc.id for doc in docs}

    # * Database operation
    def insert_word(self, word: str) -> None:
        if word == "" or word is None:
            return

        doc_ref = db.collection(UNLOCKED_WORDS).document(word)
        doc = doc_ref.get()

        exists = getattr(doc, "exists", False)

        if exists:
            doc_ref.update({"last_used": SERVER_TIMESTAMP, "times_used": Increment(1)})

        else:
            doc_ref.set(
                {
                    "word": word,
                    "last_used": SERVER_TIMESTAMP,
                    "times_used": 1,
                    "mistakes": 0,
                    "is_high_frequency_word": False,
                }
            )

    # * Database operation
    def insert_all_words(self, words: set[str]):
        for word in words:
            self.insert_word(word)

    # * Database operation
    def set_max_episode_completed(self, episode: int) -> None:
        collection = db.collection(EPISODES)

        doc_ref = collection.document("max_episode_completed")
        doc = doc_ref.get()

        exists = getattr(doc, "exists", False)
        if not exists:
            doc_ref.set({"episode": episode})
            return

        current_max_completed_episode = self.get_max_episode_completed()
        if episode < current_max_completed_episode:
            return

        doc_ref.update({"episode": episode})

    # * Database operation
    def get_max_episode_completed(self) -> int:
        doc = db.collection(EPISODES).document("max_episode_completed").get()

        exists = getattr(doc, "exists", False)
        if not exists:
            return -1

        return doc.get("episode")  # type: ignore

    # * Database operation
    def update_misused_words(self, misused_words: set[str]) -> None:
        if len(misused_words) == 0:
            return

        collection = db.collection(UNLOCKED_WORDS)

        for misused_word in misused_words:
            if misused_word == "":
                continue

            doc_ref = collection.document(misused_word)
            doc = doc_ref.get()

            exists = getattr(doc, "exists", False)
            if not exists:
                continue

            doc_ref.update(
                {
                    "last_used": SERVER_TIMESTAMP,
                    "times_used": Increment(1),
                    "mistakes": Increment(1),
                }
            )

    # * Database operation
    def update_high_frequency_words(self, high_freq_words: set[str]) -> None:
        if len(high_freq_words) == 0:
            return

        collection = db.collection(UNLOCKED_WORDS)

        for word in high_freq_words:
            if word == "":
                continue

            doc_ref = collection.document(word)
            doc = doc_ref.get()

            exists = getattr(doc, "exists", False)
            if not exists:
                continue

            doc_ref.update({"is_high_frequency_word": True})

    def find_new_words(self, used_words: set[str]) -> set[str]:
        new_words: set[str] = set()

        for word in used_words:
            if word not in self.words:
                new_words.add(word)

        return new_words

    def verify_new_words(
        self, new_words: set[str], current_invalid: set[str]
    ) -> set[str]:
        invalid_set = current_invalid
        verified: set[str] = new_words.difference(invalid_set)
        return verified

    def verify_and_update_vocabulary(self, analysis: UserInputAnalysis) -> set[str]:
        formatted_used_words = normalize_user_input(analysis.set_of_words)
        formatted_misused_words = normalize_user_input(analysis.misused_words)

        self.update_misused_words(formatted_misused_words)

        new_words = self.find_new_words(formatted_used_words)
        verified_words = self.verify_new_words(new_words, formatted_misused_words)
        # self.words.update(verified_words)

        # self.insert_all_words(verified_words)
        return verified_words


# def get_todays_words() -> dict[str, dict[str, Any]]:
#     now = datetime.now(timezone.utc)

#     start_of_today = datetime(
#         year=now.year, month=now.month, day=now.day, tzinfo=timezone.utc
#     )

#     start_of_tomorrow = start_of_today + timedelta(days=1)

#     docs = (
#         db.collection(UNLOCKED_WORDS)
#         .where(filter=FieldFilter("last_used", ">=", start_of_today))
#         .where(filter=FieldFilter("last_used", "<=", start_of_tomorrow))
#         .stream()
#     )

#     todays_words: dict[str, dict[str, Any]] = {}

#     for doc in docs:
#         report = doc.to_dict()

#         if report is None:
#             continue

#         word = doc.id
#         todays_words[word] = report

#     print(todays_words)
#     return todays_words


# def print_db():
#     docs = db.collection(UNLOCKED_WORDS).stream()

#     for doc in docs:
#         print(f"{doc.id} -> {doc.to_dict()}")
