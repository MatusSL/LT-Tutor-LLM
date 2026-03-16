import firebase_admin   
from firebase_admin import credentials, firestore
from google.cloud.firestore_v1 import Client

cred = credentials.Certificate("lt-tutor-firebase-key.json")
firebase_admin.initialize_app(cred)

db: Client = firestore.client()
