import re

from app.schemas.llm import Topic, Topics

from app.prompts.topic_generator_prompt import TOPIC_GENERATOR_PROMPT
from app.agents.runner import Runner
from langchain.agents import create_agent
from langchain_ollama import ChatOllama

topics_fallback: Topics = Topics(
    topics=[
        Topic(
            display_name="FAIL", description="", difficulty="easy", suggested_goals=[]
        )
    ]
)


class TopicGenerator:
    def __init__(self, runner: Runner, model: ChatOllama) -> None:
        self.agent = create_agent(
            model=model,
            system_prompt=TOPIC_GENERATOR_PROMPT,
        )

        self.runner = runner

    def suggest_topics_for_vocabulary(self, words: list[str]) -> Topics:
        unlocked_words = "\n".join(f"- {w}" for w in words)

        MAX_RETRIES = 3
        for attempt in range(MAX_RETRIES):
            response = self.runner.run_agent(self.agent, unlocked_words)
            try:
                topics = self.parse_topics_response(response)
                return topics

            except Exception:
                if attempt == MAX_RETRIES - 1:
                    pass

        return topics_fallback

    def parse_topics_response(self, response_text: str) -> Topics:
        try:
            return Topics.model_validate_json(response_text)
        except Exception:
            pass

        match = re.search(r"\{.*\}", response_text, re.DOTALL)
        if match:
            try:
                return Topics.model_validate_json(match.group(0))
            except Exception:
                pass

        return topics_fallback
