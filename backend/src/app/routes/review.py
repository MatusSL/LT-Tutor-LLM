import random
from typing import List

from fastapi import APIRouter

from app.schemas.api import ReviewDataResponse
from app.schemas.db import MistakeModel

from app.core.build_tutor_core import _tutor_core_instance

router = APIRouter()


def pick_random_n_mistakes(mistakes: List[MistakeModel], n: int) -> List[MistakeModel]:
    if len(mistakes) <= n:
        return mistakes[:]
    return random.sample(mistakes, n)


@router.get("/review", response_model=ReviewDataResponse)
def get_review() -> ReviewDataResponse:
    mistakes = _tutor_core_instance.vocabulary.get_all_mistakes()
    random_mistakes = pick_random_n_mistakes(mistakes=mistakes, n=15)
    review_data = _tutor_core_instance.reviewer.generate_review(mistakes=random_mistakes)
    return ReviewDataResponse(review_data=review_data)
