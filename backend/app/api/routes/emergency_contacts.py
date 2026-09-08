from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db.session import get_db
from app.models.entities import User
from app.schemas.api import EmergencyContactCreate, EmergencyContactOut, EmergencyContactUpdate
from app.services.emergency_contact_service import (
    create_contact,
    delete_contact,
    list_contacts,
    update_contact,
)

router = APIRouter(prefix="/emergency-contacts", tags=["emergency-contacts"])


@router.get("", response_model=list[EmergencyContactOut])
def get_emergency_contacts(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return list_contacts(db, user)


@router.post("", response_model=EmergencyContactOut, status_code=status.HTTP_201_CREATED)
def add_emergency_contact(
    payload: EmergencyContactCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return create_contact(db, user, payload)


@router.put("/{contact_id}", response_model=EmergencyContactOut)
def modify_emergency_contact(
    contact_id: str,
    payload: EmergencyContactUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return update_contact(db, user, contact_id, payload)


@router.delete("/{contact_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_emergency_contact(
    contact_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    delete_contact(db, user, contact_id)
