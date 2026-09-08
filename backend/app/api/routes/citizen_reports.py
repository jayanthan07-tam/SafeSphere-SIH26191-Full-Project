from pathlib import Path
import uuid
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import get_current_user, require_roles
from app.db.session import get_db
from app.models.entities import CitizenReport, User, UserRole, WorkflowStatus
from app.schemas.api import CitizenReportCreate, CitizenReportOut, CitizenReportVerify

router = APIRouter(prefix="/citizen-reports", tags=["citizen reports"])


@router.get("", response_model=list[CitizenReportOut])
def list_reports(status: WorkflowStatus | None = None, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    stmt = select(CitizenReport)
    if user.role == UserRole.citizen:
        stmt = stmt.where(CitizenReport.user_id == user.id)
    if status:
        stmt = stmt.where(CitizenReport.status == status)
    return db.scalars(stmt.order_by(CitizenReport.created_at.desc())).all()


@router.post("", response_model=CitizenReportOut, status_code=201)
def create_report(payload: CitizenReportCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    row = CitizenReport(user_id=user.id, **payload.model_dump())
    db.add(row); db.commit(); db.refresh(row)
    return row


@router.post("/{report_id}/evidence")
async def upload_evidence(report_id: str, file: UploadFile = File(...), db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    row = db.get(CitizenReport, report_id)
    if not row or (user.role == UserRole.citizen and row.user_id != user.id):
        raise HTTPException(status_code=404, detail="Report not found")
    allowed = {"image/jpeg", "image/png", "image/webp", "video/mp4"}
    if file.content_type not in allowed:
        raise HTTPException(status_code=415, detail="Unsupported evidence file type")
    data = await file.read()
    s = get_settings()
    if len(data) > s.max_upload_mb * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Evidence file is too large")
    suffix = Path(file.filename or "evidence").suffix.lower() or ".bin"
    name = f"{uuid.uuid4()}{suffix}"
    path = s.upload_path / name
    path.write_bytes(data)
    row.evidence_url = f"/uploads/{name}"
    db.commit()
    return {"evidence_url": row.evidence_url}


@router.patch("/{report_id}/verify", response_model=CitizenReportOut)
def verify_report(report_id: str, payload: CitizenReportVerify, db: Session = Depends(get_db), user: User = Depends(require_roles(UserRole.administrator, UserRole.authority, UserRole.district_officer, UserRole.field_officer))):
    row = db.get(CitizenReport, report_id)
    if not row:
        raise HTTPException(status_code=404, detail="Report not found")
    row.status = WorkflowStatus(payload.status)
    row.verification_notes = payload.verification_notes
    row.verified_by = user.id
    db.commit(); db.refresh(row)
    return row
