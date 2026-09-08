from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import get_current_user, require_roles
from app.db.session import get_db
from app.models.entities import Habitation, RelocationPlan, RelocationSite, User, UserRole
from app.schemas.api import RelocationCandidate, RelocationPlanCreate, RelocationPlanOut, RelocationRecommendRequest, RelocationSiteCreate, RelocationSiteOut
from app.services.relocation_engine import rank_sites

router = APIRouter(prefix="/relocation", tags=["relocation"])
ROLES = (UserRole.administrator, UserRole.authority, UserRole.district_officer)


@router.get("/sites", response_model=list[RelocationSiteOut])
def list_sites(district: str | None = None, verified_only: bool = False, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    stmt = select(RelocationSite)
    if district:
        stmt = stmt.where(RelocationSite.district == district)
    if verified_only:
        stmt = stmt.where(RelocationSite.verified.is_(True))
    return db.scalars(stmt.order_by(RelocationSite.name)).all()


@router.post("/sites", response_model=RelocationSiteOut, status_code=201)
def create_site(payload: RelocationSiteCreate, db: Session = Depends(get_db), _: User = Depends(require_roles(*ROLES))):
    if db.scalar(select(RelocationSite).where(RelocationSite.code == payload.code)):
        raise HTTPException(status_code=409, detail="Relocation site code already exists")
    row = RelocationSite(**payload.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.post("/recommend/{habitation_id}", response_model=list[RelocationCandidate])
def recommend(habitation_id: str, payload: RelocationRecommendRequest, db: Session = Depends(get_db), _: User = Depends(require_roles(*ROLES))):
    h = db.get(Habitation, habitation_id)
    if not h:
        raise HTTPException(status_code=404, detail="Habitation not found")
    sites = db.scalars(select(RelocationSite).where(RelocationSite.verified.is_(True))).all()
    if not sites:
        raise HTTPException(status_code=422, detail="No verified relocation sites are available")
    return rank_sites(h, list(sites), payload.population_to_relocate, payload.weights, payload.max_distance_km)


@router.get("/plans", response_model=list[RelocationPlanOut])
def list_plans(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return db.scalars(select(RelocationPlan).order_by(RelocationPlan.created_at.desc())).all()


@router.post("/plans", response_model=RelocationPlanOut, status_code=201)
def create_plan(payload: RelocationPlanCreate, db: Session = Depends(get_db), user: User = Depends(require_roles(*ROLES))):
    if not db.get(Habitation, payload.habitation_id):
        raise HTTPException(status_code=404, detail="Habitation not found")
    site = db.get(RelocationSite, payload.selected_site_id)
    if not site:
        raise HTTPException(status_code=404, detail="Relocation site not found")
    if site.available_capacity < payload.population_to_relocate:
        raise HTTPException(status_code=422, detail="Selected site does not have enough available capacity")
    row = RelocationPlan(**payload.model_dump(), created_by=user.id)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row
