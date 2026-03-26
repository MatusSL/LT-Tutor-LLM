from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.agents.topic_generator import TopicGenerator
from app.schemas.models import ChatResponse, UserInput

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

topic_generator = TopicGenerator()


@app.post("/topics", response_model=ChatResponse)
def chat_endpoint(user_input: UserInput):
    # result = tutor.chat(user_sentence=user_input.user_sentence)
    # print(result)
    return result
