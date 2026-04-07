# from typing import List

from typing import List

from langchain_mistralai import ChatMistralAI
from langchain.agents import create_agent

from app.agents.runner import Runner
from app.schemas.db import DistractionModel, MistakeModel
from app.schemas.review import BlankWord, ErrorCorrection, Flashcard, PhraseQuiz


SYSTEM_PROMPT = """
You are a Spanish language exercise designer specializing in distractor generation.

Your task is to generate exercise content for a given Spanish word across three review exercise types.

--------------------------------------------------

INPUT

You will receive:
- WORD: a single Spanish word that a learner has struggled with
- SENTENCE: the sentence in which the learner made a mistake with this word

--------------------------------------------------

TASK

Generate content for each review method exactly as described:

- phrase: 3 complete English sentences that naturally but incorrectly translate the sentence
- blank: 3 real Spanish words that are plausible but WRONG substitutes for the target word in a fill-in-the-blank exercise
- correction: 1 real Spanish word that could replace the target word in the given sentence — it fits grammatically and plausibly, but is the WRONG choice

--------------------------------------------------

RULES

- Every word in blank and correction must be a real Spanish word
- Every word in blank and correction must match the part of speech of the input word
- Distractors must be plausible enough to trick a learner — not obviously wrong
- Do NOT repeat the input word as a distractor
- Do NOT use obscure or rare vocabulary — use common learner-level words
- phrase must contain exactly 3 sentences
- blank must contain exactly 3 words
- correction must be exactly 1 word (a string, not a list)

--------------------------------------------------

OUTPUT FORMAT

Return ONLY valid JSON, nothing else:

{{
    "phrase": ["sentence1", "sentence2", "sentence3"],
    "blank": ["wrong1", "wrong2", "wrong3"],
    "correction": "wrong_word"
}}

--------------------------------------------------

ADDITIONAL RULES

- Do not include explanations
- Do not include markdown
- Do not include any text outside the JSON

--------------------------------------------------

FINAL CHECK

Before responding:
- phrase has exactly 3 full sentences
- blank has exactly 3 single words
- correction is a single word string (not a list) that could substitute the input word in the sentence
- no distractor repeats the input word
- output is valid JSON

--------------------------------------------------
WORD: {word}
SENTENCE: {sentence}
"""


class Reviewer:
    def __init__(self, runner: Runner, model: ChatMistralAI) -> None:
        self.runner = runner
        self.agent = create_agent(model=model)

    def generate_distractions(self, word: str, sentence: str) -> DistractionModel:
        prompt = SYSTEM_PROMPT.format(word=word, sentence=sentence)

        response = self.runner.run_agent(self.agent, prompt)
        cleaned = response.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
        return DistractionModel.model_validate_json(cleaned)
    
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
            correct = mistake.sentence.replace(mistake.origin, mistake.corrected)

            phrase = PhraseQuiz(
                correct=correct,
                wrong=[s for s in mistake.distractions.phrase]
            )

            phrase_quiz.append(phrase)

        return phrase_quiz
    
    def generate_fill_in_the_blank(self, mistakes: List[MistakeModel]) -> List[BlankWord]:
        blanks_words: List[BlankWord] = []

        for mistake in mistakes:
            underscores = "_" * len(mistake.corrected)
            title_sentence = mistake.sentence.replace(mistake.origin, underscores)
            
            blank_word = BlankWord(
                mistake.origin,
                corrected=mistake.corrected,
                sentence=title_sentence,
                error_candidates=[s for s in mistake.distractions.blank][:2]
            )

            blanks_words.append(blank_word)

        return blanks_words
    
    def generate_error_correction(self, mistakes: List[MistakeModel]) -> List[ErrorCorrection]:
        error_corrections: List[ErrorCorrection] = []

        for mistake in mistakes:
            correction = ErrorCorrection(
                sentence=mistake.sentence,
                wrong_word=mistake.origin
            )

            error_corrections.append(correction)
        
        return error_corrections