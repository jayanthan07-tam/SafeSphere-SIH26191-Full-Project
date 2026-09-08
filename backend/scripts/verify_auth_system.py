import json
import sys
import urllib.error
import urllib.request

BASE_URL = "http://127.0.0.1:8000/api/v1"

ACCOUNTS = [
    {
        "role": "admin",
        "email": "admin.safesphere@gmail.com",
        "password": "Admin123!",
        "expected_role": "admin",
    },
    {
        "role": "citizen",
        "email": "user.safesphere@gmail.com",
        "password": "User123!",
        "expected_role": "citizen",
    },
    {
        "role": "authority",
        "email": "authority.safesphere@gmail.com",
        "password": "Authority123!",
        "expected_role": "authority",
    },
    {
        "role": "field_officer",
        "email": "officer.safesphere@gmail.com",
        "password": "Officer123!",
        "expected_role": "field_officer",
    },
    {
        "role": "family_member",
        "email": "family.safesphere@gmail.com",
        "password": "Family123!",
        "expected_role": "family_member",
    },
]


def make_request(url: str, data: dict | None = None, method: str = "GET") -> tuple[int, dict]:
    headers = {"Content-Type": "application/json"}
    body = json.dumps(data).encode("utf-8") if data is not None else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            status = resp.getcode()
            body_json = json.loads(resp.read().decode("utf-8"))
            return status, body_json
    except urllib.error.HTTPError as e:
        body_text = e.read().decode("utf-8")
        try:
            body_json = json.loads(body_text)
        except Exception:
            body_json = {"raw": body_text}
        return e.code, body_json


def test_auth_system():
    print("Testing health endpoint...")
    try:
        code, body = make_request("http://127.0.0.1:8000/health")
        print(f"Health status: {code} -> {body}")
    except Exception as e:
        print("Backend is not currently reachable:", e)
        return False

    print("\n--- Testing 5 Seed Accounts Login ---")
    for acc in ACCOUNTS:
        payload = {
            "email": acc["email"],
            "password": acc["password"],
            "role": acc["role"],
        }
        code, data = make_request(f"{BASE_URL}/auth/login", payload, method="POST")
        if code != 200:
            print(f"FAILED login for {acc['role']}: status={code} body={data}")
            return False
        assert "access_token" in data
        assert data["user"]["email"] == acc["email"]
        assert data["role"] == acc["expected_role"]
        print(f"PASS: {acc['role']} ({acc['email']}) logged in successfully with JWT token")

    print("\n--- Testing Validation Order & Exact Error Messages ---")
    # 1. Non-existent email -> 404 Account not found.
    code, r_unknown = make_request(f"{BASE_URL}/auth/login", {"email": "nonexistent@safesphere.org", "password": "AnyPassword123!"}, method="POST")
    assert code == 404, f"Expected 404 got {code}"
    assert r_unknown.get("detail") == "Account not found.", f"Expected 'Account not found.' got {r_unknown}"
    print("PASS: Non-existent email returns 404 'Account not found.'")

    # 2. Existing email + wrong password -> 401 Incorrect password.
    code, r_wrong_pwd = make_request(f"{BASE_URL}/auth/login", {"email": "user.safesphere@gmail.com", "password": "WrongPassword999!"}, method="POST")
    assert code == 401, f"Expected 401 got {code}"
    assert r_wrong_pwd.get("detail") == "Incorrect password.", f"Expected 'Incorrect password.' got {r_wrong_pwd}"
    print("PASS: Wrong password returns 401 'Incorrect password.'")

    # 3. Role mismatch -> 403 This account does not have access to the selected role.
    code, r_mismatch = make_request(f"{BASE_URL}/auth/login", {"email": "user.safesphere@gmail.com", "password": "User123!", "role": "admin"}, method="POST")
    assert code == 403, f"Expected 403 got {code}"
    assert "This account does not have access to the selected role." in r_mismatch.get("detail", "")
    print("PASS: Role mismatch returns 403 'This account does not have access to the selected role.'")

    print("\n--- All Authentication System Checks Passed Successfully! ---")
    return True


if __name__ == "__main__":
    success = test_auth_system()
    if not success:
        sys.exit(1)
