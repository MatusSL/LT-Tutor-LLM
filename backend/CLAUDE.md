# LT-Tutor-LLM Backend

A FastAPI-based Spanish conversation tutor backend using Ollama LLMs and Firebase Firestore.

## Tech Stack

- **Runtime**: Python 3.12+
- **Web Framework**: FastAPI
- **LLM**: Ollama (Llama 3.2, Qwen 2.5)
- **Database**: Firebase Firestore
- **Task Queue**: LangChain Agents

## Project Structure

```
src/app/
├── agents/       # AI agent implementations (Tutor, TopicGenerator, etc.)
├── core/         # Core orchestrator and session management
├── database/     # Firestore integration
├── prompts/      # LLM prompt templates
├── routes/       # FastAPI endpoint handlers
├── schemas/      # Pydantic models
└── services/     # Utility services (Vocabulary, WordsService)
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
- `Vocabulary`: Firestore operations for word tracking

## Additional Documentation

- [.claude/docs/architectural_patterns.md](.claude/docs/architectural_patterns.md) — Design patterns, dependency injection, error handling patterns, agent structure
- [src/app/schemas/models.py:32](src/app/schemas/models.py:32) — Pydantic model definitions (Topic, ChatResponse, etc.)
- [src/app/core/build_tutor_core.py:58](src/app/core/build_tutor_core.py:58) — Service initialization pattern
- [src/app/database/firestore.py:1](src/app/database/firestore.py:1) — Firestore setup and singleton pattern
- [src/app/prompts/conversational_prompt.py:1](src/app/prompts/conversational_prompt.py:1) — Prompt structure examples
- [src/app/core/tutor_core.py:34](src/app/core/tutor_core.py:34) — Core message handling flow
