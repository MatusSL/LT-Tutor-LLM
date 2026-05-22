import json
from pathlib import Path

from app.schemas.types import UserScope


class SessionManager:
    def __init__(self, episodes_dir: Path) -> None:
        self.episodes_dir = episodes_dir

    def get_episode_path(self, episode_id: int) -> Path:
        current_episode = f"Track_{episode_id}.json"
        direct_path = self.episodes_dir / current_episode

        if direct_path.exists():
            return direct_path
        return self.episodes_dir / "spanish" / current_episode

    def get_unlocked_words(self, end: int) -> set[str]:
        start = 1
        unlocked_words: set[str] = set()
        for episode_id in range(start, end + 1):
            try:
                filename = self.get_episode_path(episode_id)

                with open(filename, "r", encoding="utf-8") as file:
                    data = json.load(file)
                    data_unlocked_words = data.get("unlocked_words", [])
                    unlocked_words.update(data_unlocked_words)

            except FileNotFoundError:
                print(f"file not found: {episode_id=}")

        return unlocked_words

    def get_unlocked_tenses(self, end: int) -> set[str]:
        unlocked_tenses: set[str] = set()

        start = 1
        for episode_id in range(start, end + 1):
            try:
                filename = self.get_episode_path(episode_id)

                with open(filename, "r", encoding="utf-8") as file:
                    data = json.load(file)
                    data_unlocked_words = data.get("unlocked_tenses", [])
                    unlocked_tenses.update(data_unlocked_words)

            except FileNotFoundError:
                print(f"file not found: {episode_id=}")

        return unlocked_tenses

    def get_unlocked_structures(self, end: int) -> set[str]:
        unlocked_structures: set[str] = set()

        start = 1
        for episode_id in range(start, end + 1):
            try:
                filename = self.get_episode_path(episode_id)

                with open(filename, "r", encoding="utf-8") as file:
                    data = json.load(file)
                    data_unlocked_words = data.get("unlocked_structures", [])
                    unlocked_structures.update(data_unlocked_words)

            except FileNotFoundError:
                print(f"file not found: {episode_id=}")

        return unlocked_structures

    def get_unlocked_scope(self, end: int) -> UserScope:
        structures = self.get_unlocked_structures(end)
        tenses = self.get_unlocked_tenses(end)
        # words = self.get_unlocked_words(end)

        return UserScope(tenses=tenses, structures=structures)
