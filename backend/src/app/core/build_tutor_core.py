import os
from pathlib import Path
from dotenv import load_dotenv
from pydantic import SecretStr

from langchain_openai import ChatOpenAI

from app.agents.opener import Opener
from app.agents.review_builder import ReviewBuilder
from app.agents.tutor import Tutor

from app.core.tutor_core import TutorCore

from app.schemas.constants import CoreServices
from app.schemas.api import Mode

from app.services.vocabulary import Vocabulary
from app.services.language_detector import LanguageDetector
from app.services.reviewer import Reviewer

load_dotenv()

raw_api_key = os.getenv("OPENAI_API_KEY")
API_KEY = SecretStr(raw_api_key) if raw_api_key else None

LLM_BASE_URL = os.getenv("LLM_BASE_URL", "http://localhost:1234/v1")
LLM_API_KEY = SecretStr(os.getenv("LLM_API_KEY", "lm-studio"))
LLM_MODEL = os.getenv("LLM_MODEL", "google/gemma-3-12b")

MODELS = {
    "lt": {"tutor": "gpt-5.4-mini", "reviewer": "gpt-5.4-nano"},
    "conversation": {"tutor": "gpt-5.4-mini", "reviewer": "gpt-5.4-nano"},
}

MODE: Mode = "conversation"

# TUTOR_MODEL = ChatOpenAI(model=MODELS[MODE]["tutor"], api_key=API_KEY)
REVIEWER_MODEL = ChatOpenAI(model=MODELS[MODE]["reviewer"], api_key=API_KEY)

TUTOR_MODEL = ChatOpenAI(
    base_url=LLM_BASE_URL,
    api_key=LLM_API_KEY,
    model=LLM_MODEL,
    temperature=1.0,
)

# REVIEWER_MODEL = ChatOpenAI(
#     base_url="http://localhost:1234/v1",
#     api_key=SecretStr("lm-studio"),
#     model="openai/gpt-oss-20b",
#     temperature=1.0,
# )


def resolve_episode_dir() -> Path:
    current = Path(__file__).resolve()
    while not (current / "LT_Episodes").exists():
        current = current.parent

    episode_dir = current / "LT_Episodes"
    return episode_dir


def build_tutor_core() -> TutorCore:
    tutor = Tutor(model=TUTOR_MODEL)
    opener = Opener(model=TUTOR_MODEL)

    reviewer = Reviewer()
    language_detector = LanguageDetector()
    review_builder = ReviewBuilder(model=REVIEWER_MODEL)

    vocabulary = Vocabulary()
    episode_dir = resolve_episode_dir()

    core_services = CoreServices(
        tutor=tutor,
        review_builder=review_builder,
        vocabulary=vocabulary,
        episodes_dir=episode_dir,
        opener=opener,
        language_detector=language_detector,
        reviewer=reviewer,
    )

    return TutorCore(core_services=core_services)


_tutor_core_instance: TutorCore = build_tutor_core()
