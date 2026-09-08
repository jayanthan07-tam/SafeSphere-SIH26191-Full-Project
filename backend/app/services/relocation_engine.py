from __future__ import annotations

import math
from statistics import mean
from app.models.entities import Habitation, RelocationSite


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371.0088
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlambda / 2) ** 2
    return r * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def infrastructure_score(site: RelocationSite) -> float | None:
    values = [
        site.land_score,
        site.water_score,
        site.housing_score,
        site.road_score,
        site.power_score,
        site.healthcare_score,
        site.education_score,
        site.environment_score,
    ]
    values = [v for v in values if v is not None]
    return round(mean(values), 1) if values else None


def rank_sites(habitation: Habitation, sites: list[RelocationSite], population: int, weights: dict[str, float], max_distance_km: float | None = None) -> list[dict]:
    defaults = {
        "capacity": 0.28,
        "future_safety": 0.28,
        "infrastructure": 0.24,
        "distance": 0.20,
    }
    if weights:
        for key, value in weights.items():
            if key in defaults and value >= 0:
                defaults[key] = float(value)
    total_w = sum(defaults.values()) or 1
    w = {k: v / total_w for k, v in defaults.items()}

    output: list[dict] = []
    for site in sites:
        distance = haversine_km(habitation.latitude, habitation.longitude, site.latitude, site.longitude)
        if max_distance_km and distance > max_distance_km:
            continue
        available = site.available_capacity
        capacity_ratio = min(1.0, available / max(population, 1))
        safety = 0.5 if site.future_risk_score is None else max(0, min(1, 1 - site.future_risk_score / 100))
        infra = infrastructure_score(site)
        infra_norm = 0.5 if infra is None else infra / 100
        distance_norm = max(0, 1 - min(distance, 200) / 200)
        score = (
            capacity_ratio * w["capacity"]
            + safety * w["future_safety"]
            + infra_norm * w["infrastructure"]
            + distance_norm * w["distance"]
        ) * 100
        output.append({
            "site_id": site.id,
            "site_name": site.name,
            "distance_km": round(distance, 2),
            "available_capacity": available,
            "capacity_sufficient": available >= population,
            "future_risk_score": site.future_risk_score,
            "infrastructure_score": infra,
            "overall_score": round(score, 1),
            "rationale": {
                "capacity_ratio": round(capacity_ratio, 3),
                "future_safety_component": round(safety * 100, 1),
                "infrastructure_component": infra,
                "distance_component": round(distance_norm * 100, 1),
                "verified_site": site.verified,
            },
        })
    return sorted(output, key=lambda x: (x["capacity_sufficient"], x["overall_score"]), reverse=True)
