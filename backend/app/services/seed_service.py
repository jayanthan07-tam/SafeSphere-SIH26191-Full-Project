import uuid
from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.entities import User, UserRole


DEMO_USERS = [
    {
        "role": UserRole.admin,
        "email": "admin.safesphere@gmail.com",
        "password": "Admin123!",
        "full_name": "SafeSphere Admin",
        "phone": "+919876543201",
        "title": "Administrator",
    },
    {
        "role": UserRole.citizen,
        "email": "user.safesphere@gmail.com",
        "password": "User123!",
        "full_name": "Demo Citizen",
        "phone": "+919876543202",
        "title": "Citizen",
    },
    {
        "role": UserRole.authority,
        "email": "authority.safesphere@gmail.com",
        "password": "Authority123!",
        "full_name": "State Disaster Authority",
        "phone": "+919876543203",
        "title": "Authority",
    },
    {
        "role": UserRole.field_officer,
        "email": "officer.safesphere@gmail.com",
        "password": "Officer123!",
        "full_name": "Field Rescue Officer",
        "phone": "+919876543204",
        "title": "Field Officer",
    },
    {
        "role": UserRole.family_member,
        "email": "family.safesphere@gmail.com",
        "password": "Family123!",
        "full_name": "Family Member Contact",
        "phone": "+919876543205",
        "title": "Family Member",
    },
]


def seed_demo_users(db: Session | None = None) -> list[str]:
    """
    Idempotently seeds or updates the 5 required demo accounts with valid bcrypt hashes.
    Prints "Demo [Role] ready" for each.
    """
    close_after = False
    if db is None:
        db = SessionLocal()
        close_after = True

    ready_roles: list[str] = []
    try:
        for u in DEMO_USERS:
            email = u["email"].lower().strip()
            user = db.scalar(select(User).where(User.email == email))
            hashed_pwd = hash_password(u["password"])
            if not user:
                user = User(
                    id=str(uuid.uuid4()),
                    email=email,
                    full_name=u["full_name"],
                    hashed_password=hashed_pwd,
                    role=u["role"],
                    phone=u["phone"],
                    is_active=True,
                    is_verified=True,
                )
                db.add(user)
            else:
                user.hashed_password = hashed_pwd
                user.role = u["role"]
                user.full_name = u["full_name"]
                user.is_active = True
                user.is_verified = True
                if not user.phone:
                    user.phone = u["phone"]

            db.commit()
            print(f"Demo {u['title']} ready")
            ready_roles.append(u["title"])
    finally:
        if close_after:
            db.close()

    return ready_roles


if __name__ == "__main__":
    seed_demo_users()
