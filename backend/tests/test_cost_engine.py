from app.services.cost_engine import estimate_inaction, estimate_relocation_cost


def test_costs_are_derived_from_explicit_assumptions():
    result = estimate_relocation_cost(10, 40, {"housing_per_household": 100, "transport_per_person": 5, "roads": 200}, 10)
    assert result["subtotal"] == 1400
    assert result["total"] == 1540
    inaction = estimate_inaction(1540, {"housing_loss": 2000, "roads_loss": 500})
    assert inaction["potential_loss"] == 2500
    assert inaction["potential_avoided_loss"] == 960
