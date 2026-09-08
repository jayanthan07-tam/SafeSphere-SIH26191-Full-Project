from __future__ import annotations

import math
from datetime import datetime, timezone
from statistics import mean
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.entities import Habitation, HazardObservation, HazardType, RiskClass


def clamp(value: float, low: float = 0.0, high: float = 1.0) -> float:
    return max(low, min(high, value))


def classify(score: float) -> RiskClass:
    if score < 35:
        return RiskClass.safe
    if score < 60:
        return RiskClass.moderate
    if score < 80:
        return RiskClass.high
    return RiskClass.critical


def _norm_score(value: float | None) -> float | None:
    if value is None:
        return None
    return clamp(value / 100.0)


def _hazard_specific_factors(h: Habitation, hazard: HazardType) -> dict[str, float | None]:
    vulnerability = _norm_score(h.vulnerability_score)
    infrastructure = None if h.infrastructure_resilience_score is None else 1 - _norm_score(h.infrastructure_resilience_score)
    drainage = None if h.drainage_score is None else 1 - _norm_score(h.drainage_score)
    rainfall = None if h.rainfall_trend_percent is None else clamp(max(0, h.rainfall_trend_percent) / 50)
    land_use = None if h.land_use_change_percent is None else clamp(abs(h.land_use_change_percent) / 50)
    pop_growth = None if h.population_growth_rate_percent is None else clamp(max(0, h.population_growth_rate_percent) / 10)

    if hazard in {HazardType.flood, HazardType.waterlogging, HazardType.heavy_rainfall}:
        elevation = None if h.elevation_m is None else clamp(1 - h.elevation_m / 300)
        river = None if h.river_distance_km is None else math.exp(-h.river_distance_km / 3)
        slope = None if h.slope_deg is None else clamp(h.slope_deg / 45) * 0.35
        return {
            "vulnerability": vulnerability,
            "infrastructure_vulnerability": infrastructure,
            "drainage_vulnerability": drainage,
            "rainfall_trend": rainfall,
            "low_elevation": elevation,
            "river_proximity": river,
            "terrain": slope,
            "land_use_change": land_use,
            "population_growth": pop_growth,
        }
    if hazard == HazardType.landslide:
        slope = None if h.slope_deg is None else clamp(h.slope_deg / 45)
        rainfall = None if h.rainfall_trend_percent is None else clamp(max(0, h.rainfall_trend_percent) / 50)
        return {
            "vulnerability": vulnerability,
            "infrastructure_vulnerability": infrastructure,
            "slope": slope,
            "rainfall_trend": rainfall,
            "land_use_change": land_use,
            "population_growth": pop_growth,
        }
    if hazard == HazardType.coastal_erosion:
        return {
            "vulnerability": vulnerability,
            "infrastructure_vulnerability": infrastructure,
            "land_use_change": land_use,
            "population_growth": pop_growth,
        }
    return {
        "vulnerability": vulnerability,
        "infrastructure_vulnerability": infrastructure,
        "rainfall_trend": rainfall,
        "land_use_change": land_use,
        "population_growth": pop_growth,
    }


def assess_risk(db: Session, habitation: Habitation, hazard: HazardType, horizon_years: int) -> dict:
    observations = db.scalars(
        select(HazardObservation).where(
            HazardObservation.habitation_id == habitation.id,
            HazardObservation.hazard_type == hazard,
            HazardObservation.verified.is_(True),
        )
    ).all()

    history = clamp(mean([o.severity_score for o in observations]) / 100) if observations else None
    factors = _hazard_specific_factors(habitation, hazard)
    factors["verified_hazard_history"] = history

    weights = {
        "verified_hazard_history": 0.24,
        "vulnerability": 0.15,
        "infrastructure_vulnerability": 0.12,
        "drainage_vulnerability": 0.11,
        "rainfall_trend": 0.12,
        "low_elevation": 0.10,
        "river_proximity": 0.10,
        "terrain": 0.04,
        "slope": 0.18,
        "land_use_change": 0.08,
        "population_growth": 0.06,
    }

    available = [(name, value) for name, value in factors.items() if value is not None]
    missing = [name for name, value in factors.items() if value is None]
    if not available:
        raise ValueError("Insufficient evidence: no usable risk inputs are available for this habitation.")

    denom = sum(weights.get(name, 0.05) for name, _ in available)
    current = sum(value * weights.get(name, 0.05) for name, value in available) / denom

    # Trend adjustment is deliberately bounded and transparent. It estimates planning risk,
    # not the date or certainty of a disaster event.
    trend_inputs = [
        factors.get("rainfall_trend"),
        factors.get("land_use_change"),
        factors.get("population_growth"),
    ]
    usable_trends = [v for v in trend_inputs if v is not None]
    trend_pressure = mean(usable_trends) if usable_trends else 0.0
    future = clamp(current + trend_pressure * min(horizon_years, 30) * 0.012)

    completeness = len(available) / max(1, len(factors))
    history_bonus = min(len(observations), 8) / 8 * 0.25
    confidence = clamp(0.35 + completeness * 0.4 + history_bonus)

    contribution_raw = {
        name: (value * weights.get(name, 0.05) / denom) * 100
        for name, value in available
    }
    contribution_total = sum(contribution_raw.values()) or 1
    contributions = {
        name: {
            "relative_percent": round(value / contribution_total * 100, 1),
            "normalized_input": round(dict(available)[name] * 100, 1),
        }
        for name, value in sorted(contribution_raw.items(), key=lambda x: x[1], reverse=True)
    }

    return {
        "current_score": round(current * 100, 1),
        "future_score": round(future * 100, 1),
        "risk_class": classify(future * 100),
        "confidence": round(confidence * 100, 1),
        "methodology": "Explainable weighted multi-factor risk model v1",
        "factor_contributions": contributions,
        "missing_inputs": missing,
        "evidence_summary": {
            "verified_observation_count": len(observations),
            "input_completeness_percent": round(completeness * 100, 1),
            "horizon_years": horizon_years,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "statement": "Risk estimate for planning support; not a guaranteed disaster prediction.",
        },
    }
