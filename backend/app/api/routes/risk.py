import math
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import get_current_user, require_roles
from app.db.session import get_db
from app.models.entities import Habitation, HazardType, RiskAssessment, User, UserRole
from app.schemas.api import RiskAssessmentOut, RiskAssessmentRequest
from app.services.risk_engine import assess_risk

router = APIRouter(prefix="/risk", tags=["risk"])


@router.get("/assessments", response_model=list[RiskAssessmentOut])
def list_assessments(habitation_id: str | None = None, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    stmt = select(RiskAssessment)
    if habitation_id:
        stmt = stmt.where(RiskAssessment.habitation_id == habitation_id)
    return db.scalars(stmt.order_by(RiskAssessment.created_at.desc()).limit(250)).all()


@router.post("/assess/{habitation_id}", response_model=RiskAssessmentOut)
def create_assessment(habitation_id: str, payload: RiskAssessmentRequest, db: Session = Depends(get_db), user: User = Depends(require_roles(UserRole.administrator, UserRole.authority, UserRole.district_officer))):
    h = db.get(Habitation, habitation_id)
    if not h:
        raise HTTPException(status_code=404, detail="Habitation not found")
    try:
        result = assess_risk(db, h, payload.hazard_type, payload.horizon_years)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    row = RiskAssessment(
        habitation_id=h.id,
        hazard_type=payload.hazard_type,
        current_score=result["current_score"],
        future_score=result["future_score"],
        horizon_years=payload.horizon_years,
        risk_class=result["risk_class"],
        confidence=result["confidence"],
        methodology=result["methodology"],
        factor_contributions=result["factor_contributions"],
        evidence_summary=result["evidence_summary"],
        missing_inputs=result["missing_inputs"],
        created_by=user.id,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371.0088
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlambda / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


@router.get("/outlook")
def risk_outlook(
    latitude: float | None = None,
    longitude: float | None = None,
    horizon_years: int = 5,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Read-only future planning-risk outlook for citizen and authority dashboards.

    The endpoint selects the nearest stored habitation when coordinates are supplied; otherwise it
    prefers the authenticated user's district. It computes transparent risk estimates without
    persisting a new assessment. It is a planning aid, not an exact disaster prediction.
    """
    horizon_years = max(1, min(int(horizon_years), 30))
    habitations = db.scalars(select(Habitation)).all()
    if not habitations:
        return {
            "habitation": None,
            "horizon_years": horizon_years,
            "predictions": [],
            "statement": "No habitation evidence is available yet.",
        }

    candidates = habitations
    if user.district:
        district_matches = [h for h in habitations if h.district.lower() == user.district.lower()]
        if district_matches:
            candidates = district_matches

    if latitude is not None and longitude is not None:
        habitation = min(candidates, key=lambda h: _haversine_km(latitude, longitude, h.latitude, h.longitude))
        distance_km = round(_haversine_km(latitude, longitude, habitation.latitude, habitation.longitude), 2)
    else:
        habitation = candidates[0]
        distance_km = None

    hazards = [
        HazardType.flood,
        HazardType.landslide,
        HazardType.cyclone,
        HazardType.heavy_rainfall,
        HazardType.fire,
        HazardType.multi_hazard,
    ]
    predictions = []
    for hazard in hazards:
        try:
            result = assess_risk(db, habitation, hazard, horizon_years)
        except ValueError:
            continue
        current_score = float(result["current_score"])
        future_score = float(result["future_score"])
        delta = round(future_score - current_score, 1)
        predictions.append({
            "hazard_type": hazard.value,
            "current_score": current_score,
            "future_score": future_score,
            "delta": delta,
            "trend": "rising" if delta > 1 else "stable" if delta >= -1 else "falling",
            "risk_class": result["risk_class"].value,
            "confidence": result["confidence"],
            "factor_contributions": result["factor_contributions"],
            "missing_inputs": result["missing_inputs"],
        })

    predictions.sort(key=lambda x: x["future_score"], reverse=True)
    return {
        "habitation": {
            "id": habitation.id,
            "name": habitation.name,
            "district": habitation.district,
            "state": habitation.state,
            "latitude": habitation.latitude,
            "longitude": habitation.longitude,
            "distance_km": distance_km,
        },
        "horizon_years": horizon_years,
        "predictions": predictions,
        "highest_risk": predictions[0] if predictions else None,
        "methodology": "Explainable weighted multi-factor trend projection",
        "statement": "Future planning-risk estimate only; it does not predict an exact disaster date or guarantee an event.",
    }


@router.get("/future-zones")
def future_zones(hazard_type: HazardType | None = None, min_score: float = 60, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    """Returns planning exposure envelopes around habitation points from latest risk scores.

    These are not official hazard polygons. Radius is derived from future risk score and is exposed in properties.
    """
    assessments = db.scalars(select(RiskAssessment).order_by(RiskAssessment.created_at.desc())).all()
    latest = {}
    for a in assessments:
        if hazard_type and a.hazard_type != hazard_type:
            continue
        latest.setdefault((a.habitation_id, a.hazard_type.value), a)
    features = []
    for a in latest.values():
        if a.future_score < min_score:
            continue
        h = db.get(Habitation, a.habitation_id)
        if not h:
            continue
        radius_km = max(0.25, (a.future_score - min_score + 5) * 0.04)
        # GeoJSON circle approximation around the habitation. Methodology is explicit.
        coords = []
        lat_scale = 111.32
        lon_scale = 111.32 * max(0.2, math.cos(math.radians(h.latitude)))
        for i in range(64):
            angle = 2 * math.pi * i / 64
            lat = h.latitude + (radius_km / lat_scale) * math.sin(angle)
            lon = h.longitude + (radius_km / lon_scale) * math.cos(angle)
            coords.append([lon, lat])
        coords.append(coords[0])
        features.append({
            "type": "Feature",
            "geometry": {"type": "Polygon", "coordinates": [coords]},
            "properties": {
                "habitation_id": h.id,
                "name": h.name,
                "hazard_type": a.hazard_type.value,
                "future_score": a.future_score,
                "horizon_years": a.horizon_years,
                "confidence": a.confidence,
                "radius_km": round(radius_km, 2),
                "status": "planning_exposure_envelope",
                "methodology": "Circular planning envelope derived from future risk score; not an official hazard boundary.",
            },
        })
    return {"type": "FeatureCollection", "features": features}
