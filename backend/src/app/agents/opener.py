import logging

from langchain_core.language_models import BaseChatModel

from app.prompts.opener_prompt import OPENER_PROMPT
from app.schemas.llm import OpenerResponse
from app.schemas.protocols import OpenerProtocol

logger = logging.getLogger(__name__)

_FALLBACK_SPANISH = "Hola, ¿qué tal? ¿De qué quieres hablar hoy?"
_FALLBACK_ENGLISH = "Hey, what's up? What do you want to talk about today?"


class Opener(OpenerProtocol):
    def __init__(self, model: BaseChatModel) -> None:
        self.model = model.with_structured_output(OpenerResponse)

    def generate(self, vocabulary: set[str]) -> OpenerResponse:
        vocab_block = self._format_vocabulary(vocabulary)
        prompt = OPENER_PROMPT.format(vocabulary=vocab_block)

        try:
            response: OpenerResponse = self.model.invoke(prompt)  # type: ignore
            if not response.response_spanish.strip():
                return self._fallback()
            return response
        except Exception as e:
            logger.error(
                "Failed to get structured response from opener model", exc_info=e
            )
            return self._fallback()

    @staticmethod
    def _format_vocabulary(vocabulary: set[str]) -> str:
        if not vocabulary:
            return "(no vocabulary unlocked yet)"
        return "\n".join(f"- {word}" for word in sorted(vocabulary))

    @staticmethod
    def _fallback() -> OpenerResponse:
        return OpenerResponse(
            response_spanish=_FALLBACK_SPANISH,
            response_english=_FALLBACK_ENGLISH,
        )
