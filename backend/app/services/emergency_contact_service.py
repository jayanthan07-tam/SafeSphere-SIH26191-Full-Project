from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.entities import EmergencyContact, User, UserRole
from app.schemas.api import EmergencyContactCreate, EmergencyContactOut, EmergencyContactUpdate


def list_contacts(db: Session, user: User) -> list[EmergencyContact]:
    return (
        db.scalars(
            select(EmergencyContact)
            .where(EmergencyContact.user_id == user.id)
            .order_by(EmergencyContact.priority.asc(), EmergencyContact.created_at.asc())
        )
        .all()
    )


def create_contact(db: Session, user: User, payload: EmergencyContactCreate) -> EmergencyContact:
    priority = payload.priority.lower().strip()
    if priority not in {"primary", "secondary"}:
        priority = "primary"

    contact = EmergencyContact(
        user_id=user.id,
        name=payload.name.strip(),
        relationship=payload.relationship.strip(),
        phone_number=payload.phone_number.strip(),
        sms_enabled=payload.sms_enabled,
        priority=priority,
    )
    db.add(contact)
    db.commit()
    db.refresh(contact)
    return contact


def update_contact(db: Session, user: User, contact_id: str, payload: EmergencyContactUpdate) -> EmergencyContact:
    contact = db.get(EmergencyContact, contact_id)
    if not contact or contact.user_id != user.id:
        raise HTTPException(status_code=404, detail="Emergency contact not found.")

    if payload.name is not None:
        contact.name = payload.name.strip()
    if payload.relationship is not None:
        contact.relationship = payload.relationship.strip()
    if payload.phone_number is not None:
        contact.phone_number = payload.phone_number.strip()
    if payload.sms_enabled is not None:
        contact.sms_enabled = payload.sms_enabled
    if payload.priority is not None:
        p = payload.priority.lower().strip()
        if p in {"primary", "secondary"}:
            contact.priority = p

    db.commit()
    db.refresh(contact)
    return contact


def delete_contact(db: Session, user: User, contact_id: str) -> None:
    contact = db.get(EmergencyContact, contact_id)
    if not contact or contact.user_id != user.id:
        raise HTTPException(status_code=404, detail="Emergency contact not found.")
    db.delete(contact)
    db.commit()
