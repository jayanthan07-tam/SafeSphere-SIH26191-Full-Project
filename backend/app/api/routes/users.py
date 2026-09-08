from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.core.security import hash_password, require_roles
from app.db.session import get_db
from app.models.entities import User, UserRole
from app.schemas.api import StaffUserCreate, UserOut, UserPasswordReset, UserStatusUpdate
from app.services.auth_service import create_staff_user

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=list[UserOut])
def list_users(
    role: str | None = None,
    search: str | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.administrator, UserRole.authority, UserRole.district_officer)),
):
    stmt = select(User)
    if role:
        try:
            r = UserRole.from_str(role)
            stmt = stmt.where(User.role == r)
        except ValueError:
            pass
    if search:
        s = f"%{search.strip()}%"
        stmt = stmt.where(or_(User.email.ilike(s), User.full_name.ilike(s), User.phone.ilike(s)))

    return db.scalars(stmt.order_by(User.created_at.desc())).all()


@router.get("/officers", response_model=list[UserOut])
def list_operational_officers(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.administrator, UserRole.authority, UserRole.district_officer)),
):
    roles = [UserRole.field_officer, UserRole.district_officer, UserRole.authority]
    return db.scalars(select(User).where(User.role.in_(roles), User.is_active == True).order_by(User.full_name.asc())).all()


@router.post("", response_model=UserOut, status_code=201)
def create_user(
    payload: StaffUserCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.administrator)),
):
    return create_staff_user(db, payload)


@router.patch("/{user_id}", response_model=UserOut)
def update_user_status(
    user_id: str,
    payload: UserStatusUpdate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_roles(UserRole.administrator)),
):
    target = db.get(User, user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    if payload.is_active is not None:
        if target.id == current_admin.id and not payload.is_active:
            raise HTTPException(status_code=400, detail="Administrator cannot deactivate their own account.")
        target.is_active = payload.is_active

    if payload.role is not None:
        target.role = UserRole.from_str(payload.role)
    if payload.full_name is not None:
        target.full_name = payload.full_name.strip()
    if payload.phone is not None:
        target.phone = payload.phone.strip() or None
    if payload.district is not None:
        target.district = payload.district.strip() or None

    db.commit()
    db.refresh(target)
    return target


@router.post("/{user_id}/reset-password", response_model=dict)
def reset_user_password(
    user_id: str,
    payload: UserPasswordReset,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.administrator)),
):
    target = db.get(User, user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    target.hashed_password = hash_password(payload.new_password)
    db.commit()
    return {"message": f"Password for {target.email} has been reset successfully."}
