import csv
import io
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.core.security import get_current_user, require_roles
from app.db.session import get_db
from app.models.entities import Habitation, User, UserRole
from app.schemas.api import HabitationCreate, HabitationOut, HabitationUpdate

router = APIRouter(prefix="/habitations", tags=["habitations"])

AUTHORITY_ROLES = (UserRole.administrator, UserRole.authority, UserRole.district_officer)


@router.get("", response_model=list[HabitationOut])
def list_habitations(q: str | None = None, district: str | None = None, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    stmt = select(Habitation)
    if q:
        like = f"%{q}%"
        stmt = stmt.where(or_(Habitation.name.ilike(like), Habitation.code.ilike(like)))
    if district:
        stmt = stmt.where(Habitation.district == district)
    return db.scalars(stmt.order_by(Habitation.name)).all()


@router.get("/{habitation_id}", response_model=HabitationOut)
def get_habitation(habitation_id: str, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    item = db.get(Habitation, habitation_id)
    if not item:
        raise HTTPException(status_code=404, detail="Habitation not found")
    return item


@router.post("", response_model=HabitationOut, status_code=201)
def create_habitation(payload: HabitationCreate, db: Session = Depends(get_db), _: User = Depends(require_roles(*AUTHORITY_ROLES))):
    if db.scalar(select(Habitation).where(Habitation.code == payload.code)):
        raise HTTPException(status_code=409, detail="Habitation code already exists")
    row = Habitation(**payload.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.patch("/{habitation_id}", response_model=HabitationOut)
def update_habitation(habitation_id: str, payload: HabitationUpdate, db: Session = Depends(get_db), _: User = Depends(require_roles(*AUTHORITY_ROLES))):
    row = db.get(Habitation, habitation_id)
    if not row:
        raise HTTPException(status_code=404, detail="Habitation not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(row, key, value)
    db.commit()
    db.refresh(row)
    return row


@router.post("/import-csv")
async def import_csv(file: UploadFile = File(...), db: Session = Depends(get_db), _: User = Depends(require_roles(*AUTHORITY_ROLES))):
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="CSV file required")
    raw = await file.read()
    reader = csv.DictReader(io.StringIO(raw.decode("utf-8-sig")))
    required = {"code", "name", "state", "district", "taluk", "latitude", "longitude", "population", "households"}
    if not reader.fieldnames or not required.issubset(reader.fieldnames):
        raise HTTPException(status_code=400, detail=f"Missing required columns: {sorted(required)}")
    imported, errors = 0, []
    float_fields = ["vulnerability_score", "infrastructure_resilience_score", "drainage_score", "elevation_m", "slope_deg", "river_distance_km", "rainfall_trend_percent", "land_use_change_percent", "population_growth_rate_percent"]
    for line_no, item in enumerate(reader, start=2):
        try:
            if db.scalar(select(Habitation).where(Habitation.code == item["code"])):
                raise ValueError("duplicate code")
            kwargs = {
                "code": item["code"], "name": item["name"], "state": item["state"], "district": item["district"], "taluk": item["taluk"],
                "latitude": float(item["latitude"]), "longitude": float(item["longitude"]), "population": int(item["population"]), "households": int(item["households"]),
            }
            for field in float_fields:
                if field in item and item[field] not in (None, ""):
                    kwargs[field] = float(item[field])
            db.add(Habitation(**kwargs))
            imported += 1
        except Exception as exc:
            errors.append({"line": line_no, "error": str(exc)})
    db.commit()
    return {"imported": imported, "errors": errors}
