from app.domain.schemas.models import OLLAMA_MODEL
from app.services.tutor_core import TutorCore

from app.agents.runner import Runner
from app.agents.tutor_response_generator import TutorResponseGenerator
from langchain.agents import create_agent

from app.prompts.conversational_prompt import CONVERSATIONAL_PROMPT


class Tutor:
    def __init__(self) -> None:

        self.agent = create_agent(
            model=OLLAMA_MODEL, system_prompt=CONVERSATIONAL_PROMPT
        )

        self.response_generator = TutorResponseGenerator()

        self.runner = Runner()

        self.tutor_core = TutorCore()

    def chat(self, user_sentence: str) -> None:
        response = self.runner.run_agent(self.agent, user_sentence)
        print(response)

        tutor_response = self.response_generator.generate_tutor_response_json(
            user_sentence
        )
        self.tutor_core.process_user_input(tutor_response)
