from fastapi import APIRouter, Depends, HTTPException, Query
from app.core.security import get_current_user
from app.models.entities import User
from app.providers.weather import open_meteo_current

router = APIRouter(prefix="/weather", tags=["weather"])


@router.get("/current")
async def current(latitude: float = Query(ge=-90, le=90), longitude: float = Query(ge=-180, le=180), _: User = Depends(get_current_user)):
    try:
        return await open_meteo_current(latitude, longitude)
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Weather provider unavailable: {exc}") from exc
