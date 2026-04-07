from dataclasses import dataclass
from typing import Any, Dict

QWEN25_7B_MODEL = "qwen2.5:7b"
QWEN25_14B_MODEL = "qwen2.5:14b"
LLAMA32_MODEL = "llama3.2:latest"
LLAMA31 = "llama3.1:8b"

type LLMResponse = Dict[str, Any]

@dataclass
class Context:
    role: str
    content: str
