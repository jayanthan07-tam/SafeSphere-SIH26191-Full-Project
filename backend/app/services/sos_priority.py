from __future__ import annotations

from app.models.entities import HazardType


def calculate_sos_priority(hazard_type: HazardType | None, special_needs: list[str], people_count: int, message: str | None) -> float:
    score = 45.0
    hazard_bonus = {
        HazardType.earthquake: 22,
        HazardType.landslide: 20,
        HazardType.fire: 20,
        HazardType.medical_emergency: 18,
        HazardType.flood: 15,
        HazardType.cyclone: 15,
        HazardType.heavy_rainfall: 12,
        HazardType.bridge_damage: 16,
    }.get(hazard_type, 5)
    score += hazard_bonus
    score += min(20, len(special_needs) * 5)
    score += min(12, max(0, people_count - 1) * 2)
    text = (message or "").lower()
    urgent_keywords = ["trapped", "injured", "unable to move", "medical", "dying", "collapsed", "oxygen", "bleeding", "unconscious"]
    if any(word in text for word in urgent_keywords):
        score += 10
    return round(min(score, 100), 1)

