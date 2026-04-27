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


def _is_word_char(char: str) -> bool:
    return char.isalnum() or char == "_"


def _expand_to_word_boundaries(text: str, start: int, end: int) -> tuple[int, int]:
    while start > 0 and _is_word_char(text[start - 1]):
        start -= 1

    while end < len(text) and _is_word_char(text[end]):
        end += 1

    return start, end


def _find_closest(text: str, needle: str, target: int) -> tuple[int, int] | None:
    if not needle:
        return None

    matches: list[tuple[int, int]] = []
    start = 0
    while True:
        index = text.find(needle, start)
        if index == -1:
            break

        matches.append((index, index + len(needle)))
        start = index + 1

    if not matches:
        return None

    return min(matches, key=lambda match: abs(match[0] - target))
