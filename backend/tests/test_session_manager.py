import json
from pathlib import Path

from app.core.session_manager import SessionManager


def write_episode(directory: Path, episode_id: int, words: list[str]) -> None:
    data = {
        "id": episode_id,
        "unlocked_words": words,
        "unlocked_tenses": ["present"],
    }
    (directory / f"Track_{episode_id}.json").write_text(
        json.dumps(data), encoding="utf-8"
    )


class TestGetEpisodePath:
    def test_returns_direct_path_when_file_exists(self, tmp_path):
        write_episode(tmp_path, 1, [])
        sm = SessionManager(tmp_path)
        path = sm.get_episode_path(1)
        assert path == tmp_path / "Track_1.json"

    def test_falls_back_to_spanish_subdirectory(self, tmp_path):
        spanish_dir = tmp_path / "spanish"
        spanish_dir.mkdir()
        write_episode(spanish_dir, 2, [])
        sm = SessionManager(tmp_path)
        path = sm.get_episode_path(2)
        assert path == spanish_dir / "Track_2.json"

    def test_direct_path_takes_precedence_over_spanish_subdir(self, tmp_path):
        spanish_dir = tmp_path / "spanish"
        spanish_dir.mkdir()
        write_episode(tmp_path, 3, ["from_root"])
        write_episode(spanish_dir, 3, ["from_spanish"])
        sm = SessionManager(tmp_path)
        path = sm.get_episode_path(3)
        assert path == tmp_path / "Track_3.json"


class TestGetUnlockedWords:
    def test_returns_words_from_single_episode(self, tmp_path):
        write_episode(tmp_path, 1, ["hola", "amigo"])
        sm = SessionManager(tmp_path)
        words = sm.get_unlocked_words(1)
        assert words == {"hola", "amigo"}

    def test_aggregates_words_across_multiple_episodes(self, tmp_path):
        write_episode(tmp_path, 1, ["hola"])
        write_episode(tmp_path, 2, ["amigo"])
        write_episode(tmp_path, 3, ["gracias"])
        sm = SessionManager(tmp_path)
        words = sm.get_unlocked_words(3)
        assert words == {"hola", "amigo", "gracias"}

    def test_deduplicates_words_across_episodes(self, tmp_path):
        write_episode(tmp_path, 1, ["hola", "yo"])
        write_episode(tmp_path, 2, ["yo", "tu"])
        sm = SessionManager(tmp_path)
        words = sm.get_unlocked_words(2)
        assert words == {"hola", "yo", "tu"}

    def test_skips_missing_episode_files_gracefully(self, tmp_path):
        write_episode(tmp_path, 1, ["hola"])
        write_episode(tmp_path, 3, ["gracias"])
        sm = SessionManager(tmp_path)
        words = sm.get_unlocked_words(3)
        assert "hola" in words
        assert "gracias" in words

    def test_start_zero_treated_as_start_one(self, tmp_path):
        write_episode(tmp_path, 1, ["primero"])
        sm = SessionManager(tmp_path)
        words = sm.get_unlocked_words(1)
        assert "primero" in words

    def test_returns_empty_set_when_no_episodes_found(self, tmp_path):
        sm = SessionManager(tmp_path)
        words = sm.get_unlocked_words(5)
        assert words == set()

    def test_episode_with_no_unlocked_words_contributes_nothing(self, tmp_path):
        write_episode(tmp_path, 1, [])
        write_episode(tmp_path, 2, ["hola"])
        sm = SessionManager(tmp_path)
        words = sm.get_unlocked_words(2)
        assert words == {"hola"}
