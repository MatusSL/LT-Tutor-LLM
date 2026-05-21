from pathlib import Path

from langchain_openai import ChatOpenAI

from app.agents.opener import Opener
from app.agents.reviewer import Reviewer
from app.agents.tutor import Tutor

from app.core.tutor_core import TutorCore

from app.schemas.constants import CoreServices
from app.services.vocabulary import Vocabulary

import os
from dotenv import load_dotenv
from pydantic import SecretStr

load_dotenv()

raw_api_key = os.getenv("OPENAI_API_KEY")
API_KEY = SecretStr(raw_api_key) if raw_api_key else None

MODELS = {
      "conversation": {"tutor": "gpt-5.4-mini", "reviewer": "gpt-5.4-nano"},
      "lt":           {"tutor": "gpt-5.4-mini", "reviewer": "gpt-5.4-nano"},
}

TUTOR_MODEL = ChatOpenAI(model=MODELS["conversation"]["tutor"], api_key=API_KEY)
REVIEWER_MODEL = ChatOpenAI(model=MODELS["conversation"]["reviewer"], api_key=API_KEY)


def resolve_episode_dir() -> Path:
    current = Path(__file__).resolve()
    while not (current / "LT_Episodes").exists():
        current = current.parent

    episode_dir = current / "LT_Episodes"
    return episode_dir


def build_tutor_core() -> TutorCore:
    tutor = Tutor(model=TUTOR_MODEL)
    reviewer = Reviewer(model=REVIEWER_MODEL)
    opener = Opener(model=TUTOR_MODEL)
    vocabulary = Vocabulary()
    episode_dir = resolve_episode_dir()

    core_services = CoreServices(
        tutor=tutor,
        reviewer=reviewer,
        vocabulary=vocabulary,
        episodes_dir=episode_dir,
        opener=opener,
    )

    return TutorCore(core_services=core_services)


_tutor_core_instance: TutorCore = build_tutor_core()
