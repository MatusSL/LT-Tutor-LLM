# Architectural Patterns

Patterns that appear across multiple files in this full-stack project.

## Backend: Dependency Injection via Builder Function

All services are constructed in one place and injected. Nothing self-instantiates.

- Builder: `backend/src/app/core/build_tutor_core.py:49`
- Consumer: `backend/src/app/core/tutor_core.py` — receives all agents via `__init__`
- Wired at startup: `backend/main.py:17` — single global `tutor_core` instance

Pattern: create agents → pass to `TutorCore(tutor=..., topic_generator=..., ...)`.

## Backend: Agent Factory Pattern

All LLM agents (`agents/tutor.py`, `agents/topic_generator.py`, `agents/tutor_response_generator.py`, `agents/word_recommender.py`) follow the same structure:

1. Accept a shared `Runner` + `ChatOllama` model
2. Call `create_agent(model, system_prompt)` from LangChain
3. Implement a public method that calls `self.runner.run_agent(self.agent, prompt)`
4. Retry up to `MAX_RETRIES = 3` on parse failure
5. Return a pre-defined fallback object on total failure

Example: `backend/src/app/agents/tutor_response_generator.py:19`

## Backend: Runner/Executor Wrapper

`backend/src/app/agents/runner.py` wraps LangChain's `agent.invoke()`. All agents call `runner.run_agent()` rather than invoking LangChain directly. This centralizes response extraction (`messages[-1].content`) and exception handling in one place.

## Backend: Orchestrator Pattern

`TutorCore.handle_message()` (`backend/src/app/core/tutor_core.py:34`) is a linear pipeline:

1. Get natural-language reply from `Tutor` agent
2. Append both turns to `session_state.history`
3. Parse the last 2 turns through `TutorResponseGenerator` → structured `TutorResponse`
4. If input was Spanish: run vocabulary analysis, update Firestore + session vocabulary
5. Return `ChatResponse(response, tutor_response)`

## Backend: Pydantic Models as Contract

`backend/src/app/schemas/models.py` defines the shared type contract between agents, services, and API routes. Key types: `TutorResponse`, `ChatResponse`, `Language` (enum), `Correction`, `Topic`. Frontend TypeScript types in `frontend/my-app/services/tutor-api.ts:31` mirror these manually.

## Backend: Firestore Singleton

`backend/src/app/database/firestore.py` initializes Firebase once at import time and exports a module-level `db` client. All services import `db` directly — no connection pooling or factory needed.

- Atomic increments via `firestore.Increment(1)` (vocabulary/mistakes counters)
- `SERVER_TIMESTAMP` for `last_used` fields
- Upsert pattern: `doc_ref.set({...}, merge=True)`

See: `backend/src/app/services/vocabulary.py:22`

## Backend: Prompt-as-String Constants

Each agent has a corresponding prompt module in `backend/src/app/prompts/`. Prompts are plain Python string constants passed to `create_agent(system_prompt=...)`. No templating library — f-strings are used when runtime values (e.g. vocabulary list) must be injected.

Key prompts:
- `conversational_prompt.py` — main tutor persona + vocabulary constraints
- `tutor_response_generator.py` — strict JSON schema instructions for structured output

## Frontend: Typed API Service Layer

All backend calls go through `frontend/my-app/services/tutor-api.ts`. The generic `requestJson<T>` helper (`tutor-api.ts:53`) handles fetch, JSON serialization, and error wrapping. Callers get fully-typed responses.

No state management library — all async results are passed directly into React `useState` setters in `chat.tsx`.

## Frontend: File-Based Routing (Expo Router)

Screen files under `frontend/my-app/app/` map directly to routes:
- `(tabs)/` — tab group rendered by `_layout.tsx`
- Adding a file creates a new route automatically

Navigation between screens uses `router.push()` from `expo-router` (`lectures.tsx:54`).

## Frontend: Setup Flow State Machine

`chat.tsx` models the pre-chat setup as a string-literal state: `"options" | "episode-select" | "chat"` stored in `useState<SetupStep>`. Rendering switches on this value. No router navigation occurs between setup steps — it's all within the single Chat screen.

See: `frontend/my-app/app/(tabs)/chat.tsx:344`