"""
Pydantic data models for BrandLens platform.
Strictly adheres to PRD.md Section 11 and Section 9.3 schema.
"""
from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel, Field
import uuid
import time

# Role definitions per PRD Section 3.2
UserRole = Literal["creator", "reviewer", "brand_manager", "admin"]

# Finding status per PRD Section 9.3
FindingStatus = Literal["open", "accepted", "edited", "disputed", "overridden"]

# Content status per PRD Section 7.5 (WF-1)
ContentStatus = Literal["draft", "in_review", "changes_requested", "approved", "rejected"]

# Categories per PRD Section 9.3
FindingCategory = Literal["claims", "tone", "terminology", "facts", "visual", "accessibility"]

# Severity per PRD Section 9.3
FindingSeverity = Literal["high", "medium", "low"]

class User(BaseModel):
    id: str
    workspace_id: str = "ws_default"
    name: str
    email: str
    role: UserRole
    photo_url: Optional[str] = None

class WorkspaceSettings(BaseModel):
    ai_provider: str = "mock-grounded-ai"  # or openai / gemini / rules-only
    rules_only_mode: bool = False
    ai_disclosure_text: str = "BrandLens uses AI-assisted semantic verification grounded strictly in approved corporate knowledge sources. No content is auto-published."

class Workspace(BaseModel):
    id: str
    name: str
    settings: WorkspaceSettings = Field(default_factory=WorkspaceSettings)

class Source(BaseModel):
    id: str
    type: Literal["guideline", "fact", "glossary", "claims", "asset-rule"]
    title: str
    section: str
    version: str = "v1.0"
    status: Literal["active", "retired"] = "active"
    effective_date: str
    owner: str
    content: str
    tags: List[str] = Field(default_factory=list)

class SourceChunk(BaseModel):
    """A semantic chunk of a Source, with its embedding vector."""
    id: str = Field(default_factory=lambda: f"chunk_{uuid.uuid4().hex[:8]}")
    source_id: str
    source_title: str
    section: str
    text: str
    embedding: List[float] = Field(default_factory=list)

class CheckRun(BaseModel):
    """Metadata about a single review run for reproducibility (PRD 9.4)."""
    id: str = Field(default_factory=lambda: f"run_{uuid.uuid4().hex[:8]}")
    version_id: str
    model: str = "gemini-2.0-flash"
    prompt_hash: str = ""
    started_at: float = Field(default_factory=time.time)
    completed_at: Optional[float] = None
    status: Literal["running", "completed", "failed"] = "running"
    regex_finding_count: int = 0
    llm_finding_count: int = 0
    dropped_finding_count: int = 0

class FindingSource(BaseModel):
    source_id: str
    section: str
    quote: str
    title: Optional[str] = None

class TextExcerpt(BaseModel):
    text: str
    start: int
    end: int

class Finding(BaseModel):
    id: str = Field(default_factory=lambda: f"f_{uuid.uuid4().hex[:8]}")
    run_id: str
    category: FindingCategory
    severity: FindingSeverity
    confidence: float = 0.95
    excerpt: TextExcerpt
    reason: str
    sources: List[FindingSource]
    suggestion: str
    status: FindingStatus = "open"
    applied_text: Optional[str] = None      # Replacement text applied in draft
    detection_method: Literal["regex", "llm", "visual"] = "regex"
    creator_response: Optional[str] = None  # Reason for dispute or edited text
    override_reason: Optional[str] = None   # Reason required for reviewer override

class Comment(BaseModel):
    id: str = Field(default_factory=lambda: f"c_{uuid.uuid4().hex[:8]}")
    content_id: str
    finding_id: Optional[str] = None
    author_id: str
    author_name: str
    author_role: UserRole
    body: str
    timestamp: float = Field(default_factory=time.time)

class Decision(BaseModel):
    id: str = Field(default_factory=lambda: f"dec_{uuid.uuid4().hex[:8]}")
    content_id: str
    reviewer_id: str
    reviewer_name: str
    outcome: Literal["approved", "rejected", "changes_requested"]
    reason: str
    timestamp: float = Field(default_factory=time.time)

class FindingDecisionRecord(BaseModel):
    """Captures the full context of a human decision on a finding (PRD Section 7.6)."""
    id: str = Field(default_factory=lambda: f"fdr_{uuid.uuid4().hex[:8]}")
    finding_id: str
    source_id: str
    category: FindingCategory
    original_severity: FindingSeverity
    content_type: str
    channel: str
    action: Literal["accepted", "edited", "disputed", "overridden"]
    reason: Optional[str] = None
    timestamp: float = Field(default_factory=time.time)

class SeverityAdjustment(BaseModel):
    """A learned adjustment to a rule's severity in a specific context."""
    id: str = Field(default_factory=lambda: f"adj_{uuid.uuid4().hex[:8]}")
    source_id: str
    source_section: str
    content_type: Optional[str] = None
    channel: Optional[str] = None
    original_severity: FindingSeverity
    adjusted_severity: FindingSeverity
    evidence_count: int
    override_rate_pct: float
    top_reasons: List[str] = Field(default_factory=list)
    status: Literal["proposed", "approved", "rejected"] = "proposed"
    created_at: float = Field(default_factory=time.time)
    approved_by: Optional[str] = None

class GuidelineRewriteSuggestion(BaseModel):
    """AI-generated suggestion to clarify an ambiguous guideline."""
    id: str = Field(default_factory=lambda: f"grs_{uuid.uuid4().hex[:8]}")
    source_id: str
    source_title: str
    current_content: str
    suggested_content: str
    rationale: str
    evidence_summary: str
    status: Literal["proposed", "approved", "rejected"] = "proposed"
    created_at: float = Field(default_factory=time.time)

class AuditEvent(BaseModel):
    id: str = Field(default_factory=lambda: f"aud_{uuid.uuid4().hex[:8]}")
    actor_id: str
    actor_name: str
    actor_role: UserRole
    action: str  # e.g. "submit_content", "accept_finding", "dispute_finding", "override_finding", "approve_content"
    entity: str  # "content", "finding", "source", "settings"
    entity_id: str
    timestamp: float = Field(default_factory=time.time)
    metadata: Dict[str, Any] = Field(default_factory=dict)

class ContentVersion(BaseModel):
    id: str = Field(default_factory=lambda: f"v_{uuid.uuid4().hex[:6]}")
    content_id: str
    number: int
    extracted_text: str
    image_url: Optional[str] = None
    is_image: bool = False
    pdf_url: Optional[str] = None
    is_pdf: bool = False
    created_at: float = Field(default_factory=time.time)

class ContentItem(BaseModel):
    id: str = Field(default_factory=lambda: f"cnt_{uuid.uuid4().hex[:8]}")
    workspace_id: str = "ws_default"
    creator_id: str
    creator_name: str
    title: str
    content_type: Literal["social", "web", "press", "deck", "email", "article"]
    channel: str
    status: ContentStatus = "draft"
    current_version_id: str = ""
    image_url: Optional[str] = None
    is_image: bool = False
    pdf_url: Optional[str] = None
    is_pdf: bool = False
    file_name: Optional[str] = None
    versions: List[ContentVersion] = Field(default_factory=list)
    findings: List[Finding] = Field(default_factory=list)
    created_at: float = Field(default_factory=time.time)
    updated_at: float = Field(default_factory=time.time)

# Request / Response Schemas
class ContentSubmitRequest(BaseModel):
    title: str
    text: str
    content_type: Literal["social", "web", "press", "deck", "email", "article"] = "web"
    channel: str = "Global Website"
    creator_id: str = "usr_creator"
    creator_name: str = "Alex Morgan"

class FindingActionRequest(BaseModel):
    action: Literal["accept", "edit", "dispute", "override"]
    actor_id: str
    actor_name: str
    actor_role: UserRole
    reason: Optional[str] = None
    edited_text: Optional[str] = None

class CommentCreateRequest(BaseModel):
    finding_id: Optional[str] = None
    author_id: str
    author_name: str
    author_role: UserRole
    body: str

class DecisionCreateRequest(BaseModel):
    reviewer_id: str
    reviewer_name: str
    outcome: Literal["approved", "rejected", "changes_requested"]
    reason: str

class SourceCreateRequest(BaseModel):
    type: Literal["guideline", "fact", "glossary", "claims", "asset-rule"]
    title: str
    section: str
    effective_date: str
    owner: str
    content: str
    tags: List[str] = Field(default_factory=list)

class SettingsUpdateRequest(BaseModel):
    rules_only_mode: Optional[bool] = None
    ai_provider: Optional[str] = None

class GoogleAuthRequest(BaseModel):
    id_token: Optional[str] = None
    uid: str
    email: str
    name: Optional[str] = None
    photo_url: Optional[str] = None
    role: Optional[UserRole] = "creator"
