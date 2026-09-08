from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.routes.ws import manager
from app.core.security import get_current_user, require_roles
from app.db.session import get_db
from app.models.entities import EmergencyContact, SOSRequest, User, UserRole, WorkflowStatus
from app.schemas.api import PublicSOSCreate, SOSAssign, SOSCreate, SOSOut, SOSStatusUpdate
from app.services.notification_service import notify_family_sms
from app.services.sos_priority import calculate_sos_priority

router = APIRouter(prefix="/sos", tags=["sos"])
AUTHORITY = (UserRole.administrator, UserRole.authority, UserRole.district_officer, UserRole.field_officer)


@router.post("/public", response_model=SOSOut, status_code=201)
async def create_public_sos(payload: PublicSOSCreate, db: Session = Depends(get_db)):
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=10)
    recent = (
        db.scalar(
            select(func.count())
            .select_from(SOSRequest)
            .where(SOSRequest.phone == payload.phone, SOSRequest.created_at >= cutoff)
        )
        or 0
    )
    if recent >= 3:
        raise HTTPException(
            status_code=429,
            detail="Too many recent SOS requests for this phone number. If this is an emergency, contact local emergency services directly.",
        )
    row = SOSRequest(
        user_id=None,
        caller_name=payload.caller_name,
        phone=payload.phone,
        latitude=payload.latitude,
        longitude=payload.longitude,
        hazard_type=payload.hazard_type,
        message=payload.message,
        transcript=payload.transcript,
        special_needs=payload.special_needs,
        people_count=payload.people_count,
        status=WorkflowStatus.new,
        priority_score=calculate_sos_priority(
            payload.hazard_type, payload.special_needs, payload.people_count, payload.message or payload.transcript
        ),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    await manager.broadcast(
        {
            "type": "sos_created",
            "payload": {
                "id": row.id,
                "status": row.status.value,
                "priority_score": row.priority_score,
                "latitude": row.latitude,
                "longitude": row.longitude,
                "public": True,
            },
        }
    )
    return row


@router.post("", response_model=SOSOut, status_code=201)
async def create_sos(payload: SOSCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    row = SOSRequest(
        user_id=user.id,
        caller_name=payload.caller_name or user.full_name,
        phone=payload.phone or user.phone,
        latitude=payload.latitude,
        longitude=payload.longitude,
        hazard_type=payload.hazard_type,
        message=payload.message,
        transcript=payload.transcript,
        special_needs=payload.special_needs,
        people_count=payload.people_count,
        status=WorkflowStatus.new,
        priority_score=calculate_sos_priority(
            payload.hazard_type, payload.special_needs, payload.people_count, payload.message or payload.transcript
        ),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    await manager.broadcast(
        {
            "type": "sos_created",
            "payload": {
                "id": row.id,
                "status": row.status.value,
                "priority_score": row.priority_score,
                "latitude": row.latitude,
                "longitude": row.longitude,
            },
        }
    )

    # Notify emergency contacts
    contacts = db.scalars(select(EmergencyContact).where(EmergencyContact.user_id == user.id, EmergencyContact.sms_enabled == True)).all()
    contact_msg = f"EMERGENCY ALERT: {user.full_name} activated SOS. Coordinates: {row.latitude:.5f}, {row.longitude:.5f}."
    for c in contacts:
        await notify_family_sms(db, user.id, f"{contact_msg} (Notified: {c.name})")

    # Also notify family members if SMS enabled
    await notify_family_sms(
        db,
        user.id,
        f"Emergency alert: {user.full_name} activated SOS. Last known coordinates: {row.latitude:.5f}, {row.longitude:.5f}. Follow official instructions.",
    )
    return row


@router.get("/my", response_model=list[SOSOut])
def list_my_sos(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return db.scalars(select(SOSRequest).where(SOSRequest.user_id == user.id).order_by(SOSRequest.created_at.desc())).all()


@router.get("/active", response_model=list[SOSOut])
def list_active_sos(db: Session = Depends(get_db), _: User = Depends(require_roles(*AUTHORITY))):
    active_statuses = [
        WorkflowStatus.new,
        WorkflowStatus.active,
        WorkflowStatus.acknowledged,
        WorkflowStatus.assigned,
        WorkflowStatus.en_route,
        WorkflowStatus.contacted,
        WorkflowStatus.evacuating,
    ]
    return (
        db.scalars(
            select(SOSRequest)
            .where(SOSRequest.status.in_(active_statuses))
            .order_by(SOSRequest.priority_score.desc(), SOSRequest.created_at.desc())
        )
        .all()
    )


@router.get("", response_model=list[SOSOut])
def list_sos(status: WorkflowStatus | None = None, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    stmt = select(SOSRequest)
    if user.role in {UserRole.citizen, UserRole.family_member}:
        stmt = stmt.where(SOSRequest.user_id == user.id)
        return db.scalars(stmt.order_by(SOSRequest.created_at.desc())).all()
    if status:
        stmt = stmt.where(SOSRequest.status == status)
    return db.scalars(stmt.order_by(SOSRequest.priority_score.desc(), SOSRequest.created_at.desc())).all()


@router.post("/{sos_id}/assign", response_model=SOSOut)
@router.patch("/{sos_id}/assign", response_model=SOSOut)
async def assign_sos(
    sos_id: str,
    payload: SOSAssign,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.administrator, UserRole.authority, UserRole.district_officer)),
):
    row = db.get(SOSRequest, sos_id)
    assignee = db.get(User, payload.assigned_to)
    if not row or not assignee:
        raise HTTPException(status_code=404, detail="SOS or assignee not found")
    if assignee.role not in {UserRole.field_officer, UserRole.authority, UserRole.district_officer}:
        raise HTTPException(status_code=422, detail="Assignee must be an operational responder")
    row.assigned_to = assignee.id
    row.status = WorkflowStatus.assigned
    row.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(row)
    await manager.broadcast(
        {"type": "sos_updated", "payload": {"id": row.id, "status": row.status.value, "assigned_to": row.assigned_to}}
    )
    return row


@router.patch("/{sos_id}/status", response_model=SOSOut)
async def update_status(
    sos_id: str,
    payload: SOSStatusUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(*AUTHORITY)),
):
    row = db.get(SOSRequest, sos_id)
    if not row:
        raise HTTPException(status_code=404, detail="SOS not found")
    row.status = payload.status
    row.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(row)
    await manager.broadcast({"type": "sos_updated", "payload": {"id": row.id, "status": row.status.value}})
    return row
