import logging

from language_tool_python import LanguageTool, Match

from app.schemas.llm import ErrorCandidate
from app.schemas.protocols import ReviewerProtocol

logger = logging.getLogger(__name__)


class Reviewer(ReviewerProtocol):
    def __init__(self) -> None:
        self.tool = LanguageTool("es")

    def review_sentence(self, sentence: str) -> list[ErrorCandidate] | None:
        matches: list[Match] = self.tool.check(sentence)

        candidates: list[ErrorCandidate] = []
        for match in matches:
            correction = match.replacements
            start = match.offset
            end = match.offset + match.error_length
            error_type = match.category

            candidates.append(
                ErrorCandidate(
                    word=sentence[start:end],
                    translation="",
                    span=[start, end],
                    error_type=error_type,
                    correction=" ".join(correction),
                    explanation="",
                )
            )

        logger.debug("Reviewed sentence %s", candidates)
        return candidates
