from pathlib import Path

from langchain_ollama import ChatOllama

from app.agents.runner import Runner
from app.agents.topic_generator import TopicGenerator
from app.agents.tutor import Tutor
from app.agents.tutor_response_generator import TutorResponseGenerator
from app.agents.word_recommender import WordRecommender

from app.core.tutor_core import TutorCore

from app.schemas.models import QWEN_MODEL
from app.services.vocabulary import Vocabulary


# TODO: if not selected completed episodes build_tutor_code @param episode: int | None

def resolve_episode_dir() -> Path:
    current = Path(__file__).resolve()
    while not (current / "LT_Episodes").exists():
        current = current.parent

    episode_dir = current / "LT_Episodes"
    return episode_dir


def setup_tutor_service(runner: Runner) -> Tutor:
    tutor_model = ChatOllama(model=QWEN_MODEL, temperature=0.7)
    return Tutor(
        runner=runner,
        model=tutor_model
    )


def setup_topic_generator_service(runner: Runner) -> TopicGenerator:
    topic_generator_model = ChatOllama(model=QWEN_MODEL, temperature=0.8)
    return TopicGenerator(
        runner=runner,
        model=topic_generator_model
        )

def setup_response_generator_service(runner: Runner) -> TutorResponseGenerator:
    tutor_response_generator_model = ChatOllama(model=QWEN_MODEL, temperature=0.2)
    return TutorResponseGenerator(
        runner=runner,
        model=tutor_response_generator_model
    )

def setup_word_recommender_service(runner: Runner) -> WordRecommender:
    word_recommender_model = ChatOllama(model=QWEN_MODEL, temperature=0.15)
    return WordRecommender(
        runner=runner,
        model=word_recommender_model
    )


def build_tutor_core() -> TutorCore:
    runner = Runner()

    tutor = setup_tutor_service(runner)
    topic_generator = setup_topic_generator_service(runner)
    tutor_response_generator = setup_response_generator_service(runner)
    word_recommender = setup_word_recommender_service(runner)

    vocabulary = Vocabulary()

    episode_dir = resolve_episode_dir()

    return TutorCore(
        tutor=tutor,
        topic_generator=topic_generator,
        tutor_response_generator=tutor_response_generator,
        word_recommender=word_recommender,
        vocabulary=vocabulary,
        episodes_dir=episode_dir,
    )
