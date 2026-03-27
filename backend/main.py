from fastapi import FastAPI, WebSocket, WebSocketDisconnect
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


def build_episode_response(active_tutor_core, episode: int) -> EpisodeResponse:
    unlocked_words = active_tutor_core.session_manager.get_unlocked_words_from_episodes(
        1, episode
    )
    active_tutor_core.session_state.vocabulary = unlocked_words

    high_frequency_words = (
        active_tutor_core.word_recommender.get_high_frequency_words_from_vocabulary(
            unlocked_words
        )
    )
    topics = active_tutor_core.topic_generator.suggest_topics_for_vocabulary(
        high_frequency_words.high_frequency_words
    )

    return EpisodeResponse(status="ok", episode=episode, topics=topics)


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    socket_tutor_core = build_tutor_core()

    try:
        while True:
            payload = await websocket.receive_json()
            message_type = payload.get("type")

            if message_type == "set_episode":
                episode = payload.get("episode")

                if not isinstance(episode, int):
                    await websocket.send_json(
                        {"type": "error", "message": "Episode must be an integer."}
                    )
                    continue

                episode_response = build_episode_response(socket_tutor_core, episode)
                await websocket.send_json(
                    {"type": "episode_topics", **episode_response.model_dump(mode="json")}
                )
                continue
 
            if message_type == "chat":
                user_sentence = payload.get("user_sentence")

                if not isinstance(user_sentence, str) or not user_sentence.strip():
                    await websocket.send_json(
                        {"type": "error", "message": "Message text is required."}
                    )
                    continue

                result = socket_tutor_core.handle_message(user_input=user_sentence)
                await websocket.send_json(
                    {"type": "chat_response", "data": result.model_dump(mode="json")}
                )
                continue

            await websocket.send_json(
                {"type": "error", "message": "Unsupported websocket message type."}
            )
    except WebSocketDisconnect:
        return
