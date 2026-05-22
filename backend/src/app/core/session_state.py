from dataclasses import dataclass, field
from pathlib import Path

from app.schemas.types import Context, UserScope
from app.schemas.db import Language


@dataclass
class SessionState:
    language: Language = Language.UNKNOWN
    episodes_dir: Path = field(default_factory=Path)
    context: list[Context] = field(default_factory=list)
    episode_vocabulary: set[str] = field(default_factory=set)
    max_episode_completed: int | None = None
    scope: UserScope = field(
        default_factory=lambda: UserScope(
            tenses=set(), structures=set())
    )
