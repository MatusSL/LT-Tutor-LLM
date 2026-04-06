from typing import List, Set

from postgrest import APIResponse

from app.database.supabase_setup import get_supabase
from app.schemas.db import MistakeModel, Table, User, UserModel, WordModel
from app.schemas.llm import ErrorCandidate
from app.schemas.session import UserInputAnalysis

from app.utils.helpers import normalize_user_input


class Vocabulary:
    def __init__(self):
        self._words: Set[str] | None = None

    @property
    def words(self) -> Set[str]:
        if self._words is None:
            self._words = self.load_vocabulary()
        return self._words

    # * Database operation
    def load_vocabulary(self) -> Set[str]:
        response = (
            get_supabase()
            .table(Table.WORDS)
            .select("*")
            .execute()
        )

        vocabulary = self.get_words_from_response(response)
        return vocabulary

    # * Database operation
    def update_max_episode_completed(self, episode: int) -> None:
        (
        get_supabase()
        .table(Table.USERS)
        .update({User.MAX_EPISODE: episode})
        .eq(User.DISPLAY_NAME, "matus")
        .execute()
        )

    # * Database operation
    def get_max_episode_completed(self) -> int:
        response = (
            get_supabase()
            .table(Table.USERS)
            .select("*")
            .eq(User.DISPLAY_NAME, "matus")
            .execute()
        )

        return UserModel.model_validate(response.data[0]).max_episode

    # * Database operation
    def insert_word(self, word: str) -> None:
        if word is None or word.strip() == "":
            return

        payload = WordModel(word=word)

        (
        get_supabase()
        .table(Table.WORDS)
        .upsert(
            payload.model_dump(exclude_none=True),
            on_conflict="word"
        )
        .execute()
        )

    # * Database operation
    def insert_mistake(self, error: ErrorCandidate, sentence: str) -> None:
        if error.word is None or error.word.strip() == "":
            return

        distractions = {}

        payload = MistakeModel(
            origin=error.word,
            corrected=error.correction,
            sentence=sentence,
            translation=error.translation,
            distractions=distractions
        )

        (
        get_supabase()
        .table(Table.MISTAKES)
        .upsert(
            payload.model_dump(exclude_none=True),
            on_conflict="origin"
        )
        .execute()
        )

    # * Database operation
    def get_all_mistakes(self) -> List[MistakeModel]:
        response = (
            get_supabase()
            .table(Table.MISTAKES)
            .select("*")
            .execute()
        )

        return [MistakeModel.model_validate(row) for row in response.data]

    def insert_all_words(self, words: Set[str]):
        for word in words:
            self.insert_word(word)

    def get_words_from_response(self, response: APIResponse) -> Set[str]:
        result: Set[str] = set()

        for batch in response.data:
            word_model = WordModel.model_validate(batch)
            result.add(word_model.word)

        return result

    def find_new_words(self, used_words: Set[str]) -> Set[str]:
        new_words: Set[str] = set()

        for word in used_words:
            if word not in self.words:
                new_words.add(word)

        return new_words

    def verify_new_words(self, new_words: Set[str], current_invalid: Set[str]) -> Set[str]:
        invalid_set = current_invalid
        verified: Set[str] = new_words.difference(invalid_set)
        return verified

    def verify_and_update_vocabulary(self, analysis: UserInputAnalysis) -> Set[str]:
        formatted_used_words = normalize_user_input(analysis.set_of_words)
        formatted_misused_words = normalize_user_input(analysis.misused_words)

        # self.update_misused_words(formatted_misused_words)

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

if __name__ == "__main__":
    vocab = Vocabulary()
    vocab.insert_word("donde")