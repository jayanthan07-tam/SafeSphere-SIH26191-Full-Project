from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import get_current_user, require_roles
from app.db.session import get_db
from app.models.entities import Report, User, UserRole, WorkflowStatus
from app.schemas.api import ReportCreate, ReportOut
from app.services.report_service import report_to_pdf

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("", response_model=list[ReportOut])
def list_reports(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return db.scalars(select(Report).order_by(Report.created_at.desc())).all()


@router.post("", response_model=ReportOut, status_code=201)
def create_report(payload: ReportCreate, db: Session = Depends(get_db), user: User = Depends(require_roles(UserRole.administrator, UserRole.authority, UserRole.district_officer))):
    row = Report(**payload.model_dump(), created_by=user.id)
    db.add(row); db.commit(); db.refresh(row)
    return row


@router.post("/{report_id}/review", response_model=ReportOut)
def review_report(report_id: str, db: Session = Depends(get_db), user: User = Depends(require_roles(UserRole.administrator, UserRole.authority))):
    row = db.get(Report, report_id)
    if not row:
        raise HTTPException(status_code=404, detail="Report not found")
    row.status = WorkflowStatus.reviewed
    row.reviewed_by = user.id
    row.reviewed_at = datetime.now(timezone.utc)
    db.commit(); db.refresh(row)
    return row


@router.get("/{report_id}/pdf")
def download_pdf(report_id: str, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    row = db.get(Report, report_id)
    if not row:
        raise HTTPException(status_code=404, detail="Report not found")
    data = report_to_pdf(row.title, row.scope, row.content)
    filename = f"{row.report_type}-{row.id}.pdf"
    return Response(data, media_type="application/pdf", headers={"Content-Disposition": f'attachment; filename="{filename}"'})
