from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.core.build_tutor_core import build_tutor_core
from app.schemas.models import ChatResponse, Topics, UserInput

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

tutor_core = build_tutor_core()
# tutor_core.handle_message("Hola")
@app.post("/chat", response_model=ChatResponse)
def chat_endpoint(user_input: UserInput):
    result = tutor_core.handle_message(user_input=user_input.user_sentence)
    print(f"\nCHAT RESPONSE: --------{result}\n")
    return result



class EpisodeRequest(BaseModel):
    episode: int


class EpisodeResponse(BaseModel):
    status: str
    episode: int
    topics: Topics


# @app.post("/episodes", response_model=EpisodeResponse)
# async def save_episode(data: EpisodeRequest):
#     episode = data.episode
#     words = tutor.word_recommender.get_high_frequency_words_from_vocabulary(episode)
#     topics = tutor.topic_generator.suggest_topics_for_vocabulary(
#         words.high_frequency_words
#     )

#     return EpisodeResponse(status="ok", episode=episode, topics=topics)
