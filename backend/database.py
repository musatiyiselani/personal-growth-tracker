from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker

from config import get_database_url

DATABASE_URL = get_database_url()

# Settings for a hosted PostgreSQL database (Neon free tier):
# - A small pool: the free tier limits the number of connections, and each
#   Render instance runs a single process.
# - pool_pre_ping: test a pooled connection before use. Neon suspends idle
#   computes, so connections can go stale.
# - pool_recycle: replace connections older than 5 minutes for the same reason.
# - prepare_threshold=None: do not create server-side prepared statements.
#   Neon's connection pooler reuses server connections between transactions,
#   and prepared statements can break behind a transaction-mode pooler. This
#   application does not depend on them.
engine = create_engine(
    DATABASE_URL,
    pool_size=5,
    max_overflow=5,
    pool_timeout=30,
    pool_pre_ping=True,
    pool_recycle=300,
    connect_args={
        "connect_timeout": 10,
        "prepare_threshold": None,
    },
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """Create any missing tables. Existing tables and data are left untouched."""
    import models  # noqa: F401  (registers the model classes with Base)

    Base.metadata.create_all(bind=engine)


def check_database_connection() -> str:
    """Run a trivial query and return the PostgreSQL version string."""
    with engine.connect() as connection:
        return connection.execute(text("SELECT version()")).scalar_one()
