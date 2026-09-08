import sys
from pathlib import Path

CURRENT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = CURRENT_DIR.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from sqlalchemy import inspect, text
from app.db.base import Base
from app.db.session import engine
import app.models  # noqa: F401


def migrate_and_init():
    with engine.begin() as conn:
        try:
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis"))
        except Exception:
            pass

        # Postgres enum migration if applicable
        if engine.dialect.name == "postgresql":
            try:
                conn.execute(text("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'family_member'"))
            except Exception:
                pass

        # Add missing columns safely if running on an existing DB
        inspector = inspect(conn)
        tables = inspector.get_table_names()

        if "users" in tables:
            user_cols = {c["name"] for c in inspector.get_columns("users")}
            if "is_verified" not in user_cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN is_verified BOOLEAN DEFAULT 1"))
            if "updated_at" not in user_cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN updated_at TIMESTAMP"))

        if "family_group_memberships" in tables:
            mem_cols = {c["name"] for c in inspector.get_columns("family_group_memberships")}
            if "sms_alerts_enabled" not in mem_cols:
                conn.execute(text("ALTER TABLE family_group_memberships ADD COLUMN sms_alerts_enabled BOOLEAN DEFAULT 1"))
            if "special_assistance" not in mem_cols:
                conn.execute(text("ALTER TABLE family_group_memberships ADD COLUMN special_assistance JSON DEFAULT '[]'"))

    Base.metadata.create_all(bind=engine)
    print("Database schema ready and up-to-date.")


if __name__ == "__main__":
    migrate_and_init()
