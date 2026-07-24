import logging
import os
from typing import Any

import psycopg
from dotenv import load_dotenv
from psycopg import Connection
from psycopg_pool import ConnectionPool

from app.schemas.db import (
    MistakeModel,
)
from app.schemas.protocols import VocabularyProtocol

load_dotenv()

DB_URL = os.environ.get("DB_CONNECTION")

if not DB_URL:
    raise ValueError("Supabase connection string must be set")


logger = logging.getLogger(__name__)


pool = ConnectionPool(
    DB_URL, min_size=1, max_size=5, check=ConnectionPool.check_connection
)


def get_connection():
    with pool.connection() as conn:
        yield conn


class Vocabulary(VocabularyProtocol):
    def __init__(self):
        self._words: set[str] | None = None

    # @property
    # def words(self) -> set[str]:
    #     if self._words is None:
    #         self._words = self.load_vocabulary()
    #     return self._words

    @staticmethod
    def _query(
        conn: Connection, sql: str, params: dict | list | None = None
    ) -> list[Any] | None:
        try:
            with conn.cursor() as cur:
                result = cur.execute(sql, params).fetchall()  # type: ignore
                return result

        except psycopg.OperationalError:
            logger.exception("Operational Error occurred while querying DB")
            return None

        except psycopg.InternalError:
            logger.exception("Internal Error occurred while querying DB")
            return None

        except psycopg.ProgrammingError:
            logger.exception("Programming Error occurred while querying DB")
            return None

        except psycopg.DatabaseError:
            logger.exception("Database Error occurred while querying DB")
            return None

    # * Database operation
    def load_vocabulary(self, conn: Connection) -> list[str]:
        sql = """--sql
            SELECT *
            FROM words
        """

        words = self._query(conn, sql)

        if words is None:
            logger.warning("DB Error occurred while getting words")
            return []

        return words

    # * Database operation
    def update_max_episode_completed(self, conn: Connection, new_max: int) -> None:
        sql = """--sql
            UPDATE users
            SET max_episode = %d
            WHERE display_name = %s
            RETURNING id
        """

        res = self._query(conn, sql, [new_max, "matus"])

        if not res:
            logger.warning("DB error occurred while updating max episode")

    # * Database operation
    def get_max_episode_completed(self, conn: Connection) -> int:
        sql = """--sql
            SELECT max_episode
            FROM users
            WHERE display_name = %s
        """

        rows = self._query(conn, sql, ["matus"])
        if not rows:
            logger.warning("DB Error occurred while getting max episode")
            return -1

        row: tuple = rows[0]
        return row[0]

    # * Database operation
    def update_mistake(self, mistake: MistakeModel) -> None:
        if mistake.origin is None or mistake.origin.strip() == "":
            return

    # # * Database operation
    # def update_all_mistakes(self, mistakes: list[MistakeModel]) -> None:
    #     for mistake in mistakes:
    #         self.update_mistake(mistake)

    # # * Database operation
    # def get_all_mistakes(self) -> list[MistakeModel]:
    #     try:
    #         response = get_supabase().table(Table.MISTAKES).select("*").execute()

    #         return [MistakeModel.model_validate(row) for row in response.data]

    #     except HTTPError as e:
    #         logger.error("Failed to connect to DB while getting mistakes", exc_info=e)
    #         raise

    #     except APIError as e:
    #         logger.error("Failed to query DB while getting mistakes", exc_info=e)
    #         raise

    # def get_words_from_response(self, response: APIResponse) -> set[str]:
    #     result: set[str] = set()

    #     for batch in response.data:
    #         word_model = WordModel.model_validate(batch)
    #         result.add(word_model.word)

    #     return result

    def verify_new_words(
        self, new_words: set[str], current_invalid: set[str]
    ) -> set[str]:
        invalid_set = current_invalid
        verified: set[str] = new_words.difference(invalid_set)
        return verified
