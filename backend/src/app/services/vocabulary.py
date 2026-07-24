import logging
import os

from httpx import HTTPError
from postgrest import APIResponse
from postgrest.exceptions import APIError
from psycopg_pool import ConnectionPool

from app.database.supabase_setup import get_supabase
from app.schemas.db import MistakeModel, Table, User, UserModel, WordModel

# from app.schemas.types import UserInputAnalysis
from app.schemas.protocols import VocabularyProtocol

# from app.utils.helpers import normalize_user_input

logger = logging.getLogger(__name__)

DB_URL = os.environ.get("DB_CONNECTION")

if not DB_URL:
    raise ValueError("Supabase connection string must be set")

pool = ConnectionPool(
    DB_URL, min_size=1, max_size=5, check=ConnectionPool.check_connection
)


class Vocabulary(VocabularyProtocol):
    def __init__(self):
        self._words: set[str] | None = None

    @property
    def words(self) -> set[str]:
        if self._words is None:
            self._words = self.load_vocabulary()
        return self._words

    # * Database operation
    def load_vocabulary(self) -> set[str]:
        try:
            response = get_supabase().table(Table.WORDS).select("*").execute()

            vocabulary = self.get_words_from_response(response)
            return vocabulary

        except HTTPError as e:
            logger.error("DB could not be reached.", exc_info=e)
            raise

        except APIError as e:
            logger.error("Error while fetching vocabulary from database.", exc_info=e)
            raise

    # * Database operation
    def update_max_episode_completed(self, episode: int) -> None:
        try:
            (
                get_supabase()
                .table(Table.USERS)
                .update({User.MAX_EPISODE: episode})
                .eq(User.DISPLAY_NAME, "matus")
                .execute()
            )

        except (HTTPError, APIError) as e:
            logger.warning("Failed to save episode progress.", exc_info=e)

    # * Database operation
    def get_max_episode_completed(self) -> int:
        try:
            response = (
                get_supabase()
                .table(Table.USERS)
                .select("*")
                .eq(User.DISPLAY_NAME, "matus")
                .execute()
            )
            if len(response.data) == 0:
                return 0

            return UserModel.model_validate(response.data[0]).max_episode

        except HTTPError as e:
            logger.error("DB connection failed.", exc_info=e)
            raise

        except APIError as e:
            logger.error(f"DB query failed {e.message}.", exc_info=e)
            raise

    # * Database operation
    def update_mistake(self, mistake: MistakeModel) -> None:
        if mistake.origin is None or mistake.origin.strip() == "":
            return

        try:
            (
                get_supabase()
                .table(Table.MISTAKES)
                .insert(mistake.model_dump(exclude_none=True))
                .execute()
            )
        except (HTTPError, APIError) as e:
            logger.warning(f"Failed to update {mistake.origin=}", exc_info=e)

    # * Database operation
    def update_all_mistakes(self, mistakes: list[MistakeModel]) -> None:
        for mistake in mistakes:
            self.update_mistake(mistake)

    # * Database operation
    def get_all_mistakes(self) -> list[MistakeModel]:
        try:
            response = get_supabase().table(Table.MISTAKES).select("*").execute()

            return [MistakeModel.model_validate(row) for row in response.data]

        except HTTPError as e:
            logger.error("Failed to connect to DB while getting mistakes", exc_info=e)
            raise

        except APIError as e:
            logger.error("Failed to query DB while getting mistakes", exc_info=e)
            raise

    # # * Database operation
    # def update_all_words(self, words: set[str]):
    #     for word in words:
    #         self.update_word(word)

    def get_words_from_response(self, response: APIResponse) -> set[str]:
        result: set[str] = set()

        for batch in response.data:
            word_model = WordModel.model_validate(batch)
            result.add(word_model.word)

        return result

    def verify_new_words(
        self, new_words: set[str], current_invalid: set[str]
    ) -> set[str]:
        invalid_set = current_invalid
        verified: set[str] = new_words.difference(invalid_set)
        return verified
