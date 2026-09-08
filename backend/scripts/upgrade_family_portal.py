from sqlalchemy import text
from app.db.session import engine

# Safe compatibility upgrade for projects that already created the PostgreSQL UserRole enum.
if engine.dialect.name == "postgresql":
    with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as conn:
        conn.execute(text("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'family_member'"))
print("Family portal compatibility upgrade complete.")
