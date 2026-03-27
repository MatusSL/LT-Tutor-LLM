from langchain_ollama import ChatOllama
from app.agents.runner import Runner
from langchain.agents import create_agent

from app.prompts.conversational_prompt import CONVERSATIONAL_PROMPT
from app.schemas.models import History
# import threading


class Tutor:
    def __init__(self, runner: Runner, model: ChatOllama) -> None:
        self.agent = create_agent(model=model)
        self.runner = runner

    def reply(self, user_input: str, history: History, vocabulary: set[str]) -> str:
        conversation = "\n".join(f"{m['role']}: {m['content']}" for m in history)

        prompt = CONVERSATIONAL_PROMPT.format(
            vocabulary=vocabulary, history=conversation, user_input=user_input
        )

        response = self.runner.run_agent(self.agent, prompt)
        return response
