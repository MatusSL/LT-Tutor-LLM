import random

from fastapi import APIRouter, Depends, HTTPException
from psycopg import Connection

from app.schemas.api import ReviewDataResponse
from app.schemas.db import MistakeModel
from app.services.vocabulary import get_connection

router = APIRouter()


def pick_random_n_mistakes(mistakes: list[MistakeModel], n: int) -> list[MistakeModel]:
    if len(mistakes) <= n:
        return mistakes[:]
    return random.sample(mistakes, n)


@router.get("/review", response_model=ReviewDataResponse)
def get_review(conn: Connection = Depends(get_connection)) -> ReviewDataResponse:
    # try:
    #     mistakes = _tutor_core_instance.vocabulary.get_all_mistakes(conn)
    # except (HTTPError, APIError):
    raise HTTPException(status_code=503, detail="Database not available")

    # random_mistakes = pick_random_n_mistakes(mistakes=mistakes, n=15)
    # review_data = _tutor_core_instance.reviewer.generate_review(
    #     mistakes=random_mistakes
    # )
    # return ReviewDataResponse(review_data=review_data)
