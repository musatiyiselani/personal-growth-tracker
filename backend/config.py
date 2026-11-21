"""Application settings.

Values are read from the environment. If a `.env` file exists in the backend
folder, its KEY=VALUE lines are loaded first (variables already set in the
environment take priority). No extra package is needed.
"""
import os
from pathlib import Path

PLACEHOLDER_PREFIX = "replace_this"
MIN_SECRET_LENGTH = 32


def _load_env_file(path: Path) -> None:
    if not path.is_file():
        return

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        value = value.strip().strip('"').strip("'")
        os.environ.setdefault(key.strip(), value)


_load_env_file(Path(__file__).resolve().parent / ".env")


def get_secret_key() -> str:
    key = os.getenv("SECRET_KEY", "").strip()

    if not key:
        raise RuntimeError(
            "SECRET_KEY is missing. Add it to backend/.env or set it in your "
            "terminal before starting the backend (see README_SETUP.md)."
        )

    if key.startswith(PLACEHOLDER_PREFIX) or len(key) < MIN_SECRET_LENGTH:
        raise RuntimeError(
            "SECRET_KEY is still the example placeholder or is too short. "
            "Generate a new one as described in README_SETUP.md."
        )

    return key
