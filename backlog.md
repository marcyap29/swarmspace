# SwarmSpace — To-Do List
*Updated: April 2026*

---

## Top Priority

> **Plan Agent (Two-Phase Execution)** — Add a planning phase to SwarmSpace agent execution. Before an agent runs, it produces a structured plan showing which tools it will use. User reviews, edits, approves, then execution begins. Backend: `workers/agent-worker/` (deployed). Flutter UI: see LUMARA repository for client integration.

---

## Security & Infrastructure Reality Gap

> **The audit (April 2026) confirmed that security.html, PRISM.md, and DEVELOPER_GUIDE.md describe capabilities that do not exist in code. These items close that gap. Nothing in this section is optional if developer outreach is happening.**

### Documentation Honesty Pass (BEFORE outreach)
- [ ] Audit security.html — replace present-tense claims about V8 sandboxing, `globalOutbound: null`, network domain enforcement, and credential injection with "planned" / "in development" language
- [ ] Audit prism.html — same pass. Context minimization is logging-only today, not enforcement
- [ ] Audit OWASP_AST10_COMPLIANCE.md — flag which controls are implemented vs designed
- [ ] Audit DEVELOPER_GUIDE.md — ensure sandbox execution model section reflects current state (static Workers, not dynamic isolates)

### PRISM Enforcement (code exists but is disconnected)
- [ ] Wire `lib/types/privacy-tiers.ts` and `lib/types/plugin-registry.ts` into `swarmspaceRouter.ts` — currently imported nowhere
- [ ] Replace `privacy_data_required: boolean` with string array of field names in swarmspaceRouter (matches DEVELOPER_GUIDE spec)
- [ ] Implement actual context field filtering at router dispatch (`swarmspaceRouter.ts:421-491` currently forwards `params` verbatim)
- [ ] Remove the `"Allow through for now"` passthrough (line 455) and enforce blocking when consent is missing

### Credential Isolation
- [ ] Refactor plugin Workers so they do not read raw API key secrets directly (currently: `github-public/src/index.ts:59`, `jina-reader/src/index.ts:50`, likely others)
- [ ] Move toward boundary injection: router or proxy injects credentials into outbound requests, plugin code never touches them
- [ ] Audit all 13 plugin Workers for direct secret access patterns and log which ones need refactoring

### Dynamic Worker Loader (sandbox layer)
- [ ] Prototype one plugin running inside Dynamic Worker Loader (V8 isolate sandbox)
- [ ] Configure `globalOutbound: null` on prototype — verify network restriction works
- [ ] Implement `network_domains` allowlist check against plugin manifest before dispatch
- [ ] Evaluate DX and cost vs current static Worker deployment
- [ ] Add `@cloudflare/codemode` or equivalent to repo if adopting Dynamic Workers

### Durable Objects (recurring agent runtime)
- [ ] Define first Durable Object class extending `DurableObject` from `cloudflare:workers`
- [ ] Add `durable_objects` bindings to wrangler config
- [ ] Prototype News Briefing delta variant: store previous output, diff on next run, return delta
- [ ] Implement Alarms API scheduling (`setAlarm` / `alarm()`) for cron-style recurring execution
- [ ] Implement tier gating: reject DO scheduling requests from free-tier mobile users
- [ ] CHRONICLE context injection at execution time (request fresh context, never persist in DO)

### Orchestrator Execution Modes
- [ ] Implement `plan` mode in orchestrator — full chain proposal, no execution until confirmation
- [ ] Implement `auto` mode — headless dispatch for DO/scheduler runs, check `is_destructive` and `is_read_only` manifest fields before plugin execution
- [ ] Implement `bubble` mode — child plugins inherit parent chain authorization
- [ ] Implement `interactive` mode — per-plugin approval for runtime gap discovery
- [ ] Add mode assignment logic: on-demand enters `plan`, DO scheduled enters `auto`, confirmed chains run constituent plugins in `bubble`

### Catalogue Discovery
- [ ] Build `/catalogue/updates` endpoint on swarmspaceRouter (builds on live `swarmspacePluginCatalog`)
- [ ] Accept: `since` timestamp, `interest_tags`, `user_history_categories`
- [ ] Return new/updated plugins sorted by merit score
- [ ] Rate limit: max once per 6 hours per user

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
- [ ] Add user context​​​​​​​​​​​​​​​​
