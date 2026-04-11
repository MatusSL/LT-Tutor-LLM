from dataclasses import dataclass, field
from pathlib import Path
from typing import List, Set

from app.schemas.types import Context, LLMResponse
from app.schemas.db import Language


@dataclass
class SessionState:
    language: Language = Language.UNKNOWN
    response_json: LLMResponse = field(default_factory=dict)
    episodes_dir: Path = field(default_factory=Path)
    context: List[Context] = field(default_factory=list)
    vocabulary: Set[str] = field(default_factory=set)
    episode_vocabulary: Set[str] = field(default_factory=set)
    is_finished: bool = False
