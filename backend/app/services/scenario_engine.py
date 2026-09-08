from __future__ import annotations

from app.models.entities import Habitation


def run_scenario(habitation: Habitation | None, parameters: dict[str, float]) -> dict:
    """Transparent sensitivity scenario, not a forecast.

    Each parameter is a percentage change. The output is a bounded relative pressure index.
    """
    coefficients = {
        "rainfall_percent": 0.34,
        "population_percent": 0.15,
        "flood_frequency_percent": 0.22,
        "deforestation_percent": 0.12,
        "urban_expansion_percent": 0.10,
        "drainage_improvement_percent": -0.18,
        "infrastructure_improvement_percent": -0.16,
    }
    contributions = {}
    raw = 0.0
    for key, value in parameters.items():
        coef = coefficients.get(key, 0.05)
        impact = float(value) * coef
        contributions[key] = round(impact, 3)
        raw += impact
    baseline = 0.0
    if habitation and habitation.vulnerability_score is not None:
        baseline = habitation.vulnerability_score / 100 * 30
    pressure = max(0.0, min(100.0, 50 + baseline + raw))
    return {
        "scenario_pressure_index": round(pressure, 1),
        "contributions": contributions,
        "statement": "User-defined sensitivity scenario; not a guaranteed future outcome.",
    }
