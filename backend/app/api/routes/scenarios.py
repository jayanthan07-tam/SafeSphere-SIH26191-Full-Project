from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import get_current_user, require_roles
from app.db.session import get_db
from app.models.entities import Habitation, Scenario, User, UserRole
from app.schemas.api import ScenarioCreate, ScenarioOut
from app.services.scenario_engine import run_scenario

router = APIRouter(prefix="/scenarios", tags=["scenarios"])


@router.get("", response_model=list[ScenarioOut])
def list_scenarios(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return db.scalars(select(Scenario).order_by(Scenario.created_at.desc())).all()


@router.post("", response_model=ScenarioOut, status_code=201)
def create_scenario(payload: ScenarioCreate, db: Session = Depends(get_db), user: User = Depends(require_roles(UserRole.administrator, UserRole.authority, UserRole.district_officer))):
    habitation = None
    if payload.habitation_id:
        habitation = db.get(Habitation, payload.habitation_id)
        if not habitation:
            raise HTTPException(status_code=404, detail="Habitation not found")
    results = run_scenario(habitation, payload.parameters)
    row = Scenario(name=payload.name, habitation_id=payload.habitation_id, parameters=payload.parameters, results=results, created_by=user.id)
    db.add(row); db.commit(); db.refresh(row)
    return row
