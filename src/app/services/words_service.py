from google.cloud.firestore_v1 import Increment, SERVER_TIMESTAMP, FieldFilter
from datetime import datetime, timezone, timedelta
from typing import Any

from app.database.firestore import db

UNLOCKED_WORDS = "unlocked_words"


def insert_word(word: str) -> None:
    if word == "" or word is None:
        return

    doc_ref = db.collection(UNLOCKED_WORDS).document(word)
    doc = doc_ref.get()

    exists = getattr(doc, "exists", False)

    if exists:
        doc_ref.update({"last_used": SERVER_TIMESTAMP, "times_used": Increment(1)})

    else:
        doc_ref.set(
            {
                "word": word,
                "last_used": SERVER_TIMESTAMP,
                "times_used": 1,
                "mistakes": 0,
                "is_high_frequency_word": False,
            }
        )


def insert_all_words(words: set[str]):
    for word in words:
        insert_word(word)


def update_misused_words(misused_words: set[str]) -> None:
    if len(misused_words) == 0:
        return

    collection = db.collection(UNLOCKED_WORDS)

    for misused_word in misused_words:
        if misused_word == "":
            continue

        doc_ref = collection.document(misused_word)
        doc = doc_ref.get()

        exists = getattr(doc, "exists", False)
        if not exists:
            continue

        doc_ref.update(
            {
                "last_used": SERVER_TIMESTAMP,
                "times_used": Increment(1),
                "mistakes": Increment(1),
            }
        )


def update_high_frequency_words(high_freq_words: set[str]) -> None:
    if len(high_freq_words) == 0:
        return

    collection = db.collection(UNLOCKED_WORDS)

    for word in high_freq_words:
        if word == "":
            continue

        doc_ref = collection.document(word)
        doc = doc_ref.get()

        exists = getattr(doc, "exists", False)
        if not exists:
            continue

        doc_ref.update({"is_high_frequency_word": True})


def load_database_words() -> set[str]:
    docs = db.collection(UNLOCKED_WORDS).stream()

    return {doc.id for doc in docs}


def get_todays_words() -> dict[str, dict[str, Any]]:
    now = datetime.now(timezone.utc)

    start_of_today = datetime(
        year=now.year, month=now.month, day=now.day, tzinfo=timezone.utc
    )

    start_of_tomorrow = start_of_today + timedelta(days=1)

    docs = (
        db.collection(UNLOCKED_WORDS)
        .where(filter=FieldFilter("last_used", ">=", start_of_today))
        .where(filter=FieldFilter("last_used", "<=", start_of_tomorrow))
        .stream()
    )

    todays_words: dict[str, dict[str, Any]] = {}

    for doc in docs:
        report = doc.to_dict()

        if report is None:
            continue

        word = doc.id
        todays_words[word] = report

    print(todays_words)
    return todays_words


def print_db():
    docs = db.collection(UNLOCKED_WORDS).stream()

    for doc in docs:
        print(f"{doc.id} -> {doc.to_dict()}")
