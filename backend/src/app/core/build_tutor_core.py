from pathlib import Path

from langchain_ollama import ChatOllama
from langchain_mistralai.chat_models import ChatMistralAI

from app.agents.review.fill_in_the_blank import GapFiller
from app.agents.runner import Runner
from app.agents.topic_generator import TopicGenerator
from app.agents.tutor import Tutor
from app.agents.word_recommender import WordRecommender

from app.core.tutor_core import TutorCore

from app.schemas.models import QWEN25_7B_MODEL
from app.services.vocabulary import Vocabulary

import os
from dotenv import load_dotenv
from pydantic import SecretStr

load_dotenv()


def resolve_episode_dir() -> Path:
    current = Path(__file__).resolve()
    while not (current / "LT_Episodes").exists():
        current = current.parent

    episode_dir = current / "LT_Episodes"
    return episode_dir


raw_api_key = os.getenv("MISTRAL_API_KEY")
API_KEY = SecretStr(raw_api_key) if raw_api_key else None


def setup_tutor_service(runner: Runner) -> Tutor:
    # tutor_model = ChatOllama(model=QWEN25_14B_MODEL, temperature=0.55)
    tutor_model = ChatMistralAI(api_key=API_KEY)
    return Tutor(runner=runner, model=tutor_model)


def setup_topic_generator_service(runner: Runner) -> TopicGenerator:
    topic_generator_model = ChatOllama(
        model=QWEN25_7B_MODEL, temperature=0.8, format="json"
    )
    return TopicGenerator(runner=runner, model=topic_generator_model)


def setup_word_recommender_service(runner: Runner) -> WordRecommender:
    word_recommender_model = ChatOllama(
        model=QWEN25_7B_MODEL, temperature=0.15, format="json"
    )
    return WordRecommender(runner=runner, model=word_recommender_model)

def setup_review_service(runner: Runner):
    gap_filler = GapFiller(runner, ChatMistralAI(api_key=API_KEY))

def build_tutor_core() -> TutorCore:
    runner = Runner()

    tutor = setup_tutor_service(runner)
    topic_generator = setup_topic_generator_service(runner)
    word_recommender = setup_word_recommender_service(runner)

    vocabulary = Vocabulary()

    episode_dir = resolve_episode_dir()

    return TutorCore(
        tutor=tutor,
        topic_generator=topic_generator,
        word_recommender=word_recommender,
        vocabulary=vocabulary,
        episodes_dir=episode_dir,
    )


# if __name__ == "__main__":
#     g = GapFiller(Runner(), ChatMistralAI(api_key=API_KEY))
#     g.add_word(origin="digo", corrected="decir", sentence="Te voy a digo algo nuevo!")
    