# LT-Tutor-LLM Backend

A FastAPI-based Spanish conversation tutor backend using Ollama LLMs and Supabase.

## Tech Stack

- **Runtime**: Python 3.12+
- **Web Framework**: FastAPI
- **LLM**: Ollama (Llama 3.2, Qwen 2.5)
- **Database**: Supabase (PostgreSQL via postgrest)
- **Task Queue**: LangChain Agents

## Project Structure

```
src/app/
├── agents/       # AI agent implementations (Tutor, Reviewer, TopicGenerator, WordRecommender)
├── core/         # Core orchestrator and session management
├── database/     # Supabase client setup
├── prompts/      # LLM prompt templates
├── routes/       # FastAPI endpoint handlers
├── schemas/      # Pydantic models
└── services/     # Utility services (Vocabulary, STT, TTS)
```

## Essential Commands

```bash
# Install dependencies
uv sync

# Run the server
uvicorn main:app --reload

# Run tests
python -m unittest tests/

# Lint code
ruff check src/
```

## Core Architecture

- `build_tutor_core.py`: Initializes all agents with models
- `TutorCore`: Orchestrates the conversation flow
- `SessionState`: Manages per-user state (history, vocabulary)
- `Vocabulary`: Supabase operations for word tracking

## Additional Documentation

- [.claude/docs/architectural_patterns.md](.claude/docs/architectural_patterns.md) — Design patterns, dependency injection, error handling patterns, agent structure
- [src/app/schemas/models.py:32](src/app/schemas/models.py:32) — Pydantic model definitions (Topic, ChatResponse, etc.)
- [src/app/core/build_tutor_core.py:58](src/app/core/build_tutor_core.py:58) — Service initialization pattern
- [src/app/database/supabase_setup.py:1](src/app/database/supabase_setup.py:1) — Supabase client setup and singleton pattern
- [src/app/core/tutor_core.py:34](src/app/core/tutor_core.py:34) — Core message handling flow
