# SwarmSpace — To-Do List
*Updated: April 2026*

---

## Top Priority

> **Plan Agent (Two-Phase Execution)** — Add a planning phase to SwarmSpace agent execution. Before an agent runs, it produces a structured plan showing which tools it will use. User reviews, edits, approves, then execution begins. Backend: `workers/agent-worker/` (deployed). Flutter UI: see LUMARA repository for client integration.

---

## Pending Tasks

### Infrastructure Deployment
- [x] Merge `claude/review-swarmspace-backlog-HQOlM` branch into `main`

### Community Launch
- [x] Create DEVELOPER_GUIDE.md — step-by-step guide for building a SwarmSpace plugin
- [ ] Draft Developer Agreement (legal) — Prinz Law Office, La Jolla
- [ ] Identify 20-30 target developers from LinkedIn/Substack for personal outreach
- [ ] Write personal outreach messages — Founding Developer pitch (85% share, 100 spots)
- [ ] Open Founding Developer programme registration
- [ ] Seed at least one real post in every Swarm before public launch
- [ ] Publish AST10 compliance page on swarmspace.vercel.app

### Developer Guide Fixes (before outreach)
- [ ] Remove Experimental trust tier from DEVELOPER_GUIDE.md (Section 6, JSON Schema) and architecture.md — only Community and Verified at launch
- [ ] Standardize `privacy_data_required` naming to dot-notation (`user.display_name`, `chronicle.interests`) across DEVELOPER_GUIDE.md and architecture.md
- [ ] Add user context field vocabulary table to DEVELOPER_GUIDE.md Section 10 (PRISM) — developers can't declare fields they don't know exist
- [ ] Add manifest behavioral fields (`is_read_only`, `is_destructive`, `is_concurrency_safe`, `headless`) to DEVELOPER_GUIDE.md Section 3 — required for Durable Object dispatch; `schedulable` already present
- [ ] Expand workflow composition coverage — add revenue compounding detail, real /research route example, output-chaining explanation
- [ ] Add specific error responses from swarmspaceRouter (403 quota, 403 tier, 502 timeout) to DEVELOPER_GUIDE.md Section 4
- [ ] Add testing/sandbox instructions — Firebase auth token, curl against swarmspaceRouter, sandbox environment status
- [ ] Add changelog/versioning guidance — update submission process, content_hash updates, re-review for breaking changes
- [ ] Verify all outreach URLs resolve: submit-plugin, earnings, GitHub repo, developer@orbitalai.net mailbox

### Platform Mechanics
- [ ] Swarms UI — per-plugin, per-workflow community spaces
- [ ] Upvote infrastructure — one vote per user, weighted by usage
- [ ] Monthly merit review tooling — manual at launch, dashboard at scale
- [ ] Credit rollover policy — no rollover at launch, 20% cap post-launch
- [ ] Tighten Developer Pro qualification thresholds
- [ ] Progressive workflow discovery (CHRONICLE-driven surfacing)
- [ ] Custom chain builder UI

### Plan Agent Enhancements
- [ ] Add custom user API key support to Plan Agent worker
- [ ] Enhance plugin registry with capabilities, example queries, and privacy flags
- [ ] Implement plan validation mode for editing workflows

### Infrastructure
- [ ] Firestore composite index on `stripe_customer_id`
- [ ] API key uniqueness enforcement in Firestore
- [ ] Behavioral scanning pipeline for submissions (AST08 gap)
- [ ] Stripe webhook signature verification (currently basic check only)

### Layer 3 — Agents & Desktop (Future Phase)
- [ ] Add `schedulable` field to manifest spec
- [ ] Define Dream Team pack manifest format
- [ ] Design CHRONICLE goal ancestry data model
- [ ] Resolve autonomy ladder UX patterns
- [ ] LUMARA desktop app — Flutter/Dart scaffold (macOS primary)
- [ ] Desktop scheduler — Dart background isolate + cron dispatcher
- [ ] First Dream Team: Social Media Manager + Content Strategist
- [ ] Agent marketplace UI
- [ ] iOS + desktop CHRONICLE sync

---

*Full Layer 3 spec: [Docs/LAYER3_DESIGN_AND_BACKLOG.md](Docs/LAYER3_DESIGN_AND_BACKLOG.md)*
