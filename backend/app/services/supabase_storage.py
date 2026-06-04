from pathlib import Path
from urllib.error import HTTPError
from urllib.parse import quote
from urllib.request import Request, urlopen

from app.config import get_settings

settings = get_settings()


def is_supabase_enabled() -> bool:
    return bool(settings.supabase_url and settings.supabase_service_role_key and settings.supabase_bucket)


def object_url(object_path: str) -> str:
    base_url = (settings.supabase_url or "").rstrip("/")
    encoded_path = "/".join(quote(part) for part in object_path.strip("/").split("/"))
    return f"{base_url}/storage/v1/object/{settings.supabase_bucket}/{encoded_path}"


def auth_headers(content_type: str | None = None) -> dict[str, str]:
    headers = {
        "Authorization": f"Bearer {settings.supabase_service_role_key}",
        "apikey": settings.supabase_service_role_key or "",
    }
    if content_type:
        headers["Content-Type"] = content_type
    return headers


def upload_bytes(object_path: str, content: bytes, content_type: str = "application/octet-stream") -> None:
    if not is_supabase_enabled():
        return

    request = Request(
        object_url(object_path),
        data=content,
        headers={**auth_headers(content_type), "x-upsert": "true"},
        method="POST",
    )
    try:
        with urlopen(request, timeout=30):
            return
    except HTTPError as exc:
        if exc.code != 409:
            print(f"Supabase upload skipped for {object_path}: HTTP {exc.code}")
            return
    except Exception as exc:
        print(f"Supabase upload skipped for {object_path}: {exc}")
        return

    put_request = Request(
        object_url(object_path),
        data=content,
        headers=auth_headers(content_type),
        method="PUT",
    )
    try:
        with urlopen(put_request, timeout=30):
            return
    except Exception as exc:
        print(f"Supabase upload skipped for {object_path}: {exc}")


def download_bytes(object_path: str) -> bytes | None:
    if not is_supabase_enabled():
        return None

    request = Request(object_url(object_path), headers=auth_headers(), method="GET")
    try:
        with urlopen(request, timeout=30) as response:
            return response.read()
    except HTTPError as exc:
        print(f"Supabase download skipped for {object_path}: HTTP {exc.code}")
        return None
    except Exception as exc:
        print(f"Supabase download skipped for {object_path}: {exc}")
        return None


def delete_object(object_path: str) -> None:
    if not is_supabase_enabled():
        return
    request = Request(object_url(object_path), headers=auth_headers(), method="DELETE")
    try:
        with urlopen(request, timeout=30):
            return
    except HTTPError as exc:
        if exc.code != 404:
            print(f"Supabase delete skipped for {object_path}: HTTP {exc.code}")
    except Exception as exc:
        print(f"Supabase delete skipped for {object_path}: {exc}")


def restore_file(object_path: str, destination: Path) -> bool:
    content = download_bytes(object_path)
    if content is None:
        return False
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_bytes(content)
    return True


def backup_file(source: Path, object_path: str, content_type: str = "application/octet-stream") -> None:
    if source.exists() and source.is_file():
        upload_bytes(object_path, source.read_bytes(), content_type)
