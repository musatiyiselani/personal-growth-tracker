"""Application settings, read from environment variables.

Values are read from the environment. If a `.env` file exists in the backend
folder, its KEY=VALUE lines are loaded first; variables that are already set
in the environment take priority. No extra package is needed for this.

This module must not import anything from the application, so that it can be
used (and tested) without a database.
"""
import os
from pathlib import Path
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

PLACEHOLDER_PREFIX = "replace_this"
MIN_SECRET_LENGTH = 32
DEFAULT_CORS_ORIGINS = (
    "http://127.0.0.1:5500,http://localhost:5500,"
    "http://127.0.0.1:3000,http://localhost:3000"
)


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
            "SECRET_KEY is missing. Add it to backend/.env or to your hosting "
            "environment variables (see DEPLOYMENT.md)."
        )

    if key.startswith(PLACEHOLDER_PREFIX) or len(key) < MIN_SECRET_LENGTH:
        raise RuntimeError(
            "SECRET_KEY is still the example placeholder or is too short. "
            "Generate a new one as described in DEPLOYMENT.md."
        )

    return key


def normalize_database_url(url: str) -> str:
    """Return a SQLAlchemy URL that uses the psycopg 3 driver for PostgreSQL.

    Neon (and most hosts) give connection strings that start with
    `postgresql://`. SQLAlchemy needs the driver named explicitly, so the
    prefix is rewritten to `postgresql+psycopg://`.

    Error messages never include the URL itself, because it contains the password.
    """
    value = (url or "").strip()
    if not value:
        raise RuntimeError(
            "DATABASE_URL is not set. Add your Neon PostgreSQL connection string "
            "to backend/.env or to your hosting environment variables "
            "(see DEPLOYMENT.md)."
        )

    lowered = value.lower()
    if lowered.startswith("sqlite"):
        raise RuntimeError(
            "SQLite is no longer supported. Set DATABASE_URL to your Neon "
            "PostgreSQL connection string (see DEPLOYMENT.md)."
        )

    for prefix in ("postgresql+psycopg://", "postgresql://", "postgres://"):
        if lowered.startswith(prefix):
            value = "postgresql+psycopg://" + value[len(prefix):]
            break
    else:
        raise RuntimeError(
            "DATABASE_URL must be a PostgreSQL connection string that starts with "
            "postgresql://"
        )

    parts = urlsplit(value)
    query = dict(parse_qsl(parts.query, keep_blank_values=True))
    if (parts.hostname or "").endswith(".neon.tech") and "sslmode" not in query:
        # Neon only accepts encrypted connections.
        query["sslmode"] = "require"
        value = urlunsplit(parts._replace(query=urlencode(query)))

    return value


def get_database_url() -> str:
    return normalize_database_url(os.getenv("DATABASE_URL", ""))


def get_cors_origins() -> list[str]:
    raw = os.getenv("CORS_ORIGINS", DEFAULT_CORS_ORIGINS)
    return [origin.strip().rstrip("/") for origin in raw.split(",") if origin.strip()]
