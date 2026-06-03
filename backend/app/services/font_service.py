from functools import lru_cache
from pathlib import Path


FALLBACK_FONTS = [
    {"family": "Helvetica", "file_path": None},
    {"family": "Arial", "file_path": None},
    {"family": "Times New Roman", "file_path": None},
    {"family": "Georgia", "file_path": None},
    {"family": "Verdana", "file_path": None},
    {"family": "Tahoma", "file_path": None},
    {"family": "Courier New", "file_path": None},
]


@lru_cache(maxsize=1)
def list_system_fonts() -> list[dict[str, str | None]]:
    fonts = _windows_registry_fonts() or _font_directory_fonts()
    merged: dict[str, dict[str, str | None]] = {font["family"].lower(): font for font in FALLBACK_FONTS}
    for font in fonts:
        family = font["family"].strip()
        if not family:
            continue
        merged[family.lower()] = {"family": family, "file_path": font.get("file_path")}
    return sorted(merged.values(), key=lambda font: str(font["family"]).lower())


def font_file_for_family(family: str | None) -> str | None:
    if not family:
        return None
    target = family.strip().lower()
    for font in list_system_fonts():
        if str(font["family"]).strip().lower() == target:
            return font.get("file_path")
    return None


def _windows_registry_fonts() -> list[dict[str, str | None]]:
    try:
        import winreg
    except ImportError:
        return []

    fonts_dir = Path("C:/Windows/Fonts")
    registry_path = r"SOFTWARE\Microsoft\Windows NT\CurrentVersion\Fonts"
    discovered: list[dict[str, str | None]] = []
    try:
        with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, registry_path) as key:
            index = 0
            while True:
                try:
                    display_name, filename, _ = winreg.EnumValue(key, index)
                except OSError:
                    break
                index += 1
                if not str(filename).lower().endswith((".ttf", ".otf", ".ttc")):
                    continue
                family = _clean_windows_font_name(display_name)
                path = Path(filename)
                if not path.is_absolute():
                    path = fonts_dir / path
                discovered.append({"family": family, "file_path": str(path) if path.exists() else None})
    except OSError:
        return []
    return discovered


def _font_directory_fonts() -> list[dict[str, str | None]]:
    candidates = [Path("C:/Windows/Fonts"), Path("/System/Library/Fonts"), Path("/Library/Fonts"), Path("/usr/share/fonts")]
    discovered: list[dict[str, str | None]] = []
    for root in candidates:
        if not root.exists():
            continue
        for path in root.rglob("*"):
            if path.suffix.lower() in {".ttf", ".otf", ".ttc"}:
                discovered.append({"family": path.stem.replace("-", " "), "file_path": str(path)})
    return discovered


def _clean_windows_font_name(display_name: str) -> str:
    name = display_name.split("(")[0].strip()
    suffixes = [" Regular", " Bold", " Italic", " Oblique", " Light", " Semibold", " Semilight", " Black"]
    for suffix in suffixes:
        if name.endswith(suffix):
            return name[: -len(suffix)].strip()
    return name
