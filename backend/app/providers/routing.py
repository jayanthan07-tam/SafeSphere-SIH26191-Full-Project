from __future__ import annotations

import httpx
from app.core.config import get_settings


async def route(source_lat: float, source_lon: float, dest_lat: float, dest_lon: float) -> dict:
    s = get_settings()
    if not s.enable_external_routing:
        raise RuntimeError("External routing is disabled. Configure a routing provider before operational use.")
    url = f"{s.osrm_base_url.rstrip('/')}/route/v1/driving/{source_lon},{source_lat};{dest_lon},{dest_lat}"
    params = {"overview": "full", "geometries": "geojson", "steps": "false"}
    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.get(url, params=params)
    response.raise_for_status()
    data = response.json()
    if data.get("code") != "Ok" or not data.get("routes"):
        raise RuntimeError("Routing provider returned no route")
    r = data["routes"][0]
    return {
        "provider": "osrm",
        "distance_km": round(r["distance"] / 1000, 2),
        "duration_minutes": round(r["duration"] / 60, 1),
        "geometry": r["geometry"],
        "warning": "Route is based on the configured routing provider. Hazard/closure avoidance requires current operational layers.",
    }
