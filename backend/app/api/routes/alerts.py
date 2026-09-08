from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import get_current_user, require_roles
from app.db.session import get_db
from app.models.entities import Alert, AlertSeverity, NotificationDelivery, User, UserRole, WorkflowStatus
from app.schemas.api import AlertCreate, AlertOut
from app.services.notification_service import deliver_alert_sms

router = APIRouter(prefix="/alerts", tags=["alerts"])


@router.get("", response_model=list[AlertOut])
def list_alerts(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    stmt = select(Alert)
    if user.role == UserRole.citizen:
        stmt = stmt.where(Alert.status == WorkflowStatus.published)
        if user.state:
            stmt = stmt.where((Alert.state.is_(None)) | (Alert.state == user.state))
        if user.district:
            stmt = stmt.where((Alert.district.is_(None)) | (Alert.district == user.district))
    return db.scalars(stmt.order_by(Alert.created_at.desc())).all()


@router.post("", response_model=AlertOut, status_code=201)
def create_alert(payload: AlertCreate, db: Session = Depends(get_db), user: User = Depends(require_roles(UserRole.administrator, UserRole.authority, UserRole.district_officer))):
    row = Alert(**payload.model_dump(), created_by=user.id)
    db.add(row); db.commit(); db.refresh(row)
    return row


@router.post("/{alert_id}/publish")
async def publish_alert(alert_id: str, db: Session = Depends(get_db), _: User = Depends(require_roles(UserRole.administrator, UserRole.authority, UserRole.district_officer))):
    row = db.get(Alert, alert_id)
    if not row:
        raise HTTPException(status_code=404, detail="Alert not found")
    row.status = WorkflowStatus.published
    row.published_at = datetime.now(timezone.utc)
    db.commit(); db.refresh(row)
    deliveries = []
    if "sms" in row.channels:
        deliveries = await deliver_alert_sms(db, row)
    return {
        "alert": AlertOut.model_validate(row),
        "sms": [{"recipient": d.recipient, "provider": d.provider, "status": d.status, "error": d.error_message} for d in deliveries],
    }


@router.get("/{alert_id}/deliveries")
def deliveries(alert_id: str, db: Session = Depends(get_db), _: User = Depends(require_roles(UserRole.administrator, UserRole.authority, UserRole.district_officer))):
    rows = db.scalars(select(NotificationDelivery).where(NotificationDelivery.alert_id == alert_id).order_by(NotificationDelivery.created_at.desc())).all()
    return [{"id": x.id, "recipient": x.recipient, "channel": x.channel, "provider": x.provider, "status": x.status, "provider_message_id": x.provider_message_id, "error": x.error_message} for x in rows]


@router.get("/{alert_id}/cap")
def alert_as_cap(alert_id: str, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    """Export an alert as a minimal OASIS Common Alerting Protocol (CAP) v1.2 XML document."""
    from xml.etree.ElementTree import Element, SubElement, tostring

    row = db.get(Alert, alert_id)
    if not row:
        raise HTTPException(status_code=404, detail="Alert not found")

    severity_map = {
        AlertSeverity.info: "Minor",
        AlertSeverity.advisory: "Moderate",
        AlertSeverity.high: "Severe",
        AlertSeverity.critical: "Extreme",
    }
    urgency = "Immediate" if row.severity in {AlertSeverity.high, AlertSeverity.critical} else "Expected"
    certainty = "Likely" if row.severity in {AlertSeverity.high, AlertSeverity.critical} else "Possible"
    sent = (row.published_at or row.created_at).isoformat()

    root = Element("alert", {"xmlns": "urn:oasis:names:tc:emergency:cap:1.2"})
    SubElement(root, "identifier").text = row.id
    SubElement(root, "sender").text = "disaster-management-platform"
    SubElement(root, "sent").text = sent
    SubElement(root, "status").text = "Actual" if row.status == WorkflowStatus.published else "Test"
    SubElement(root, "msgType").text = "Alert"
    SubElement(root, "scope").text = "Public"

    info = SubElement(root, "info")
    SubElement(info, "language").text = "en-IN"
    SubElement(info, "category").text = "Safety"
    SubElement(info, "event").text = row.hazard_type.value.replace("_", " ").title() if row.hazard_type else "Disaster Alert"
    SubElement(info, "urgency").text = urgency
    SubElement(info, "severity").text = severity_map.get(row.severity, "Moderate")
    SubElement(info, "certainty").text = certainty
    SubElement(info, "headline").text = row.title
    SubElement(info, "description").text = row.message
    area = SubElement(info, "area")
    area_parts = [row.locality, row.taluk, row.district, row.state]
    SubElement(area, "areaDesc").text = ", ".join(x for x in area_parts if x) or "Targeted alert area"

    xml = tostring(root, encoding="utf-8", xml_declaration=True)
    return Response(content=xml, media_type="application/xml", headers={"Content-Disposition": f'inline; filename="alert-{row.id}.xml"'})
