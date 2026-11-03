import os

def test_frontend_files():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    frontend_dir = os.path.join(base_dir, "frontend")
    
    index_html = os.path.join(frontend_dir, "index.html")
    style_css = os.path.join(frontend_dir, "css", "style.css")
    app_js = os.path.join(frontend_dir, "js", "app.js")
    api_js = os.path.join(frontend_dir, "js", "api.js")
    
    assert os.path.exists(index_html), "index.html missing"
    assert os.path.exists(style_css), "style.css missing"
    assert os.path.exists(app_js), "app.js missing"
    assert os.path.exists(api_js), "api.js missing"
    
    with open(index_html, "r", encoding="utf-8") as f:
        html_content = f.read()
    
    with open(style_css, "r", encoding="utf-8") as f:
        css_content = f.read()
        
    # Check typography tokens in HTML
    assert "Plus+Jakarta+Sans" in html_content
    assert "Inter" in html_content
    assert "JetBrains+Mono" in html_content
    
    # Check CSS design tokens & diff styles
    assert "--ground: #07090e" in css_content
    assert "--font-display: \"Plus Jakarta Sans\"" in css_content
    assert "--accent: #4f46e5" in css_content
    assert "--accent-light: #6366f1" in css_content
    assert ".studio-layout" in css_content
    assert ".doc-toolbar" in css_content
    assert ".reading-surface" in css_content
    assert ".finding-card" in css_content
    assert ".audit-action-tag" in css_content
    assert ".recent-drafts-panel" in css_content
    assert ".recent-draft-card" in css_content
    assert ".diff-visual-card" in css_content
    assert ".diff-comparison-grid" in css_content

    with open(app_js, "r", encoding="utf-8") as f:
        js_content = f.read()

    assert "computeWordDiff" in js_content
    assert "selectDraftFromDiff" in js_content
    assert "changeDiffVersions" in js_content
    assert "badge-visual-asset" in js_content
    assert "badge-pdf-doc" in js_content
    assert "signInWithGoogle" in js_content
    assert "signOutGoogle" in js_content

    # Check Firebase Auth Service
    fb_js = os.path.join(frontend_dir, "js", "firebase-auth.js")
    assert os.path.exists(fb_js), "firebase-auth.js missing"
    with open(fb_js, "r", encoding="utf-8") as f:
        fb_content = f.read()
    assert "initFirebaseAuth" in fb_content
    assert "signInWithGoogle" in fb_content
    assert "signOutGoogle" in fb_content
    assert "GoogleAuthProvider" in fb_content

    # Check Firebase elements in HTML
    assert "btnGoogleSignIn" in html_content
    assert "userProfilePill" in html_content
    assert "firebaseConfigModal" in html_content

    # Check Firebase elements in CSS
    assert ".btn-google-signin" in css_content
    assert ".user-profile-pill" in css_content
    
    print(f"PASS: All frontend files exist and contain updated modern design tokens.")
    print(f"HTML size: {len(html_content)} bytes")
    print(f"CSS size: {len(css_content)} bytes ({css_content.count(chr(10))} lines)")

if __name__ == "__main__":
    test_frontend_files()
