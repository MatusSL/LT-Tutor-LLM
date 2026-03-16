import re

from langchain.agents import create_agent
from langchain_ollama import ChatOllama

from app.agents.runner import Runner

from app.schemas.models import QWEN_MODEL, Language, TutorResponse
from app.prompts.tutor_response_generator import TUTOR_RESPONSE_PROMPT

tutor_response_fallback = TutorResponse(
    input_spanish="",
    input_english="",
    input_language=Language.SPANISH,
    response_spanish="Lo siento, hubo un problema procesando el mensaje. ¿Puedes intentarlo otra vez?",
    response_english="Sorry, there was a problem processing the message. Could you try again?",
    correction=None,
)


class TutorResponseGenerator:
    def __init__(self) -> None:

        self.agent = create_agent(
            model=ChatOllama(model=QWEN_MODEL), system_prompt=TUTOR_RESPONSE_PROMPT
        )

        self.runner = Runner()

    def generate_tutor_response_json(self, user_sentence: str) -> TutorResponse:
        MAX_RETRIES = 3

        for attempt in range(MAX_RETRIES):
            response = self.runner.run_agent(self.agent, user_sentence)
            try:
                response_json = self.parse_response(response)
                return response_json

            except Exception:
                if attempt == MAX_RETRIES - 1:
                    pass

        return tutor_response_fallback

    def parse_response(self, response_text: str) -> TutorResponse:
        try:
            return TutorResponse.model_validate_json(response_text)
        except Exception:
            pass

        match = re.search(r"\{.*\}", response_text, re.DOTALL)
        if match:
            try:
                return TutorResponse.model_validate_json(match.group(0))
            except Exception:
                pass

        return tutor_response_fallback


if __name__ == "__main__":
    trg = TutorResponseGenerator()
    print(trg.generate_tutor_response_json("hola como estas?"))
