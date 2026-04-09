from typing import List, Protocol, Set, Tuple

from app.schemas.constants import Context
from app.schemas.llm import TutorResponse
from app.schemas.db import DistractionModel, MistakeModel, ReviewData
from app.schemas.session import UserInputAnalysis


class ReviewerProtocol(Protocol):
    def generate_distractions(self, word: str, sentence: str) -> DistractionModel:
        ...
        
    def generate_review(self, mistakes: List[MistakeModel]) -> ReviewData:
        ...
    


class TutorProtocol(Protocol):
    def reply(
            self,
            user_input: str,
            context: List[Context],
            vocabulary: Set[str]
        ) -> Tuple[str, TutorResponse]:
            ...


class VocabularyProtocol(Protocol):
    @property
    def words(self) -> Set[str]:
        ...

    def update_max_episode_completed(self, episode: int) -> None:
        ...

    def get_max_episode_completed(self) -> int:
        ...

    def update_all_mistakes(self, mistakes: List[MistakeModel]) -> None:
        ...

    def get_all_mistakes(self) -> List[MistakeModel]:
        ...

    def update_all_words(self, words: Set[str]) -> None:
        ...

    def verify_and_update_vocabulary(self, analysis: UserInputAnalysis) -> Set[str]:
        ...