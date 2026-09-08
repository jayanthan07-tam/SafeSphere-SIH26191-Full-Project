from fastapi import APIRouter, Depends
from app.core.security import require_roles
from app.models.entities import User, UserRole
from app.schemas.api import CostEstimateOut, CostEstimateRequest, InactionEstimateOut, InactionEstimateRequest
from app.services.cost_engine import estimate_inaction, estimate_relocation_cost

router = APIRouter(prefix="/costs", tags=["costs"])
ROLES = (UserRole.administrator, UserRole.authority, UserRole.district_officer)


@router.post("/relocation", response_model=CostEstimateOut)
def relocation_cost(payload: CostEstimateRequest, _: User = Depends(require_roles(*ROLES))):
    return estimate_relocation_cost(payload.households, payload.population, payload.assumptions, payload.contingency_percent)


@router.post("/inaction", response_model=InactionEstimateOut)
def inaction_cost(payload: InactionEstimateRequest, _: User = Depends(require_roles(*ROLES))):
    return estimate_inaction(payload.relocation_cost, payload.loss_assumptions)
