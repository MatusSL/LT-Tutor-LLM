from dataclasses import dataclass
from typing import Any

from app.schemas.api import Mode


type LLMResponse = dict[str, Any]


@dataclass
class Context:
    role: str
    content: str


@dataclass
class UserInputAnalysis:
    set_of_words: set[str]
    misused_words: set[str]


@dataclass
class UserScope:
    tenses: set[str]
    structures: set[str]


@dataclass
class UserContextData:
    mode: Mode
    user_input: str
    context: list[Context]
    scope: UserScope | None
