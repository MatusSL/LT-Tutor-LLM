import string


def remove_punctuation(text: str) -> str:
    result = text.translate(str.maketrans("", "", string.punctuation))
    return result


def turn_text_to_lowercase(text: str) -> str:
    lowercase_text = list(map(str.lower, text.split()))
    return " ".join(lowercase_text)


def normalize_user_input(words: set[str]) -> set[str]:
    text = " ".join(words)
    removed_punctuation = remove_punctuation(text)
    lowercase_text = turn_text_to_lowercase(removed_punctuation)
    output = set(lowercase_text.split(" "))
    return output
