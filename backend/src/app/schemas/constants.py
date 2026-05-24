from dataclasses import dataclass
from pathlib import Path

from app.schemas.protocols import (
    LanguageDetectorProtocol,
    OpenerProtocol,
    ReviewBuilderProtocol,
    ReviewerProtocol,
    TutorProtocol,
    VocabularyProtocol,
)

@dataclass
class CoreServices:
    tutor: TutorProtocol
    review_builder: ReviewBuilderProtocol
    vocabulary: VocabularyProtocol
    episodes_dir: Path
    opener: OpenerProtocol
    language_detector: LanguageDetectorProtocol
    reviewer: ReviewerProtocol
