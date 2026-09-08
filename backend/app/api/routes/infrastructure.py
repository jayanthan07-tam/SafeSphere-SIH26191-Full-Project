from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import get_current_user, require_roles
from app.db.session import get_db
from app.models.entities import EvacuationRoute, InfrastructureAsset, User, UserRole
from app.providers.routing import route
from app.schemas.api import InfrastructureCreate, InfrastructureOut, RouteOut, RouteRequest

router = APIRouter(prefix="/infrastructure", tags=["infrastructure"])
ROLES = (UserRole.administrator, UserRole.authority, UserRole.district_officer, UserRole.field_officer)


@router.get("/assets", response_model=list[InfrastructureOut])
def list_assets(district: str | None = None, asset_type: str | None = None, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    stmt = select(InfrastructureAsset)
    if district:
        stmt = stmt.where(InfrastructureAsset.district == district)
    if asset_type:
        stmt = stmt.where(InfrastructureAsset.asset_type == asset_type)
    return db.scalars(stmt.order_by(InfrastructureAsset.name)).all()


@router.post("/assets", response_model=InfrastructureOut, status_code=201)
def create_asset(payload: InfrastructureCreate, db: Session = Depends(get_db), _: User = Depends(require_roles(*ROLES))):
    row = InfrastructureAsset(**payload.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.post("/route", response_model=RouteOut)
async def calculate_route(payload: RouteRequest, db: Session = Depends(get_db), user: User = Depends(require_roles(*ROLES, UserRole.citizen))):
    try:
        result = await route(payload.source_latitude, payload.source_longitude, payload.destination_latitude, payload.destination_longitude)
    except Exception as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    row = EvacuationRoute(
        name=f"{payload.source_name or 'Source'} to {payload.destination_name or 'Destination'}",
        source_name=payload.source_name,
        destination_name=payload.destination_name,
        source_latitude=payload.source_latitude,
        source_longitude=payload.source_longitude,
        destination_latitude=payload.destination_latitude,
        destination_longitude=payload.destination_longitude,
        distance_km=result["distance_km"],
        duration_minutes=result["duration_minutes"],
        path_geojson=result["geometry"],
        provider=result["provider"],
        created_by=user.id,
    )
    db.add(row)
    db.commit()
    return result
