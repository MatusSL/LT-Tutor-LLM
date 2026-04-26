# LT-Tutor-LLM: Production-Readiness Roadmap

## Context

LT-Tutor-LLM is a functional prototype: a React Native + FastAPI Spanish tutor with working chat, STT, and review exercises. But under the hood it has the shape of a student project — hardcoded single user (`"matus"`), blocking LLM calls, no chat persistence, zero frontend tests, no CI, no observability. This roadmap turns it into a multi-user, production-grade app in **six staged milestones**. Each milestone is independently shippable, teaches a distinct software-engineering skill area, and the ordering is deliberate: earlier milestones unblock later ones (auth before persistence, async before streaming, tests before refactoring confidently).

The goal is dual: ship real improvements the app genuinely needs, AND build skills a student engineer will use for the rest of their career — auth, async, streaming, algorithms, state management, testing, DevOps, observability.

> **Note on stack**: `CLAUDE.md` says Firestore, but the backend actually uses **Supabase (PostgreSQL)** — see [backend/src/app/database/db.py](backend/src/app/database/db.py) and the Supabase calls in [vocabulary.py:61](backend/src/app/services/vocabulary.py:61). Fix `CLAUDE.md` as part of Milestone 1.

---

## Milestone 1 — Multi-User Auth & Data Model

**Why first**: Every other milestone (persistence, SRS, observability) assumes a real `user_id`. The hardcoded `"matus"` is the single biggest architectural blocker.

**Skills learned**: JWT auth, Supabase Row-Level Security (RLS), FastAPI dependencies, secure password handling, foreign keys, data migrations.

**Changes**:
- Add `users.email`, `users.password_hash` (bcrypt via `passlib`) to [db.py](backend/src/app/database/db.py)
- Add `user_id` FK to `words` and `mistakes`; backfill all existing rows to current `"matus"` user
- New endpoints in [main.py](backend/main.py): `POST /auth/signup`, `POST /auth/login` → returns JWT
- Replace `verify_api_key` in [dependencies.py:9](backend/src/app/dependencies.py:9) with `get_current_user` that decodes JWT and returns `UserModel`
- Thread `user_id` through [tutor_core.py](backend/src/app/core/tutor_core.py), [vocabulary.py:61](backend/src/app/services/vocabulary.py:61), and `SessionState` ([session_state.py:10](backend/src/app/core/session_state.py:10))
- Enable Supabase RLS policies so each user only reads/writes their own rows
- Frontend: login/signup screens under `app/(auth)/`, store JWT via `expo-secure-store`, attach `Authorization: Bearer` in [tutor-api.ts:119](frontend/my-app/services/tutor-api.ts:119)

**Verify**: Sign up two users, each accumulates separate vocab. Attempt cross-user read via direct Supabase query → RLS blocks it. Unit tests for JWT issue/verify; integration test for protected routes returning 401 without token.

---

## Milestone 2 — Async Backend + Streaming LLM Responses (SSE)

**Why second**: Requires user context (M1) to stream per-session. Unlocks a dramatic UX win — tokens appear as the LLM generates them instead of a 3–5s blank wait.

**Skills learned**: `async`/`await` in Python, FastAPI async routes, Server-Sent Events, LangChain async streaming, AbortController, React streaming UI.

**Changes**:
- Convert `TutorCore.handle_message()` ([tutor_core.py:34](backend/src/app/core/tutor_core.py:34)) and all agent `invoke()` calls to `async`; use `ainvoke` / `astream` in [tutor.py:17](backend/src/app/agents/tutor.py:17)
- Replace `POST /chat` with `POST /chat/stream` returning `text/event-stream`; emit `{type: "token"}`, `{type: "correction"}`, `{type: "done"}` frames
- Keep `POST /chat` for backward compat during migration
- Wrap Supabase vocabulary writes in async executor (Supabase-py is sync) — document the bridge pattern
- Add `tenacity`-based retry decorator with exponential backoff around LLM calls (replaces the hand-rolled try/except at [tutor.py:26](backend/src/app/agents/tutor.py:26))
- Frontend: swap `fetch` in [tutor-api.ts](frontend/my-app/services/tutor-api.ts) for `EventSource` polyfill (`react-native-sse`); render tokens incrementally in [chat.tsx](frontend/my-app/app/(tabs)/chat.tsx); add cancel-on-unmount via `AbortController`

**Verify**: Load test with 5 concurrent users — response start latency should drop from ~3s to <500ms. Kill network mid-stream, confirm graceful error. Unit tests with async LangChain mocks.

---

## Milestone 3 — Spaced Repetition System (SRS)

**Why third**: The review screens ([app/review/](frontend/my-app/app/review/)) currently show flat decks — every word equally often. Real language apps (Anki, Duolingo) use SRS so users review *about-to-forget* cards. This is the single biggest learning-outcome improvement.

**Skills learned**: Algorithm implementation (SM-2 or FSRS), database schema design, queue ordering, scheduled background work.

**Changes**:
- New table `review_schedule(user_id, word_id, due_at, ease_factor, interval_days, repetitions, last_reviewed)` — one row per (user, word)
- Implement **SM-2** first (simpler, ~30 lines) in new `backend/src/app/services/srs.py`; leave a TODO to migrate to FSRS later
- New endpoints: `GET /review/due` (words due today, sorted by overdue-ness), `POST /review/grade` (user rates recall 0–5, schedule updates)
- Modify flashcard/phrase-quiz screens to pull from `/review/due` and POST grades on swipe
- Seed schedule rows automatically when a word is first added via [vocabulary.py](backend/src/app/services/vocabulary.py)

**Verify**: Unit tests for SM-2 edge cases (first review, lapse resets interval, ease-factor floor of 1.3). Integration test: grade a card as "hard" → `due_at` is sooner than "easy". Run locally for a day, confirm the right cards resurface.

---

## Milestone 4 — Persistence & Offline-First Frontend

**Why fourth**: With M1+M2+M3 shipped, the data is valuable — losing chat history on app close is now unacceptable.

**Skills learned**: Client state management (Zustand), persistent storage, optimistic UI, offline queue + sync, React error boundaries.

**Changes**:
- Add `zustand` + `zustand/middleware/persist` backed by `@react-native-async-storage/async-storage`
- New stores: `useChatStore` (messages, activeEpisode), `useAuthStore` (JWT, user), `useReviewStore` (in-progress session)
- Replace the 12+ `useState` calls in [chat.tsx:46](frontend/my-app/app/(tabs)/chat.tsx:46) with store selectors — major cleanup
- Offline queue: if `/chat/stream` fails, push message to `pendingMessages[]`; flush on reconnect via `@react-native-community/netinfo` listener
- Top-level `ErrorBoundary` in [_layout.tsx](frontend/my-app/app/_layout.tsx) rendering a reset-button fallback
- Delete the duplicated `C` color objects across screens — use [constants/colors.ts](frontend/my-app/constants/colors.ts) everywhere

**Verify**: Force-quit app mid-chat, reopen → history restored. Airplane mode → messages queue visibly, send on reconnect. Throw from a screen → ErrorBoundary catches instead of white-screen crash.

---

## Milestone 5 — Test Pyramid + CI/CD

**Why fifth**: Now that the app has real surface area, further changes need a safety net. Doing this after M1–M4 means the tests cover the *final* shape, not throwaway code.

**Skills learned**: Testing strategy (pyramid: unit → integration → E2E), FastAPI `TestClient`, Jest + React Native Testing Library, GitHub Actions, pre-commit hooks.

**Changes**:
- **Backend integration tests**: new `backend/tests/test_routes.py` using `TestClient` — cover `/auth/*`, `/chat/stream` (happy + LLM failure), `/review/due`, `/review/grade`. Use a test Supabase project or `supabase-py` mocks.
- **Frontend tests**: add `jest`, `jest-expo`, `@testing-library/react-native`. Cover the API layer in [tutor-api.ts](frontend/my-app/services/tutor-api.ts), store reducers, and one critical screen (chat.tsx smoke test).
- **GitHub Actions** `.github/workflows/ci.yml`: on PR run `ruff check`, `uv run python -m unittest`, `npm run lint`, `npm test`. Block merge on failure.
- **Pre-commit**: `.pre-commit-config.yaml` with `ruff format`, `ruff check`, `eslint --fix`.

**Verify**: Open a PR with a deliberate lint error → CI blocks. Coverage report shows >70% on new backend routes.

---

## Milestone 6 — Observability & LLM Eval Harness

**Why last**: Observability has highest leverage once the system is complex enough that you can't reason about it by reading code.

**Skills learned**: Structured logging, distributed tracing (OpenTelemetry), metrics (Prometheus), LLM evaluation methodology.

**Changes**:
- Replace `print`/`logger.info` calls with **structured JSON logging** via `structlog` — one logger factory in `backend/src/app/core/logging.py`, bind `user_id` + `request_id` per request via FastAPI middleware
- **OpenTelemetry** auto-instrumentation for FastAPI + manual spans around each agent call in [tutor_core.py](backend/src/app/core/tutor_core.py); export to local Jaeger via Docker Compose for dev
- `/metrics` endpoint exposing Prometheus counters: `llm_calls_total{agent,status}`, `llm_latency_seconds`, `vocabulary_updates_total`
- **LLM eval harness**: new `backend/evals/` with a golden dataset of ~50 Spanish sentences + expected error detections; script runs Tutor+Reviewer agents against it and reports precision/recall. Run in CI nightly, not on every PR.

**Verify**: Open Jaeger, see a trace for one chat request spanning TutorCore → TutorAgent → ReviewerAgent → vocabulary write. Hit `/metrics`, confirm counters increment. Run eval harness, see a score; intentionally regress a prompt, watch score drop.

---

## Execution Notes

- **Each milestone is ~1–2 weeks of student-pace work.** Merge each to `main` before starting the next so improvements ship incrementally.
- **Fix `CLAUDE.md`** in Milestone 1: update the Firestore → Supabase reference, and note any new endpoints/commands as they land.
- **Keep a learning journal** (`docs/journal.md`) — one paragraph per milestone on what clicked, what was hard, what you'd do differently. This is where the actual skill growth gets consolidated.
- **Don't skip ahead.** The ordering trades short-term speed for long-term clarity; e.g., it's tempting to do streaming before auth, but then you rewrite streaming once user context is threaded through.

## Critical Files to Touch

| Milestone | Primary files |
|---|---|
| M1 Auth | [dependencies.py:9](backend/src/app/dependencies.py:9), [db.py](backend/src/app/database/db.py), [vocabulary.py:61](backend/src/app/services/vocabulary.py:61), [session_state.py:10](backend/src/app/core/session_state.py:10), [tutor-api.ts:119](frontend/my-app/services/tutor-api.ts:119), new `app/(auth)/` |
| M2 Streaming | [tutor_core.py:34](backend/src/app/core/tutor_core.py:34), [tutor.py:17](backend/src/app/agents/tutor.py:17), [main.py](backend/main.py), [chat.tsx](frontend/my-app/app/(tabs)/chat.tsx), [tutor-api.ts](frontend/my-app/services/tutor-api.ts) |
| M3 SRS | new `backend/src/app/services/srs.py`, [db.py](backend/src/app/database/db.py), [app/review/](frontend/my-app/app/review/) |
| M4 Persistence | [chat.tsx:46](frontend/my-app/app/(tabs)/chat.tsx:46), [_layout.tsx](frontend/my-app/app/_layout.tsx), new `frontend/my-app/stores/`, [colors.ts](frontend/my-app/constants/colors.ts) |
| M5 Tests/CI | new `backend/tests/test_routes.py`, new `frontend/my-app/__tests__/`, new `.github/workflows/ci.yml`, `.pre-commit-config.yaml` |
| M6 Observability | new `backend/src/app/core/logging.py`, [tutor_core.py](backend/src/app/core/tutor_core.py), [main.py](backend/main.py), new `backend/evals/` |
