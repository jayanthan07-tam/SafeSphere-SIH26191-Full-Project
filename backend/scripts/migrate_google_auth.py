import sqlite3
import uuid
from datetime import datetime, timezone

from pathlib import Path

DB_PATH = Path(__file__).resolve().parents[1] / "disaster.db"

def migrate_and_seed():
    print(f"Connecting to database at {DB_PATH}...")
    conn = sqlite3.connect(str(DB_PATH))
    cursor = conn.cursor()

    # Check columns on users table
    cursor.execute("PRAGMA table_info(users)")
    existing_cols = {row[1] for row in cursor.fetchall()}

    if "google_sub" not in existing_cols:
        print("Adding column google_sub to users...")
        cursor.execute("ALTER TABLE users ADD COLUMN google_sub VARCHAR(255)")

    if "profile_image" not in existing_cols:
        print("Adding column profile_image to users...")
        cursor.execute("ALTER TABLE users ADD COLUMN profile_image VARCHAR(1024)")

    now = datetime.now(timezone.utc).isoformat()

    # Seed predefined authorized staff and example accounts if not existing
    seed_accounts = [
        {
            "id": str(uuid.uuid4()),
            "email": "admin@gmail.com",
            "full_name": "System Administrator",
            "role": "administrator",
            "phone": "+919876543210",
        },
        {
            "id": str(uuid.uuid4()),
            "email": "authority@gmail.com",
            "full_name": "State Disaster Authority",
            "role": "authority",
            "phone": "+919876543211",
        },
        {
            "id": str(uuid.uuid4()),
            "email": "officer@gmail.com",
            "full_name": "Field Rescue Officer",
            "role": "field_officer",
            "phone": "+919876543212",
        },
        {
            "id": str(uuid.uuid4()),
            "email": "family@gmail.com",
            "full_name": "Family Member",
            "role": "family_member",
            "phone": "+919876543213",
        },
        {
            "id": str(uuid.uuid4()),
            "email": "user@gmail.com",
            "full_name": "Citizen User",
            "role": "citizen",
            "phone": "+919876543214",
        },
    ]

    for acc in seed_accounts:
        cursor.execute("SELECT id FROM users WHERE email = ?", (acc["email"],))
        row = cursor.fetchone()
        if not row:
            print(f"Seeding authorized account: {acc['email']} ({acc['role']})...")
            cursor.execute(
                """
                INSERT INTO users (
                    id, email, full_name, hashed_password, role, phone,
                    preferred_language, is_active, is_verified, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    acc["id"],
                    acc["email"],
                    acc["full_name"],
                    "oauth_google_seed",
                    acc["role"],
                    acc["phone"],
                    "en",
                    1,
                    1,
                    now,
                    now,
                ),
            )

    conn.commit()
    conn.close()
    print("Database migration and account seeding completed successfully.")

if __name__ == "__main__":
    migrate_and_seed()
