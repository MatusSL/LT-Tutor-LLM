from dataclasses import dataclass


@dataclass
class TutorResult:
    is_correct: bool
    learned_words: set[str]


@dataclass
class UserInputAnalysis:
    set_of_words: set[str]
    misused_words: set[str]
