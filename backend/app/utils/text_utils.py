import re

VARIABLE_RE = re.compile(r"^[a-z][a-z0-9_]*$")
VARIABLE_TOKEN_RE = re.compile(r"{{\s*([a-z][a-z0-9_]*)\s*}}")


def validate_variable_name(name: str) -> bool:
    return bool(VARIABLE_RE.fullmatch(name))


def extract_variables_from_text(content: str) -> list[str]:
    return sorted(set(VARIABLE_TOKEN_RE.findall(content or "")))


def extract_variables_from_elements(elements) -> list[str]:
    names: set[str] = set()
    for element in elements:
        content = element.content if hasattr(element, "content") else element.get("content", "")
        hyperlink_url = element.hyperlink_url if hasattr(element, "hyperlink_url") else element.get("hyperlink_url", "")
        names.update(extract_variables_from_text(content))
        names.update(extract_variables_from_text(hyperlink_url))
    return sorted(names)


def replace_variables(content: str, data: dict) -> str:
    def replace(match: re.Match[str]) -> str:
        name = match.group(1)
        value = data.get(name)
        return "" if value is None else str(value)

    return VARIABLE_TOKEN_RE.sub(replace, content or "")
