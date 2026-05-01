# Configuration Management & Documentation Tracking

**Last Updated:** 2026-05-01
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
| Docs/context.md | Docs/ | 2026-05-01 | ✅ Synced | Session handoff log; updated with launch-day and post-launch sessions |
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

---

## Change Log

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
