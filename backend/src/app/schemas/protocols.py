from typing import List, Protocol, Set, Tuple

from app.schemas.constants import Context
from app.schemas.db import DistractionModel, MistakeModel
from app.schemas.llm import TutorResponse
from app.schemas.review import BlankWord, ErrorCorrection, Flashcard, PhraseQuiz
from app.schemas.session import UserInputAnalysis


class ReviewerProtocol(Protocol):
    def generate_distractions(self, word: str, sentence: str) -> DistractionModel:
        ...
        
    def generate_flashcards(self, mistakes: List[MistakeModel]) -> List[Flashcard]:
        ...
    
    def generate_phrase_quiz(self, mistakes: List[MistakeModel]) -> List[PhraseQuiz]:
        ...
    
    def generate_fill_in_the_blank(self, mistakes: List[MistakeModel]) -> List[BlankWord]:
        ...
        
    def generate_error_correction(self, mistakes: List[MistakeModel]) -> List[ErrorCorrection]:
        ...


class TutorProtocol(Protocol):
    def reply(
            self,
            user_input: str,
            context: List[Context],
            vocabulary: set[str]
        ) -> Tuple[str, TutorResponse]:
            ...


class VocabularyProtocol(Protocol):
    @property
    def words(self) -> Set[str]:
        ...

    def load_vocabulary(self) -> Set[str]:
        ...

    def update_max_episode_completed(self, episode: int) -> None:
        ...

    def get_max_episode_completed(self) -> int:
        ...

    def insert_word(self, word: str) -> None:
        ...

    def update_mistake(self, mistake: MistakeModel) -> None:
        ...

    # def update_all_mistakes(self)

    def get_all_mistakes(self) -> List[MistakeModel]:
        ...

    def insert_all_words(self, words: Set[str]) -> None:
        ...

    def verify_and_update_vocabulary(self, analysis: UserInputAnalysis) -> Set[str]:
        ...