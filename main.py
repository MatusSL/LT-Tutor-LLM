from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.agents.tutor import Tutor
from app.domain.schemas.models import ChatResponse, Topics, UserInput

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

tutor = Tutor()


@app.post("/chat", response_model=ChatResponse)
def chat_endpoint(user_input: UserInput):
    result = tutor.chat(user_sentence=user_input.user_sentence)
    print(result)
    return result


class EpisodeRequest(BaseModel):
    episode: int


class EpisodeResponse(BaseModel):
    status: str
    episode: int
    topics: Topics


@app.post("/episodes", response_model=EpisodeResponse)
async def save_episode(data: EpisodeRequest):
    episode = data.episode
    words = tutor.word_recommender.get_high_frequency_words_from_vocabulary(episode)
    topics = tutor.topic_generator.suggest_topics_for_vocabulary(
        words.high_frequency_words
    )

    return EpisodeResponse(status="ok", episode=episode, topics=topics)
