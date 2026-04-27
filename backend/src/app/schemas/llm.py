from typing import Literal, Optional
from pydantic import BaseModel, Field, model_validator
from app.utils.helpers import (
    _find_closest,
    _expand_to_word_boundaries,
    _is_word_char
)

from app.schemas.db import Language


class Topic(BaseModel):
    display_name: str
    description: str
    suggested_goals: list[str]
    difficulty: Literal["easy", "medium", "hard"]


class Topics(BaseModel):
    topics: list[Topic]


class ErrorCandidate(BaseModel):
    word: str
    translation: str
    span: list[int]
    error_type: str
    correction: str
    explanation: str




class Correction(BaseModel):
    original: str = Field(description="The user's incorrect sentence.")
    corrected: str = Field(description="The corrected version of the sentence.")
    error_candidates: list[ErrorCandidate]

    @model_validator(mode="after")
    def normalize_error_candidate_spans(self) -> "Correction":
        normalized: list[ErrorCandidate] = []
        cursor = 0
        original_length = len(self.original)

        for error in sorted(
            self.error_candidates, key=lambda e: e.span[0] if e.span else 0
        ):
            if len(error.span) < 2 or not error.word.strip():
                continue

            raw_start, raw_end = error.span[0], error.span[1]
            start = max(0, min(raw_start, original_length))
            end = max(start, min(raw_end, original_length))
            wrong_text = self.original[start:end]

            if wrong_text != error.word:
                closest = _find_closest(self.original, error.word, start)
                if closest is not None:
                    start, end = closest
                    wrong_text = self.original[start:end]
                else:
                    expanded_start, expanded_end = _expand_to_word_boundaries(
                        self.original, start, end
                    )
                    expanded_text = self.original[expanded_start:expanded_end]
                    expected = error.word.strip()
                    current = wrong_text.strip()
                    recoverable = (
                        expected in expanded_text
                        or (current and current in expected)
                        or (current and expected in current)
                    )
                    if not recoverable:
                        continue

                    start, end = expanded_start, expanded_end
                    wrong_text = expanded_text

            cuts_through_word = (
                (start > 0 and _is_word_char(self.original[start - 1]))
                or (end < original_length and _is_word_char(self.original[end]))
            )
            if cuts_through_word:
                start, end = _expand_to_word_boundaries(self.original, start, end)
                wrong_text = self.original[start:end]

            if start < cursor or start == end or not wrong_text.strip():
                continue

            normalized.append(
                error.model_copy(update={"span": [start, end], "word": wrong_text})
            )
            cursor = end

        self.error_candidates = normalized
        return self


class TutorResponse(BaseModel):
    input_spanish: str = Field(description="User's input in Spanish.")
    input_english: str = Field(description="User's input in English.")
    input_language: Language = Field(description="Detected input language")
    response_spanish: str = Field(description="The main conversational response in Spanish.")
    response_english: str = Field(description="The main conversational response in English.")
    correction: Optional[Correction] = Field(
        default=None, description="Present only if the user made a mistake."
    )


class HighFrequencyWords(BaseModel):
    high_frequency_words: list[str]
