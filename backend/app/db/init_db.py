from sqlalchemy import text

from app.db.database import Base, engine
import app.db.models  # noqa: F401 — register all models


async def init_db() -> None:
    """Create enum types and all tables if they don't exist."""
    async with engine.begin() as conn:
        # Create PostgreSQL enum types (idempotent)
        await conn.execute(text("""
            DO $$ BEGIN
                CREATE TYPE period_type AS ENUM ('annual', 'quarterly');
            EXCEPTION WHEN duplicate_object THEN NULL;
            END $$;
        """))
        await conn.execute(text("""
            DO $$ BEGIN
                CREATE TYPE dividend_type AS ENUM ('regular', 'special', 'return_of_capital');
            EXCEPTION WHEN duplicate_object THEN NULL;
            END $$;
        """))
        # Create all tables
        await conn.run_sync(Base.metadata.create_all)
