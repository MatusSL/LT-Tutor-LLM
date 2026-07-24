import logging
import os

from app.dependencies import verify_api_key
from app.routes import chat, episode, health, review
from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

log_level = os.getenv("LOG_LEVEL", "DEBUG").upper()
logging.basicConfig(
    level=getattr(logging, log_level),
    format="%(asctime)s %(levelname)s %(name)s - %(message)s",
)

_noise = [
    "httpcore",
    "httpx",
    "hpack",
    "openai",
    "python_multipart",
    "asyncio",
    "faster_whisper",
    "language_tool_python",
    "urllib3",
]

for _noisy in _noise:
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
    import os

    import uvicorn

    host = os.getenv("APP_HOST", "0.0.0.0")
    port = int(os.getenv("APP_PORT", "8000"))
    uvicorn.run(app=app, host=host, port=port)
