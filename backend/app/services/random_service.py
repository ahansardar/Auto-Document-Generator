import random
import string


SPECIAL_CHARACTERS = "!@#$%&*-_"
DEFAULT_PATTERN = "{####}"


def generate_from_pattern(pattern: str | None) -> str:
    value = pattern.strip() if pattern else DEFAULT_PATTERN
    output: list[str] = []
    token: list[str] = []
    in_token = False

    for character in value:
        if character == "{" and not in_token:
            in_token = True
            token = []
            continue
        if character == "}" and in_token:
            output.append(_expand_token("".join(token)))
            in_token = False
            continue
        if in_token:
            token.append(character)
        else:
            output.append(character)

    if in_token:
        output.append("{" + "".join(token))

    return "".join(output)


def _expand_token(token: str) -> str:
    return "".join(_random_character(marker) for marker in token)


def _random_character(marker: str) -> str:
    if marker in {"#", "9"}:
        return random.choice(string.digits)
    if marker == "A":
        return random.choice(string.ascii_uppercase)
    if marker == "a":
        return random.choice(string.ascii_lowercase)
    if marker == "X":
        return random.choice(string.ascii_uppercase + string.digits)
    if marker == "x":
        return random.choice(string.ascii_lowercase + string.digits)
    if marker == "*":
        return random.choice(SPECIAL_CHARACTERS)
    if marker == "?":
        return random.choice(string.ascii_letters + string.digits + SPECIAL_CHARACTERS)
    return marker
