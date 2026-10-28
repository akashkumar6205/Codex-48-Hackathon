"""
In-memory persistence and initial seed data for BrandLens.
Provides methods to query and update Workspaces, Users, Sources, Content, Findings, and Audit Logs.
"""
import time
import uuid
from typing import Dict, List, Optional
from backend.models import (
    Workspace, User, Source, ContentItem, ContentVersion,
    Finding, Comment, Decision, AuditEvent, WorkspaceSettings
)

class DataStore:
    def __init__(self):
        self.workspace = Workspace(
            id="ws_default",
            name="Inkloom BrandLens",
            settings=WorkspaceSettings(
                ai_provider="grounded-llm-v1",
                rules_only_mode=False,
                ai_disclosure_text="BrandLens AI evaluates submissions against verified Brand Guidelines. Every finding is strictly cited. AI suggestions are assistive; humans approve all changes."
            )
        )
        
        # 4 Core Roles
        self.users: Dict[str, User] = {
            "usr_creator": User(id="usr_creator", name="Alex Morgan", email="alex.m@inkloom.ai", role="creator"),
            "usr_reviewer": User(id="usr_reviewer", name="Jordan Hayes", email="jordan.h@inkloom.ai", role="reviewer"),
            "usr_brand_mgr": User(id="usr_brand_mgr", name="Elena Vance", email="elena.v@inkloom.ai", role="brand_manager"),
            "usr_admin": User(id="usr_admin", name="Marcus Sterling", email="marcus.s@inkloom.ai", role="admin"),
        }
        
        # Approved Knowledge Sources (PRD Section 7.1)
        self.sources: Dict[str, Source] = {}
        self.init_seed_sources()

        # Content items
        self.content_items: Dict[str, ContentItem] = {}
        
        # Comments & Decisions
        self.comments: List[Comment] = []
        self.decisions: List[Decision] = []
        
        # Immutable Audit Trail (PRD Section 7.5 WF-5)
        self.audit_events: List[AuditEvent] = []

    def log_audit(self, actor_id: str, action: str, entity: str, entity_id: str, metadata: dict = None):
        user = self.users.get(actor_id)
        actor_name = user.name if user else "System"
        actor_role = user.role if user else "admin"
        event = AuditEvent(
            actor_id=actor_id,
            actor_name=actor_name,
            actor_role=actor_role,
            action=action,
            entity=entity,
            entity_id=entity_id,
            metadata=metadata or {}
        )
        self.audit_events.append(event)
        return event

    def init_seed_sources(self):
        seed_sources = [
            Source(
                id="claims-policy-01",
                type="claims",
                title="Commercial Claims & Superlatives Policy",
                section="3.2",
                version="v2.1",
                status="active",
                effective_date="2026-01-15",
                owner="Brand & Legal Governance",
                content="Ranking and superlative claims (such as '#1 in the market', 'industry-leading', or 'best-in-class') require a verifiable, cited third-party report published within the past 12 months. Self-proclaimed rankings or unverifiable absolutes are strictly prohibited in public-facing marketing copy.",
                tags=["claims", "legal", "superlatives", "ranking"]
            ),
            Source(
                id="glossary-prod-01",
                type="glossary",
                title="Product Naming & Trademark Guidelines",
                section="2.1",
                version="v3.0",
                status="active",
                effective_date="2026-03-01",
                owner="Product Marketing",
                content="Our enterprise collaboration suite was formally rebranded from 'CloudSync' to 'OmniFlow'. Use of 'CloudSync' is deprecated and strictly prohibited in external messaging. Always use 'OmniFlow' with proper camel case capitalization.",
                tags=["product", "naming", "branding", "glossary"]
            ),
            Source(
                id="glossary-banned-01",
                type="glossary",
                title="Banned Value Vocabulary",
                section="4.5",
                version="v1.4",
                status="active",
                effective_date="2025-11-20",
                owner="Brand Strategy",
                content="The word 'cheap' must not be used to describe our products, tiers, or pricing. Approved alternative terminology includes 'cost-effective', 'high-ROI', 'accessible', or 'flexible value tier'.",
                tags=["vocabulary", "pricing", "banned-words"]
            ),
            Source(
                id="tone-voice-01",
                type="guideline",
                title="Brand Voice & Tone Standard",
                section="1.4",
                version="v2.0",
                status="active",
                effective_date="2026-02-10",
                owner="Editorial Committee",
                content="Our brand tone is confident, measured, and empathetic. We strictly avoid high-pressure urgency cues, aggressive sales phrasing, multiple exclamation points ('Hurry up!', 'Act now!'), or infomercial-style hype.",
                tags=["tone", "voice", "copywriting"]
            ),
            Source(
                id="facts-approved-01",
                type="fact",
                title="Company Benchmark Data & Metrics",
                section="5.3",
                version="v2.2",
                status="active",
                effective_date="2026-06-01",
                owner="Corporate Communications",
                content="Verified company metrics for public citation: OmniFlow is trusted by over 50,000 businesses across Europe and North America, with a certified 99.95% enterprise uptime SLA.",
                tags=["facts", "metrics", "stats"]
            ),
            Source(
                id="accessibility-01",
                type="asset-rule",
                title="Digital Accessibility & Visual Clarity",
                section="6.1",
                version="v1.2",
                status="active",
                effective_date="2026-04-12",
                owner="Design Systems",
                content="All digital customer communications must follow WCAG 2.1 AA standards. Ensure high text contrast ratios, meaningful alternative text, and unambiguous call-to-action link labels.",
                tags=["accessibility", "visual", "compliance"]
            )
        ]
        for s in seed_sources:
            self.sources[s.id] = s

        # Content items (managed dynamically by real users)
        self.content_items: Dict[str, ContentItem] = {}
        
        # Comments & Decisions
        self.comments: List[Comment] = []
        self.decisions: List[Decision] = []
        
        # Immutable Audit Trail (PRD Section 7.5 WF-5)
        self.audit_events: List[AuditEvent] = []
        
        self.init_starter_content()

    def init_starter_content(self):
        starter_text = (
            "OmniFlow connects your distributed teams seamlessly with enterprise-grade synchronization. "
            "We are the #1 cloud platform in Europe delivering 99.95% measured uptime to over 50,000 businesses worldwide. "
            "Explore our cost-effective tiers to transform your modern workplace."
        )
        content = ContentItem(
            id="cnt_starter_01",
            workspace_id="ws_default",
            creator_id="usr_creator",
            creator_name="Alex Morgan",
            title="OmniFlow Global Launch Announcement",
            content_type="web",
            channel="Global Marketing Landing Page",
            status="draft",
            current_version_id="v_start_1",
            versions=[
                ContentVersion(
                    id="v_start_1",
                    content_id="cnt_starter_01",
                    number=1,
                    extracted_text=starter_text
                )
            ]
        )
        self.content_items[content.id] = content
        self.log_audit(
            actor_id="usr_creator",
            action="submit_content",
            entity="content",
            entity_id=content.id,
            metadata={"title": content.title, "channel": content.channel}
        )

store = DataStore()
