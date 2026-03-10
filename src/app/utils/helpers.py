import json
from agents import RunResult
import logging

LOG_FORMAT = "%(asctime)s | %(levelname)s | %(name)s | %(message)s"

logging.basicConfig(
    level=logging.INFO,
    format=LOG_FORMAT
    )
    
logger = logging.getLogger(__name__)


def model_behavior_error(content: str, exc: Exception) -> None:
    logger.warning(
        "Model behavior error during LLM response parsing",
        extra={
            "content": content,
            "error": str(exc)
        },
    )

def log_unexpected_error(content: str, exc: Exception) -> None:
    logger.error(
        "Unexpected error during LLM response parsing",
        exc_info=exc,
        extra={
            "content": content,
            "error": str(exc)
        },
    )



# def print_token_usage(agent: Agent, result: RunResult):
#     print(f"Toen usage for agent {agent.name}:\n")

#     usage = result.raw_responses[0].usage
#     print(
#         f"""LLM response usage:
#             "input_tokens": {usage.input_tokens}
#             "output_tokens": {usage.output_tokens}
#             "total_tokens": {usage.total_tokens}
#         """
#     )



def update_token_usage_price_json(result: RunResult) -> None:
    input = result.raw_responses[0].usage.input_tokens
    output = result.raw_responses[0].usage.output_tokens
    total = result.raw_responses[0].usage.total_tokens

    filename = "token_usage_prices.json"
    with open(filename, 'r') as file:
        data = json.load(file)
    
    data["input_token_price"] += input
    data["output_token_price"] += output
    data["total_token_price"] += total
    

    with open(filename, 'w') as file:
        json.dump(data, file, indent=4)
