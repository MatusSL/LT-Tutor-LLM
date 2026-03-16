from dataclasses import dataclass, field
from pathlib import Path
from typing import Set

from app.schemas.models import History, LLMResponse, Language


@dataclass
class SessionState:
    language: Language = Language.UNKNOWN
    response_json: LLMResponse = field(default_factory=dict)
    episodes_dir: Path = field(default_factory=Path)
    history: History = field(default_factory=list)
    vocabulary: Set[str] = field(default_factory=set)
    is_finished: bool = False
