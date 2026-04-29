from dataclasses import dataclass
from typing import Any, Dict


type LLMResponse = Dict[str, Any]


@dataclass
class Context:
    role: str
    content: str


@dataclass
class UserInputAnalysis:
    set_of_words: set[str]
    misused_words: set[str]
