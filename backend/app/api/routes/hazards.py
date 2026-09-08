from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import get_current_user, require_roles
from app.db.session import get_db
from app.models.entities import HazardObservation, User, UserRole
from app.schemas.api import HazardObservationCreate, HazardObservationOut

router = APIRouter(prefix="/hazards", tags=["hazards"])


@router.get("/observations", response_model=list[HazardObservationOut])
def list_observations(habitation_id: str | None = None, verified: bool | None = None, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    stmt = select(HazardObservation)
    if habitation_id:
        stmt = stmt.where(HazardObservation.habitation_id == habitation_id)
    if verified is not None:
        stmt = stmt.where(HazardObservation.verified == verified)
    return db.scalars(stmt.order_by(HazardObservation.observed_at.desc())).all()


@router.post("/observations", response_model=HazardObservationOut, status_code=201)
def create_observation(payload: HazardObservationCreate, db: Session = Depends(get_db), _: User = Depends(require_roles(UserRole.administrator, UserRole.authority, UserRole.district_officer, UserRole.field_officer))):
    row = HazardObservation(**payload.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.post("/observations/{observation_id}/verify", response_model=HazardObservationOut)
def verify_observation(observation_id: str, db: Session = Depends(get_db), user: User = Depends(require_roles(UserRole.administrator, UserRole.authority, UserRole.district_officer))):
    row = db.get(HazardObservation, observation_id)
    if not row:
        raise HTTPException(status_code=404, detail="Observation not found")
    row.verified = True
    row.verified_by = user.id
    db.commit()
    db.refresh(row)
    return row
