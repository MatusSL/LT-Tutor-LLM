# LT-Tutor-LLM

A bilingual Spanish conversation tutor. Users practice Spanish with an LLM that tracks vocabulary, detects errors, and structures learning around episodes.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.12, FastAPI, Uvicorn |
| LLM | Ollama (Qwen 2.5, Llama 3.2) via LangChain |
| Database | Firebase Firestore |
| Frontend | React Native 0.81, Expo 54, TypeScript 5.9 |
| Navigation | Expo Router (file-based) |
| BE Package Manager | `uv` + `pyproject.toml` |
| FE Package Manager | npm |

## Key Directories

```
backend/
├── main.py                    # FastAPI app + all route definitions
├── src/app/
│   ├── agents/                # LangChain agent wrappers (one per task)
│   ├── core/                  # Orchestrator + session state
│   ├── database/              # Firestore singleton client
│   ├── prompts/               # LLM system prompt strings
│   ├── schemas/               # Pydantic models (shared types)
│   └── services/              # Vocabulary DB operations
└── .claude/                   # Backend-specific docs

frontend/my-app/
├── app/
│   ├── _layout.tsx            # Root layout (ThemeProvider, Stack)
│   └── (tabs)/                # Tab screens: index, chat, lectures, review
├── services/tutor-api.ts      # Typed fetch wrappers for backend
└── constants/api.ts           # API base URL (env override supported)
```

## Essential Commands

**Backend** (run from `backend/`):
```bash
uv sync                          # Install dependencies
uvicorn main:app --reload        # Dev server (default port 8000)
python -m unittest tests/        # Run tests
ruff check src/                  # Lint
```

**Frontend** (run from `frontend/my-app/`):
```bash
npm install                      # Install dependencies
npm start                        # Expo dev server
npm run ios / npm run android    # Run on simulator
npm run lint                     # ESLint
```

**API URL**: Set `EXPO_PUBLIC_API_URL` in `frontend/my-app/.env.local` to override the default (`constants/api.ts:6`).

## API Surface

All routes defined in `backend/main.py`:

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Liveness check |
| POST | `/chat` | Send user message, get tutor reply + structured analysis |
| POST | `/episode` | Load episode topics + unlock vocabulary |
| GET | `/episode/saved` | Resume last completed episode |

Request/response types: `backend/src/app/schemas/models.py`
Frontend types mirror them: `frontend/my-app/services/tutor-api.ts:31`

## Key Entry Points

- Backend orchestration: `backend/src/app/core/tutor_core.py:34` — `handle_message()` flow
- Service wiring: `backend/src/app/core/build_tutor_core.py:49`
- Chat screen (main UI): `frontend/my-app/app/(tabs)/chat.tsx`
- Episode selection: `frontend/my-app/app/(tabs)/lectures.tsx`

## Additional Documentation

- [.claude/docs/architectural_patterns.md](.claude/docs/architectural_patterns.md) — Agent factory, DI, orchestrator flow, Firestore patterns, frontend state
- [backend/CLAUDE.md](backend/CLAUDE.md) — Backend-specific commands and architecture detail
- [backend/.claude/docs/architectural_patterns.md](backend/.claude/docs/architectural_patterns.md) — Backend-specific patterns (prompt engineering, retry logic)
