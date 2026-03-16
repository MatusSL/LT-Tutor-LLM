import json
import re

from app.agents.runner import Runner

from langchain.agents import create_agent
from langchain_ollama import ChatOllama

from app.domain.schemas.models import QWEN_MODEL, HighFrequencyWords
from app.prompts.word_recommender_prompt import HIGH_FREQUENCY_FILTER_PROMPT

from app.services.words_service import insert_all_words

high_freq_words_fallback = HighFrequencyWords(high_frequency_words=[])


class WordRecommender:
    def __init__(self) -> None:

        self.agent = create_agent(
            model=ChatOllama(model=QWEN_MODEL),
            system_prompt=HIGH_FREQUENCY_FILTER_PROMPT,
        )

        self.runner = Runner()

    def get_unlocked_words_from_episodes(self, last: int) -> set[str]:
        unlocked_words: set[str] = set()

        for episode_id in range(1, last + 1):
            try:
                filename = f"LT_Episodes/Track_{episode_id}.json"
                with open(filename, "r", encoding="utf-8") as file:
                    data = json.load(file)
                    data_unlocked_words = data.get("unlocked_words", [])
                    unlocked_words.update(data_unlocked_words)

            except FileNotFoundError:
                print(f"file not found: {episode_id=}")

        insert_all_words(unlocked_words)
        return unlocked_words

    def get_high_frequency_words_from_vocabulary(
        self, last_episode: int
    ) -> HighFrequencyWords:

        unlocked_words = self.get_unlocked_words_from_episodes(last_episode)
        formatted_unlocked_words = "\n".join(unlocked_words)

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

        raise ValueError("Model did not return valid Topics JSON")
