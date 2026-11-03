"""
Verify Firebase Auth and .env configuration endpoints
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_firebase_config_endpoint():
    res = client.get("/api/auth/firebase-config")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    data = res.json()
    assert "apiKey" in data, "Missing apiKey in firebase config"
    assert "authDomain" in data, "Missing authDomain in firebase config"
    assert "projectId" in data, "Missing projectId in firebase config"
    print("✓ test_firebase_config_endpoint passed:", data)

def test_google_user_sync():
    payload = {
        "uid": "goog_test_user_12345",
        "email": "sarah.connor@acme-corp.com",
        "name": "Sarah Connor",
        "role": "brand_manager",
        "photo_url": "https://lh3.googleusercontent.com/a/test-avatar"
    }
    res = client.post("/api/auth/google", json=payload)
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    user_res = res.json()
    assert user_res["status"] == "authenticated"
    assert user_res["user"]["email"] == "sarah.connor@acme-corp.com"
    assert user_res["user"]["role"] == "brand_manager"
    print("✓ test_google_user_sync passed:", user_res["user"]["name"])

    # Check list
    list_res = client.get("/api/auth/users")
    assert list_res.status_code == 200
    users = list_res.json()
    found = any(u["email"] == "sarah.connor@acme-corp.com" for u in users)
    assert found, "Synced user not found in user list"
    print("✓ test_auth_users_list passed. Total users:", len(users))

if __name__ == "__main__":
    test_firebase_config_endpoint()
    test_google_user_sync()
    print("\nALL GOOGLE AUTH & .ENV ENDPOINTS VERIFIED SUCCESSFULLY!")
