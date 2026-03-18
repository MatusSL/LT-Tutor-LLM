from langchain.agents import create_agent
from langchain.messages import HumanMessage, AIMessage
from langchain_core.messages import BaseMessage
from langchain_core.runnables import Runnable
from app.prompts.summarizer_prompt import SUMMARIZER_PROMPT
from app.schemas.models import OLLAMA_MODEL, LLMResponse
from langchain_ollama import ChatOllama


class Runner:
    def __init__(self) -> None:
        self.summarizer = create_agent(
            model=ChatOllama(model=OLLAMA_MODEL, temperature=0.8),
            system_prompt=SUMMARIZER_PROMPT,
        )

        self.context: list[BaseMessage] = []
        self.total_tokens = 0
        self.CONTEXT_WINDOW_LIMIT = 90_000

    def run_agent(self, agent: Runnable, user_input: str) -> str:
        try:
            self.context.append(HumanMessage(content=user_input))
            response: LLMResponse = agent.invoke({"messages": self.context})  # type: ignore
            self.add_tokens(response)

            if self.total_tokens >= self.CONTEXT_WINDOW_LIMIT:
                self.trim_context_window()

        except Exception as e:
            if len(self.context) > 0:
                self.context.pop()

            # ! Unhandled Exception
            raise Exception(f"Agent invocation failed: {e}")

        content = self.extract_content(response)
        self.context.append(AIMessage(content=content))

        return content

    def extract_content(self, response: LLMResponse) -> str:
        last_message = response["messages"][-1]

        if isinstance(last_message, HumanMessage):
            return ""

        ai_message: AIMessage = last_message

        content = ai_message.content
        if isinstance(content, list):
            return " ".join(str(c) for c in content)

        return content

    def add_tokens(self, response: LLMResponse) -> None:
        last_message = response["messages"][-1]

        if isinstance(last_message, HumanMessage):
            return

        ai_message: AIMessage = last_message

        if ai_message.usage_metadata is None:
            return

        response_tokens = ai_message.usage_metadata["total_tokens"]
        self.total_tokens += response_tokens

    def trim_context_window(self):
        mid = len(self.context) // 2
        to_summarize = self.context[:mid]

        summary_request = to_summarize + [HumanMessage(content=SUMMARIZER_PROMPT)]

        summary_response: LLMResponse = self.summarizer.invoke(
            {"messages": summary_request}  # type: ignore
        )
        summary_text = self.extract_content(summary_response)

        self.context = [
            HumanMessage(content=f"Summary of earlier conversation: {summary_text}")
        ] + self.context[mid:]
        self.total_tokens = 0
