# LT-Tutor-LLM

A bilingual Spanish conversation tutor. The user chats with an LLM that plays the role of a patient tutor: it replies in Spanish at a target CEFR level, detects grammar and vocabulary errors, and structures each session around a short "episode" (a topic with a small unlocked vocabulary set).

Built as a learning project to explore LangChain agent orchestration, multi-model prompting, and a typed Python/React Native stack end-to-end.

## What it does

- **Episode-based learning** — each session is anchored on a topic with a small unlocked vocabulary list, so the conversation has scope.
- **Multi-agent orchestration** — separate LangChain agents handle the tutor reply, error review, topic generation, and vocabulary recommendations. A single orchestrator (`backend/src/app/core/tutor_core.py`) composes them on every user message.
- **Speech in, speech out** — Whisper for STT and OpenAI TTS for spoken tutor replies.
- **Persistence** — vocabulary, episode progress, and session state live in Supabase.

## Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.12, FastAPI, Uvicorn, LangChain |
| LLM | OpenAI (tutor + reviewer); Ollama (Qwen 2.5 / Llama 3.2) supported locally |
| Database | Supabase (Postgres) |
| Frontend | React Native 0.81, Expo 54, TypeScript 5.9, Expo Router |
| Tooling | `uv` (Python), `npm` (JS), `ruff`, ESLint |

## Repo layout

```
backend/
  main.py                     FastAPI app + route definitions
  src/app/
    agents/                   One LangChain agent per task (tutor, reviewer, …)
    core/                     Orchestrator + session state
    database/                 Supabase client
    prompts/                  System prompts
    schemas/                  Pydantic models (shared types)
    services/                 Vocabulary, STT, TTS
frontend/my-app/
  app/(tabs)/                 Tab screens: chat, lectures, review
  services/tutor-api.ts       Typed fetch wrappers mirroring backend schemas
  constants/api.ts            API base URL (env-overridable)
```

## Running locally

### Backend

```bash
cd backend
cp .env.example .env          # fill in OPENAI_API_KEY, SUPABASE_*, API_KEY
uv sync
uvicorn main:app --reload     # http://localhost:8000
```

### Frontend

```bash
cd frontend/my-app
cp .env.example .env.local    # point EXPO_PUBLIC_API_URL at the backend
npm install
npm start                     # then press i / a for iOS / Android
```

## API

All routes are defined in `backend/main.py`. Requests are authenticated with an `X-API-Key` header matching `API_KEY` in the backend `.env`.

| Method | Path | Purpose |
|--------|------|---------|
| GET  | `/health` | Liveness check |
| POST | `/chat` | Send user message, get tutor reply + structured analysis |
| POST | `/episode` | Load episode topics + unlock vocabulary |
| GET  | `/episode/saved` | Resume last completed episode |

Request/response shapes live in `backend/src/app/schemas/models.py` and mirror to the frontend in `frontend/my-app/services/tutor-api.ts`.

## License

MIT — see [LICENSE](LICENSE).
