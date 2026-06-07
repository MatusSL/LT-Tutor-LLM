import logging

from langchain_core.language_models import BaseChatModel

from app.prompts.merged_tutor_prompt import MERGED_TUTOR_PROMPT
from app.prompts.lt_tutor_prompt import LT_TUTOR_PROMPT
from app.prompts.learner_profile import LEARNER_LEVEL
from app.schemas.types import UserContextData
from app.schemas.db import Language
from app.schemas.llm import TutorResponse
from app.schemas.protocols import TutorProtocol

logger = logging.getLogger(__name__)


class Tutor(TutorProtocol):
    def __init__(self, model: BaseChatModel) -> None:
        self.model = model.with_structured_output(TutorResponse)

    def reply(self, user_ctx_data: UserContextData) -> tuple[str, TutorResponse]:
        # prompt = MERGED_TUTOR_PROMPT.format(history=conversation, user_input=user_input)
        prompt = self.get_prompt_by_mode(user_ctx_data)

        try:
            tutor_response: TutorResponse = self.model.invoke(prompt)  # type: ignore
            return tutor_response.response_spanish, tutor_response

        except Exception as e:
            logger.error(
                "Failed to get structured response from tutor model", exc_info=e
            )
            return self._fallback(user_ctx_data.user_input)

    @staticmethod
    def _fallback(user_input: str) -> tuple[str, TutorResponse]:
        reply = "Lo siento, hubo un problema. ¿Puedes intentarlo otra vez?"
        return reply, TutorResponse(
            input_spanish=user_input,
            input_english=user_input,
            input_language=Language.SPANISH,
            response_spanish=reply,
            response_english="Sorry, there was a problem. Could you try again?",
            correction=None,
        )

    @staticmethod
    def get_prompt_by_mode(user_ctx_data: UserContextData) -> str:
        conversation = "\n".join(
            f"{m.role}: {m.content}" for m in user_ctx_data.context
        )
        user_input = user_ctx_data.corrected_input or user_ctx_data.user_input

        if user_ctx_data.mode == "conversation":
            return MERGED_TUTOR_PROMPT.format(
                history=conversation, user_input=user_input
            )
        
        if user_ctx_data.scope is None:
            unlocked_tenses = "(none yet)"
            unlocked_structures = "(none yet)"
        else:
            unlocked_tenses = ", ".join(user_ctx_data.scope.tenses)
            unlocked_structures = ", ".join(user_ctx_data.scope.structures)

        return LT_TUTOR_PROMPT.format(
            LEARNER_LEVEL=LEARNER_LEVEL,
            unlocked_tenses=unlocked_tenses,
            unlocked_structures=unlocked_structures,
            history=conversation,
            user_input=user_input,
        )
