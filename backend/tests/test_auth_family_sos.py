import pytest
from app.core.security import hash_password, verify_password
from app.models.entities import User, UserRole
from app.db.base import Base
from tests.conftest import TestingSessionLocal, client, test_engine


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=test_engine)
    # Seed an admin for the test if not present
    with TestingSessionLocal() as db:
        existing = db.query(User).filter(User.email == "admin@example.com").first()
        if not existing:
            admin = User(
                id="test-admin-id",
                email="admin@example.com",
                full_name="Admin Test",
                hashed_password=hash_password("AdminPass123!"),
                role=UserRole.administrator,
                is_active=True,
                is_verified=True,
            )
            db.add(admin)
            db.commit()
    yield


def test_direct_bcrypt_password_security():
    pwd = "MySuperSecretPassword123"
    hashed = hash_password(pwd)
    assert hashed != pwd
    assert verify_password(pwd, hashed) is True
    assert verify_password("WrongPassword", hashed) is False


def test_public_registration_restriction():
    # Attempt to self-register as Administrator should fail with 403
    res = client.post(
        "/api/auth/register",
        json={
            "email": "hacker@test.com",
            "full_name": "Bad Actor",
            "password": "Password123!",
            "role": "administrator",
        },
    )
    assert res.status_code == 403
    assert "Staff roles must be created by an administrator" in res.json()["detail"]


def test_citizen_registration_and_role_login_validation():
    # Register citizen
    res = client.post(
        "/api/auth/register",
        json={
            "email": "citizen@gmail.com",
            "full_name": "Jane Citizen",
            "mobile_number": "9876543210",
            "password": "CitizenPass123!",
            "role": "citizen",
        },
    )
    assert res.status_code == 201
    data = res.json()
    assert "access_token" in data
    assert data["role"] == "citizen"
    assert data["user"]["email"] == "citizen@gmail.com"

    # Login with mismatched role (select Administrator) -> must reject with 403
    mismatch_res = client.post(
        "/api/auth/login",
        json={
            "email": "citizen@gmail.com",
            "password": "CitizenPass123!",
            "role": "administrator",
        },
    )
    assert mismatch_res.status_code == 403
    assert mismatch_res.json()["detail"] in (
        "Selected role does not match this account.",
        "This account does not have access to the selected role.",
    )

    # Login with correct role
    login_res = client.post(
        "/api/auth/login",
        json={
            "email": "citizen@gmail.com",
            "password": "CitizenPass123!",
            "role": "citizen",
        },
    )
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    assert token is not None


def test_family_portal_and_linking_flow():
    # 1. Register Citizen
    c_res = client.post(
        "/api/auth/register",
        json={
            "email": "citizen.family@test.com",
            "full_name": "Citizen Head",
            "password": "FamilyPassword123!",
            "role": "citizen",
        },
    )
    citizen_token = c_res.json()["access_token"]
    headers_citizen = {"Authorization": f"Bearer {citizen_token}"}

    # 2. Citizen checks family portal group and retrieves join code
    group_res = client.get("/api/family/portal/group", headers=headers_citizen)
    assert group_res.status_code == 200
    group_data = group_res.json()
    join_code = group_data["join_code"]
    assert join_code.startswith("DM-FAM-")
    assert len(join_code) == 12  # "DM-FAM-" + 5 chars

    # 3. Test join code regeneration
    regen_res = client.post("/api/family/regenerate-code", headers=headers_citizen)
    assert regen_res.status_code == 200
    new_code = regen_res.json()["join_code"]
    assert new_code != join_code
    assert new_code.startswith("DM-FAM-")

    # 4. Register Family Member
    fm_res = client.post(
        "/api/auth/register",
        json={
            "email": "familymember@test.com",
            "full_name": "Bob Member",
            "password": "BobPassword123!",
            "role": "family_member",
        },
    )
    assert fm_res.status_code == 201
    member_token = fm_res.json()["access_token"]
    headers_member = {"Authorization": f"Bearer {member_token}"}

    # 5. Try joining with invalid code
    bad_join = client.post("/api/family/join", json={"join_code": "INVALID99", "relationship": "Brother"}, headers=headers_member)
    assert bad_join.status_code == 404
    assert bad_join.json()["detail"] == "Invalid or expired family join code."

    # 6. Join with valid regenerated code
    good_join = client.post("/api/family/join", json={"join_code": new_code, "relationship": "Brother"}, headers=headers_member)
    assert good_join.status_code == 200
    linked_group = good_join.json()
    assert len(linked_group["members"]) == 2

    # 7. Family member check-in with location sharing
    checkin_res = client.post(
        "/api/family/check-in",
        json={"status": "SAFE", "location_sharing": True, "latitude": 13.0827, "longitude": 80.2707},
        headers=headers_member,
    )
    assert checkin_res.status_code == 200
    updated_members = checkin_res.json()["members"]
    bob_card = next(m for m in updated_members if m["full_name"] == "Bob Member")
    assert bob_card["safety_status"] == "SAFE"
    assert bob_card["location_sharing"] is True
    assert bob_card["last_latitude"] == 13.0827


def test_emergency_contacts_crud():
    # Register citizen
    c_res = client.post(
        "/api/auth/register",
        json={
            "email": "contacts.user@test.com",
            "full_name": "Contact Tester",
            "password": "Password123!",
            "role": "citizen",
        },
    )
    headers = {"Authorization": f"Bearer {c_res.json()['access_token']}"}

    # Create primary contact
    create_res = client.post(
        "/api/emergency-contacts",
        json={
            "name": "Mom",
            "relationship": "Mother",
            "phone_number": "9998887776",
            "priority": "primary",
            "sms_enabled": True,
        },
        headers=headers,
    )
    assert create_res.status_code == 201
    contact_id = create_res.json()["id"]
    assert create_res.json()["name"] == "Mom"

    # List contacts
    list_res = client.get("/api/emergency-contacts", headers=headers)
    assert list_res.status_code == 200
    assert len(list_res.json()) == 1

    # Update contact
    update_res = client.put(
        f"/api/emergency-contacts/{contact_id}",
        json={"name": "Mother (Updated)", "priority": "secondary"},
        headers=headers,
    )
    assert update_res.status_code == 200
    assert update_res.json()["name"] == "Mother (Updated)"
    assert update_res.json()["priority"] == "secondary"

    # Delete contact
    del_res = client.delete(f"/api/emergency-contacts/{contact_id}", headers=headers)
    assert del_res.status_code == 204

    # Verify deleted
    empty_res = client.get("/api/emergency-contacts", headers=headers)
    assert len(empty_res.json()) == 0


def test_sos_and_active_sos():
    # Register Citizen
    c_res = client.post(
        "/api/auth/register",
        json={
            "email": "sos.caller@test.com",
            "full_name": "SOS Caller",
            "password": "Password123!",
            "role": "citizen",
        },
    )
    headers_citizen = {"Authorization": f"Bearer {c_res.json()['access_token']}"}

    # Create SOS
    sos_res = client.post(
        "/api/sos",
        json={
            "latitude": 13.0827,
            "longitude": 80.2707,
            "message": "Water rising rapidly, need evacuation",
            "hazard_type": "flood",
            "special_needs": ["elderly"],
            "people_count": 3,
        },
        headers=headers_citizen,
    )
    assert sos_res.status_code == 201
    sos_data = sos_res.json()
    assert sos_data["status"] == "new"
    sos_id = sos_data["id"]

    # Check my SOS
    my_sos = client.get("/api/sos/my", headers=headers_citizen)
    assert my_sos.status_code == 200
    assert len(my_sos.json()) >= 1

    # Admin checks active SOS
    admin_login = client.post(
        "/api/auth/login",
        json={"email": "admin@example.com", "password": "AdminPass123!", "role": "administrator"},
    )
    assert admin_login.status_code == 200, f"Admin login failed: {admin_login.json()}"
    headers_admin = {"Authorization": f"Bearer {admin_login.json()['access_token']}"}

    active_res = client.get("/api/sos/active", headers=headers_admin)
    assert active_res.status_code == 200
    active_ids = [s["id"] for s in active_res.json()]
    assert sos_id in active_ids
