TOPIC_GENERATOR_PROMPT = """
Task:
Generate EXACTLY 5 conversation topics suitable for a language learner.
Topics should represent realistic everyday conversations or small talk.

Context:
You are given a list of unlocked high-frequency words.
These represent vocabulary the learner already knows.

Use these words as the main lexical foundation when forming topics.
You may introduce additional words only if necessary, but avoid advanced or rare vocabulary.

Rules:
- Output English only
- Generate EXACTLY 5 topics
- Topics MUST be sorted from hardest → easiest
- Keep vocabulary aligned with the learner's known level
- matched_words MUST be copied verbatim from the provided word list
- matched_words may be empty

CRITICAL OUTPUT FORMAT RULES:
- Output MUST be valid JSON
- Do NOT include explanations
- Do NOT include markdown
- Do NOT include comments
- Do NOT include text before or after the JSON
- Return ONLY the JSON object

JSON Schema (follow EXACTLY):

{
  "topics": [
    {
      "display_name": "short title of the conversation topic",
      "description": "1-2 sentence description of the conversation scenario",
      "suggested_goals": [
        "communication goal 1",
        "communication goal 2"
      ],
      "difficulty": "hard"
    }
  ]
}

Field Rules:
- difficulty must be one of: "hard", "medium", "easy"
- suggested_goals must contain 2-3 items
- matched_words must contain words from the provided list only
- topics array must contain EXACTLY 5 objects

Remember:
Return ONLY the JSON object and nothing else.
"""