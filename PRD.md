# BrandLens: Product Requirements Document (PRD)

| | |
|---|---|
| **Product** | BrandLens (working name): AI brand-governance platform |
| **Event / Challenge** | Inkloom AI: Brand Governance |
| **Document status** | Draft v1.0 (Round 1: The Plan) |
| **Date** | 26 October 2026 |
| **Owner** | Product & Research Lead |

---

## 1. Overview

### 1.1 Summary
BrandLens reviews content **before publication** and checks it against an organisation's approved brand guidelines, facts, terminology and assets. It explains every issue, cites the exact source behind it, and suggests a correction that preserves the creator's intent. Humans keep final control through a role-based review and approval workflow.

One-line pitch: *a spell-check for brand consistency: it explains, cites its source and suggests, and people decide.*

### 1.2 Problem Statement
Organisations publish through many employees, agencies and AI tools. As volume grows, content goes out with:
- incorrect or outdated facts
- inconsistent tone and terminology
- off-brand or inaccessible visuals
- unsupported promotional claims (for example "#1 in the market")

These errors damage credibility before anyone notices. Today's review is late, manual, subjective and spread across email and chat, and guidelines are buried in long PDFs. The same mistakes repeat, and nobody can see which guidelines are unclear.

### 1.3 Vision
Brand consistency is checked at the moment of creation, not discovered after publication. Every finding is evidence-based and explainable, and repeat mistakes feed back into better guidelines.

---

## 2. Goals and Non-Goals

### 2.1 Goals
1. Detect brand issues in tone, terminology, facts and messaging, visuals, accessibility and promotional claims before publication.
2. Ground **every** finding in an approved source (guideline, fact, glossary entry or asset rule).
3. Explain each finding in plain language and suggest a fix that keeps the creator's purpose.
4. Support comments, approvals, revision history and role-based review.
5. Surface recurring mistakes and unclear guidelines over time.
6. Protect confidential brand materials and disclose all AI and external-service use.

### 2.2 Non-Goals (v1)
- Auto-publishing to channels (social, CMS, email).
- Auto-rewriting or auto-approving content without human action.
- Legal sign-off. BrandLens supports reviewers but does not replace legal or compliance judgment.
- Video and audio review.
- Real-time collaborative editing (Google Docs style).
- Verifying claims against the open web. Only approved internal sources are used.

---

## 3. Target Users and Setting

### 3.1 Organisational setting
Mid-to-large organisations publishing across web, social, slide decks, PDFs and email, using in-house teams, agencies and AI writing tools.

### 3.2 Personas

| Persona | Role | Key needs | Success looks like |
|---|---|---|---|
| **Creator** (marketing exec, writer, agency designer) | Produces content | Fast, clear feedback before submitting; no surprise rejections | Fewer revision rounds |
| **Brand Manager** | Owns guidelines and consistency | Consistency at scale; visibility of repeat issues; control of the knowledge base | Fewer late-stage corrections |
| **Reviewer** (brand, legal, compliance) | Approves sensitive or high-risk content | Evidence-backed flags, audit trail, ability to override | Faster, defensible approvals |
| **Admin** | Manages workspace | Users, roles, security, data settings | Safe, compliant operation |
| **Agency / External collaborator** | Creates under brand rules | Guidelines they can check work against, with restricted access | Accepted on first review |

### 3.3 Roles and permissions

| Capability | Creator | Reviewer | Brand Manager | Admin |
|---|:--:|:--:|:--:|:--:|
| Submit content, run checks | Yes | Yes | Yes | Yes |
| Accept, edit or dispute findings (own content) | Yes | Yes | Yes | Yes |
| Comment | Yes | Yes | Yes | Yes |
| Approve or reject content | No | Yes | Yes | Yes |
| Override a finding (with reason) | No | Yes | Yes | Yes |
| Manage knowledge base | No | No | Yes | Yes |
| View insights dashboard | Own only | Team | All | All |
| Manage users, roles, settings | No | No | No | Yes |

---

## 4. Evidence and Research Plan

The problem must be shown to be real. Findings will replace the placeholders below as research completes.

| Method | Sample | Hypothesis tested |
|---|---|---|
| Stakeholder interviews | 10-12 brand, marketing, legal and agency leads | Errors are mostly found late, at final sign-off |
| Survey | 40+ creators and managers | Rework from brand feedback is frequent; guideline lookup is slow |
| Workflow observation | 2-3 teams shadowed through one campaign | Hand-offs happen over email and chat with no audit trail |
| Brand-incident review | Public brand slips and internal post-mortems | Root causes cluster in facts, claims, visuals and tone |

**Evidence to add before submission:** interview quotes, survey percentages, and 2-3 real brand-mishap examples with consequences.

---

## 5. User Stories

**Creator**
- As a creator, I upload a draft and see issues with reasons before my manager does.
- As a creator, I get a suggested fix that keeps my message, so I do not have to guess how to correct it.
- As a creator, I can dispute a finding if I believe it is wrong, and explain why.

**Brand Manager**
- As a brand manager, I upload guidelines, approved facts, glossary terms and assets once and keep them versioned.
- As a brand manager, I see which rules are flagged most often and which are frequently overridden, so I can clarify them.

**Reviewer**
- As a reviewer, I see each flag with its cited source so I can approve quickly and defensibly.
- As a reviewer, I can override a finding with a recorded reason, and the audit trail shows who decided what.

**Admin**
- As an admin, I control who can access which workspace and see what data is shared with AI services.

---

## 6. Scope

### 6.1 MVP (hackathon build)
- Auth and role-based access
- Knowledge base (guidelines, approved facts, glossary, claims policy, asset rules)
- Text review (paste) and document review (PDF, DOCX)
- Findings with severity, explanation, cited source and suggested fix
- Accept / edit / dispute actions
- Comments, approve / reject, revision history, audit log
- Insights dashboard (top rules, repeat issues, override rate)
- AI-use disclosure notice

### 6.2 Phase 2
- Image review (logo misuse, palette, alt-text, contrast) with vision model
- Slide deck (PPTX) review
- Slack / Teams notifications
- Drive / SharePoint import
- SSO (SAML / OIDC)

### 6.3 Later
- Figma and CMS plug-ins
- Multi-language support
- Custom checks defined by brand managers
- Browser extension for in-context checks

---

## 7. Functional Requirements

Priority: **P0** = must have for MVP, **P1** = should have, **P2** = later.

### 7.1 Knowledge Base

| ID | Requirement | Priority |
|---|---|---|
| KB-1 | Upload brand guidelines (PDF, DOCX, MD, TXT) and parse into sections | P0 |
| KB-2 | Manage structured entries: approved facts, glossary (preferred, banned, product names), claims policy | P0 |
| KB-3 | Every source item has an ID, title, section reference, owner, effective date and version | P0 |
| KB-4 | Mark sources as active or retired; retired sources are never used for new checks | P0 |
| KB-5 | Store reusable assets (logos, palette, fonts) with usage rules | P1 |
| KB-6 | Show which findings each source has triggered | P1 |
| KB-7 | Import from Drive or SharePoint | P2 |

### 7.2 Content Submission

| ID | Requirement | Priority |
|---|---|---|
| CS-1 | Paste text or upload PDF and DOCX | P0 |
| CS-2 | Select content type and channel (social, web, press, deck, email) so the correct rules apply | P0 |
| CS-3 | Extract text with structure preserved so findings map back to locations | P0 |
| CS-4 | Upload images (PNG, JPG) with OCR and visual checks | P1 |
| CS-5 | Upload PPTX | P2 |
| CS-6 | Tag content as AI-generated, human-written or mixed | P1 |

### 7.3 Review Engine

| ID | Requirement | Priority |
|---|---|---|
| RE-1 | Check categories: tone and voice, terminology, facts and messaging, promotional claims | P0 |
| RE-2 | Check categories: visual consistency and accessibility (alt-text, contrast, structure) | P1 |
| RE-3 | Deterministic rule checks (banned terms, naming, superlatives, contrast ratio) run alongside AI checks | P0 |
| RE-4 | AI checks use retrieval of relevant approved sources and return structured JSON | P0 |
| RE-5 | **A finding is only shown if it cites at least one source.** Findings with no supporting source are dropped or labelled "advisory" | P0 |
| RE-6 | Each finding includes confidence and severity (high, medium, low) | P0 |
| RE-7 | Suggested fix preserves the creator's intent and stays within approved facts and terms | P0 |
| RE-8 | Re-run checks on a new version and show what was resolved, remained or newly raised | P0 |
| RE-9 | Deduplicate overlapping findings | P1 |

### 7.4 Findings and Explanations

Every finding displays:
- the flagged excerpt (highlighted in context)
- category and severity
- plain-language reason ("why was this flagged")
- the cited source (title, section, link to the source text)
- a suggested fix (never auto-applied)
- actions: **Accept**, **Edit**, **Dispute** (with required reason), and for reviewers **Override**

| ID | Requirement | Priority |
|---|---|---|
| FD-1 | Show findings inline in the content and in a side list | P0 |
| FD-2 | Show before / after for accepted fixes | P0 |
| FD-3 | Disputed findings are routed to a reviewer | P0 |
| FD-4 | Filter and sort by severity, category, status | P1 |

### 7.5 Workflow, Collaboration and Audit

| ID | Requirement | Priority |
|---|---|---|
| WF-1 | Status flow: Draft, In Review, Changes Requested, Approved, Rejected | P0 |
| WF-2 | Route content to a reviewer based on severity and content type | P0 |
| WF-3 | Comments on content and on individual findings, with @mentions | P0 |
| WF-4 | Revision history with side-by-side diff | P0 |
| WF-5 | Immutable audit log (who, what, when) for submissions, decisions, overrides and settings changes | P0 |
| WF-6 | In-app notifications for assignments and decisions | P1 |
| WF-7 | Slack and Teams notifications | P2 |

### 7.6 Insights and Governance

| ID | Requirement | Priority |
|---|---|---|
| IN-1 | Top flagged rules over a selectable period | P0 |
| IN-2 | Flags by category, team, channel and content type | P0 |
| IN-3 | Override and dispute rate per rule. A high flag count with a high override rate marks a rule as **possibly unclear** | P0 |
| IN-4 | Repeat-issue tracking per team | P1 |
| IN-5 | Suggest improvements to unclear guidelines (for example "add an example to Rule 3.2") for the brand manager to review | P1 |
| IN-6 | Export reports (CSV, PDF) | P2 |

### 7.7 Administration, Privacy and Transparency

| ID | Requirement | Priority |
|---|---|---|
| AD-1 | Role-based access control per workspace | P0 |
| AD-2 | Visible disclosure listing which AI and external services are used and what data is sent | P0 |
| AD-3 | Label AI-generated findings and suggestions as such in the UI | P0 |
| AD-4 | Data deletion and export on request | P1 |
| AD-5 | Workspace setting to choose the AI provider or disable external AI (rules-only mode) | P1 |

---

## 8. Core Workflow (End to End)

1. **Set up:** Brand manager uploads guidelines, facts, glossary and asset rules.
2. **Submit:** Creator submits text, document or image and chooses content type and channel.
3. **Check:** System extracts content, retrieves relevant approved sources, runs rule checks and AI checks.
4. **Explain:** Findings appear with reason, cited source and suggested fix.
5. **Revise:** Creator accepts, edits or disputes each finding, then re-runs the check.
6. **Review:** Manager or reviewer comments, asks for changes, overrides with a reason, or approves.
7. **Record:** Version history and audit log are saved.
8. **Learn:** Insights update; unclear rules are highlighted for the brand manager.

---

## 9. AI and Grounding Design

### 9.1 Principles
- **Grounded:** every finding cites an approved source. No source means no finding.
- **Explainable:** reasons are written in plain language and the cited text is shown.
- **Assistive:** the system suggests; people decide.
- **Minimal data:** only the content and the retrieved source excerpts needed for a check are sent to a model.

### 9.2 Pipeline

```
Content -> Parse/extract -> Segment into units
        -> Retrieve relevant source chunks (vector + keyword)
        -> Deterministic rule checks
        -> LLM checks (structured output)
        -> Validate: citation exists, quote matches source
        -> Merge, deduplicate, score severity/confidence
        -> Findings shown to user
```

### 9.3 Finding schema (structured output)

```json
{
  "id": "f_123",
  "category": "claims | tone | terminology | facts | visual | accessibility",
  "severity": "high | medium | low",
  "confidence": 0.0,
  "excerpt": { "text": "We are the #1 platform in Europe.", "start": 120, "end": 154 },
  "reason": "No approved fact supports a ranking claim.",
  "sources": [
    { "source_id": "claims-policy", "section": "3.2", "quote": "Ranking claims require a cited third-party report." }
  ],
  "suggestion": "Trusted by teams across Europe.",
  "status": "open | accepted | edited | disputed | overridden"
}
```

### 9.4 Reliability controls
- Validate that each cited `source_id` exists and that the quoted text appears in that source. Drop findings that fail.
- Keep the temperature low and require JSON output.
- Never suggest facts that are not in the approved fact set; if a fix needs missing information, say so instead of inventing it.
- Store model, version and prompt hash with each run for reproducibility.
- Maintain a small evaluation set of labelled examples (see section 14).

---

## 10. System Architecture

| Layer | Choice |
|---|---|
| Frontend | (React + javaScript), Tailwind CSS |
| Backend | FastAPI (Python) |
| Database | PostgreSQL (Supabase) with pgvector |
| Auth | Supabase Auth (SSO later) |
| File storage | Supabase Storage (private buckets) |
| Document parsing | PyMuPDF (PDF), python-docx (DOCX) |
| OCR / vision | Tesseract or cloud OCR; vision model for images (Phase 2) |
| AI | LLM through a provider-agnostic interface; embeddings for retrieval |
| Background jobs | Queue worker for long checks |
| Deployment | Vercel (frontend), Render or Railway (backend) |

```
[Web app] <-> [API (FastAPI)] <-> [Postgres + pgvector]
                  |   |-> [Storage]
                  |-> [Worker] -> [LLM / embeddings provider]
                  |-> [Audit log]
```

---

## 11. Data Model (core entities)

| Entity | Key fields |
|---|---|
| **Workspace** | id, name, settings (AI provider, rules-only mode) |
| **User** | id, workspace_id, email, role |
| **Source** | id, type (guideline, fact, glossary, claims, asset-rule), title, section, version, status, effective_date, owner |
| **SourceChunk** | id, source_id, text, embedding |
| **Content** | id, workspace_id, creator_id, type, channel, status, current_version_id |
| **ContentVersion** | id, content_id, number, file_ref, extracted_text, created_at |
| **CheckRun** | id, version_id, model, prompt_hash, started_at, status |
| **Finding** | id, run_id, category, severity, confidence, excerpt, reason, suggestion, status |
| **FindingSource** | finding_id, source_id, section, quote |
| **Comment** | id, content_id, finding_id (nullable), author_id, body |
| **Decision** | id, content_id, reviewer_id, outcome, reason |
| **AuditEvent** | id, actor_id, action, entity, entity_id, timestamp, metadata |

---

## 12. API Outline

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/sources` | Upload or create a source |
| GET | `/api/sources` | List sources |
| POST | `/api/content` | Submit content |
| POST | `/api/content/{id}/versions` | Upload a revised version |
| POST | `/api/content/{id}/check` | Run a review |
| GET | `/api/content/{id}/findings` | Get findings |
| PATCH | `/api/findings/{id}` | Accept, edit, dispute or override |
| POST | `/api/content/{id}/comments` | Add a comment |
| POST | `/api/content/{id}/decision` | Approve or reject |
| GET | `/api/insights` | Governance metrics |
| GET | `/api/audit` | Audit log (admin) |

---

## 13. Non-Functional Requirements

| Area | Requirement |
|---|---|
| **Performance** | Text check of up to 2,000 words returns in under 30 seconds; progress shown for longer jobs |
| **Reliability** | Findings fail safe: if the AI service is unavailable, rule-based checks still run and the user is told |
| **Security** | Encryption in transit and at rest; role-based access; per-workspace data isolation; signed, expiring file URLs |
| **Privacy** | No training on customer data; only needed excerpts sent to the model; data deletion on request |
| **Auditability** | All decisions and overrides stored in an append-only log |
| **Accessibility** | The product itself meets WCAG 2.1 AA (keyboard, contrast, labels) |
| **Usability** | A new creator completes their first check in under 5 minutes without training |
| **Scalability** | Stateless API and queued jobs so workers can scale horizontally |
| **Explainability** | No finding is displayed without a reason and a cited source |

---

## 14. Success Metrics

### 14.1 Product metrics (pilot targets to validate)

| Metric | Target |
|---|---|
| Findings with a valid source citation | 100% |
| Reduction in late-stage brand corrections | -50% |
| Reduction in review turnaround time | -40% |
| Creator-accepted suggestions | 60%+ |
| Disputed or overridden findings (a proxy for false positives) | Under 20% |
| Repeat violations of the same rule per team | Downward trend |

### 14.2 AI quality (evaluation set)
Build a set of 50-100 labelled samples (compliant and non-compliant) and track:
- **Precision:** flagged issues that are real
- **Recall:** real issues that were caught
- **Citation accuracy:** quoted source text exists and supports the finding
- **Fix quality:** reviewer rating that the suggestion preserves intent

---

## 15. Responsible AI, Privacy and Security

| Principle | How it is implemented |
|---|---|
| **Human control** | AI only suggests. No auto-edit, auto-approve or auto-publish. Every override needs a reason and is logged |
| **Transparency** | AI and external services are disclosed in-product; AI-generated text is labelled; confidence and sources are shown |
| **Privacy** | Brand files stay in the customer's workspace; excerpts only are sent to the model; no training on customer data; rules-only mode available |
| **Security** | RBAC, encryption, private storage, SSO, audit logs |
| **Fairness and accuracy** | Evaluation set, citation validation, and a dispute path to catch wrong findings |
| **Accountability** | Every finding and decision is traceable to a person, time, model version and source |

---

## 16. Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| AI hallucinates a finding or fix | Loss of trust | Citation validation; drop uncited findings; low temperature |
| Too many false positives | Users ignore the tool | Severity tiers, confidence scores, dispute button, tuning from override data |
| Guidelines are vague or conflicting | Weak or inconsistent findings | Insights flag unclear rules; require a source owner and version |
| Confidential data leaks to an external service | Security and compliance failure | Minimal excerpts, provider setting, rules-only mode, disclosure |
| Visual checks are unreliable | Wrong flags on images | Scope to text and documents for MVP; label image checks as beta |
| Scope too large for hackathon | Incomplete demo | Ship one polished end-to-end flow first |

---

## 17. Milestones (8 weeks)

| Phase | Weeks | Deliverables |
|---|---|---|
| **1. Foundation** | 1-2 | Project setup, auth and roles, knowledge base, source ingestion and chunking |
| **2. Review engine** | 3-4 | Text and PDF extraction, retrieval, rule and AI checks, cited findings, suggestions |
| **3. Workflow** | 5-6 | Findings UI, comments, approvals, version history, audit log |
| **4. Insights and polish** | 7-8 | Dashboard, image and PDF visual checks (beta), AI-use disclosure, evaluation run, demo |

### Team roles
- **Product and Research Lead:** interviews, requirements, demo story
- **AI Engineer:** retrieval, checks, explanations, evaluation
- **Full-stack Engineer:** workflow, roles, dashboard
- **Design and QA:** UX, accessibility, test content

---

## 18. Demo Scenario

A marketing campaign draft, written partly by an agency and partly by an AI tool, is submitted.

1. BrandLens flags an unsupported "#1" claim, an outdated product name, a banned term and off-brand tone.
2. Each finding cites its source and shows a suggested fix.
3. The creator accepts two fixes, edits one and disputes one.
4. The reviewer sees the dispute with the cited source, overrides it with a reason, and approves.
5. The dashboard shows the claims rule as the most flagged and most overridden, so the brand manager adds an example to clarify it.

---

## 19. Open Questions
1. Which content formats are most important to the pilot organisation (text, PDF or images)?
2. Which AI provider will be used, and does the pilot require an on-premises or private deployment option?
3. Who owns each guideline source, and how are conflicts between sources resolved?
4. What severity level should require mandatory reviewer approval?
5. Which languages must be supported at launch?

---

## 20. Glossary

| Term | Meaning |
|---|---|
| **Approved source** | A guideline, fact, glossary entry or asset rule marked active by a brand manager |
| **Finding** | A flagged issue with reason, cited source and suggested fix |
| **Grounding** | Basing an AI output on retrieved approved material |
| **Override** | A reviewer's recorded decision to dismiss or accept despite a finding |
| **Rules-only mode** | Operating with deterministic checks and no external AI service |
