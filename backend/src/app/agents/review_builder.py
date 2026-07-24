import logging

from langchain_core.language_models import BaseChatModel

from app.schemas.db import (
    DistractionModel,
    MistakeModel,
    FillBlank,
    ErrorCorrection,
    Flashcard,
    PhraseQuiz,
    ReviewData,
)
from app.schemas.protocols import ReviewBuilderProtocol

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """
You are a Spanish language exercise designer. A learner made a mistake using the word WORD inside SENTENCE.

Your job is to generate three review exercises based on that mistake.

INPUT

WORD: {word}
SENTENCE: {sentence}

EXERCISES

1. phrase_quiz — the learner translates the corrected sentence into English

   - phrase: The corrected Spanish sentence (fix WORD to its correct form)
   - correct_answer: The correct English translation of that corrected sentence
   - options: Array of exactly 4 English sentences — correct_answer first, then 3 wrong translations that are plausible but change the meaning, are subtly off, or use similar-sounding phrases

2. fill_blank — the learner picks the missing word

   - sentence: The corrected Spanish sentence with the correct form of WORD replaced by ____ (e.g. "Te voy a ____ algo")
   - blank_index: 0-based index of ____ when the sentence is split by spaces (e.g. "Te voy a ____ algo" → index 3)
   - correct_word: The correct Spanish word that fills the blank (the correct form of WORD)
   - options: Array of exactly 4 Spanish words — correct_word first, then 3 wrong words that are the same part of speech, common vocabulary, and plausible wrong choices
   - translation: English translation of the full corrected sentence

3. correction — the learner finds the error in the original sentence

   - sentence: The ORIGINAL incorrect sentence exactly as given in SENTENCE — do not fix it
   - error_index: 0-based index of WORD when the sentence is split by spaces
   - corrected_word: The correct form of WORD (what it should have been)
   - error_type: One of exactly "grammar", "agreement", or "vocabulary"
   - explanation: 1-2 sentences explaining why WORD is wrong and what corrected_word is correct

RULES

- options in fill_blank must all be real Spanish words matching the part of speech of correct_word
- options in phrase_quiz must all be grammatically complete English sentences
- No distractor may repeat WORD or corrected_word
- Do not use obscure vocabulary — use common learner-level words
"""


class ReviewBuilder(ReviewBuilderProtocol):
    def __init__(self, model: BaseChatModel) -> None:
        self.model = model.with_structured_output(DistractionModel)

    def generate_distractions(self, word: str, sentence: str) -> DistractionModel:
        prompt = SYSTEM_PROMPT.format(word=word, sentence=sentence)
        try:
            return self.model.invoke(prompt)  # type: ignore
        except Exception as e:
            logger.error(
                "Failed to generate distractions for word '%s'", word, exc_info=e
            )
            raise RuntimeError(
                f"Failed to generate distractions for word '{word}'"
            ) from e

    def generate_review(self, mistakes: list[MistakeModel]) -> ReviewData:
        flashcards = self.generate_flashcards(mistakes=mistakes)
        phrase_quiz = self.generate_phrase_quiz(mistakes=mistakes)
        error_correction = self.generate_error_correction(mistakes=mistakes)
        fill_in_the_blank = self.generate_fill_in_the_blank(mistakes=mistakes)

        return ReviewData(
            flashcards=flashcards,
            phrase_quiz=phrase_quiz,
            error_corrections=error_correction,
            blank_words=fill_in_the_blank,
        )

    @staticmethod
    def generate_flashcards(mistakes: list[MistakeModel]) -> list[Flashcard]:
        return [Flashcard(origin=m.origin, translation=m.translation) for m in mistakes]

    @staticmethod
    def generate_phrase_quiz(mistakes: list[MistakeModel]) -> list[PhraseQuiz]:
        return [m.distractions.phrase_quiz for m in mistakes]

    @staticmethod
    def generate_fill_in_the_blank(mistakes: list[MistakeModel]) -> list[FillBlank]:
        return [m.distractions.fill_blank for m in mistakes]

    @staticmethod
    def generate_error_correction(
        mistakes: list[MistakeModel],
    ) -> list[ErrorCorrection]:
        return [m.distractions.correction for m in mistakes]
