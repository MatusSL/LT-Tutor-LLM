import json
from pathlib import Path


class SessionManager:
    def __init__(self, episodes_dir: Path) -> None:
        self.episodes_dir = episodes_dir

    def get_unlocked_words_from_episodes(self, start: int, end: int) -> set[str]:
        if start == 0:
            start = 1

        unlocked_words: set[str] = set()
        for episode_id in range(start, end + 1):
            try:
                # filename = f"LT_Episodes/Track_{episode_id}.json"
                current_episode = f"Track_{episode_id}.json"
                filename = self.episodes_dir / current_episode

                with open(filename, "r", encoding="utf-8") as file:
                    data = json.load(file)
                    data_unlocked_words = data.get("unlocked_words", [])
                    unlocked_words.update(data_unlocked_words)

            except FileNotFoundError:
                print(f"file not found: {episode_id=}")

        return unlocked_words
