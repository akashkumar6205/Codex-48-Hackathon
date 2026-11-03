import os
import sys

def test_google_auth_api():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    sys.path.insert(0, base_dir)
    
    from backend.storage import store
    from backend.models import GoogleAuthRequest
    from backend.main import auth_google, list_auth_users
    
    # 1. Test authenticating with Google account
    req = GoogleAuthRequest(
        uid="goog_user_123456",
        email="alex.morgan@brandlens.google",
        name="Alex Morgan Google",
        photo_url="https://lh3.googleusercontent.com/a/demo-photo",
        role="creator"
    )
    res = auth_google(req)
    
    assert res["status"] == "authenticated"
    assert res["user"].email == "alex.morgan@brandlens.google"
    assert res["user"].name == "Alex Morgan Google"
    assert res["user"].photo_url == "https://lh3.googleusercontent.com/a/demo-photo"
    
    # 2. Check user in store
    users = list_auth_users()
    user_ids = [u.id for u in users]
    assert "usr_goog_user_1" in user_ids or any("goog" in uid for uid in user_ids)
    
    # 3. Check audit event logged
    audit_events = [e for e in store.audit_events if e.action == "google_sign_in"]
    assert len(audit_events) > 0
    assert audit_events[-1].metadata.get("provider") == "firebase_google"
    
    print("PASS: Google Auth Backend API & Audit Trail successfully verified!")

if __name__ == "__main__":
    test_google_auth_api()
