from __future__ import annotations


def estimate_relocation_cost(households: int, population: int, assumptions: dict[str, float], contingency_percent: float) -> dict:
    """All unit costs are explicit caller-provided assumptions.

    Recognized keys ending in `_per_household` multiply by households,
    `_per_person` multiply by population, and all other keys are treated as fixed amounts.
    """
    subtotals: dict[str, float] = {}
    for key, value in assumptions.items():
        value = float(value)
        if key.endswith("_per_household"):
            subtotal = households * value
        elif key.endswith("_per_person"):
            subtotal = population * value
        else:
            subtotal = value
        subtotals[key] = round(subtotal, 2)
    base = sum(subtotals.values())
    contingency = base * contingency_percent / 100
    total = base + contingency
    return {
        "subtotals": subtotals,
        "subtotal": round(base, 2),
        "contingency": round(contingency, 2),
        "total": round(total, 2),
        "per_household": round(total / households, 2) if households else None,
        "per_person": round(total / population, 2) if population else None,
        "assumptions": assumptions,
    }


def estimate_inaction(relocation_cost: float, loss_assumptions: dict[str, float]) -> dict:
    breakdown = {k: round(float(v), 2) for k, v in loss_assumptions.items()}
    loss = sum(breakdown.values())
    avoided = max(0.0, loss - relocation_cost)
    return {
        "potential_loss": round(loss, 2),
        "potential_avoided_loss": round(avoided, 2),
        "benefit_cost_ratio": round(loss / relocation_cost, 3) if relocation_cost > 0 else None,
        "breakdown": breakdown,
    }
