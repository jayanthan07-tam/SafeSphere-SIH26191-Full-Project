from __future__ import annotations

from app.models.entities import HazardType


def calculate_sos_priority(hazard_type: HazardType | None, special_needs: list[str], people_count: int, message: str | None) -> float:
    score = 45.0
    hazard_bonus = {
        HazardType.flood: 12,
        HazardType.landslide: 18,
        HazardType.cyclone: 14,
        HazardType.fire: 20,
        HazardType.bridge_damage: 16,
    }.get(hazard_type, 5)
    score += hazard_bonus
    score += min(20, len(special_needs) * 5)
    score += min(12, max(0, people_count - 1) * 2)
    text = (message or "").lower()
    if any(word in text for word in ["trapped", "injured", "unable to move", "medical"]):
        score += 10
    return round(min(score, 100), 1)
