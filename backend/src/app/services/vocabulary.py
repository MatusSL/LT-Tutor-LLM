from typing import List, Set

from postgrest import APIResponse
from postgrest.exceptions import APIError
from httpx import HTTPError

import logging

from app.database.supabase_setup import get_supabase
from app.schemas.db import MistakeModel, Table, User, UserModel, WordModel
from app.schemas.session import UserInputAnalysis
from app.schemas.protocols import VocabularyProtocol

from app.utils.helpers import normalize_user_input

logger = logging.getLogger(__name__)


class Vocabulary(VocabularyProtocol):
    def __init__(self):
        self._words: Set[str] | None = None

    @property
    def words(self) -> Set[str]:
        if self._words is None:
            self._words = self.load_vocabulary()
        return self._words


    # * Database operation
    def load_vocabulary(self) -> Set[str]:
        try:
            response = (
                get_supabase()
                .table(Table.WORDS)
                .select("*")
                .execute()
            )

            vocabulary = self.get_words_from_response(response)
            return vocabulary
        
        except HTTPError as e:
            logger.error("Supabase could not be reached.", exc_info=e)
            raise
        
        except APIError as e:
            code = e.code
            msg = e.message
            details = e.details

            logger.error(
                f"Error while fetching vocabulary from database.:\n{msg=}\n{code=}\n{details=}",
                exc_info=e
            )
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
    def update_word(self, word: str) -> None:
        if word is None or word.strip() == "":
            return

        payload = WordModel(word=word)

        try:
            (
            get_supabase()
            .table(Table.WORDS)
            .upsert(
                payload.model_dump(exclude_none=True),
                on_conflict="word"
            )
            .execute()
            )
            
        except (HTTPError, APIError) as e:
            logger.warning(f"Failed to update {word=}.", exc_info=e)

    # * Database operation
    def update_mistake(self, mistake: MistakeModel) -> None:
        if mistake.origin is None or mistake.origin.strip() == "":
            return

        try:
            (
            get_supabase()
            .table(Table.MISTAKES)
            .upsert(
                mistake.model_dump(exclude_none=True),
                on_conflict="origin"
            )
            .execute()
            )
        except (HTTPError, APIError) as e:
            logger.warning(f"Failed to update {mistake.origin=}", exc_info=e)

    # * Database operation
    def update_all_mistakes(self, mistakes: List[MistakeModel]) -> None:
        for mistake in mistakes:
            self.update_mistake(mistake)


    # * Database operation
    def get_all_mistakes(self) -> List[MistakeModel]:
        try:
            response = (
                get_supabase()
                .table(Table.MISTAKES)
                .select("*")
                .execute()
            )

            return [MistakeModel.model_validate(row) for row in response.data]
        
        except HTTPError as e:
            logger.error(
                "Failed to connect to DB while getting mistakes",
                exc_info=e
            )
            raise

        except APIError as e:
            logger.error(
                "Failed to query DB while getting mistakes",
                exc_info=e
            )
            raise


    # * Database operation
    def update_all_words(self, words: Set[str]):
        for word in words:
            self.update_word(word)

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

        new_words = self.find_new_words(formatted_used_words)
        if len(new_words) == 0:
            return set()
        
        verified_words = self.verify_new_words(new_words, formatted_misused_words)
        # self.words.update(verified_words)

        self.update_all_words(verified_words)
        return verified_words
