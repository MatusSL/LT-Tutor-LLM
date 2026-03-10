import re

from app.domain.schemas.models import QWEN_MODEL, Topics

from app.prompts.topic_generator_prompt import TOPIC_GENERATOR_PROMPT
from app.agents.runner import Runner
from langchain.agents import create_agent
from langchain_ollama import ChatOllama


class TopicGenerator:
    def __init__(self) -> None:

        self.agent = create_agent(
            model=ChatOllama(model=QWEN_MODEL),
            system_prompt=TOPIC_GENERATOR_PROMPT,
        )

        self.runner = Runner()

    def suggest_topics_for_vocabulary(self, words: list[str]) -> Topics:
        unlocked_words = "\n".join(f"- {w}" for w in words)

        MAX_RETRIES = 3
        for attempt in range(MAX_RETRIES):
            response = self.runner.run_agent(self.agent, unlocked_words)
            try:
                topics = self.parse_topics_response(response)
                # print(topics)
                return topics

            except Exception:
                if attempt == MAX_RETRIES - 1:
                    raise RuntimeError("Failed to parse topic generation JSON content")

        raise RuntimeError("Failed to parse topic generation JSON content")

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

        raise ValueError("Model did not return valid Topics JSON")


if __name__ == "__main__":
    words = [
        "hola",
        "gracias",
        "por favor",
        "perdón",
        "adiós",
        "bueno",
        "malo",
        "grande",
        "pequeño",
        "nuevo",
        "viejo",
        "mucho",
        "poco",
        "mismo",
        "otro",
        "ser",
        "estar",
        "tener",
        "hacer",
        "ir",
        "poder",
        "querer",
        "saber",
        "venir",
        "decir",
        "ver",
        "dar",
        "hablar",
        "comer",
        "vivir",
        "necesitar",
        "llamar",
        "creer",
        "pasar",
        "llevar",
        "yo",
        "tú",
        "él",
        "ella",
        "nosotros",
        "ellos",
        "usted",
        "me",
        "lo",
        "se",
        "el",
        "la",
        "un",
        "una",
        "este",
        "esta",
        "ese",
        "esa",
        "en",
        "de",
        "a",
        "con",
        "por",
        "para",
        "sin",
        "sobre",
        "entre",
        "hasta",
        "desde",
        "durante",
        "y",
        "o",
        "pero",
        "porque",
        "que",
        "si",
        "cuando",
        "donde",
        "como",
        "aunque",
        "sí",
        "no",
        "también",
        "nunca",
        "siempre",
        "aquí",
        "allí",
        "ahora",
        "hoy",
        "mañana",
        "bien",
        "mal",
        "muy",
        "más",
        "menos",
        "qué",
        "quién",
        "cómo",
        "cuándo",
        "cuánto",
    ]
    tg = TopicGenerator()
    topics = tg.suggest_topics_for_vocabulary(words)
    print(topics)
