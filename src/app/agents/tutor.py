from app.domain.schemas.models import OLLAMA_MODEL, ChatResponse
from app.services.tutor_core import TutorCore

from langchain_ollama import ChatOllama
from app.agents.runner import Runner
from app.agents.tutor_response_generator import TutorResponseGenerator
from langchain.agents import create_agent

from app.prompts.conversational_prompt import CONVERSATIONAL_PROMPT

import threading

class Tutor:
    def __init__(self) -> None:

        self.agent = create_agent(
            model=ChatOllama(model=OLLAMA_MODEL), system_prompt=CONVERSATIONAL_PROMPT
        )

        self.response_generator = TutorResponseGenerator()

        self.runner = Runner()

        self.tutor_core = TutorCore()

    def chat(self, user_sentence: str) -> ChatResponse:
        response = self.runner.run_agent(self.agent, user_sentence)
        print(response)

        turn = f"INPUT: {user_sentence}\nRESPONSE: {response}"
        tutor_response = self.response_generator.generate_tutor_response_json(
            turn
        )

        thread = threading.Thread(
            target=self.tutor_core.process_user_input,
            args=(tutor_response,),
            daemon=True
        )

        thread.start()

        result = ChatResponse.model_validate({
            "response": response,
            "tutor_response": tutor_response 
        })

        return result

if __name__ == "__main__":
    tutor = Tutor()
    r = tutor.chat("Hola amigo como estas?")

    print(r)
