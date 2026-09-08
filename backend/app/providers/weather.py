from __future__ import annotations
import httpx


async def open_meteo_current(latitude: float, longitude: float) -> dict:
    params = {
        "latitude": latitude,
        "longitude": longitude,
        "current": "temperature_2m,precipitation,rain,wind_speed_10m",
        "hourly": "precipitation_probability,precipitation",
        "forecast_days": 2,
        "timezone": "auto",
    }
    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.get("https://api.open-meteo.com/v1/forecast", params=params)
    response.raise_for_status()
    return response.json()
