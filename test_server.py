import requests

response = requests.post("http://localhost:8000/chat", json={"user_sentence": "hello"})
print(response.json())
