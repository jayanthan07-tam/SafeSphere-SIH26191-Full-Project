from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.entities import Alert, FamilyMember, NotificationDelivery, User
from app.providers.sms import get_sms_provider


async def deliver_alert_sms(db: Session, alert: Alert) -> list[NotificationDelivery]:
    provider = get_sms_provider()
    q = select(User).where(User.is_active.is_(True), User.phone.is_not(None))
    if alert.state:
        q = q.where(User.state == alert.state)
    if alert.district:
        q = q.where(User.district == alert.district)
    if alert.taluk:
        q = q.where(User.taluk == alert.taluk)
    if alert.locality:
        q = q.where(User.locality == alert.locality)
    users = db.scalars(q).all()
    deliveries = []
    for user in users:
        result = await provider.send(user.phone or "", f"{alert.title}: {alert.message}")
        row = NotificationDelivery(
            alert_id=alert.id,
            recipient=user.phone or "",
            channel="sms",
            provider=result.provider,
            status=result.status,
            provider_message_id=result.provider_message_id,
            error_message=result.error,
        )
        db.add(row)
        deliveries.append(row)
    db.commit()
    return deliveries


async def notify_family_sms(db: Session, user_id: str, message: str) -> list[NotificationDelivery]:
    provider = get_sms_provider()
    members = db.scalars(select(FamilyMember).where(FamilyMember.user_id == user_id, FamilyMember.sms_enabled.is_(True))).all()
    deliveries = []
    for member in members:
        result = await provider.send(member.phone, message)
        row = NotificationDelivery(
            recipient=member.phone,
            channel="sms",
            provider=result.provider,
            status=result.status,
            provider_message_id=result.provider_message_id,
            error_message=result.error,
        )
        db.add(row)
        deliveries.append(row)
    db.commit()
    return deliveries
