from typing import Set

from postgrest import APIResponse

from app.database.supabase_setup import get_supabase
from app.schemas.models import Table, WordModel, UserModel, User


def insert_word(word: str) -> None:
    if word.strip() == "" or word is None:
        return

    payload = WordModel(word=word)

    get_supabase().table(Table.WORDS).insert(payload.model_dump()).execute()


def insert_all_words(words: Set[str]):
    for word in words:
        insert_word(word)


def update_max_episode_completed(episode: int) -> None:
    get_supabase().table(Table.USERS).update({User.MAX_EPISODE: episode}).eq(
        User.DISPLAY_NAME, "matus"
    ).execute()


# def create_user(user_model: UserModel) -> None:
#     get_supabase().table(Table.USERS).insert(user_model.model_dump()).execute()


def get_max_episode_completed() -> int:
    response = (
        get_supabase()
        .table(Table.USERS)
        .select("*")
        .eq(User.DISPLAY_NAME, "matus")
        .execute()
    )

    return UserModel.model_validate(response.data[0]).max_episode


# def update_misused_words(misused_words: set[str]) -> None:
#     if len(misused_words) == 0:
#         return

#     collection = db.collection(UNLOCKED_WORDS)

#     for misused_word in misused_words:
#         if misused_word == "":
#             continue

#         doc_ref = collection.document(misused_word)
#         doc = doc_ref.get()

#         exists = getattr(doc, "exists", False)
#         if not exists:
#             continue

#         doc_ref.update(
#             {
#                 "last_used": SERVER_TIMESTAMP,
#                 "times_used": Increment(1),
#                 "mistakes": Increment(1),
#             }
#         )


# def update_high_frequency_words(high_freq_words: set[str]) -> None:
#     if len(high_freq_words) == 0:
#         return

#     collection = db.collection(UNLOCKED_WORDS)

#     for word in high_freq_words:
#         if word == "":
#             continue

#         doc_ref = collection.document(word)
#         doc = doc_ref.get()

#         exists = getattr(doc, "exists", False)
#         if not exists:
#             continue

#         doc_ref.update({"is_high_frequency_word": True})


def get_words_from_response(response: APIResponse) -> Set[str]:
    result: Set[str] = set()

    for batch in response.data:
        word_model = WordModel.model_validate(batch)
        result.add(word_model.word)

    return result


def load_vocabulary() -> Set[str]:
    response = get_supabase().table(Table.WORDS).select("*").execute()
    vocabulary = get_words_from_response(response)
    return vocabulary


# def get_todays_words() -> dict[str, dict[str, Any]]:
#     now = datetime.now(timezone.utc)

#     start_of_today = datetime(
#         year=now.year, month=now.month, day=now.day, tzinfo=timezone.utc
#     )

#     start_of_tomorrow = start_of_today + timedelta(days=1)

#     docs = (
#         db.collection(UNLOCKED_WORDS)
#         .where(filter=FieldFilter("last_used", ">=", start_of_today))
#         .where(filter=FieldFilter("last_used", "<=", start_of_tomorrow))
#         .stream()
#     )

#     todays_words: dict[str, dict[str, Any]] = {}

#     for doc in docs:
#         report = doc.to_dict()

#         if report is None:
#             continue

#         word = doc.id
#         todays_words[word] = report

#     print(todays_words)
#     return todays_words


# def print_db():
#     docs = db.collection(UNLOCKED_WORDS).stream()

#     for doc in docs:
#         print(f"{doc.id} -> {doc.to_dict()}")
