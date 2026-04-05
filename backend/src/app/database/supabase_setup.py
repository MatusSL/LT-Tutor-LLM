import os
from pathlib import Path

import firebase_admin
from firebase_admin import credentials, firestore
from google.cloud.firestore_v1 import Client


def _resolve_credentials_path() -> Path:
    env_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    if env_path:
        credentials_path = Path(env_path).expanduser()
        if credentials_path.exists():
            return credentials_path
        raise FileNotFoundError(
            f"Firebase credentials file not found: {credentials_path}"
        )

    project_backend_dir = Path(__file__).resolve().parents[3]
    default_credentials_path = project_backend_dir / "lt-tutor-firebase-key.json"
    if default_credentials_path.exists():
        return default_credentials_path

    raise FileNotFoundError(
        "Firebase credentials file not found. Set GOOGLE_APPLICATION_CREDENTIALS "
        "or place lt-tutor-firebase-key.json in the backend directory."
    )


cred = credentials.Certificate(str(_resolve_credentials_path()))

if not firebase_admin._apps:
    firebase_admin.initialize_app(cred)

db: Client = firestore.client()
