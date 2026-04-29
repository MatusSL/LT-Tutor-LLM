import logging
from typing import List, Set, Tuple

from langchain_core.language_models import BaseChatModel

from app.prompts.merged_tutor_prompt import MERGED_TUTOR_PROMPT
from app.schemas.types import Context
from app.schemas.db import Language
from app.schemas.llm import TutorResponse
from app.schemas.protocols import TutorProtocol

logger = logging.getLogger(__name__)


class Tutor(TutorProtocol):
    def __init__(self, model: BaseChatModel) -> None:
        self.model = model.with_structured_output(TutorResponse)

    def reply(
        self, user_input: str, context: List[Context], vocabulary: Set[str]
    ) -> Tuple[str, TutorResponse]:
        conversation = "\n".join(f"{m.role}: {m.content}" for m in context)

        prompt = MERGED_TUTOR_PROMPT.format(history=conversation, user_input=user_input)

        try:
            tutor_response: TutorResponse = self.model.invoke(prompt)
            return tutor_response.response_spanish, tutor_response
        except Exception as e:
            logger.error(
                "Failed to get structured response from tutor model", exc_info=e
            )
            return self._fallback(user_input)

    def _fallback(self, user_input: str) -> Tuple[str, TutorResponse]:
        reply = "Lo siento, hubo un problema. ¿Puedes intentarlo otra vez?"
        return reply, TutorResponse(
            input_spanish=user_input,
            input_english=user_input,
            input_language=Language.SPANISH,
            response_spanish=reply,
            response_english="Sorry, there was a problem. Could you try again?",
            correction=None,
        )
