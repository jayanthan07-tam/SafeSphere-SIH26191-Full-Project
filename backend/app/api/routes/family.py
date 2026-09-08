from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import get_current_user, require_roles
from app.db.session import get_db
from app.models.entities import FamilyGroup, FamilyGroupMembership, FamilyMember, User, UserRole
from app.schemas.api import (
    FamilyCheckIn,
    FamilyGroupCheckIn,
    FamilyGroupJoin,
    FamilyGroupOut,
    FamilyMemberCreate,
    FamilyMemberOut,
    FamilyRegenerateCodeResponse,
)
from app.services.family_service import (
    check_in_safety,
    ensure_owner_group,
    get_group_for_user,
    join_group,
    regenerate_join_code,
    serialize_family_group,
)

router = APIRouter(prefix="/family", tags=["family"])


@router.get("", response_model=FamilyGroupOut | list[FamilyMemberOut])
def get_family_info(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """
    Returns full family group for citizen or family member, or legacy contact list if requested.
    """
    if user.role in {UserRole.citizen, UserRole.family_member}:
        group = get_group_for_user(db, user)
        if group:
            return serialize_family_group(db, group, user)

    # Fallback to legacy contacts list
    return db.scalars(select(FamilyMember).where(FamilyMember.user_id == user.id).order_by(FamilyMember.name)).all()


@router.get("/portal/group", response_model=FamilyGroupOut)
def get_family_group(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if user.role not in {UserRole.citizen, UserRole.family_member}:
        raise HTTPException(status_code=403, detail="Family portal is available to citizens and family members.")
    group = get_group_for_user(db, user)
    if not group:
        raise HTTPException(status_code=404, detail="You have not joined a family yet.")
    return serialize_family_group(db, group, user)


@router.post("/join", response_model=FamilyGroupOut)
@router.post("/portal/join", response_model=FamilyGroupOut)
def join_family(
    payload: FamilyGroupJoin,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.family_member)),
):
    group = join_group(db, user, payload.join_code, payload.relationship)
    return serialize_family_group(db, group, user)


@router.post("/check-in", response_model=FamilyGroupOut)
@router.patch("/portal/check-in", response_model=FamilyGroupOut)
def family_check_in(
    payload: FamilyGroupCheckIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if user.role not in {UserRole.citizen, UserRole.family_member}:
        raise HTTPException(status_code=403, detail="Family check-ins are available to citizens and family members.")
    status = payload.status or payload.safety_status or "SAFE"
    group = check_in_safety(
        db=db,
        user=user,
        raw_status=status,
        location_sharing=payload.location_sharing,
        latitude=payload.latitude,
        longitude=payload.longitude,
    )
    return serialize_family_group(db, group, user)


@router.post("/regenerate-code", response_model=FamilyRegenerateCodeResponse)
def regenerate_code(
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.citizen)),
):
    code = regenerate_join_code(db, user)
    return FamilyRegenerateCodeResponse(join_code=code)


# Legacy contact endpoints preserved for backward compatibility
@router.post("/contacts", response_model=FamilyMemberOut, status_code=201)
def add_family_legacy(payload: FamilyMemberCreate, db: Session = Depends(get_db), user: User = Depends(require_roles(UserRole.citizen))):
    row = FamilyMember(user_id=user.id, **payload.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.patch("/{member_id}/check-in", response_model=FamilyMemberOut)
def check_in_legacy(member_id: str, payload: FamilyCheckIn, db: Session = Depends(get_db), user: User = Depends(require_roles(UserRole.citizen))):
    row = db.get(FamilyMember, member_id)
    if not row or row.user_id != user.id:
        raise HTTPException(status_code=404, detail="Family member not found")
    row.safety_status = payload.safety_status or payload.status or "unknown"
    row.last_checkin_at = datetime.now(timezone.utc)
    if row.location_sharing and payload.latitude is not None and payload.longitude is not None:
        row.last_latitude = payload.latitude
        row.last_longitude = payload.longitude
    db.commit()
    db.refresh(row)
    return row


@router.delete("/{member_id}", status_code=204)
def delete_family_legacy(member_id: str, db: Session = Depends(get_db), user: User = Depends(require_roles(UserRole.citizen))):
    row = db.get(FamilyMember, member_id)
    if not row or row.user_id != user.id:
        raise HTTPException(status_code=404, detail="Family member not found")
    db.delete(row)
    db.commit()
