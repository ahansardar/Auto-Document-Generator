from collections.abc import Generator

from sqlalchemy import inspect, text
from sqlmodel import Session, SQLModel, create_engine

from app.config import get_settings
from app.services.supabase_storage import backup_file, restore_file

settings = get_settings()
database_path = settings.data_dir / "app.db"
settings.data_dir.mkdir(parents=True, exist_ok=True)
restore_file(settings.supabase_db_backup_path, database_path)


def resolve_database_url() -> str:
    if settings.database_url == "sqlite:///data/app.db":
        return f"sqlite:///{database_path.as_posix()}"

    return settings.database_url


engine = create_engine(
    resolve_database_url(),
    connect_args={"check_same_thread": False},
)


def create_db_and_tables() -> None:
    SQLModel.metadata.create_all(engine)
    ensure_variable_columns()
    ensure_template_page_columns()
    backup_database()


def backup_database() -> None:
    backup_file(database_path, settings.supabase_db_backup_path, "application/x-sqlite3")


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
