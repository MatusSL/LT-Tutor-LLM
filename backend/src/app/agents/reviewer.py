from typing import List

from langchain_core.language_models import BaseChatModel
from langchain.agents import create_agent

from app.agents.runner import Runner
from app.schemas.db import (
    DistractionModel,
    MistakeModel,
    FillBlank,
    ErrorCorrection,
    Flashcard,
    PhraseQuiz,
    ReviewData
)
from app.schemas.protocols import ReviewerProtocol

SYSTEM_PROMPT = """
You are a Spanish language exercise designer. A learner made a mistake using the word WORD inside SENTENCE.

Your job is to generate three review exercises based on that mistake. Return ONLY valid JSON — no markdown, no explanation, no extra text.

--------------------------------------------------

INPUT

WORD: {word}
SENTENCE: {sentence}

--------------------------------------------------

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

--------------------------------------------------

RULES

- options in fill_blank must all be real Spanish words matching the part of speech of correct_word
- options in phrase_quiz must all be grammatically complete English sentences
- No distractor may repeat WORD or corrected_word
- Do not use obscure vocabulary — use common learner-level words
- Output must be pure JSON with no markdown fences

--------------------------------------------------

OUTPUT FORMAT

{{
    "phrase_quiz": {{
        "phrase": "<corrected Spanish sentence>",
        "correct_answer": "<correct English translation>",
        "options": ["<correct_answer>", "<wrong1>", "<wrong2>", "<wrong3>"]
    }},
    "fill_blank": {{
        "sentence": "<corrected sentence with ____ replacing the target word>",
        "blank_index": <int>,
        "correct_word": "<correct Spanish word>",
        "options": ["<correct_word>", "<wrong1>", "<wrong2>", "<wrong3>"],
        "translation": "<English translation of corrected sentence>"
    }},
    "correction": {{
        "sentence": "<original incorrect sentence>",
        "error_index": <int>,
        "corrected_word": "<correct form>",
        "error_type": "<grammar|agreement|vocabulary>",
        "explanation": "<why WORD is wrong and corrected_word is right>"
    }}
}}
"""


class Reviewer(ReviewerProtocol):
    def __init__(self, runner: Runner, model: BaseChatModel) -> None:
        self.runner = runner
        self.agent = create_agent(model=model)


    MAX_RETRIES = 3
    def generate_distractions(self, word: str, sentence: str) -> DistractionModel:
        prompt = SYSTEM_PROMPT.format(word=word, sentence=sentence)

        for _ in range(self.MAX_RETRIES):
            try:
                response = self.runner.run_agent(self.agent, prompt)
            except Exception:
                continue

            cleaned = response.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
            if not cleaned:
                continue
            try:
                return DistractionModel.model_validate_json(cleaned)
            except RuntimeError:
                continue

        raise RuntimeError(f"Failed to generate distractions for word '{word}' after {self.MAX_RETRIES} retries")\
    
    def generate_review(self, mistakes: List[MistakeModel]) -> ReviewData:
        flashcards = self.generate_flashcards(mistakes=mistakes)
        phrase_quiz = self.generate_phrase_quiz(mistakes=mistakes)
        error_correction = self.generate_error_correction(mistakes=mistakes)
        fill_in_the_blank = self.generate_fill_in_the_blank(mistakes=mistakes)

        return ReviewData(
            flashcards=flashcards,
            phrase_quiz=phrase_quiz,
            error_corrections=error_correction,
            blank_words=fill_in_the_blank
        )
    
    def generate_flashcards(self, mistakes: List[MistakeModel]) -> List[Flashcard]:
        flashcards: List[Flashcard] = []

        for mistake in mistakes:
            flashcard = Flashcard(
                origin=mistake.origin,
                translation=mistake.translation
            )
            flashcards.append(flashcard)

        return flashcards
    
    def generate_phrase_quiz(self, mistakes: List[MistakeModel]) -> List[PhraseQuiz]:
        phrase_quiz: List[PhraseQuiz] = []
        for mistake in mistakes:
            phrase_data = mistake.distractions.phrase_quiz
            phrase_quiz.append(phrase_data)

        return phrase_quiz
    
    def generate_fill_in_the_blank(self, mistakes: List[MistakeModel]) -> List[FillBlank]:
        blanks_words: List[FillBlank] = []

        for mistake in mistakes:
            blank_word = mistake.distractions.fill_blank
            blanks_words.append(blank_word)

        return blanks_words
    
    def generate_error_correction(self, mistakes: List[MistakeModel]) -> List[ErrorCorrection]:
        error_corrections: List[ErrorCorrection] = []

        for mistake in mistakes:
            correction = mistake.distractions.correction
            error_corrections.append(correction)
        
        return error_corrections