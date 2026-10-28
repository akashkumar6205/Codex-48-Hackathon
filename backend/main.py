"""
FastAPI application for BrandLens.
Provides REST endpoints according to PRD.md Section 12.
Serves static frontend (HTML5, Vanilla JavaScript, CSS).
"""
import os
import sys
import time
from pathlib import Path
from typing import List, Optional

# Ensure project root is in sys.path whether executed from root or backend/
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from fastapi import FastAPI, HTTPException, Query, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse

from backend.models import (
    ContentSubmitRequest, FindingActionRequest, CommentCreateRequest,
    DecisionCreateRequest, SourceCreateRequest, SettingsUpdateRequest,
    ContentItem, ContentVersion, Source, Finding, Comment, Decision, AuditEvent
)
from backend.storage import store
from backend.review_engine import review_engine

uploads_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "uploads"))
os.makedirs(uploads_dir, exist_ok=True)

app = FastAPI(
    title="BrandLens API",
    description="AI Brand Governance Platform - REST API",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

# -------------------------------------------------------------
# Workspace & Settings (PRD Section 7.7 AD-2, AD-5)
# -------------------------------------------------------------
@app.get("/api/workspace")
def get_workspace():
    return {
        "workspace": store.workspace,
        "users": list(store.users.values())
    }

@app.patch("/api/sources/{source_id}/toggle-status")
def toggle_source_status(source_id: str):
    if source_id not in store.sources:
        raise HTTPException(status_code=404, detail="Source not found")
    source = store.sources[source_id]
    source.status = "retired" if source.status == "active" else "active"
    store.log_audit(
        actor_id="usr_brand_mgr",
        action=f"{source.status}_source",
        entity="source",
        entity_id=source.id,
        metadata={"title": source.title, "new_status": source.status}
    )
    return source

@app.delete("/api/sources/{source_id}")
def delete_source(source_id: str):
    if source_id not in store.sources:
        raise HTTPException(status_code=404, detail="Source not found")
    source = store.sources.pop(source_id)
    store.log_audit(
        actor_id="usr_brand_mgr",
        action="delete_source",
        entity="source",
        entity_id=source_id,
        metadata={"title": source.title}
    )
    return {"status": "ok", "deleted_id": source_id}

@app.patch("/api/workspace/settings")
def update_settings(req: SettingsUpdateRequest):
    if req.rules_only_mode is not None:
        store.workspace.settings.rules_only_mode = req.rules_only_mode
    if req.ai_provider is not None:
        store.workspace.settings.ai_provider = req.ai_provider
        
    store.log_audit(
        actor_id="usr_admin",
        action="update_settings",
        entity="workspace",
        entity_id=store.workspace.id,
        metadata={"rules_only_mode": store.workspace.settings.rules_only_mode, "ai_provider": store.workspace.settings.ai_provider}
    )
    return store.workspace.settings

# -------------------------------------------------------------
# Sources & Knowledge Base (PRD Section 7.1 KB-1 to KB-6)
# -------------------------------------------------------------
@app.get("/api/sources")
def list_sources():
    # Also calculate trigger count for each source (KB-6)
    trigger_counts = {}
    for cnt in store.content_items.values():
        for f in cnt.findings:
            for s in f.sources:
                trigger_counts[s.source_id] = trigger_counts.get(s.source_id, 0) + 1
                
    result = []
    for s in store.sources.values():
        src_dict = s.model_dump()
        src_dict["trigger_count"] = trigger_counts.get(s.id, 0)
        result.append(src_dict)
    return result

@app.post("/api/sources")
def create_source(req: SourceCreateRequest):
    src_id = f"src_{int(time.time())}"
    source = Source(
        id=src_id,
        type=req.type,
        title=req.title,
        section=req.section,
        version="v1.0",
        status="active",
        effective_date=req.effective_date,
        owner=req.owner,
        content=req.content,
        tags=req.tags
    )
    store.sources[source.id] = source
    store.log_audit(
        actor_id="usr_brand_mgr",
        action="create_source",
        entity="source",
        entity_id=source.id,
        metadata={"title": source.title, "type": source.type}
    )
    return source

@app.put("/api/sources/{source_id}")
def update_source(source_id: str, req: SourceCreateRequest):
    if source_id not in store.sources:
        raise HTTPException(status_code=404, detail="Source not found")
    source = store.sources[source_id]
    source.title = req.title
    source.section = req.section
    source.content = req.content
    source.effective_date = req.effective_date
    source.owner = req.owner
    source.tags = req.tags
    source.version = f"v{float(source.version.replace('v', '')) + 0.1:.1f}"

    store.log_audit(
        actor_id="usr_brand_mgr",
        action="update_source",
        entity="source",
        entity_id=source.id,
        metadata={"title": source.title, "version": source.version}
    )
    return source

# -------------------------------------------------------------
# Content Submissions & Reviews (PRD Section 7.2, 7.3, 7.4)
# -------------------------------------------------------------
@app.get("/api/content")
def list_content():
    return list(store.content_items.values())

@app.post("/api/content")
def submit_content(req: ContentSubmitRequest):
    content = ContentItem(
        creator_id=req.creator_id,
        creator_name=req.creator_name,
        title=req.title,
        content_type=req.content_type,
        channel=req.channel,
        status="draft"
    )
    version = ContentVersion(
        content_id=content.id,
        number=1,
        extracted_text=req.text
    )
    content.versions.append(version)
    content.current_version_id = version.id
    
    # Run immediate initial check
    findings = review_engine.run_check(req.text, req.content_type, req.channel)
    content.findings = findings
    
    store.content_items[content.id] = content
    
    store.log_audit(
        actor_id=req.creator_id,
        action="submit_content",
        entity="content",
        entity_id=content.id,
        metadata={"title": content.title, "channel": content.channel, "finding_count": len(findings)}
    )
    return content

@app.post("/api/content/upload")
async def upload_document(
    file: UploadFile = File(...),
    title: str = Form("Uploaded Document"),
    channel: str = Form("Global Marketing Landing Page"),
    content_type: str = Form("web"),
    creator_id: str = Form("usr_creator"),
    creator_name: str = Form("Alex Morgan"),
    ocr_text: Optional[str] = Form(None)
):
    import io
    import re
    import uuid
    content_bytes = await file.read()
    extracted_text = ""
    filename = file.filename.lower()
    image_url = None
    is_image = False

    IMAGE_EXTENSIONS = (".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp", ".svg", ".tiff")

    if any(filename.endswith(ext) for ext in IMAGE_EXTENSIONS):
        is_image = True
        safe_name = re.sub(r'[^a-zA-Z0-9_\.-]', '_', file.filename)
        unique_name = f"{uuid.uuid4().hex[:8]}_{safe_name}"
        saved_path = os.path.join(uploads_dir, unique_name)
        with open(saved_path, "wb") as f:
            f.write(content_bytes)

        image_url = f"/uploads/{unique_name}"

        # If client extracted OCR text, use it; otherwise use clean informative placeholder
        if ocr_text and ocr_text.strip():
            extracted_text = ocr_text.strip()
        else:
            extracted_text = f"Visual Asset: {file.filename}\nChannel: {channel}\nFormat: {os.path.splitext(filename)[1].upper().replace('.', '')}"
    elif filename.endswith(".pdf"):
        try:
            import pypdf
            reader = pypdf.PdfReader(io.BytesIO(content_bytes))
            extracted_text = "\n\n".join([page.extract_text() or "" for page in reader.pages]).strip()
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to parse PDF document: {str(e)}")
    elif filename.endswith(".docx"):
        try:
            import docx
            doc = docx.Document(io.BytesIO(content_bytes))
            extracted_text = "\n\n".join([p.text for p in doc.paragraphs if p.text]).strip()
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to parse DOCX document: {str(e)}")
    else:
        # Plain text / Markdown / HTML fallback
        try:
            extracted_text = content_bytes.decode("utf-8").strip()
        except Exception:
            extracted_text = content_bytes.decode("latin-1", errors="ignore").strip()

    if not extracted_text and not is_image:
        raise HTTPException(status_code=400, detail="Uploaded file contained no readable text content.")

    content = ContentItem(
        creator_id=creator_id,
        creator_name=creator_name,
        title=title if title and title != "Uploaded Document" else file.filename,
        content_type=content_type,
        channel=channel,
        status="draft",
        image_url=image_url,
        is_image=is_image,
        file_name=file.filename
    )
    version = ContentVersion(
        content_id=content.id,
        number=1,
        extracted_text=extracted_text,
        image_url=image_url,
        is_image=is_image
    )
    content.versions.append(version)
    content.current_version_id = version.id

    findings = review_engine.run_check(extracted_text, content_type, channel, is_image=is_image)
    content.findings = findings
    store.content_items[content.id] = content

    store.log_audit(
        actor_id=creator_id,
        action="upload_document",
        entity="content",
        entity_id=content.id,
        metadata={"filename": file.filename, "is_image": is_image, "findings_count": len(findings)}
    )
    return content

@app.delete("/api/content/{content_id}")
def delete_content(content_id: str):
    if content_id not in store.content_items:
        raise HTTPException(status_code=404, detail="Content not found")
    item = store.content_items.pop(content_id)
    store.log_audit(
        actor_id="usr_creator",
        action="delete_content",
        entity="content",
        entity_id=content_id,
        metadata={"title": item.title}
    )
    return {"status": "ok", "deleted_id": content_id}

@app.get("/api/content/{content_id}")
def get_content(content_id: str):
    if content_id not in store.content_items:
        raise HTTPException(status_code=404, detail="Content not found")
    content = store.content_items[content_id]
    
    # If no findings yet, run check automatically
    if not content.findings and content.versions:
        latest_ver = content.versions[-1]
        content.findings = review_engine.run_check(
            latest_ver.extracted_text,
            content.content_type,
            content.channel,
            is_image=bool(content.image_url or content.is_image)
        )
        
    comments = [c for c in store.comments if c.content_id == content_id]
    decisions = [d for d in store.decisions if d.content_id == content_id]
    
    return {
        "content": content,
        "comments": comments,
        "decisions": decisions
    }

@app.post("/api/content/{content_id}/check")
def rerun_check(content_id: str):
    if content_id not in store.content_items:
        raise HTTPException(status_code=404, detail="Content not found")
    content = store.content_items[content_id]
    current_ver = next((v for v in content.versions if v.id == content.current_version_id), content.versions[-1])
    
    findings = review_engine.run_check(
        current_ver.extracted_text,
        content.content_type,
        content.channel,
        is_image=bool(content.image_url or content.is_image)
    )
    content.findings = findings
    content.updated_at = time.time()
    
    store.log_audit(
        actor_id="usr_creator",
        action="rerun_check",
        entity="content",
        entity_id=content.id,
        metadata={"findings_count": len(findings)}
    )
    return {"status": "ok", "findings": findings}

@app.post("/api/content/{content_id}/versions")
def submit_new_version(content_id: str, text: str = Form(...)):
    if content_id not in store.content_items:
        raise HTTPException(status_code=404, detail="Content not found")
    content = store.content_items[content_id]
    
    new_version_num = len(content.versions) + 1
    version = ContentVersion(
        content_id=content.id,
        number=new_version_num,
        extracted_text=text,
        image_url=content.image_url,
        is_image=content.is_image
    )
    content.versions.append(version)
    content.current_version_id = version.id
    content.updated_at = time.time()
    
    # Re-run review engine on new text
    findings = review_engine.run_check(
        text,
        content.content_type,
        content.channel,
        is_image=bool(content.image_url or content.is_image)
    )
    content.findings = findings
    
    store.log_audit(
        actor_id="usr_creator",
        action="upload_version",
        entity="content",
        entity_id=content.id,
        metadata={"version_number": new_version_num}
    )
    return {"version": version, "findings": findings}

# -------------------------------------------------------------
# Finding Actions: Accept, Edit, Dispute, Override (PRD Section 7.4)
# -------------------------------------------------------------
@app.patch("/api/content/{content_id}/findings/{finding_id}")
def handle_finding_action(content_id: str, finding_id: str, req: FindingActionRequest):
    if content_id not in store.content_items:
        raise HTTPException(status_code=404, detail="Content not found")
    content = store.content_items[content_id]
    
    finding = next((f for f in content.findings if f.id == finding_id), None)
    if not finding:
        raise HTTPException(status_code=404, detail="Finding not found")
    
    if req.action == "accept":
        finding.status = "accepted"
        # Apply the suggested fix to the content text if desired by creator
        current_ver = next((v for v in content.versions if v.id == content.current_version_id), content.versions[-1])
        old_text = current_ver.extracted_text
        if finding.excerpt.text in old_text:
            new_text = old_text.replace(finding.excerpt.text, finding.suggestion, 1)
            # Create updated version
            new_ver = ContentVersion(
                content_id=content.id,
                number=len(content.versions) + 1,
                extracted_text=new_text
            )
            content.versions.append(new_ver)
            content.current_version_id = new_ver.id
            content.updated_at = time.time()
            
    elif req.action == "edit":
        finding.status = "edited"
        finding.creator_response = req.edited_text or req.reason
        if req.edited_text:
            current_ver = next((v for v in content.versions if v.id == content.current_version_id), content.versions[-1])
            new_text = current_ver.extracted_text.replace(finding.excerpt.text, req.edited_text, 1)
            new_ver = ContentVersion(
                content_id=content.id,
                number=len(content.versions) + 1,
                extracted_text=new_text
            )
            content.versions.append(new_ver)
            content.current_version_id = new_ver.id
            content.updated_at = time.time()
            
    elif req.action == "dispute":
        finding.status = "disputed"
        finding.creator_response = req.reason or "No dispute reason provided."
        content.status = "in_review"  # Route disputed content to reviewer (FD-3)
        
    elif req.action == "override":
        # Reviewer / Brand Manager only (PRD Section 3.3)
        if req.actor_role not in ["reviewer", "brand_manager", "admin"]:
            raise HTTPException(status_code=403, detail="Only Reviewers or Brand Managers can override findings.")
        finding.status = "overridden"
        finding.override_reason = req.reason or "Approved by brand reviewer with business justification."
        
    store.log_audit(
        actor_id=req.actor_id,
        action=f"{req.action}_finding",
        entity="finding",
        entity_id=finding.id,
        metadata={
            "finding_category": finding.category,
            "reason": req.reason or req.edited_text,
            "status": finding.status
        }
    )
    return finding

# -------------------------------------------------------------
# Workflow & Decisions (PRD Section 7.5 WF-1, WF-2, WF-3)
# -------------------------------------------------------------
@app.post("/api/content/{content_id}/comments")
def add_comment(content_id: str, req: CommentCreateRequest):
    if content_id not in store.content_items:
        raise HTTPException(status_code=404, detail="Content not found")
    comment = Comment(
        content_id=content_id,
        finding_id=req.finding_id,
        author_id=req.author_id,
        author_name=req.author_name,
        author_role=req.author_role,
        body=req.body
    )
    store.comments.append(comment)
    store.log_audit(
        actor_id=req.author_id,
        action="add_comment",
        entity="comment",
        entity_id=comment.id,
        metadata={"content_id": content_id, "finding_id": req.finding_id}
    )
    return comment

@app.post("/api/content/{content_id}/decision")
def make_decision(content_id: str, req: DecisionCreateRequest):
    if content_id not in store.content_items:
        raise HTTPException(status_code=404, detail="Content not found")
    content = store.content_items[content_id]
    
    content.status = req.outcome
    content.updated_at = time.time()
    
    decision = Decision(
        content_id=content_id,
        reviewer_id=req.reviewer_id,
        reviewer_name=req.reviewer_name,
        outcome=req.outcome,
        reason=req.reason
    )
    store.decisions.append(decision)
    
    store.log_audit(
        actor_id=req.reviewer_id,
        action=f"decision_{req.outcome}",
        entity="content",
        entity_id=content.id,
        metadata={"outcome": req.outcome, "reason": req.reason}
    )
    return decision

# -------------------------------------------------------------
# Governance & Insights Dashboard (PRD Section 7.6 IN-1 to IN-3)
# -------------------------------------------------------------
@app.get("/api/insights")
def get_insights():
    # 1. Total findings, categories breakdown
    category_counts = {}
    severity_counts = {"high": 0, "medium": 0, "low": 0}
    total_findings = 0
    overridden_count = 0
    disputed_count = 0
    accepted_count = 0
    
    # Track per-rule stats
    rule_stats = {}
    
    for cnt in store.content_items.values():
        for f in cnt.findings:
            total_findings += 1
            category_counts[f.category] = category_counts.get(f.category, 0) + 1
            severity_counts[f.severity] = severity_counts.get(f.severity, 0) + 1
            
            if f.status == "overridden":
                overridden_count += 1
            elif f.status == "disputed":
                disputed_count += 1
            elif f.status == "accepted":
                accepted_count += 1
                
            for s in f.sources:
                if s.source_id not in rule_stats:
                    rule_stats[s.source_id] = {
                        "source_id": s.source_id,
                        "title": s.title or store.sources.get(s.source_id, Source(id=s.source_id, type="guideline", title="Unknown", section="", effective_date="", owner="", content="")).title,
                        "section": s.section,
                        "flags": 0,
                        "overrides": 0,
                        "disputes": 0
                    }
                rule_stats[s.source_id]["flags"] += 1
                if f.status == "overridden":
                    rule_stats[s.source_id]["overrides"] += 1
                elif f.status == "disputed":
                    rule_stats[s.source_id]["disputes"] += 1

    # IN-3: Detect "Unclear Rules" (High flag count with high override/dispute rate)
    unclear_rules = []
    top_flagged_rules = []
    for r in rule_stats.values():
        dispute_override_rate = (r["overrides"] + r["disputes"]) / max(1, r["flags"])
        r["override_rate_pct"] = round(dispute_override_rate * 100, 1)
        top_flagged_rules.append(r)
        
        # Condition: flagged at least once and >= 40% overridden/disputed
        if r["flags"] >= 1 and dispute_override_rate >= 0.4:
            unclear_rules.append({
                **r,
                "diagnosis": "High override rate suggests authors or reviewers find this rule ambiguous.",
                "recommendation": f"Clarify Section {r['section']} with contextual examples and allowed exceptions."
            })
            
    top_flagged_rules.sort(key=lambda x: x["flags"], reverse=True)

    return {
        "summary": {
            "total_content_pieces": len(store.content_items),
            "total_findings": total_findings,
            "accepted_count": accepted_count,
            "disputed_count": disputed_count,
            "overridden_count": overridden_count,
            "acceptance_rate_pct": round((accepted_count / max(1, total_findings)) * 100, 1),
            "dispute_override_rate_pct": round(((disputed_count + overridden_count) / max(1, total_findings)) * 100, 1),
        },
        "by_category": category_counts,
        "by_severity": severity_counts,
        "top_flagged_rules": top_flagged_rules,
        "unclear_rules": unclear_rules
    }

# -------------------------------------------------------------
# Audit Log (PRD Section 7.5 WF-5, Section 12)
# -------------------------------------------------------------
@app.get("/api/audit")
def get_audit_trail():
    return sorted(store.audit_events, key=lambda x: x.timestamp, reverse=True)

# -------------------------------------------------------------
# Static Frontend Files Mount (Pure Vanilla JS, HTML, CSS - NO TypeScript/Next.js)
# -------------------------------------------------------------
frontend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend"))
if os.path.exists(frontend_path):
    css_dir = os.path.join(frontend_path, "css")
    js_dir = os.path.join(frontend_path, "js")
    if os.path.exists(css_dir):
        app.mount("/css", StaticFiles(directory=css_dir), name="css")
    if os.path.exists(js_dir):
        app.mount("/js", StaticFiles(directory=js_dir), name="js")
    app.mount("/static", StaticFiles(directory=frontend_path), name="static")

@app.get("/")
def serve_root():
    index_file = os.path.join(frontend_path, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return {"message": "BrandLens API is running. Frontend index.html not yet created."}
