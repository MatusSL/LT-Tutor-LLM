from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi import Request
from fastapi.responses import JSONResponse

from app.dependencies import verify_api_key

import os
import logging

from app.routes import chat, episode, health, review

log_level = os.getenv("LOG_LEVEL", "DEBUG").upper()
logging.basicConfig(
    level=getattr(logging, log_level),
    format="%(asctime)s %(levelname)s %(name)s - %(message)s",
)


for _noisy in (
    "httpcore",
    "httpx",
    "hpack",
    "openai",
    "python_multipart",
    "asyncio",
    "faster_whisper",
    "language_tool_python",
    "urllib3"
):
    logging.getLogger(_noisy).setLevel(logging.WARNING)

logger = logging.getLogger(__name__)


app = FastAPI()


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.error("Unhandled exception", exc_info=exc)
    return JSONResponse(
        status_code=500, content={"detail": "An unexpected error occurred."}
    )


_auth = [Depends(verify_api_key)]

app.include_router(health.router)
app.include_router(chat.router, dependencies=_auth)
app.include_router(review.router, dependencies=_auth)
app.include_router(episode.router, dependencies=_auth)


if __name__ == "__main__":
    import uvicorn
    # uv run uvicorn main:app --host 100.85.107.73 --port 8000 --reload
    uvicorn.run(app=app, host="100.85.107.73", port=8000)
