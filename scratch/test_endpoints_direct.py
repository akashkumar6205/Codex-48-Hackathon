"""
Direct test of backend endpoints without TestClient / httpx event loop
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.main import get_firebase_config, auth_google, list_auth_users
from backend.models import GoogleAuthRequest

def test_endpoints():
    cfg = get_firebase_config()
    print("Config returned:", cfg)
    assert "apiKey" in cfg
    assert cfg["projectId"] == "brandlens-governance"

    req = GoogleAuthRequest(
        uid="usr_google_tester",
        email="john.doe@enterprise.com",
        name="John Doe",
        role="admin"
    )
    auth_resp = auth_google(req)
    print("Auth response:", auth_resp["status"], auth_resp["user"].name, auth_resp["user"].role)
    assert auth_resp["status"] == "authenticated"
    assert auth_resp["user"].role == "admin"

    users = list_auth_users()
    print("Total users in system:", len(users))
    assert any(u.email == "john.doe@enterprise.com" for u in users)

    print("\n✓ ALL DIRECT ENDPOINT ASSERTIONS PASSED!")

if __name__ == "__main__":
    test_endpoints()
