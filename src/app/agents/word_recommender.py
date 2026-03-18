import re

from app.agents.runner import Runner

from langchain.agents import create_agent
from langchain_ollama import ChatOllama

from app.schemas.models import QWEN_MODEL, HighFrequencyWords
from app.prompts.word_recommender_prompt import HIGH_FREQUENCY_FILTER_PROMPT

high_freq_words_fallback = HighFrequencyWords(high_frequency_words=[])


class WordRecommender:
    def __init__(self, runner: Runner) -> None:

        self.agent = create_agent(
            model=ChatOllama(model=QWEN_MODEL, temperature=0.15),
            system_prompt=HIGH_FREQUENCY_FILTER_PROMPT,
        )

        self.runner = runner

    def get_high_frequency_words_from_vocabulary(
        self, words: set[str]
    ) -> HighFrequencyWords:

        formatted_unlocked_words = "\n".join(words)

        MAX_RETRIES = 3
        for attempt in range(MAX_RETRIES):
            response = self.runner.run_agent(self.agent, formatted_unlocked_words)
            try:
                high_freq_words = self.parse_response(response)
                return high_freq_words

            except Exception:
                if attempt == MAX_RETRIES - 1:
                    pass

        return high_freq_words_fallback

    def parse_response(self, response_text: str) -> HighFrequencyWords:
        try:
            return HighFrequencyWords.model_validate_json(response_text)
        except Exception:
            pass

        match = re.search(r"\{.*\}", response_text, re.DOTALL)
        if match:
            try:
                return HighFrequencyWords.model_validate_json(match.group(0))
            except Exception:
                pass

        # ! Unhandled Exception
        raise ValueError("Model did not return valid Topics JSON")
