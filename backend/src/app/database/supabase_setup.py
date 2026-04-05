import os
from supabase import create_client, Client
from dotenv import load_dotenv


load_dotenv()


_client: Client | None = None


def get_supabase() -> Client:
    global _client

    if _client is None:
        url: str | None = os.getenv("SUPABASE_URL")
        key: str | None = os.getenv("SUPABASE_KEY")

        if url is None or key is None:
            raise ValueError(
                "SUPABASE_URL and SUPABASE_KEY must be set in environment variables."
            )

        _client = create_client(url, key)

    return _client
