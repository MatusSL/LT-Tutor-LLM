import logging

from langchain.messages import HumanMessage, AIMessage
from langchain_core.runnables import Runnable
from langchain_core.exceptions import LangChainException

from app.schemas.constants import LLMResponse

logger = logging.getLogger(__name__)


class Runner:
    def __init__(self) -> None:
        pass

    def run_agent(self, agent: Runnable, user_input: str) -> str:
        try:
            response: LLMResponse = agent.invoke({"messages": user_input})
            content = self.extract_content(response)
            return content

        except LangChainException as e:
            logger.debug("Failed to run the runner.", exc_info=e)
            raise

    def extract_content(self, response: LLMResponse) -> str:
        try:
            last_message = response["messages"][-1]

            if isinstance(last_message, HumanMessage):
                return ""

            ai_message: AIMessage = last_message

            content = ai_message.content
            if isinstance(content, list):
                return " ".join(str(c) for c in content)

            return content
        
        except (KeyError, IndexError) as e:
            logger.error("Failed to generate valid response.", exc_info=e)
            raise LangChainException("Failed to extract content from response")