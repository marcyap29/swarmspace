# Configuration Management & Documentation Tracking

**Last Updated:** 2026-05-16
**Status:** ✅ Synced

---

## Purpose

Tracks changes between the repository codebase and documentation, ensuring docs stay synchronized with implementation. Central hub for configuration management.

---

## Key Documents for Onboarding

| Entry point | Purpose | When to read |
|-------------|---------|--------------|
| **Swarmspace_Overview.md** | Purpose, flow, orientation for users/agents | First read; what is SwarmSpace |
| **README.md** | Setup guide (Firebase, Stripe, Vercel) | Deploy instructions |
| **SWARMSPACE_API_CONTEXT.md** | API reference for LUMARA integration | API integration |
| **architecture.md** | SwarmStore architecture & hosting | Broader vision; plugin format |
| **Docs/claude.md** | AI context guide; SOPs; Documentation & Config Role | Onboarding; doc workflows |
| **Docs/Agents.md** | Cross-repo dependency check (LUMARA ↔ SwarmSpace) | Before/after every feature touching shared functions |
| **Docs/context.md** | Session handoff log | Read at session start; append after each meaningful action |
| **Docs/CONFIGURATION_MANAGEMENT.md** (this file) | Docs inventory and change log | Sync status; what changed |
| **Docs/CHANGELOG.md** | Version history | What changed and when |
| **Docs/FEATURES.md** | Feature list | Capabilities |
| **Docs/backend.md** | Backend (API, Vercel, Firebase) | Backend structure |
| **DEVELOPER_GUIDE.md** | Manifest spec, schemas, submission checklist | Plugin authors |
| **Docs/PRISM.md** | Privacy / activity logging reference | Security, compliance |
| **Docs/PRIVACY.md** | Privacy policy (Markdown) | Legal / product |
| **prism.html** / **privacy.html** | Public PRISM and privacy pages | Site visitors |
| **Docs/bugtracker/** | Bug tracker | Known issues, fixes |

---

## Documentation Update Checklist

When running a doc sync or release:

- [ ] **Docs/CHANGELOG.md** — new version entry
- [ ] **Docs/CONFIGURATION_MANAGEMENT.md** — this change log entry + inventory if needed
- [ ] **Docs/bugtracker/** — new row in Recent code changes; Last Updated (if applicable)
- [ ] **README.md** — file structure, setup steps if changed
- [ ] **SWARMSPACE_API_CONTEXT.md** — API changes when relevant

---

## Documentation Inventory

| Document | Location | Last Reviewed | Status | Notes |
|----------|----------|---------------|--------|-------|
| Swarmspace_Overview.md | root | 2026-03-01 | ✅ Synced | Renamed from overview.md (canonical filename) |
| README.md | root | 2026-04-06 | ✅ Synced | Firebase submit/admin; file structure |
| SWARMSPACE_API_CONTEXT.md | root | 2026-04-19 | ✅ Synced | Full Workflow/Work Chain API section added (12 orchestrator routes) |
| architecture.md | root | 2026-04-14 | ✅ Synced | v1.4.1 full rewrite — PRISM, discovery, founding dev, orchestrator, 22 plugins, 10 collections |
| submit.html | root | 2026-04-04 | ✅ Synced | Public `/submit`; Firestore `plugin_submissions` (legacy shape + `developer_uid`) |
| submit-plugin.html | root | 2026-04-06 | ✅ Synced | Primary submit portal; `plugin_submissions`; client-sorted history |
| Docs/Agents.md | Docs/ | 2026-04-19 | ✅ Synced | Agent prompt rules reference |
| Docs/CHRONICLE.md | Docs/ | 2026-04-19 | ✅ Synced | CHRONICLE summary generation reference |
| admin-submissions.html | root | 2026-04-04 | ✅ Synced | `/admin-submissions`; `plugin_submissions` review UI |
| security.html | root | 2026-04-06 | ✅ Synced | Security & trust architecture (static page) |
| prism.html | root | 2026-04-06 | ✅ Synced | Public PRISM reference |
| privacy.html | root | 2026-04-06 | ✅ Synced | Public privacy policy |
| Privacy.md | root | 2026-04-06 | ✅ Synced | MD privacy policy (paired with Docs/PRIVACY.md) |
| Docs/PRIVACY.md | Docs/ | 2026-04-06 | ✅ Synced | Privacy policy (Markdown) |
| DEVELOPER_GUIDE.md | root | 2026-04-04 | ✅ Synced | Developer / manifest reference |
| Docs/PRISM.md | Docs/ | 2026-04-04 | ✅ Synced | PRISM reference |
| Docs/claude.md | Docs/ | 2026-05-01 | ✅ Synced | v1.5.1: RULE.md/overview.md references removed, §12/§16 status updated, file structure refreshed |
| Docs/context.md | Docs/ | 2026-05-16 | ✅ Synced | Session handoff log; updated with OAuth 2.1 session (2026-05-15) and doc close-out session (2026-05-16) |
| roles.html | root | 2026-04-19 | ✅ Synced | §16 Roles browsing page (6 cards: 5 Free, 1 Standard) |
| Docs/CONFIGURATION_MANAGEMENT.md | Docs/ | 2026-04-06 | ✅ Synced | |
| Docs/CHANGELOG.md | Docs/ | 2026-04-06 | ✅ Synced | |
| Docs/FEATURES.md | Docs/ | 2026-04-06 | ✅ Synced | |
| Docs/backend.md | Docs/ | 2026-04-06 | ✅ Synced | |
| functions/ | root | 2026-04-06 | ✅ Synced | Cloud Functions; lazy SDK loads for deploy |
| Docs/git.md | Docs/ | 2026-03-01 | ✅ Synced | |
| Docs/SECURITY_CHECKLIST.md | Docs/ | 2026-03-01 | ✅ Synced | |
| Docs/UI_UX.md | Docs/ | 2026-03-01 | ✅ Synced | |
| Docs/bugtracker/ | Docs/ | 2026-04-04 | ✅ Synced | |
| ast10.html | root | 2026-04-10 | ✅ Synced | OWASP AST10 compliance page (public) |
| LUMARA_SWARMSPACE_FUNCTIONS_INTEGRATION.md | root | 2026-04-10 | ✅ Synced | Cross-repo function ownership |
| SWARMSPACE_ANSWERS_TO_LUMARA.md | root | 2026-04-10 | ✅ Synced | Responses to LUMARA integration questions |
| backlog.md | root | 2026-04-19 | ✅ Synced | Long-term feature backlog |
| planner.md | root | 2026-04-19 | ✅ Synced | Active task scratchpad |
| scripts/test-workflows.sh | scripts/ | 2026-04-19 | ✅ Synced | Live smoke-test for 3 primary workflows |
| scripts/get-test-token.js | scripts/ | 2026-04-19 | ✅ Synced | Firebase ID token helper for manual testing |
| Docs/OWASP_AST10_COMPLIANCE.md | Docs/ | 2026-04-10 | ✅ Synced | Internal AST10 compliance doc |
| Docs/LAYER3_DESIGN_AND_BACKLOG.md | Docs/ | 2026-04-10 | ✅ Synced | Layer 3 design |
| Docs/LUMARA_Overview.md | Docs/ | 2026-04-10 | ✅ Synced | LUMARA overview |
| functions/src/functions/validatePluginSubmission.ts | functions/ | 2026-04-10 | ✅ Synced | Plugin validation function |
| founding-developers.html | root | 2026-04-11 | ✅ Synced | Founding Developer Programme landing page |
| developer-guide.html | root | 2026-04-11 | ✅ Synced | HTML developer guide (styled) |
| functions/src/functions/swarmspaceDiscoveryAgent.ts | functions/ | 2026-04-11 | ✅ Synced | Discovery agent function |
| functions/src/functions/swarmspaceClaimFoundingSpot.ts | functions/ | 2026-04-11 | ✅ Synced | Founding spot claim function |
| workers/mcp-server/src/tools.ts | workers/mcp-server/ | 2026-05-14 | ✅ Synced | MCP tool definitions for 13 orchestrator chains |
| workers/mcp-server/src/index.ts | workers/mcp-server/ | 2026-05-15 | ✅ Synced | MCP Remote Server Worker — OAuth 2.1 AS + Streamable HTTP + 13 tools; version c5aa5f33 |
| workers/mcp-server/package.json | workers/mcp-server/ | 2026-05-14 | ✅ Synced | Worker package config |
| workers/mcp-server/wrangler.toml | workers/mcp-server/ | 2026-05-15 | ✅ Synced | KV bindings: OAUTH_CLIENTS/CODES/TOKENS; secrets: MCP_KEY_SECRET, SWARMSPACE_INTERNAL_TOKEN, OAUTH_ISSUER, FIREBASE_PROJECT_ID |
| workers/mcp-server/tsconfig.json | workers/mcp-server/ | 2026-05-15 | ✅ Synced | New file — TypeScript config for mcp-server worker |
| oauth-consent.html | root | 2026-05-15 | ✅ Synced | OAuth consent page (Firebase email + Google sign-in); deployed via Vercel at swarmspace.app/oauth-consent.html |
| functions/src/functions/swarmspaceMcpKeys.ts | functions/ | 2026-05-14 | ✅ Synced | generateMcpApiKey + revokeMcpApiKey (secret: MCP_KEY_SECRET) |

---

## Change Log

### 2026-05-14 — MCP Remote Server build complete (branch: claude/review-swarm-agents-workflows-0BqPd)

**Action:** Built Remote MCP Server for claude.ai marketplace submission. Test agent reviewed and signed off (PASS).

**New files:**
- `workers/mcp-server/src/tools.ts` — MCP tool definitions for 13 orchestrator chains
- `workers/mcp-server/src/index.ts` — MCP Remote Server Worker (JSON-RPC 2.0, HMAC-SHA256 auth, orchestrator proxy)
- `workers/mcp-server/package.json` — Worker package config
- `workers/mcp-server/wrangler.toml` — Cloudflare Worker config (secrets required: MCP_KEY_SECRET, SWARMSPACE_INTERNAL_TOKEN)
- `functions/src/functions/swarmspaceMcpKeys.ts` — generateMcpApiKey + revokeMcpApiKey (secret: MCP_KEY_SECRET; max 5 keys/user; keys never stored in Firestore)

**Modified files:**
- `functions/src/index.ts` — added exports for generateMcpApiKey + revokeMcpApiKey
- `functions/tsconfig.json` — minor fixes (rootDir, ignoreDeprecations)

**Not yet deployed.** Deployment checklist in `planner.md` Deployment Checklist section.

---

### 2026-05-01 — SOP doc-drift sweep (v1.5.1)

**Action:** Cleared stale references in SOP layer, removed case-collision risk for `planner.md`, recorded post-launch commits.

**Changes:**
- Deleted: `Planner.md` (uppercase) from git index — case collision with lowercase `planner.md` would break Linux/CI checkouts. Lowercase is canonical (matches all SOP wording).
- Updated: `Docs/claude.md` v1.4.0 → **v1.5.1** — removed all `Docs/RULE.md` references (RULE.md was deleted in 1.5.0 but pointers lingered in Quick Reference, File Structure, Reference files); removed all `overview.md` references (canonical filename is `Swarmspace_Overview.md`); refreshed Backlog Sections Reference (§12 Phase 2 ✅, §16 Roles ✅); fixed version footer (was 1.3.0, now 1.5.1); added `Docs/Agents.md`, `Docs/context.md`, `Docs/CHRONICLE.md`, and `roles.html` to file structure.
- Updated: `Docs/CONFIGURATION_MANAGEMENT.md` (this file) — Key Documents table cleaned; inventory refreshed; `roles.html` added; `Docs/context.md` row added.
- Added: `Docs/CHANGELOG.md` v1.5.1 entry covering 7 post-launch commits since 1.5.0.

**Recorded post-launch commits (Apr 19 → Apr 24):**
- `0e2e85c` §12 Phase 2 discovery agent JS complete
- `af723ea` Gemini API key removed from repo + history rewrite
- `ca18197` context.md security remediation notes
- `cd71c9c` §16 Roles browsing page + Firebase timeout investigation
- `36fa6e3` LUMARA cross-repo dependency check rule added to Agents.md
- `d293bd5` removed unused functions (Ollama, AssemblyAI, Wispr)
- `4311c49` credential isolation (per-request token injection) + orphaned worker cleanup

**Follow-up sweep (same day):**
- `backlog.md` §4.5 — verified credit-balance hydration is wired in `dashboard.html:573-583`; updated note from "not confirmed" to ✅.
- `backlog.md` §5.5 — marked Plugin Registry Worker resolved (deleted in `4311c49`); was previously "needs decision".
- `backlog.md` §5.2 — added `recurringVariant` discovery-agent surfacing as a sub-task under Durable Objects (moved from §12 Phase 2, where the field was a dangling dependency).
- `backlog.md` §12 — replaced the dangling `recurringVariant` note with a pointer to §5.2.
- `backlog.md` §17 — fixed cross-references (Citation Verifier §14 → §18, Iterative Refinement §15 → §19) — drift from the §14 Terminology Update renumbering.
- `backlog.md` footer — bumped April 19 → May 1, 2026.
- `Docs/context.md` — closed the loop on the Gemini API key rotation (originally flagged 2026-04-19 in commit `af723ea`); confirmed rotated 2026-05-01.

**Second drift sweep (same day) — verifying claimed-open backlog items against code:**
- `backlog.md` §7.1 + §8 prereq — marked `useOrchestrator` flag flipped (per `Docs/context.md` 2026-04-24 entry); was claiming "active open task". Community launch gate fully clear.
- `backlog.md` §12 Phase 3 chain-to-signup — marked ✅ DONE; was claiming "Not started". All four tasks verified shipped: `signup.html:330-354` captures and persists chain param, `dashboard.html:546-559` decodes and consumes, `dashboard.html:890-949` `renderPendingChain` is tier-aware (upgrade prompt for paid-required, workflow run for matched routes, disabled for custom).
- `backlog.md` §3.3 Stripe Connect — task list updated: `create-connect-account` wiring confirmed live in `earnings.html:222`; credit-checkout pricing live in `dashboard.html:279-281`. Open: `get-connect-balance` UI wiring + production-readiness audit + payout writes.
- `backlog.md` §3.4 Earnings Dashboard — split into ✅ frontend display (verified `earnings.html:178-183`) and ❌ backend population (no Firebase function writes `total_earned`/`pending_payout`/`merit_score`).
- `backlog.md` §2.3 Credential Isolation — replaced stale "13 plugin Workers" claim with verified in-repo audit: 8 plugin workers + `media-upload` are clean; `social-publisher` still env-bound but unrouted; ~10 catalogue plugins not in this repo.

**Third drift sweep (same day) — sequencing-claim correction + Meeting Prep spec added:**
- `backlog.md` §5.2 — corrected the "Depends on: orchestrator execution modes landing first" assertion (stale sequential thinking, not a code-level dependency). Verified: `workers/orchestrator/src/index.js` has zero execution-mode awareness; routes are plain POST handlers running pre-baked, read-only chains. §5.3 only matters for agent-assembled chains. Curated workflow DOs (News Briefing, Competitor Research, Trend Spotter, Market Intelligence) can be built directly against the live orchestrator routes without §5.3.
- `backlog.md` §22 MEETING PREP AGENT — added full implementation spec inline. Cross-repo: SwarmSpace owns `calendar-reader` plugin Worker + `/meeting-prep` orchestrator route; LUMARA owns `MeetingPrepWorkflow` class + UI screen + CHRONICLE/document lookup + OAuth token management. Integration Contract is the source of truth. DO auto-fire (recurring meeting briefs) is Phase 2, will live as a §5.2 variant.

---

### 2026-05-01 — v1.5.2 release: §4.4 + §22 (SwarmSpace half) + §5.2 v1 + service-token bypass

**Action:** Three high-priority backlog items shipped in parallel via SOP-ORCH (lead + 3 sub-agents in worktrees), plus correction of §22 spec ownership mislabel after LUMARA Claude pre-flight confirmed `swarmspaceRouter.ts` lives only in SwarmSpace.

**Changes:**
- **`functions/src/functions/swarmspaceRouter.ts`** —
  - Extended `swarmspacePluginCatalog` with `since` + `interest_tags` filtering (§4.4). New Firestore collection `catalogue_update_rate_limits/{uid}` for 6h/UID gate.
  - Added service-token bypass auth path: `request.data._service_token` + `_run_as_uid` → skip `enforceAuth`, run as that uid.
  - Added `calendar-reader` entry to `PLUGIN_REGISTRY` (Standard tier, STRUCTURED_PERSONAL).
  - Extended `PluginConfig` with optional `is_read_only`, `is_destructive`, `schedulable`, `headless` (forward-looking manifest fields per §22 / backlog §6).
- **`workers/orchestrator/src/index.js`** — new `/meeting-prep` route + `runMeetingPrepWorkflow` per §22 SS-3. `ctx` carries optional `serviceToken` + `runAsUid`; `callPlugin` propagates them in the data envelope when present.
- **`workers/plugins/calendar-reader/`** — new Cloudflare Worker. `Env { SWARMSPACE_INTERNAL_TOKEN }` only; OAuth token is a per-request param. Wraps Google Calendar API v3.
- **`workers/plugins/REGISTRY_ENTRIES.ts`** — appended `calendar-reader` (9th entry).
- **`workers/durable-objects/news-briefing/`** — new Worker hosting `NewsBriefingDO`. Three HTTP routes: `POST /create`, `POST /cancel`, `GET /{do_id}/latest`. SQLite state, daily/weekly Alarms, service-token bypass auth to call orchestrator's `/news-brief`. Tier gate via Firestore REST + service-account JWT.
- **`backlog.md` §22 spec** — moved L-1 → SS-5 (registry entry lives in SwarmSpace, not LUMARA, per `Docs/CLAUDE.md` ownership rules). Updated SS-2 cross-reference. Renumbered LUMARA tasks (L-2→L-1, L-3→L-2, L-4→L-3). Added new L-4 for `SwarmSpaceOrchestratorService.v1RouteSet` allowlist (LUMARA-side route gate originally missed by spec, surfaced by LUMARA Claude pre-flight).
- **`.gitignore`** — added `node_modules/` (the news-briefing DO Worker now carries `package.json` + lockfile).
- **`Docs/CHANGELOG.md`** — v1.5.2 entry.

**Sprint pattern:** SOP-ORCH (lead + 3 parallel sub-agents in `.claude/worktrees/`). User pre-approved A1-A3, B1-B4, C1-C3, D1-D5, E (out-of-scope list) up front so the run was non-stop. Per-track commits: `891ccc2` (§4.4), `e165496` (calendar-reader Worker), `b2e4fd5` (lead's orchestrator + service-token), `306983a` (DO Worker).

**Deploy commands handed to user separately. Not yet deployed at time of write.**

---

### 2026-04-19 — Community launch gate cleared + workflow fixes (v1.5.0)

**Action:** Doc sync after 3-workflow verification and associated fixes that cleared the community launch gate.

**Changes:**
- Fixed: `workers/orchestrator/src/index.js` — `_prism_consent: true` added to all `callPlugin()` calls
- Fixed: `functions/src/functions/swarmspaceRouter.ts` — `"prompt"` added to gemini-flash `privacy_data_required` + `dataTypes`
- Fixed: Lazy-load `admin.firestore()` pattern propagated to 13 LUMARA-owned functions (authGuard, stripeWebhook, analyzeJournalEntry, createCheckoutSession, generateJournalPrompts, getUserSubscription, sendChatMessage, unlockThrottle, quotaGuards, rateLimiter, saveUserModelConfig, crisisIntervention, prism/rivet/resolve)
- Changed: `functions/package.json` — firebase-functions ^7.2.3 → ^7.2.5
- Added: `SWARMSPACE_API_CONTEXT.md` Workflow/Work Chain API section (12 orchestrator routes)
- Added: `scripts/test-workflows.sh`, `scripts/get-test-token.js`
- Added: `Docs/CHRONICLE.md`, `Docs/Agents.md`
- Deleted: `Docs/RULE.md` (rules consolidated into `Docs/claude.md` SOPs)
- Updated: `backlog.md` (§3.3 Stripe Connect partial build, §5.3 agent-worker prototype, §5.5 plugin-registry orphan, §7.1/§8 LUMARA useOrchestrator flag)
- Updated: `Docs/claude.md` v1.4.0, `Docs/CHANGELOG.md` v1.5.0, `Docs/CONFIGURATION_MANAGEMENT.md`

---

### 2026-04-14 — Terminology update: Outcome Packages → Work Chains / Roles

**Action:** Retired "Outcome Packages" term across all docs. Introduced two-layer model: Work Chains (infrastructure/developer) and Roles (marketing skin/end user). Updated backlog, backend, architecture, LAYER3, founding-developers.html, LUMARA integration docs. Added Work Chains catalogue (15 live/near-complete/recurring items), Roles browsing page items, and Market Intelligence Analyst DO variant to backlog Section 5.2.

**Changes:**
- Modified: `backlog.md` (renamed Section 4.6, Section 6 Dream Team → Roles, added Sections 14-16 terminology + Work Chains catalogue + Roles page, added Market Intelligence DO to 5.2, updated Layer 2 → Work Chain references)
- Modified: `Docs/backend.md` (Outcome Packages → Work Chains & Roles, Package → Role throughout, packages → roles collection, prerequisite statuses updated)
- Modified: `Docs/LAYER3_DESIGN_AND_BACKLOG.md` (Dream Team → Roles, pack → Role, Layer 2 → Work Chain)
- Modified: `founding-developers.html` (Outcome Packages → Work Chains & Roles)
- Modified: `LUMARA_SWARMSPACE_FUNCTIONS_INTEGRATION.md` (swarmspacePackageCatalog description)
- Modified: `architecture.md` (Layer 2 → Work Chain)

### 2026-04-14 — architecture.md full rewrite (4.7)

**Action:** Rewrote `architecture.md` to close significant drift with the current codebase. The document had not been updated since before PRISM enforcement, discovery agent, founding dev programme, v2 validation pipeline, and orchestrator were implemented.

**Changes:**
- Rewrote: `architecture.md` (full rewrite: 22 plugins, 5 standard-tier, PRISM section, discovery agent section, founding dev section, orchestrator & workflow chains section, 10 Firestore collections, updated architecture diagram, updated pricing, plugin promotion pipeline with state transitions and resubmission, v2 validation pipeline details)

### 2026-04-13 — validatePluginSubmission v2 upgrade

**Action:** Rewrote `validatePluginSubmission` as a v2 automated validation pipeline with Ajv schema validation, latency profiling, security header audit, network DNS validation, and prompt injection probes.

**Changes:**
- Modified: `functions/src/functions/validatePluginSubmission.ts` (v2 rewrite: Ajv JSON Schema validation, 3-sample latency profiler, security header audit, network DNS validation, prompt injection probes)
- Modified: `functions/package.json` (added `ajv`, `ajv-formats`)

### 2026-04-13 — PRISM enforcement, developer plugin pipeline, SSRF hardening, doc honesty pass

**Action:** Updated documentation after PRISM enforcement in router, developer submission promotion pipeline, plugin merge, SSRF hardening, orchestrator fixes, and documentation honesty pass.

**Changes:**
- New file: `functions/src/functions/onSubmissionStatusChange.ts`
- Modified: `functions/src/functions/swarmspaceRouter.ts` (PRISM enforcement + developer plugin merge)
- Modified: `functions/src/functions/validatePluginSubmission.ts` (SSRF, duplicates, hardening, new fields)
- Modified: `submit-plugin.html` (5 new fields, resubmission flow, status dashboard)
- Modified: `functions/src/index.ts` (new export)
- Modified: `workers/orchestrator/src/index.js` (plugin ID fixes)
- Modified: `DEVELOPER_GUIDE.md`, `developer-guide.html`, `security.html`, `prism.html`, `ast10.html`, `faq.html`, `marketplace.html`, `dashboard.html`, `submit-plugin.html`, `thankyou.html`
- Modified: `Docs/OWASP_AST10_COMPLIANCE.md`, `architecture.md`, `Docs/RULE.md`

### 2026-04-11 — Discovery Agent, Founding Developer Programme, new pages and functions

**Action:** Added Discovery Agent, Founding Developer Programme, and chain-to-signup handoff. New HTML pages and Cloud Functions registered.

**Changes:**
- CONFIGURATION_MANAGEMENT: added `founding-developers.html`, `developer-guide.html`, `swarmspaceDiscoveryAgent.ts`, `swarmspaceClaimFoundingSpot.ts` to inventory.
- claude.md: file structure, Quick Reference, and Ownership Rules updated; version bumped to 1.3.0.
- README.md: file structure updated; new Firestore collections (`founding_programme`, `discovery_rate_limits`, `discovery_sessions`) added.
- planner.md: wiped clean after completing Discovery Agent, Founding Developer Programme, and chain-to-signup handoff.

### 2026-04-10/11 — LUMARA integration, OWASP AST10, new functions, doc inventory sync

**Action:** Updated documentation inventory and cross-repo integration docs after LUMARA backend integration, OWASP AST10 compliance work, and new Cloud Function additions.

**Changes:**
- CONFIGURATION_MANAGEMENT: added `ast10.html`, `LUMARA_SWARMSPACE_FUNCTIONS_INTEGRATION.md`, `SWARMSPACE_ANSWERS_TO_LUMARA.md`, `backlog.md`, `planner.md`, `Docs/OWASP_AST10_COMPLIANCE.md`, `Docs/LAYER3_DESIGN_AND_BACKLOG.md`, `Docs/LUMARA_Overview.md`, `functions/src/functions/validatePluginSubmission.ts` to inventory.
- claude.md: file structure, Quick Reference, and Cross-Repo Integration ownership list updated.
- LUMARA_SWARMSPACE_FUNCTIONS_INTEGRATION.md: added `validatePluginSubmission` and `swarmspaceWriteCapabilities` to SwarmSpace-owned functions (6 → 8).

### 2026-04-06 — Doc-config-git-backup (prism/privacy pages, Functions lazy-load)

**Action:** Ran **Documentation, Configuration Management and Git Backup** on `main` after commits through `5b4e12b` (public PRISM/privacy HTML, index/security updates, Functions deploy fixes).

**Drift addressed:** CHANGELOG stopped at 1.1.5; new static pages and `functions` dependency/import changes undocumented; `security.html` footer had broken links.

**Changes:** CHANGELOG **1.1.6**; README file tree; FEATURES; backend Functions note; CONFIG inventory; claude.md; bugtracker; `security.html` footer fix.

### 2026-04-04 — Merge `developer-guide` → `main`

**Action:** Fast-forwarded `main` to `79bf66b`; post-merge doc touch-ups (claude.md branch line, CONFIG status, bugtracker note).

### 2026-04-04 — Doc-config-git-backup (developer-guide branch: admin sync, security page, guide)

**Action:** Ran **Documentation, Configuration Management and Git Backup** on branch `developer-guide` after commit `4ad6388` and pending UI/docs edits.

**Drift addressed:**
- README/backend still described owner-only read and no client admin updates; `firestore.indexes.json` no longer defines a composite index.
- New artifacts `DEVELOPER_GUIDE.md`, `security.html`, and expanded `Docs/PRISM.md` not in inventory or file-structure docs.

**Changes:** CHANGELOG **1.1.5**; README Firestore narrative + file tree; backend.md `plugin_submissions` + admin + indexes; FEATURES; claude.md paths; bugtracker row; this entry.

### 2026-04-04 — Doc-config-git-backup (submit-plugin portal + rules + indexes)

**Action:** Ran **Documentation, Configuration Management and Git Backup** workflow (`Docs/claude.md` § Documentation, Configuration Management and Git Backup); git backup sync after commit `e72d6ce` (plugin submission portal, rules, indexes, RULE.md).

**Drift addressed:**
- Docs did not list `submit-plugin.html`, `Docs/RULE.md`, or `firestore.indexes.json`; README/backend still described older `plugin_submissions` rule pattern.
- CHANGELOG, FEATURES, README file structure, backend Firestore policy, claude.md inventory, bugtracker reference row updated.

**Changes:**
- CHANGELOG **1.1.4** entry for portal, RULE.md, indexes, rules, signup redirect, doc sync.
- README: file structure; Firebase rules example aligned with repo `firestore.rules` for `plugin_submissions`; submit flow mentions `submit-plugin.html`.
- FEATURES.md: submit-plugin portal row; version/date bump.
- backend.md: `plugin_submissions` policy + index note; `firebase.json` indexes registration.
- claude.md: Quick Reference + file structure include `Docs/RULE.md`, `submit-plugin.html`.
- submit.html: add `developer_uid` on create for rule compatibility.

### 2026-03-23 — Doc-config-git-backup (submit/admin + inventory sync)

**Action:** Ran **Documentation, Configuration Management and Git Backup** workflow (`Docs/claude.md` § Documentation, Configuration Management and Git Backup).

**Changes:**
- CHANGELOG **1.1.3:** `submit.html`, `admin-submissions.html`, `/submit` and `/admin-submissions` rewrites
- FEATURES.md: developer submit portal + admin submissions rows; Firebase web app integration note
- README.md: file structure includes `submit.html`, `admin-submissions.html`, `reset-password.html`
- backend.md: rewrite table + admin allowlist note for `admin-submissions.html`
- CONFIGURATION_MANAGEMENT: this entry; inventory timestamps refreshed

### 2026-03-01 — Doc backup sync (unified account model)

**Action:** Ran Documentation, Configuration Management and Git Backup workflow.

**Changes:**
- CHANGELOG: documented unified account model (api_key, developer_mode, signup redirects)
- CONFIGURATION_MANAGEMENT: this entry
- backend.md: developers table schema (developer_mode, api_key, developer_accepted_terms_at)
- FEATURES.md: unified account model, API key, developer mode
- README: test flow updated (signup → dashboard)

### 2026-03-23 — Firebase submit/admin setup guidance

**Action:** Added Firebase setup guidance for plugin submission + admin review flow.

**Changes:**
- README: added Firebase setup section with modular SDK pattern (`firebaseConfig`, `ADMIN_EMAIL`) and minimum Firestore rules for `plugin_submissions`
- backend.md: documented Firebase submit/admin tasking policy and matching Firestore rule requirements

### 2026-03-01 — Doc backup sync (doc-config-git workflow)

**Action:** Ran Documentation, Configuration Management and Git Backup workflow.

**Changes:**
- Updated CONFIGURATION_MANAGEMENT, CHANGELOG, backend.md for current repo state
- Documented vercel.json rewrites in backend.md
- Synced inventory with untracked files (upgrade.html, SWARMSPACE_API_CONTEXT.md, .cursorrules, Docs/*)

### 2026-03-01 — Initial doc structure from Starter Repo

**Action:** Adopted docs from Docs/Starter Repo; adapted for SwarmSpace.

**Changes:**
- Added CONFIGURATION_MANAGEMENT, CHANGELOG, FEATURES, backend, git, SECURITY_CHECKLIST, UI_UX
- Added minimal bugtracker structure
- Updated inventory for swarmspace docs

**Files added:**
- Docs/CONFIGURATION_MANAGEMENT.md
- Docs/CHANGELOG.md
- Docs/FEATURES.md
- Docs/backend.md
- Docs/git.md
- Docs/SECURITY_CHECKLIST.md
- Docs/UI_UX.md
- Docs/bugtracker/bug_tracker.md
- Docs/bugtracker/records/_TEMPLATE_BUG_RECORD.md
