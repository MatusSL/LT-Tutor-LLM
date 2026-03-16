from pathlib import Path

from app.agents.runner import Runner
from app.agents.topic_generator import TopicGenerator
from app.agents.tutor import Tutor
from app.agents.tutor_response_generator import TutorResponseGenerator
from app.agents.word_recommender import WordRecommender

from app.core.tutor_core import TutorCore

from app.services.vocabulary import Vocabulary


# ! Unhandled Exceptions: Runner.py, WordRecommender.py


# TODO Runner shared memory between agents, runner needed = Tutor
# TODO: if not selected completed episodes build_tutor_code @param episode: int | None


def build_tutor_core() -> TutorCore:
    runner = Runner()

    tutor = Tutor(runner)
    topic_generator = TopicGenerator(runner)

    tutor_response_generator = TutorResponseGenerator(runner)
    word_recommender = WordRecommender(runner)
    vocabulary = Vocabulary()

    current = Path(__file__).resolve()
    while not (current / "LT_Episodes").exists():
        current = current.parent

    episode_dir = current / "LT_Episodes"

    return TutorCore(
        tutor=tutor,
        topic_generator=topic_generator,
        tutor_response_generator=tutor_response_generator,
        word_recommender=word_recommender,
        vocabulary=vocabulary,
        episodes_dir=episode_dir,
    )
