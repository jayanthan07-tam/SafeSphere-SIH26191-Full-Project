from app.services.relocation_engine import haversine_km


def test_haversine_zero():
    assert haversine_km(10, 20, 10, 20) == 0
