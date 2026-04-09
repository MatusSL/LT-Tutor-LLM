from pathlib import Path

from langchain_ollama import ChatOllama
from langchain_mistralai.chat_models import ChatMistralAI

from app.agents.reviewer import Reviewer
from app.agents.runner import Runner
from app.agents.tutor import Tutor

from app.core.tutor_core import TutorCore

from app.services.vocabulary import Vocabulary

import os
from dotenv import load_dotenv
from pydantic import SecretStr

load_dotenv()

raw_api_key = os.getenv("MISTRAL_API_KEY")
API_KEY = SecretStr(raw_api_key) if raw_api_key else None


# TUTOR_MODEL = ChatMistralAI(api_key=API_KEY)
TUTOR_MODEL = ChatOllama(model="mistral-large-3:675b-cloud")

# REVIEWER_MODEL = ChatMistralAI(api_key=API_KEY)
REVIEWER_MODEL = ChatOllama(model="mistral-large-3:675b-cloud")

# TOPIC_GENERATOR_MODEL = ChatOllama(model=QWEN25_7B_MODEL, temperature=0.8, format="json")
# WORD_RECOMMENDER_MODEL = ChatOllama(model=QWEN25_7B_MODEL, temperature=0.15, format="json")


def resolve_episode_dir() -> Path:
    current = Path(__file__).resolve()
    while not (current / "LT_Episodes").exists():
        current = current.parent

    episode_dir = current / "LT_Episodes"
    return episode_dir

def setup_tutor_service(runner: Runner) -> Tutor:
    return Tutor(runner=runner, model=TUTOR_MODEL)

# def setup_topic_generator_service(runner: Runner) -> TopicGenerator:
#     return TopicGenerator(runner=runner, model=TOPIC_GENERATOR_MODEL)

# def setup_word_recommender_service(runner: Runner) -> WordRecommender:
#     return WordRecommender(runner=runner, model=WORD_RECOMMENDER_MODEL)

def setup_reviewer_service(runner: Runner) -> Reviewer:
    return Reviewer(runner=runner, model=REVIEWER_MODEL)


def build_tutor_core() -> TutorCore:
    runner = Runner()

    tutor = setup_tutor_service(runner=runner)
    # topic_generator = setup_topic_generator_service(runner=runner)
    # word_recommender = setup_word_recommender_service(runner=runner)
    reviewer = setup_reviewer_service(runner=runner)

    vocabulary = Vocabulary()

    episode_dir = resolve_episode_dir()

    return TutorCore(
        tutor=tutor,
        reviewer=reviewer,
        vocabulary=vocabulary,
        episodes_dir=episode_dir,
    )


if __name__ == "__main__":
    sentence = "Te voy a digo algo nuevo!"
    word = "digo"
    r = Reviewer(Runner(), ChatMistralAI(api_key=API_KEY))
    m = r.generate_distractions(word=word, sentence=sentence)
    print(m.model_dump())