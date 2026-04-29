from dataclasses import dataclass
from pathlib import Path

from app.schemas.protocols import ReviewerProtocol, TutorProtocol, VocabularyProtocol

QWEN25_7B_MODEL = "qwen2.5:7b"
QWEN25_14B_MODEL = "qwen2.5:14b"
LLAMA32_MODEL = "llama3.2:latest"
LLAMA31 = "llama3.1:8b"


@dataclass
class CoreServices:
    tutor: TutorProtocol
    reviewer: ReviewerProtocol
    vocabulary: VocabularyProtocol
    episodes_dir: Path
