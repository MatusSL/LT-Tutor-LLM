from typing import List, Set
from app.schemas.models import Flashcard, MistakeModel


class CardBuilder:
    def __init__(self, mistakes: Set[MistakeModel]) -> None:
        self._mistakes = mistakes
        self.flashcards: List[Flashcard] = []
    
    def generate_flashcards(self):
        for mistake in self._mistakes:
            self.flashcards.append(Flashcard(
                word=mistake.origin,
                translation=mistake.translation
            ))
        
        return self.flashcards

