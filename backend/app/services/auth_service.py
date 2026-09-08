from datetime import datetime, timezone
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import create_access_token, hash_password, verify_password
from app.models.entities import User, UserRole
from app.schemas.api import LoginRequest, RegisterRequest, StaffUserCreate, Token, UserOut


PUBLIC_ROLES = {UserRole.citizen, UserRole.family_member}


def register_user(db: Session, payload: RegisterRequest) -> Token:
    # Public registration strictly for citizen and family member
    try:
        requested_role = UserRole.from_str(payload.role)
    except ValueError:
        requested_role = UserRole.citizen

    if requested_role not in PUBLIC_ROLES:
        raise HTTPException(
            status_code=403,
            detail="Staff roles must be created by an administrator.",
        )

    role = requested_role

    email = payload.email.lower().strip()
    if db.scalar(select(User).where(User.email == email)):
        raise HTTPException(status_code=409, detail="An account with this email already exists.")

    phone = payload.mobile_number or payload.phone
    if phone:
        phone = phone.strip()
        if db.scalar(select(User).where(User.phone == phone)):
            raise HTTPException(status_code=409, detail="An account with this mobile number already exists.")

    user = User(
        email=email,
        full_name=payload.full_name.strip(),
        phone=phone or None,
        role=role,
        hashed_password=hash_password(payload.password),
        is_active=True,
        is_verified=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token_str = create_access_token(user.id, user.role.value)
    return Token(
        access_token=token_str,
        token_type="bearer",
        user=UserOut.model_validate(user),
        role=user.role.value,
    )


def authenticate_user(db: Session, payload: LoginRequest) -> Token:
    email = payload.email.lower().strip()
    user = db.scalar(select(User).where(User.email == email))

    # Validation order:
    # 1. Email exists check
    if not user:
        raise HTTPException(status_code=404, detail="Account not found.")

    # 2. Password check
    if not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect password.")

    # 3. Active status check
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Your account has been disabled. Contact the administrator.")

    # 4. Role match check
    if payload.role:
        try:
            expected_role = UserRole.from_str(payload.role)
            # Allow admin <-> administrator equivalence and authority <-> district_officer equivalence
            admin_roles = {UserRole.admin, UserRole.administrator}
            authority_roles = {UserRole.authority, UserRole.district_officer}
            roles_match = (
                user.role == expected_role
                or (user.role in admin_roles and expected_role in admin_roles)
                or (user.role in authority_roles and expected_role in authority_roles)
            )
            if not roles_match:
                raise HTTPException(status_code=403, detail="This account does not have access to the selected role.")
        except ValueError:
            raise HTTPException(status_code=403, detail="This account does not have access to the selected role.")

    token_str = create_access_token(user.id, user.role.value)
    return Token(
        access_token=token_str,
        token_type="bearer",
        user=UserOut.model_validate(user),
        role=user.role.value,
    )


def create_staff_user(db: Session, payload: StaffUserCreate) -> UserOut:
    role = UserRole.from_str(payload.role)
    email = payload.email.lower().strip()
    if db.scalar(select(User).where(User.email == email)):
        raise HTTPException(status_code=409, detail="Email already exists.")

    phone = payload.mobile_number or payload.phone
    if phone:
        phone = phone.strip()
        if db.scalar(select(User).where(User.phone == phone)):
            raise HTTPException(status_code=409, detail="Phone number already exists.")

    user = User(
        email=email,
        full_name=payload.full_name.strip(),
        phone=phone or None,
        role=role,
        state=payload.state,
        district=payload.district,
        taluk=payload.taluk,
        locality=payload.locality,
        hashed_password=hash_password(payload.password),
        is_active=True,
        is_verified=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return UserOut.model_validate(user)
