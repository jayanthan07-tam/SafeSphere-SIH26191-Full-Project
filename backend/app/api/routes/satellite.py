from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import get_current_user, require_roles
from app.db.session import get_db
from app.models.entities import SatelliteChange, User, UserRole, WorkflowStatus
from app.schemas.api import SatelliteChangeCreate, SatelliteChangeOut

router = APIRouter(prefix="/satellite", tags=["satellite"])


@router.get("/changes", response_model=list[SatelliteChangeOut])
def list_changes(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return db.scalars(select(SatelliteChange).order_by(SatelliteChange.created_at.desc())).all()


@router.post("/changes", response_model=SatelliteChangeOut, status_code=201)
def create_change(payload: SatelliteChangeCreate, db: Session = Depends(get_db), user: User = Depends(require_roles(UserRole.administrator, UserRole.authority, UserRole.district_officer))):
    if payload.end_date <= payload.start_date:
        raise HTTPException(status_code=422, detail="end_date must be after start_date")
    row = SatelliteChange(**payload.model_dump(), created_by=user.id)
    db.add(row); db.commit(); db.refresh(row)
    return row


@router.patch("/changes/{change_id}/verify", response_model=SatelliteChangeOut)
def verify_change(change_id: str, notes: str = "", db: Session = Depends(get_db), _: User = Depends(require_roles(UserRole.administrator, UserRole.authority, UserRole.district_officer, UserRole.field_officer))):
    row = db.get(SatelliteChange, change_id)
    if not row:
        raise HTTPException(status_code=404, detail="Change record not found")
    row.status = WorkflowStatus.verified
    row.verification_notes = notes
    db.commit(); db.refresh(row)
    return row
