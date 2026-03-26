# Architectural Patterns & Design Decisions

## Dependency Injection

The codebase uses explicit dependency injection in service initialization (`build_tutor_core.py`):

- Services are instantiated with injected dependencies rather than self-instantiation
- Pattern: Create all agents/services, then pass to the core orchestrator

Example:
- `TutorCore.__init__` receives `tutor`, `topic_generator`, `tutor_response_generator`, `word_recommender`, `vocabulary`

## Agent Factory Pattern

Each agent follows the same structure:
1. Accepts a `Runner` (serialization layer) and `ChatOllama` model
2. Creates an agent using `create_agent(model=model, system_prompt=...)`
3. Uses the same error-handling pattern with retries and fallbacks

## Agent Components

- **Tutor**: Main conversation agent using `CONVERSATIONAL_PROMPT`
- **TopicGenerator**: Generates topic suggestions from vocabulary
- **TutorResponseGenerator**: Analyzes learner input and provides corrections
- **WordRecommender**: Filters vocabulary to high-frequency words

All agents implement:
- Retry logic (MAX_RETRIES = 3)
- JSON parsing with regex fallback for malformed responses
- Fallback responses for all failure cases

## Error Handling Patterns

1. **Try-except with fallback**: All agent calls wrap response parsing
2. **Retry loops**: `for attempt in range(MAX_RETRIES)` pattern
3. **Fallback objects**: Pre-defined fallback responses (e.g., `topics_fallback`)

## Session Management

Uses dataclass-based state (`SessionState`) with:
- Vocabulary set
- Conversation history list
- Current language state
- Episode directory reference

## Firestore Integration

Direct Firestore client in `app/database/firestore.py`:
- Singleton pattern with class-level `db` reference
- Uses `Increment` for atomic counters
- SERVER_TIMESTAMP for automatic updates

## Schema Organization

Pydantic models in `app/schemas/models.py`:
- Type aliases for LLM response structures
- Enums for language detection
- Nested models for structured AI responses

## Core Orchestrator

`TutorCore.handle_message()` flow:
1. Get tutor reply with history and vocabulary
2. Update session state history
3. Generate structured JSON response
4. Analyze for errors and misused words
5. Update vocabulary with verified new words
6. Return ChatResponse

## Prompt Engineering

Prompts stored as string constants:
- Strict output format requirements
- System role instructions
- Schema validation instructions
- Few-shot examples where applicable
