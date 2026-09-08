import os
import sys
from pathlib import Path

# Resolve project root automatically so running `python scripts/create_admin.py`
# from either root or backend works without any PYTHONPATH hacks.
CURRENT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = CURRENT_DIR.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from sqlalchemy import select
from app.core.config import get_settings
from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.entities import User, UserRole


def main():
    s = get_settings()

    # Priority:
    # 1. Environment variables (ADMIN_EMAIL / BOOTSTRAP_ADMIN_EMAIL)
    # 2. Interactive prompt if stdin is a TTY and env vars are not provided
    # 3. Default fallback from settings
    admin_name = os.getenv("ADMIN_NAME") or os.getenv("BOOTSTRAP_ADMIN_NAME") or s.bootstrap_admin_name
    admin_email = os.getenv("ADMIN_EMAIL") or os.getenv("BOOTSTRAP_ADMIN_EMAIL") or s.bootstrap_admin_email
    admin_password = os.getenv("ADMIN_PASSWORD") or os.getenv("BOOTSTRAP_ADMIN_PASSWORD") or s.bootstrap_admin_password

    # Prompt if in interactive mode and user wants custom values
    if sys.stdin and sys.stdin.isatty():
        try:
            custom_name = input(f"Admin Name [{admin_name}]: ").strip()
            if custom_name:
                admin_name = custom_name

            custom_email = input(f"Admin Email [{admin_email}]: ").strip()
            if custom_email:
                admin_email = custom_email

            custom_pwd = input(f"Admin Password [default: configured secret]: ").strip()
            if custom_pwd:
                admin_password = custom_pwd
        except (KeyboardInterrupt, EOFError):
            print("\nAborted.")
            return

    admin_email = admin_email.lower().strip()

    with SessionLocal() as db:
        existing = db.scalar(select(User).where(User.email == admin_email))
        if existing:
            print(f"[INFO] Administrator with email '{admin_email}' already exists (ID: {existing.id}). Duplicate creation prevented.")
            return

        admin = User(
            email=admin_email,
            full_name=admin_name.strip(),
            hashed_password=hash_password(admin_password),
            role=UserRole.administrator,
            is_active=True,
            is_verified=True,
        )
        db.add(admin)
        db.commit()
        db.refresh(admin)
        print(f"[SUCCESS] Administrator '{admin_name}' ({admin_email}) created successfully (ID: {admin.id}).")


if __name__ == "__main__":
    main()
