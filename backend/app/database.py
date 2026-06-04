from collections.abc import Generator

from sqlalchemy import inspect, text
from sqlmodel import Session, SQLModel, create_engine

from app.config import get_settings

settings = get_settings()
database_path = settings.data_dir / "app.db"
settings.data_dir.mkdir(parents=True, exist_ok=True)


def resolve_database_url() -> str:
    if settings.database_url == "sqlite:///data/app.db":
        return f"sqlite:///{database_path.as_posix()}"
    if settings.database_url.startswith("postgres://"):
        return settings.database_url.replace("postgres://", "postgresql+psycopg://", 1)
    if settings.database_url.startswith("postgresql://"):
        return settings.database_url.replace("postgresql://", "postgresql+psycopg://", 1)

    return settings.database_url


resolved_database_url = resolve_database_url()
engine = create_engine(
    resolved_database_url,
    connect_args={"check_same_thread": False} if resolved_database_url.startswith("sqlite") else {},
)


def create_db_and_tables() -> None:
    SQLModel.metadata.create_all(engine)
    ensure_variable_columns()
    ensure_template_page_columns()
    ensure_text_element_columns()


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


def ensure_text_element_columns() -> None:
    inspector = inspect(engine)
    if "templatetextelement" not in inspector.get_table_names():
        return

    existing = {column["name"] for column in inspector.get_columns("templatetextelement")}
    statements: list[str] = []
    if "element_type" not in existing:
        statements.append("ALTER TABLE templatetextelement ADD COLUMN element_type VARCHAR NOT NULL DEFAULT 'text'")
    if "image_src" not in existing:
        statements.append("ALTER TABLE templatetextelement ADD COLUMN image_src TEXT")
    if "image_alt" not in existing:
        statements.append("ALTER TABLE templatetextelement ADD COLUMN image_alt VARCHAR")
    if "hyperlink_url" not in existing:
        statements.append("ALTER TABLE templatetextelement ADD COLUMN hyperlink_url TEXT")

    if not statements:
        return

    with engine.begin() as connection:
        for statement in statements:
            connection.execute(text(statement))


def get_session() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session
