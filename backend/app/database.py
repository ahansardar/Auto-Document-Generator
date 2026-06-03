from collections.abc import Generator

from sqlalchemy import inspect, text
from sqlmodel import Session, SQLModel, create_engine

from app.config import get_settings

settings = get_settings()
settings.data_dir.mkdir(parents=True, exist_ok=True)
engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False},
)


def create_db_and_tables() -> None:
    SQLModel.metadata.create_all(engine)
    ensure_variable_columns()
    ensure_template_page_columns()


def ensure_variable_columns() -> None:
    inspector = inspect(engine)
    if "templatevariable" not in inspector.get_table_names():
        return

    existing = {column["name"] for column in inspector.get_columns("templatevariable")}
    statements: list[str] = []
    if "generator_enabled" not in existing:
        statements.append("ALTER TABLE templatevariable ADD COLUMN generator_enabled BOOLEAN NOT NULL DEFAULT 0")
    if "generator_pattern" not in existing:
        statements.append("ALTER TABLE templatevariable ADD COLUMN generator_pattern VARCHAR")

    if not statements:
        return

    with engine.begin() as connection:
        for statement in statements:
            connection.execute(text(statement))


def ensure_template_page_columns() -> None:
    inspector = inspect(engine)
    if "templatepage" not in inspector.get_table_names():
        return

    existing = {column["name"] for column in inspector.get_columns("templatepage")}
    if "source_page_number" in existing:
        return

    with engine.begin() as connection:
        connection.execute(text("ALTER TABLE templatepage ADD COLUMN source_page_number INTEGER"))
        connection.execute(text("UPDATE templatepage SET source_page_number = page_number WHERE source_page_number IS NULL"))


def get_session() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session
