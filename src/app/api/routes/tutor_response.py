from fastapi import APIRouter
from app.core.schemas.models import TutorResponse

router = APIRouter(prefix="/tutor", tags=["tutor"])

@router.post("/tutor_response", response_model=TutorResponse)
async def tutor_response() -> TutorResponse:
    ...