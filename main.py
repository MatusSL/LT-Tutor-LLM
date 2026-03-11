from fastapi import FastAPI

from app.agents.tutor import Tutor
from app.domain.schemas.models import ChatResponse, UserInput


app = FastAPI()
tutor = Tutor()


@app.post("/chat", response_model=ChatResponse)
def chat_endpoint(user_input: UserInput):
    result = tutor.chat(user_sentence=user_input.user_sentence)
    print(result)
    return result
