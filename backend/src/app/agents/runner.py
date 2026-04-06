from langchain.messages import HumanMessage, AIMessage
from langchain_core.runnables import Runnable
from app.schemas.constants import LLMResponse


class Runner:
    def __init__(self) -> None:
        pass

    def run_agent(self, agent: Runnable, user_input: str) -> str:
        try:
            response: LLMResponse = agent.invoke({"messages": user_input})
            content = self.extract_content(response)
            return content

        except Exception:
            return ""

    def extract_content(self, response: LLMResponse) -> str:
        last_message = response["messages"][-1]

        if isinstance(last_message, HumanMessage):
            return ""

        ai_message: AIMessage = last_message

        content = ai_message.content
        if isinstance(content, list):
            return " ".join(str(c) for c in content)

        return content
