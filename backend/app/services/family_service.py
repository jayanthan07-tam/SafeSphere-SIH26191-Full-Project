from datetime import datetime, timezone
import secrets
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.entities import FamilyGroup, FamilyGroupMembership, User, UserRole
from app.schemas.api import FamilyCheckIn, FamilyGroupMemberOut, FamilyGroupOut


CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"


def generate_family_join_code(db: Session) -> str:
    """
    Generate unique, non-sequential, cryptographically secure code.
    Example: DM-FAM-A72K9
    """
    while True:
        suffix = "".join(secrets.choice(CODE_CHARS) for _ in range(5))
        code = f"DM-FAM-{suffix}"
        if not db.scalar(select(FamilyGroup).where(FamilyGroup.join_code == code)):
            return code


def ensure_owner_group(db: Session, user: User) -> FamilyGroup:
    group = db.scalar(select(FamilyGroup).where(FamilyGroup.owner_user_id == user.id))
    if group:
        return group
    code = generate_family_join_code(db)
    group = FamilyGroup(
        owner_user_id=user.id,
        name=f"{user.full_name}'s Family",
        join_code=code,
    )
    db.add(group)
    db.commit()
    db.refresh(group)
    return group


def regenerate_join_code(db: Session, user: User) -> str:
    if user.role != UserRole.citizen:
        raise HTTPException(status_code=403, detail="Only citizen family owners can regenerate join codes.")
    group = ensure_owner_group(db, user)
    new_code = generate_family_join_code(db)
    group.join_code = new_code
    db.commit()
    return new_code


def get_group_for_user(db: Session, user: User) -> FamilyGroup | None:
    if user.role == UserRole.citizen:
        return ensure_owner_group(db, user)
    membership = db.scalar(select(FamilyGroupMembership).where(FamilyGroupMembership.user_id == user.id))
    if membership:
        return db.get(FamilyGroup, membership.group_id)
    return None


def join_group(db: Session, user: User, raw_code: str, relationship: str = "Family Member") -> FamilyGroup:
    if user.role != UserRole.family_member:
        raise HTTPException(status_code=403, detail="Only family member accounts can join family groups.")

    normalized_code = raw_code.strip().upper()
    if not normalized_code.startswith("DM-FAM-") and len(normalized_code) == 5:
        normalized_code = f"DM-FAM-{normalized_code}"

    group = db.scalar(select(FamilyGroup).where(FamilyGroup.join_code == normalized_code))
    if not group:
        raise HTTPException(status_code=404, detail="Invalid or expired family join code.")

    if group.owner_user_id == user.id:
        raise HTTPException(status_code=400, detail="You already own this family group.")

    membership = db.scalar(select(FamilyGroupMembership).where(FamilyGroupMembership.user_id == user.id))
    if membership:
        if membership.group_id == group.id:
            return group
        membership.group_id = group.id
        membership.relationship = relationship.strip() or "Family Member"
    else:
        membership = FamilyGroupMembership(
            group_id=group.id,
            user_id=user.id,
            relationship=relationship.strip() or "Family Member",
            safety_status="UNKNOWN",
            location_sharing=False,
            sms_alerts_enabled=True,
            special_assistance=[],
        )
        db.add(membership)

    db.commit()
    return group


def check_in_safety(
    db: Session,
    user: User,
    raw_status: str,
    location_sharing: bool | None = None,
    latitude: float | None = None,
    longitude: float | None = None,
) -> FamilyGroup:
    status_map = {
        "safe": "SAFE",
        "need_help": "NEED_HELP",
        "at_shelter": "AT_SHELTER",
        "unable_to_move": "UNABLE_TO_MOVE",
        "sos_active": "SOS_ACTIVE",
        "unknown": "UNKNOWN",
    }
    normalized_status = status_map.get(raw_status.lower().strip(), raw_status.upper().strip())
    now = datetime.now(timezone.utc)

    if user.role == UserRole.citizen:
        group = ensure_owner_group(db, user)
        group.owner_safety_status = normalized_status
        if location_sharing is not None:
            group.owner_location_sharing = location_sharing
        group.owner_last_checkin_at = now
        if group.owner_location_sharing and latitude is not None and longitude is not None:
            group.owner_last_latitude = latitude
            group.owner_last_longitude = longitude
        db.commit()
        db.refresh(group)
        return group

    membership = db.scalar(select(FamilyGroupMembership).where(FamilyGroupMembership.user_id == user.id))
    if not membership:
        raise HTTPException(status_code=404, detail="You have not joined a family group yet.")

    membership.safety_status = normalized_status
    if location_sharing is not None:
        membership.location_sharing = location_sharing
    membership.last_checkin_at = now
    if membership.location_sharing and latitude is not None and longitude is not None:
        membership.last_latitude = latitude
        membership.last_longitude = longitude

    db.commit()
    group = db.get(FamilyGroup, membership.group_id)
    return group


def serialize_family_group(db: Session, group: FamilyGroup, viewer: User) -> FamilyGroupOut:
    owner = db.get(User, group.owner_user_id)
    members: list[FamilyGroupMemberOut] = []

    if owner:
        # Privacy check: only expose coordinates if location sharing is ON
        share_loc = owner.id == viewer.id or group.owner_location_sharing
        members.append(
            FamilyGroupMemberOut(
                user_id=owner.id,
                full_name=owner.full_name,
                email=owner.email,
                relationship="Head of Household (Citizen)",
                safety_status=group.owner_safety_status or "UNKNOWN",
                status=group.owner_safety_status or "UNKNOWN",
                location_sharing=group.owner_location_sharing,
                location_sharing_enabled=group.owner_location_sharing,
                special_assistance=[],
                sms_alerts_enabled=True,
                last_latitude=group.owner_last_latitude if share_loc else None,
                last_longitude=group.owner_last_longitude if share_loc else None,
                last_checkin_at=group.owner_last_checkin_at,
                is_owner=True,
            )
        )

    rows = (
        db.scalars(
            select(FamilyGroupMembership)
            .where(FamilyGroupMembership.group_id == group.id)
            .order_by(FamilyGroupMembership.created_at)
        )
        .all()
    )

    for row in rows:
        u = db.get(User, row.user_id)
        if not u:
            continue
        share_loc = u.id == viewer.id or row.location_sharing
        members.append(
            FamilyGroupMemberOut(
                user_id=u.id,
                full_name=u.full_name,
                email=u.email,
                relationship=row.relationship or "Family Member",
                safety_status=row.safety_status or "UNKNOWN",
                status=row.safety_status or "UNKNOWN",
                location_sharing=row.location_sharing,
                location_sharing_enabled=row.location_sharing,
                special_assistance=row.special_assistance or [],
                sms_alerts_enabled=row.sms_alerts_enabled,
                last_latitude=row.last_latitude if share_loc else None,
                last_longitude=row.last_longitude if share_loc else None,
                last_checkin_at=row.last_checkin_at,
                is_owner=False,
            )
        )

    # Join code is displayed to the owner, and can also be shown to family members for sharing
    return FamilyGroupOut(
        id=group.id,
        name=group.name,
        join_code=group.join_code,
        owner_user_id=group.owner_user_id,
        members=members,
    )
