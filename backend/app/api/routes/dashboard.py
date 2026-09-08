from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db.session import get_db
from app.models.entities import Alert, CitizenReport, Habitation, RelocationSite, RiskAssessment, SOSRequest, User, WorkflowStatus
from app.schemas.api import DashboardSummary

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=DashboardSummary)
def summary(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    habitations = db.scalar(select(func.count()).select_from(Habitation)) or 0
    latest_high = db.scalar(select(func.count()).select_from(RiskAssessment).where(RiskAssessment.future_score >= 60)) or 0
    active_sos = db.scalar(select(func.count()).select_from(SOSRequest).where(SOSRequest.status.not_in([WorkflowStatus.resolved]))) or 0
    pending_reports = db.scalar(select(func.count()).select_from(CitizenReport).where(CitizenReport.status.in_([WorkflowStatus.pending, WorkflowStatus.under_review]))) or 0
    published_alerts = db.scalar(select(func.count()).select_from(Alert).where(Alert.status == WorkflowStatus.published)) or 0
    sites = db.scalar(select(func.count()).select_from(RelocationSite)) or 0
    verified_sites = db.scalar(select(func.count()).select_from(RelocationSite).where(RelocationSite.verified.is_(True))) or 0
    return DashboardSummary(habitations=habitations, latest_high_or_critical=latest_high, active_sos=active_sos, pending_citizen_reports=pending_reports, published_alerts=published_alerts, relocation_sites=sites, verified_relocation_sites=verified_sites)
