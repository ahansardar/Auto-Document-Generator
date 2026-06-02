from pathlib import Path
from uuid import uuid4


def safe_pdf_filename(original_name: str) -> str:
    suffix = Path(original_name).suffix.lower()
    return f"{uuid4()}{suffix}"


def ensure_within_directory(path: Path, directory: Path) -> Path:
    resolved_path = path.resolve()
    resolved_directory = directory.resolve()
    if resolved_directory not in resolved_path.parents and resolved_path != resolved_directory:
        raise ValueError("Path traversal is not allowed")
    return resolved_path
