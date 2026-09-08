import pytest
from app.models.entities import User, UserRole
from app.db.base import Base
from tests.conftest import TestingSessionLocal, client, test_engine


@pytest.fixture(autouse=True)
def setup_google_test_db():
    Base.metadata.create_all(bind=test_engine)
    with TestingSessionLocal() as db:
        users = [
            User(
                id="seed-admin-id",
                email="admin@gmail.com",
                full_name="System Administrator",
                hashed_password="dummy",
                role=UserRole.administrator,
                is_active=True,
                is_verified=True,
            ),
            User(
                id="seed-auth-id",
                email="authority@gmail.com",
                full_name="Disaster Authority",
                hashed_password="dummy",
                role=UserRole.authority,
                is_active=True,
                is_verified=True,
            ),
            User(
                id="seed-citizen-id",
                email="user@gmail.com",
                full_name="Citizen User",
                hashed_password="dummy",
                role=UserRole.citizen,
                is_active=True,
                is_verified=True,
            ),
        ]
        for u in users:
            existing = db.query(User).filter(User.email == u.email).first()
            if not existing:
                db.add(u)
        db.commit()
    yield

def test_new_citizen_google_registration():
    """Verify that a new citizen account is automatically created on first Google sign-in."""
    res = client.post(
        "/api/auth/google",
        json={"credential": "sim_autocitizen_test1@gmail.com", "selected_role": "citizen"}
    )
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["role"] == "citizen"
    assert data["user"]["email"] == "autocitizen_test1@gmail.com"
    assert data["user"]["role"] == "citizen"

def test_unknown_email_rejected_for_admin_role():
    """Verify that an unknown Gmail account cannot register or log in as Administrator."""
    res = client.post(
        "/api/auth/google",
        json={"credential": "sim_unknown_hacker@gmail.com", "selected_role": "administrator"}
    )
    assert res.status_code == 403
    assert "not authorized as an Administrator" in res.json()["detail"]

def test_unknown_email_rejected_for_authority_role():
    """Verify that an unknown Gmail account cannot log in as Disaster Authority."""
    res = client.post(
        "/api/auth/google",
        json={"credential": "sim_unknown_auth@gmail.com", "selected_role": "authority"}
    )
    assert res.status_code == 403
    assert "not authorized as a Disaster Management Authority" in res.json()["detail"]

def test_pre_seeded_admin_google_login():
    """Verify that pre-authorized admin@gmail.com can successfully log in as Administrator."""
    res = client.post(
        "/api/auth/google",
        json={"credential": "sim_admin@gmail.com", "selected_role": "administrator"}
    )
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["role"] == "administrator"
    assert data["user"]["email"] == "admin@gmail.com"

def test_pre_seeded_authority_google_login():
    """Verify that pre-authorized authority@gmail.com can successfully log in as Authority."""
    res = client.post(
        "/api/auth/google",
        json={"credential": "sim_authority@gmail.com", "selected_role": "authority"}
    )
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["role"] == "authority"
    assert data["user"]["email"] == "authority@gmail.com"

def test_role_mismatch_citizen_cannot_claim_admin():
    """Verify that an existing citizen user cannot escalate privileges by selecting Administrator."""
    res = client.post(
        "/api/auth/google",
        json={"credential": "sim_user@gmail.com", "selected_role": "administrator"}
    )
    assert res.status_code == 403
    assert "does not have Administrator access" in res.json()["detail"]
