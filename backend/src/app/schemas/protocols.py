from typing import Protocol

from app.schemas.llm import OpenerResponse, TutorResponse
from app.schemas.db import DistractionModel, MistakeModel, ReviewData
from app.schemas.types import UserContextData


class ReviewerProtocol(Protocol):
    def generate_distractions(self, word: str, sentence: str) -> DistractionModel: ...

    def generate_review(self, mistakes: list[MistakeModel]) -> ReviewData: ...


class TutorProtocol(Protocol):
    def reply(self, user_ctx_data: UserContextData) -> tuple[str, TutorResponse]: ...


class OpenerProtocol(Protocol):
    def generate(self, vocabulary: set[str]) -> OpenerResponse: ...


class VocabularyProtocol(Protocol):
    def update_max_episode_completed(self, episode: int) -> None: ...

    def get_max_episode_completed(self) -> int: ...

    def update_all_mistakes(self, mistakes: list[MistakeModel]) -> None: ...

    def get_all_mistakes(self) -> list[MistakeModel]: ...
