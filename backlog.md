# SwarmSpace — Complete Backlog for Claude Code

*Compiled April 9, 2026 — updated April 12, 2026*

---

## Critical Path

The dependency chain that gates everything:

```
Fix plugin Workers (404) → Fix orchestrator (405) → LUMARA calling SwarmSpace at runtime
                                                   → Developer submission portal
                                                   → DEVELOPER_GUIDE.md fixes
                                                   → AST10 compliance page
                                                   → Founding Developer outreach
```

Orchestrator execution modes (plan/auto/bubble/interactive) must land before Work Chain chaining and before Durable Objects dispatch.

---

## 1. IMMEDIATE BLOCKERS — Priority: CRITICAL

### 1.1 Deploy 7 Remaining Plugin Workers (404 fixes) ⬅ HIGHEST PRIORITY

Code exists in repo, not deployed. These are the 7 undeployed Workers:

- `swarmspace-plugin-pubce-plugin-nominatim`
- `swarmspace-plugin-rest-countries`
- `swarmspace-plugin-github-public`
- `swarmspace-plugin-hackernews`
- `swarmspace-plugin-dictionary-api`
- `swarmspace-plugin-jina-reader`

Deploy each with `wrangler deploy` from the respective `workers/plugins/[name]` directory. Test each with POST to `https://swarmspace-plugin-[name].orbitalai.workers.dev/invoke`.

The 8 already-live Workers: gemini-flash, brave-search, semantic-scholar, weather, wikipedia, currency, news, arxiv.

### 1.2 Fix Orchestrator Route Handlers (405 fixes) ⬅ HIGHEST PRIORITY

`swarmspace-orchestrator.orbitalai.workers.dev` is live but returning 405 on all 12 routes. Likely missing POST handler or route dispatch logic.

Routes and their plugin chains:

| Route | Chain |
|-------|-------|
| POST /research | brave-search + wikipedia + semantic-scholar > gemini-flash |
| POST /competitor | brave-search + newsapi + hackernews > gemini-flash |
| POST /marketing | brave-search + newsapi > gemini-flash |
| POST /plugins | brave-search + github-public > gemini-flash |
| POST /academic | semantic-scholar + arxiv + pubmed > gemini-flash |
| POST /news-brief | newsapi + hackernews + brave-search > gemini-flash |
| POST /market-scan | brave-search + newsapi + exchange-rates > gemini-flash |
| POST /location-brief | nominatim + open-meteo + rest-countries + wikipedia > gemini-flash |
| POST /health-research | pubmed + semantic-scholar + wikipedia > gemini-flash |
| POST /tech-scout | github-public + hackernews + brave-search + arxiv > gemini-flash |
| POST /fact-check | brave-search + wikipedia + semantic-scholar > gemini-flash |
| POST /content-brief | brave-search + wikipedia + newsapi > gemini-flash |

Key constraints:
- newsapi is a Firebase function (`https://us-central1-arc-epi.cloudfunctions.net/newsDataInvoke`), not a Cloudflare Worker
- open-meteo = `swarmspace-plugin-weather.orbitalai.workers.dev`
- exchange-rates = `swarmspace-plugin-currency.orbitalai.workers.dev`
- Gemini Flash synthesis Worker is live at `swarmspace-plugin-gemini-flash.orbitalai.workers.dev`

### 1.3 Firestore Security Rules ✅ DONE

Deployed in previous session.

### 1.4 authGuard.ts Migration ✅ DONE

Migrated in previous session.

### 1.5 Firebase Functions — All Deployed ✅

All SwarmSpace Firebase functions confirmed live as of April 12, 2026:
`swarmspaceRouter`, `swarmspacePluginCatalog`, `swarmspacePluginStatus`, `swarmspaceWriteCapabilities`, `newsDataInvoke`, `visionOcrInvoke`, `updateUserModelConfig`, `validatePluginSubmission`, `swarmspaceDiscoveryAgent`, `swarmspaceClaimFoundingSpot`

---

## 2. SECURITY & DOCUMENTATION HONESTY GAP — Priority: HIGH

> An April 2026 audit confirmed that security.html, PRISM.md, and DEVELOPER_GUIDE.md describe capabilities that do not exist in code. These items close that gap. Nothing here is optional if developer outreach is happening.

### 2.1 Documentation Honesty Pass (BEFORE outreach) ✅ DONE (2026-04-13)

Completed: security.html, prism.html, OWASP_AST10_COMPLIANCE.md, DEVELOPER_GUIDE.md — removed false claims, added transparency notes, fixed CSS breakage in prism.html.

### 2.2 PRISM Enforcement ✅ DONE (2026-04-13)

Completed: PrivacyTier enum inlined in swarmspaceRouter, all 22 registry entries have privacy_data_required (string[]), privacyTier, dataTypes. Consent gating blocks non-ANONYMOUS plugins without _prism_consent. Context field filtering strips undeclared fields before worker dispatch.

### 2.3 Credential Isolation

- [ ] Refactor plugin Workers so they do not read raw API key secrets directly (currently: `github-public/src/index.ts:59`, `jina-reader/src/index.ts:50`, likely others)
- [ ] Move toward boundary injection: router or proxy injects credentials into outbound requests, plugin code never touches them
- [ ] Audit all 13 plugin Workers for direct secret access patterns and log which ones need refactoring

### 2.4 Developer Guide Fixes (before outreach) ✅ DONE (2026-04-13)

Completed: Removed Experimental tier, changed privacy_data_required to string[], added privacyTier/dataTypes to manifest schema, added context field vocabulary table, added behavioral fields, added endpoint contract section, error code format updated to match actual HttpsError shape.

---

## 3. SUPPLY-SIDE (Developer Ecosystem) — Priority: HIGH

### 3.1 Developer Submission Portal ✅ DONE (2026-04-13)

Completed Phases 1-2. Phase 1: SSRF protection, endpoint hardening, duplicate detection, 5 new form fields (access_tier, capabilities, example_query, version, rate_limits), server-side validation. Phase 2: onSubmissionStatusChange Firestore trigger (promotion pipeline), TTL-cached developer plugin merge in swarmspaceRouter, resubmission flow, real-time status dashboard, revocation handler. Phase 3 (email notifications, health checks) deferred.

### 3.2 Developer Agreement (Legal)

In progress with Prinz Law Office, La Jolla. Covers: indemnification, data handling, de-listing rights, prompt injection liability, API compliance.

### 3.3 Stripe Connect for Developer Payouts

Not provisioned. 80% to dev, 20% platform on Verified transactions. 85% for Founding Developers.

### 3.4 Developer Earnings Dashboard

Not built. Required before Verified tier launches. Show calls, revenue, merit score trajectory.

### 3.5 AST10 Compliance Posture Page ✅ DONE (2026-04-13)

Completed: ast10.html published. 4 renamed categories use official OWASP AST10 names with (formerly: X) annotations. Trust tier claim corrected. PRISM acronym expansion removed per policy.

### 3.6 Founding Developer Programme

100 spots. First-come permanent 85% revenue share + badge. Blocked on: developer submission portal, DEVELOPER_GUIDE.md, documentation honesty pass.

### 3.7 Twitter/Bluesky + Dev.to Accounts

Flagged for SwarmSpace developer community launch. Not yet created.

---

## 4. PLATFORM MECHANICS — Priority: MEDIUM

### 4.1 Swarms UI (Community Layer)

Designed, not built. Per-plugin, per-workflow community spaces. Desktop: full thread view, structured post submission (bug reports, use cases, feature requests, developer update notes), developer profiles, merit score visibility. Mobile: simplified read-only view (upvote count, top use case, latest update). Post types: bug report, use case, feature request, update note (developer only).

### 4.2 Upvote Infrastructure

Designed, not built. One vote per user per plugin, permanent, non-revocable. Weighted by usage history (50-call user's vote > first-visit vote). Additional weight for account age and Premium subscriber status.

### 4.3 Monthly Merit Review Tooling

Manual at launch. Composite score: upvotes, call volume, retention, developer activity, update frequency, error rate.

### 4.4 Catalogue Updates Endpoint

Not built. `/catalogue/updates` on swarmspaceRouter. Builds on live `swarmspacePluginCatalog` function. Accepts: `since` (ISO timestamp), `interest_tags`, `user_history_categories`. Returns new/updated plugins filtered by user profile, sorted by merit score. Max once per 6 hours per user. Privacy: receives tag hashes, not raw CHRONICLE content.

### 4.5 Credit System

- Credit enforcement: LIVE. Free: 20/day. Standard: 500/day. Premium: 500/day. Admin: unlimited. Hard block at ceiling, 80% warning in logs.
- Credit top-up purchase flow: NOT BUILT. Pricing not yet defined.
- Credit rollover policy: No rollover at launch. Partial carry-forward (20% cap) under review.
- Per-user credit visibility in UI: Defined, not implemented.

### 4.6 Work Chain Manifest Spec

> **Terminology update (April 2026):** "Layer 2" and "Outcome Packages" are retired. Infrastructure uses **Work Chains** (what developers build and list). End users see **Roles** (the marketing skin for a Work Chain). See Terminology Update section below.

Drafted conceptually. Needs formal specification. Must include `is_concurrency_safe` declarations per step for orchestrator parallelization.

### 4.7 architecture.md in Repo ✅ DONE (2026-04-14)

Completed: Full rewrite to reflect v1.4.1 codebase — 22 plugins, PRISM enforcement, discovery agent, founding dev programme, orchestrator workflows, v2 validation pipeline, 10 Firestore collections, updated architecture diagram.

---

## 5. CLOUDFLARE AGENT INFRASTRUCTURE — Priority: MEDIUM-LOW

### 5.1 Dynamic Worker Loader (Plugin Sandbox)

- [ ] Prototype one plugin running inside Dynamic Worker Loader (V8 isolate sandbox, open beta)
- [ ] Configure `globalOutbound: null` — verify network restriction works
- [ ] Implement `network_domains` allowlist check against plugin manifest before dispatch
- [ ] Evaluate DX and cost vs current static Worker deployment
- [ ] Add `@cloudflare/codemode` or equivalent if adopting Dynamic Workers
- [ ] Runtime behavioral monitoring: log and monitor plugin behavior during execution

### 5.2 Durable Objects (Recurring Agent Runtime)

Depends on: orchestrator execution modes landing first.

- [ ] Define first Durable Object class extending `DurableObject` from `cloudflare:workers`
- [ ] Add `durable_objects` bindings to wrangler config
- [ ] Prototype News Briefing delta variant: store previous output, diff on next run, return delta (wraps live `/news-brief` route)
- [ ] Prototype Competitor Research delta variant (wraps `/competitor` route, weekly diff)
- [ ] Prototype Trend Spotter delta variant (wraps `/tech-scout` route, sentiment baseline alerts)
- [ ] Prototype Market Intelligence delta variant (wraps `/market-scan` route, weekly market movement summary with currency, news, and sector signals)
- [ ] Implement Alarms API scheduling (`setAlarm` / `alarm()`) for cron-style recurring execution
- [ ] Implement tier gating: reject DO scheduling requests from free-tier mobile users
- [ ] CHRONICLE context injection at execution time (request fresh context, never persist in DO)
- [ ] DO catalogue check: on scheduled fire, query `/catalogue/updates` for agent's category, flag new relevant plugins in delta output

Cost model: Workers Paid $5/mo base. 1M requests + 400K GB-seconds included. Estimated $10-20/mo at 10K users with 5 recurring agents each.

### 5.3 Orchestrator Execution Modes

Must land before Work Chain chaining and before DO dispatch.

- [ ] Implement `plan` mode — full chain proposal, no execution until confirmation (the Run Screen confirmation tap)
- [ ] Implement `auto` mode — headless dispatch for DO/scheduler runs, check `is_destructive` and `is_read_only` manifest fields before plugin execution. `headless: true` prerequisite for DO dispatch. Destructive plugins auto-deny.
- [ ] Implement `bubble` mode — child plugins inherit parent chain authorization. A workflow confirmed in `plan` runs constituent plugins in `bubble`.
- [ ] Implement `interactive` mode — per-plugin approval for gap discovery (user present, unplanned plugin needed)
- [ ] Mode assignment logic: on-demand enters `plan`, DO scheduled enters `auto`, confirmed chains run constituents in `bubble`

### 5.4 Workers AI / Synthesis Stack

- [ ] Benchmark Gemma 4 26B MoE as fallback synthesizer replacement for gpt-oss-120b (released April 2, 2026. Apache 2.0. 3.8B active params, 256K context. Awaiting Groq/Workers AI availability)
- [ ] Evaluate Qwen3 30B A3B on Workers AI ($0.051/$0.335) as extraction upgrade from Llama 3.1 8B
- [ ] Monitor Workers AI pricing (currently not competitive with Groq for most models)

Current stack (unchanged until benchmarking):
- Primary synthesizer: Gemini 3.1 Pro Preview (1M+ context)
- Fallback synthesizer: gpt-oss-120b on Groq ($0.15/$0.60 per M tokens)
- Fast extraction: Llama 3.1 8B Instant on Groq
- Structured extraction: Llama 3.3 70B Versatile on Groq

---

## 6. LAYER 3 — AGENTS — Priority: LOW (future)

Architecture update (April 2026): Layer 3 no longer depends on LUMARA desktop. Durable Objects provide server-side persistent runtime.

- [ ] Roles (end-user skin for Work Chains) — browse/deploy surface for pre-configured Work Chains presented as Roles (e.g. "Social Media Manager", "Content Strategist"). These are Roles, not Work Chains themselves — Roles are the marketing skin on top of Work Chain infrastructure.
- [ ] Agent Identity Token (AIT) system — autonomous agent self-registration with human-in-the-loop verification at first registration
- [ ] `schedulable` manifest field — declares plugin supports scheduled invocation. Verified-only. Required before DO dispatch.
- [ ] `headless` manifest field — declares plugin designed to run without user approval step. Verified-only. Required for `auto` execution mode.
- [ ] Agent autonomy ladder (4 levels): drafts only, queued approval, per-item with veto window, fully autonomous
- [ ] Plugin manifest v2 (OWASP fields + schedulable + behavioral fields + TypeScript interface evaluation)
- [ ] Mobile recurring agent tier gating (Pro $15/mo or Premium $20/mo required)

---

## 7. LUMARA CROSS-PRODUCT ITEMS — Priority: VARIES

These live in the LUMARA backlog but have SwarmSpace dependencies:

### 7.1 NOW (unblocked or close to unblocked)

- **LUMARA visibly SwarmSpace at runtime** — blocked on 404/405 fixes only. Once those land, wire LUMARA iOS to hit the orchestrator for real workflow execution. Community launch prerequisite.
- **Reference Documentation Ingestion** — highest-value unblocked LUMARA item. No SwarmSpace dependency.
- **Behavioral Pattern Layer (CHRONICLE extension)** — prompt design work, raw data exists. Low lift.

### 7.2 SOON (dependency on current work)

- **Session-Start Catalogue Discovery** — LUMARA queries `/catalogue/updates` on app open. Depends on that endpoint being built (Section 4.4).
- **Server-Side Recurring Agents for Mobile** — depends on DO infrastructure (Section 5.2) and execution modes (Section 5.3).
- **Intent-to-Agent Assembly** — depends on recurring agents + SwarmSpace semantic search.
- **Saved Agent Library** — depends on Intent-to-Agent Assembly.
- **Visual Chain Builder** — desktop-first. Depends on Saved Agent Library.
- **Synthesis Stack Update** — Gemma 4 26B MoE evaluation (Section 5.4).

### 7.3 LATER (larger dependencies)

- **ARA Desktop Foundation** — Flutter/Dart, macOS primary. No longer gates Layer 3 but is the preferred control plane UX.
- **LUMARA Desktop Enterprise** — on-premises Gemma 4 31B Dense for legal/healthcare. Gate: PHAROS Phase 0. Hardware: Mac Mini M4 Pro.
- **Desktop Scheduler** — native Dart background isolate + cron dispatcher. Free for desktop users (zero server cost).

---

## 8. COMMUNITY LAUNCH SEQUENCE — Priority: HIGH (after Section 1-2)

Do not start outreach until prerequisites are met.

### Prerequisites (all must be done)
- [x] 404/405 Worker fixes complete (2026-04-12)
- [x] DEVELOPER_GUIDE.md fixes complete (Section 2.4) (2026-04-13)
- [x] Documentation honesty pass complete (Section 2.1) (2026-04-13)
- [x] Developer submission portal functional (Section 3.1) (2026-04-13)
- [ ] At least 3 of 12 free workflows demonstrably working in LUMARA (Research & Summarise, News Briefing, Competitor Research)
- [x] AST10 compliance posture page published (Section 3.5) (2026-04-13)

### Launch Sequence
1. Identify 20-30 target developers from LinkedIn/Substack audience
2. Write personal outreach to each (not a blast, individual messages)
3. Pitch: Founding Developer badge, permanent 85% revenue share, 100 spots
4. Seed at least one real post in every Swarm before opening
5. Open Founding Developer programme
6. Do not inflate numbers. Tight active community beats inflated signups

### Success Metrics
- Messages sent: 20-30
- Response rate: 30-40% (6-12 responses)
- Plugins submitted: 5-10 in first 60 days
- Plugins approved: 3-7 in first 60 days
- Developers actively engaging in Swarms: 3-5

---

## 9. WEBSITE FIXES — Priority: MEDIUM

- [ ] Fix footer link in `index.html` — PRISM link `href` contains entire raw HTML of `prism.html` instead of `/prism.html`
- [ ] Verify Docs and Privacy footer links are not dead (`#`) before outreach
- [ ] Backlog footer says "v3" — should be "v4"
- [ ] Product Backlog Section 3 references Architecture v6 — should be v7

---

## 10. AGENT WALLET SYSTEM — Priority: MEDIUM (Phase 0 can start now, Phase 1+ after 404/405 fixes)

### Overview

A policy-enforced credit delegation system for autonomous agents. Agents with wallets get per-call ceilings, per-period budgets, plugin allowlists, velocity limits, anomaly detection, and atomic reservation-based spending. Agents without wallets fall through to existing user-level credit enforcement.

**Design principle:** The wallet is not just a balance — it's a policy engine. Balance alone doesn't prevent misuse.

### Use Case Scenarios

#### 10.1 Ideal: The Weekly Competitor Brief

Sarah (LUMARA Premium) funds a recurring Competitor Research agent with 200cr/week. It runs every Monday in `auto` mode, calling brave-search (15cr) + newsapi (10cr) + hackernews (0cr) + gemini-flash (30cr) = 55cr/run. Agent discovers new premium plugin via `/catalogue/updates`, flags it in delta output. Sarah authorizes with a tap. Next run costs 70cr. No friction.

#### 10.2 Generic: The Casual Research User

James (free tier) buys a 500cr pay-as-you-go bundle. On-demand workflows show estimated cost on the Run Screen before confirmation — no wallet needed. When James creates a saved agent chain, he funds a wallet with 100cr. Agent returns structured `budget_exhausted` error when depleted.

#### 10.3 Worst Case: The Runaway Recurring Agent

Alex's Tech Scout agent (500cr/week) encounters a new 50cr/call premium plugin in `auto` mode. The plugin is `is_read_only: true` and Verified, so current execution mode rules would auto-approve. It calls the plugin 6 times — 300cr on a single never-authorized plugin. Nearly drains the weekly budget in one run.

**What the wallet system prevents:**
1. **Per-call ceiling** (default 50cr) blocks expensive calls without explicit override
2. **Single-plugin run %** cap (default 40%) prevents one plugin from dominating a run
3. **First-call approval** — `is_read_only` is NOT sufficient for auto-approval of never-before-called plugins
4. **Anomaly detection** — 6 calls to a new plugin triggers pause-and-notify

### Research Findings

Industry patterns (Wallgent, Openfort, Coinbase Agentic Wallets, `agent-spending-controls` OSS):

| Policy Type | SwarmSpace Equivalent |
|---|---|
| Per-transaction limit | Per-call ceiling on agent wallet |
| Daily/weekly/monthly cap | Per-period budget on agent wallet |
| Vendor allowlist | Plugin tier restriction + explicit plugin allowlist |
| Approval threshold | Tied to execution mode |
| Velocity control | Max plugin calls per run / per hour |
| Fail-closed design | Block all spending if wallet service unreachable |

**Two-Gate Enforcement Pattern** (from `agent-spending-controls`):
1. **Gate 1 (Pre-execution):** Agent declares intent, policy engine validates, credits reserved atomically
2. **Gate 2 (Post-execution):** Actual cost confirmed, reserved amount commits or releases

Reservation prevents race conditions where parallel plugin calls both see sufficient funds and overdraw.

**What SwarmSpace does NOT need:** Crypto/blockchain wallet infrastructure. The wallet is an internal Firestore ledger extension with a policy rules engine inside swarmspaceRouter.

### Technical Architecture

#### Data Model

**Agent Wallet** (`developers/{uid}/agent_wallets/{wallet_id}`):

```json
{
  "wallet_id": "string",
  "agent_id": "string (AIT link)",
  "owner_uid": "string",
  "display_name": "string",
  "balance": "number",
  "reserved": "number",
  "total_funded": "number",
  "total_spent": "number",
  "policy": {
    "per_call_ceiling": 50,
    "per_run_budget": "number | null",
    "per_period_budget": 200,
    "period": "daily | weekly | monthly",
    "period_spent": 0,
    "period_reset_at": "timestamp",
    "plugin_tier_max": "free | standard | premium",
    "plugin_allowlist": "string[] | null",
    "plugin_denylist": "string[]",
    "max_calls_per_run": 20,
    "single_plugin_run_pct": 0.4,
    "require_first_call_approval": true,
    "anomaly_pause_threshold": 0.5
  },
  "status": "active | paused | depleted"
}
```

**Wallet Transaction Log** (`developers/{uid}/agent_wallets/{wallet_id}/transactions/{txn_id}`):

```json
{
  "txn_id": "string",
  "type": "fund | reserve | commit | release | refund",
  "amount": "number",
  "plugin_slug": "string | null",
  "workflow_route": "string | null",
  "execution_mode": "plan | auto | bubble | interactive",
  "status": "completed | blocked | reserved",
  "blocked_reason": "string | null"
}
```

#### Enforcement Flow in swarmspaceRouter

```
Request → Resolve AIT → Check agent wallet exists?
  ├─ No wallet → Fall through to user-level credit enforcement (existing behavior)
  └─ Yes wallet →
       1. Evaluate policy rules (ALL must pass):
          a. balance - reserved >= estimated_cost
          b. estimated_cost <= per_call_ceiling
          c. period_spent + estimated_cost <= per_period_budget
          d. plugin_slug not in denylist
          e. plugin tier <= plugin_tier_max
          f. if plugin_allowlist set, plugin_slug in allowlist
          g. if require_first_call_approval && plugin never called → block in auto mode
          h. run_call_count < max_calls_per_run
          i. single_plugin_run_spend / per_run_budget < single_plugin_run_pct
       2. If all pass → Reserve credits (atomic Firestore transaction)
       3. Dispatch plugin
       4. On success → Commit (decrement reserved + balance, increment period_spent, log txn)
       5. On failure → Release (decrement reserved, log txn)
       6. If any policy fails → Block, log with blocked_reason, return structured error
```

#### Structured Error Codes

`WALLET_INSUFFICIENT_BALANCE`, `WALLET_PER_CALL_CEILING`, `WALLET_PERIOD_BUDGET_EXCEEDED`, `WALLET_PLUGIN_TIER_RESTRICTED`, `WALLET_PLUGIN_DENIED`, `WALLET_FIRST_CALL_APPROVAL_REQUIRED`, `WALLET_VELOCITY_LIMIT`, `WALLET_SINGLE_PLUGIN_PCT_EXCEEDED`, `WALLET_ANOMALY_PAUSE`

#### Reservation Atomicity

**v1: Firestore Transaction** — `db.runTransaction()` to atomically check balance and increment `reserved`. Sufficient at current scale.

**Later: Durable Object** — Wallet state in DO SQLite, single-threaded guarantees atomicity without transactions. Migrate when recurring agents ship.

#### UX Surfaces

- **Desktop:** Wallet management panel, balance, policy sliders, transaction log, spending charts, policy presets (Conservative/Standard/Power User)
- **iOS:** Agent card shows balance + last run cost, tap to fund, simple budget slider, notification on pause/depletion
- **Defaults on agent creation:** per_call_ceiling 50cr, per_period_budget 200cr/week, plugin_tier_max matches subscription, require_first_call_approval true, anomaly_pause_threshold 50%

### Implementation Phases

#### Phase 0: Data Model & AIT Extension (can start now)
- Add `agent_wallets` and `wallet_transactions` sub-collections
- Extend AIT schema with `wallet_id`
- Write Firestore security rules (owner-only, server-side balance changes only)
- Deploy indexes, write Admin SDK helpers
- **Gate:** Wallet documents creatable/readable via Admin SDK, security rules pass audit

#### Phase 1: Policy Engine in swarmspaceRouter (after 404/405 fixes)
- Implement `evaluateWalletPolicy()`, `reserveCredits()`, `commitCredits()`, `releaseCredits()`
- Integrate wallet check into router dispatch path
- Implement all 9 structured error responses
- Period reset logic
- Unit tests (1 per policy rule) + integration tests (workflow chain, parallel calls)
- **Gate:** Test agent with wallet executes workflow, credits deducted from wallet, policy violations blocked

#### Phase 2: Funding & UX (after Phase 1 + DO prototype)
- Auto-create wallet on recurring agent creation
- Fund wallet endpoint (atomic transfer from user balance)
- iOS agent card + desktop panel
- Policy presets, top-up flow, depletion notifications
- **Gate:** End-to-end flow works: create agent → wallet created → fund → run → debit → see results

#### Phase 3: Anomaly Detection & Reporting (after Phase 2)
- Rolling hourly spend tracker
- Anomaly pause logic + notification
- `require_first_call_approval` enforcement in `auto` mode
- Per-run spending summary in delta output
- Weekly spending digest
- **Gate:** Worst-case scenario (Section 10.3) is prevented

#### Phase 4: DO Migration (after DO production)
- Wallet state in DO SQLite
- DO-to-Firestore sync for dashboard reads
- Migration path: Firestore wallets hydrate into DO on first scheduled run
- **Gate:** DO manages own wallet balance, Firestore reflects within 5 seconds

### Planner Tasks

#### Phase 0

| # | Task | Type | Est. |
|---|---|---|---|
| 0.1 | Design Firestore schema for wallet sub-collections | Design | 1hr |
| 0.2 | Write Firestore security rules for wallet collections | Code | 1hr |
| 0.3 | Deploy Firestore indexes (owner_uid, agent_id, status, period_reset_at) | Config | 30min |
| 0.4 | Extend AIT schema with wallet_id, update creation flow | Code | 1hr |
| 0.5 | Admin SDK helpers: createWallet(), fundWallet(), getWallet() | Code | 2hr |
| 0.6 | Test: create, fund, read back, verify security rules | Test | 1hr |

#### Phase 1

| # | Task | Type | Est. |
|---|---|---|---|
| 1.1 | evaluateWalletPolicy() function | Code | 3hr |
| 1.2 | reserveCredits() with Firestore transaction | Code | 2hr |
| 1.3 | commitCredits() | Code | 2hr |
| 1.4 | releaseCredits() | Code | 1hr |
| 1.5 | Integrate wallet check into swarmspaceRouter dispatch | Code | 3hr |
| 1.6 | All 9 structured error responses | Code | 2hr |
| 1.7 | Period reset logic | Code | 1hr |
| 1.8 | Unit tests (9 min, one per policy rule) | Test | 3hr |
| 1.9 | Integration test: 3-plugin workflow chain | Test | 2hr |
| 1.10 | Integration test: parallel calls, no overdraw | Test | 2hr |

#### Phase 2

| # | Task | Type | Est. |
|---|---|---|---|
| 2.1 | Auto-create wallet on recurring agent creation | Code | 2hr |
| 2.2 | Fund wallet endpoint (atomic user→wallet transfer) | Code | 2hr |
| 2.3 | iOS agent card: balance + last run cost | UI | 3hr |
| 2.4 | Desktop agent detail panel: balance, policy, txn log | UI | 5hr |
| 2.5 | Policy presets (Conservative/Standard/Power User) | Design+Code | 2hr |
| 2.6 | Top-up flow on depletion | UI+Code | 2hr |
| 2.7 | Push notification on paused/depleted | Code | 2hr |
| 2.8 | E2E test: full user flow | Test | 3hr |

#### Phase 3

| # | Task | Type | Est. |
|---|---|---|---|
| 3.1 | Rolling hourly spend tracker | Code | 2hr |
| 3.2 | Anomaly pause logic + notification | Code | 2hr |
| 3.3 | require_first_call_approval enforcement | Code | 2hr |
| 3.4 | Per-run spending summary in delta output | Code | 2hr |
| 3.5 | Weekly wallet spending digest | Code | 3hr |
| 3.6 | Test: runaway scenario prevention | Test | 2hr |

#### Phase 4

| # | Task | Type | Est. |
|---|---|---|---|
| 4.1 | DO SQLite schema for wallet state | Design | 1hr |
| 4.2 | Wallet state read/write in DO | Code | 3hr |
| 4.3 | DO-to-Firestore sync | Code | 2hr |
| 4.4 | Atomicity verification (single-threaded DO) | Test | 2hr |
| 4.5 | Migration: Firestore wallets → DO hydration | Code | 2hr |

### Potential Bugs

#### Critical (Financial Integrity)
- **B1 Double-spend on parallel calls** — Mitigated by reservation pattern (Phase 1)
- **B2 Credits stuck in reserved on plugin failure** — Release path + stale reservation sweeper (5min TTL)
- **B3 Non-atomic fund transfer** — Single Firestore transaction for user↔wallet transfer
- **B4 Period reset race condition** — Firestore transaction for check-and-update

#### High (Incorrect Behavior)
- **B5 Wallet policy bypassed in bubble mode** — Enforce wallet check on EVERY dispatch regardless of execution mode
- **B6 First-call check uses user history instead of wallet history** — Scope to wallet_id
- **B7 Stale iOS balance** — Invalidate cache after agent execution
- **B8 Free plugins counted against credit budgets** — Count against velocity limits only, not credit budgets

#### Medium (Edge Cases)
- **B9 Wallet depleted mid-workflow** — Reserve full estimated cost upfront for paid plugins
- **B10 Agent deleted with wallet balance** — Return balance to user account with prompt
- **B11 Duplicate wallets for same AIT** — Enforce 1:1 via AIT.wallet_id
- **B12 Policy change during in-flight run** — Policy evaluated at reservation time; changes apply on next call (document this)

#### Low (Polish)
- **B13 Unbounded transaction log** — Rotate: keep 500 in Firestore, archive to R2
- **B14 Negative balance from rounding** — Integer credits only, no fractions
- **B15 Timezone on period reset** — Store user timezone, reset at user's midnight

### Dependencies & Sequencing

| Phase | External Dependency | Can Start After |
|---|---|---|
| Phase 0 | AIT system designed | Now |
| Phase 1 | swarmspaceRouter functional (404/405 fixes) | After 404/405 resolution |
| Phase 2 | Recurring agent UX (DO prototype) | After Phase 1 + DO prototype |
| Phase 3 | Real usage data | After Phase 2 |
| Phase 4 | DO production infrastructure | After Phase 3 + DO production |

### Architecture Document Impact

When this ships, update:
- **Architecture v7** Section 6 (Execution Modes): wallet policy as second gate in `auto` mode
- **Architecture v7** Section 7 (Technical Architecture): wallet infrastructure in component table
- **Business Model v5.2** Section 7 (Credit System): agent wallet as credit delegation mechanism
- **LUMARA Backlog v7**: wallet UX in recurring agent items

---

## 11. SESSION BROKER (ORGANIZER) — Priority: Work Chain / Agent Layer (future, after orchestrator modes land)

### Overview

A first-party SwarmSpace component that acts as the universal gateway between external agents and the SwarmSpace plugin ecosystem. No external agent ever touches a plugin directly. Every request goes through the Session Broker, gets PRISM-stripped, and only then gets dispatched to the plugin chain.

The Session Broker establishes context through a structured handshake with the external agent, maintains state for the session duration, and chains SwarmSpace capabilities on behalf of the external agent. The external agent never needs to understand SwarmSpace's manifest format, trust tiers, credit system, or PRISM requirements. It just describes what it needs.

### Why It Exists

1. **Security enforcement at a single choke point.** Credential isolation, PRISM context minimization, output sanitization, rate limiting, and credit enforcement all happen in one place
2. **Universal adapter for any agent ecosystem.** LUMARA, OpenClaw, CrewAI, LangGraph, or anything that can describe a need in structured format. Massive surface area expansion without per-framework custom adapters
3. **Indirect prompt injection mitigation.** Broker inspects plugin output before it flows to the external agent. PRISM on the way in, output sanitization on the way out
4. **Audit trail by design.** Complete log of what was requested, dispatched, returned, and filtered. Compliance story for legal/healthcare verticals
5. **Agent interoperability without SwarmSpace knowledge.** External agents describe intent. Broker translates, discovers, chains, and returns results

### How It Works

1. External agent contacts Session Broker via A2A protocol (Agent Card handshake)
2. Broker reads Agent Card to understand identity, capabilities, and request
3. Broker runs request context through PRISM extraction layer (context minimization before any plugin sees data)
4. Broker queries SwarmSpace catalogue semantically to identify matching plugins/workflows
5. Broker assembles plugin chain using orchestrator execution modes (plan/auto/bubble/interactive)
6. Broker dispatches to plugins with only minimum necessary context per plugin (PRISM-enforced at dispatch boundary)
7. Broker receives plugin results, runs output sanitization, returns to external agent
8. Session context discarded after session ends. Nothing persisted beyond audit log

### Handshake Protocol

**Primary:** A2A Agent Cards (Linux Foundation, Apache 2.0). Any A2A agent connects with zero custom integration. Auth follows A2A security scheme (OAuth 2.0, API keys, OpenID Connect) with short-lived tokens. Task lifecycle follows A2A state model (submitted, working, input-required, completed). SwarmSpace publishes its own Agent Card at `swarmspace.app/.well-known/agent.json`.

**Fallback:** Simple REST/JSON endpoint for non-A2A agents (e.g., OpenClaw). Schema: `{ agent_id, agent_name, intent, context, auth_token }`. Lower trust tier by default.

### Security Properties

| Property | Implementation |
|---|---|
| Credential isolation | Broker holds all API keys. Injects at dispatch boundary. External agent and plugin code never see credentials |
| Context minimization | PRISM extraction on handshake context before any plugin dispatch. Each plugin receives only `privacy_data_required` fields |
| Output sanitization | Inspects plugin responses before returning. Filters sensitive data, prompt injection attempts, unexpected content |
| Rate limiting | Single enforcement point per session |
| Credit enforcement | Broker pre-checks quota before dispatching. swarmspaceRouter remains authoritative check |
| Audit logging | Complete log: request, dispatch chain, per-plugin I/O, filtered content, final response |
| Single point of trust | First-party infrastructure. Not a plugin. Not extensible by third parties |

### Relationship to Existing Architecture

| Component | Relationship |
|---|---|
| swarmspaceRouter | Broker dispatches TO swarmspaceRouter for plugin execution |
| Orchestrator execution modes | Broker uses plan/auto/bubble/interactive for chain assembly. External agent interactions default to `plan` |
| PRISM | Broker runs PRISM extraction at session boundary. Same privacy logic, gateway layer |
| Dynamic Worker sandbox | Plugins still execute in V8 isolates. Broker adds a layer above, not a replacement |
| Durable Objects | Recurring agents dispatched by DOs can route through Broker for external agent requests |
| Catalogue updates | Broker queries `/catalogue/updates` to recommend capabilities proactively |
| LUMARA | Becomes one Broker client among many. Direct integration migrates to Broker-mediated over time |

### First-Party Constraint

The Broker sits at the intersection of: private data access (handshake context) + untrusted content exposure (plugin responses fetching external content at runtime) + external communication (returning results). This is PRISM's lethal trifecta. The Broker MUST be first-party SwarmSpace infrastructure, hardened, audited, and maintained by Orbital AI.

### Research: Existing Infrastructure to Build On

#### AgentGateway (Linux Foundation, Apache 2.0)
- **Repo:** github.com/agentgateway/agentgateway (Rust)
- **Already provides:** A2A gateway with capability discovery, MCP gateway with tool federation, RBAC/JWT/TLS/CEL-based policies, unified audit trail, multi-tenant support, OpenTelemetry observability
- **Does NOT provide:** PRISM context minimization, credit enforcement, SwarmSpace catalogue integration, output sanitization with prompt injection detection, manifest-aware chain assembly
- **Recommendation:** Use as transport and security foundation. Build PRISM, credits, catalogue, and output sanitization as custom middleware on top

#### A2A Protocol SDK (Linux Foundation, Apache 2.0)
- **Repo:** github.com/a2aproject/A2A
- **Provides:** Agent Card schema, task lifecycle, JSON-RPC handling, streaming, gRPC (v0.3), signed security cards
- **Recommendation:** Use for Agent Card parsing and validation. Use schema directly for handshake format

#### awesome-mcp-gateways
- **Repo:** github.com/e2b-dev/awesome-mcp-gateways
- **Notable:** Lasso (plugin-based orchestration), MCP Mesh (RBAC + encrypted token vault + OpenTelemetry), Open Edison (data exfiltration prevention)

### Implementation Phases

#### Phase 1: A2A Handshake Layer

| Task | Description |
|---|---|
| 1a. Agent Card Parser | A2A validation, identity/capabilities parsing, signed card verification |
| 1b. Session Manager | DO-backed session state, auto-expire TTL (30min default), context discarded on close |
| 1c. REST Fallback | POST endpoint for non-A2A agents, lower trust tier default |
| 1d. Auth Layer | Validate against Firestore developers collection, support ss_ API key / OAuth / A2A security card, map to SwarmSpace tier |

**Output:** `session-broker/src/handshake/` — parser, session manager, REST fallback, auth layer + tests

#### Phase 2: PRISM Extraction Layer

| Task | Description |
|---|---|
| 2a. Context Minimization Engine | Cross-reference session context against plugin `privacy_data_required`, produce minimized payload, log what was stripped (not content) |
| 2b. Output Sanitization Filter | Strip internal metadata/credential fragments/CHRONICLE data, detect prompt injection in plugin output |
| 2c. PRISM Policy Config | Configurable always-strip rules (PIIs, CHRONICLE raw, API keys, cross-session tokens). Config, not hardcoded |

**Output:** `session-broker/src/prism/` — minimizer, sanitizer, policy config + tests

#### Phase 3: Catalogue Integration and Chain Assembly

| Task | Description |
|---|---|
| 3a. Intent-to-Catalogue Query | Parse intent into semantic search, query swarmspacePluginCatalog, rank by relevance/tier/compatibility |
| 3b. Chain Assembly | Assemble chain using orchestrator execution modes, default `plan` for external agents, respect manifest behavioral fields |
| 3c. Dispatch and Credit Enforcement | Pre-check credits at session level, route through swarmspaceRouter, track per-session consumption, handle partial chain failures |

**Output:** `session-broker/src/dispatch/` — intent parser, chain assembler, credit pre-check + integration tests

#### Phase 4: Audit and Observability

| Task | Description |
|---|---|
| 4a. Audit Logger | Per-session log to Firestore `broker_sessions` collection. Never log raw context, CHRONICLE, or API keys |
| 4b. Metrics and Alerting | Sessions/hour, chain length, credit consumption, sanitization trigger rate, auth failure rate. Alert on spikes |
| 4c. Developer-Facing Analytics | Plugin call frequency through Broker vs direct, surface in developer dashboard |

**Output:** `session-broker/src/audit/` — logger, metrics, Firestore schema for `broker_sessions`

#### Review Agent (run last)

1. Run all unit + integration tests across all phases
2. Validate no PRISM bypass (plugin cannot receive undeclared context fields)
3. Validate no credential leakage in any response
4. Validate session cleanup (all context discarded from DO after close)
5. Validate audit completeness (every session produces complete log)
6. Simulated attack: prompt injection in Agent Card description field — verify Broker doesn't execute
7. **Security test failure = entire build FAILED regardless of other results**

### Dependencies

| Dependency | Status | Blocks |
|---|---|---|
| swarmspaceRouter functional | Live (23 plugins, credit enforcement) | Phase 3 dispatch |
| 404/405 Worker fixes | IMMEDIATE blocker | Phase 3 full chain testing |
| swarmspacePluginCatalog | Live | Phase 3 catalogue query |
| Orchestrator execution modes | Not started (Arch v7 §6) | Phase 3 chain assembly (can stub initially) |
| Dynamic Worker sandbox | Not started | Phase 2 PRISM at sandbox level (Broker adds layer above) |
| Durable Objects | Not started | Phase 1 session state (can use in-memory fallback for prototype) |
| Plugin manifest v2 | Not started | Phase 3 chain assembly (is_destructive/headless/schedulable) |

### Notes

- Architecturally similar to AgentGateway but consumer-grade and SwarmSpace-specific. AgentGateway is enterprise/Kubernetes-focused. Broker is Cloudflare Workers-native
- Long term, Broker publishes its own Agent Card at `swarmspace.app/.well-known/agent.json`, making SwarmSpace discoverable by any A2A-compatible agent ecosystem
- LUMARA's direct SwarmSpace integration eventually migrates to Broker-mediated, making LUMARA one client among many rather than a special case

---

## 12. FRONT-PAGE DISCOVERY AGENT — Priority: HIGH (after 404/405 fixes)

### Overview

A chat-style discovery agent embedded on the SwarmSpace homepage (`index.html`) that lets visitors describe what they need in natural language. The agent queries the plugin catalogue, assembles a proposed workflow chain visually, and presents it as a card sequence. No execution happens without authentication. The agent is a conversion engine: it turns passive visitors into users who have already seen the product work.

**Example:** User types "I want to monitor my competitors weekly." The agent responds with a visual chain: Brave Search > NewsAPI > HackerNews > Gemini Flash synthesis, labels it "Competitor Research," shows the recurring variant exists, and says "Sign up to run this."

### Existing Packages to Leverage

Do NOT build the chat widget from scratch.

| Package | License | Why Use It | Adaptation Needed |
|---|---|---|---|
| @buildshipapp/chat-widget (npm) | MIT | Lightweight script-tag embed. Connects to any POST endpoint. Streaming. CSS customizable. | Restyle to dark terminal (#0A0A0F, IBM Plex Mono). Replace chat bubble with chain-card renderer. Point at new Cloud Function. |
| openchatwidget (GitHub) | MIT | MCP-compatible. Supports OpenAI, Anthropic, Gemini, Ollama. | Heavier. Only if MCP client needed in widget. Overkill for v1. |
| Custom inline (no widget) | N/A | Build directly into index.html hero section as inline chat panel, not floating bubble. | More custom work but better UX integration. The agent IS the hero. |

**Recommendation:** Option 3 (custom inline) for best conversion UX. Use BuildShip widget as reference for message handling, streaming, and error states. Copy their POST request/response pattern. Build visual rendering custom.

### Prerequisites (Do Not Start Without These)

| Prerequisite | Status | Why It Blocks |
|---|---|---|
| 404 fixes on plugin Workers | IMMEDIATE BLOCKER | Agent needs real plugins from catalogue. Incomplete if Workers return 404. |
| 405 fixes on orchestrator | IMMEDIATE BLOCKER | Chain assembly references orchestrator routes. Agent needs to know which routes exist and what they chain. |
| swarmspacePluginCatalog function | LIVE | Already deployed. Agent queries this for full catalogue with tier info. |
| At least 3 workflows working | BLOCKED on 404/405 | Agent credibility depends on showing chains that actually work. Research, News Briefing, Competitor Research minimum. |
| Gemini Flash API key | LIVE | Agent uses Gemini Flash for intent parsing and chain assembly reasoning. Already in free tier. |

### Phase 1: Intent Parser Cloud Function

A new Firebase Cloud Function (or Cloudflare Worker) that receives a natural language user message, queries the plugin catalogue, and returns a proposed chain.

**Tasks:**

1. Create `swarmspaceDiscoveryAgent` Cloud Function in the arc-epi project
2. Accept POST with `{ message: string, sessionId?: string }`
3. Call `swarmspacePluginCatalog` internally to get full plugin list with descriptions and semantic tags
4. Send user message + plugin catalogue to Gemini Flash with system prompt: "You are the SwarmSpace discovery agent. Given the user intent and the available plugin catalogue, propose a workflow chain. Return JSON with: chainName, chainDescription, steps (array of { pluginSlug, pluginName, role }), recurringVariant (boolean), upgradeRequired (boolean), upgradeReason (string if applicable)."
5. Return structured chain proposal to frontend
6. No auth required. Rate limit: 10 requests per IP per hour
7. Session ID enables multi-turn refinement: "Actually, add academic papers too" appends to chain

**Constraints:**
- Zero execution. This function ONLY proposes chains. Never calls any plugin endpoint
- Free tier Gemini Flash only. No premium model spend on unauthenticated visitors
- Response includes whether proposed chain requires paid tier (any Standard/Premium plugin triggers this)
- Plugin catalogue cached in-memory for 5 minutes

**Expected Response:**

```json
{
  "chainName": "Competitor Research",
  "chainDescription": "Weekly competitive intelligence with change tracking",
  "steps": [
    { "pluginSlug": "brave-search", "pluginName": "Brave Search", "role": "Find competitor mentions and news", "tier": "free" },
    { "pluginSlug": "newsapi", "pluginName": "NewsAPI", "role": "Pull latest headlines", "tier": "free" },
    { "pluginSlug": "hackernews", "pluginName": "HackerNews", "role": "Tech community sentiment", "tier": "free" },
    { "pluginSlug": "gemini-flash", "pluginName": "Gemini Flash", "role": "Synthesize competitive brief", "tier": "free" }
  ],
  "matchesExistingWorkflow": "/competitor",
  "recurringVariant": true,
  "recurringNote": "Can run weekly with change tracking. Requires paid tier on mobile.",
  "upgradeRequired": false,
  "estimatedCredits": 0
}
```

**Verification:**
- curl endpoint with 5 different intents. Confirm structured JSON each time
- Confirm rate limiting (11th request from same IP returns 429)
- Confirm no plugin endpoint is ever called during chain proposal

### Phase 2: Homepage Chat UI

Inline chat panel in the hero section of `index.html` that replaces or sits alongside current hero content.

**Tasks:**

1. Add chat input to hero section. Full-width input bar with placeholder: "Tell me what you need done..."
2. On submit, POST to `swarmspaceDiscoveryAgent`. Show loading state (pulsing dots, terminal cursor style)
3. Render chain as horizontal card sequence. Each card: plugin icon placeholder, plugin name, role description, tier badge (Free/Standard/Premium)
4. Cards connected by arrow indicators showing data flow direction
5. Summary line below chain ("This chain is entirely free" or "Requires SwarmSpace Pro for [plugin name]")
6. CTA button: "Sign up to run this" (links to `/signup.html`). If chain matches existing workflow route, also: "This is a ready-made workflow. Sign up and run it now."
7. If `recurringVariant` is true, secondary note: "This can also run on a schedule. Keep watching automatically."
8. Multi-turn support: after first chain renders, input stays active with "Refine this, or ask for something else..."
9. Style: dark terminal aesthetic. IBM Plex Mono for input. Cards match existing site card styling
10. Mobile responsive: cards stack vertically on small screens. Input full-width

**Constraints:**
- No Firebase Auth required. Public-facing conversion tool
- No localStorage/sessionStorage. In-memory JS only
- Chat panel is part of page layout (NOT floating overlay)
- Maximum 3 turns before: "Sign up to keep exploring."
- Use streaming if backend supports it, otherwise full response with brief entrance animation

**BuildShip Widget Patterns to Reuse:**
- POST request structure with message + threadId (map to sessionId)
- Error state handling (network failure, timeout)
- Message history in-memory array
- CSS variable system for theming (adapt to SwarmSpace palette)
- Do NOT use their floating bubble UI. Build inline.

**Verification:**
- Load index.html. Type query. Chain renders within 3 seconds
- Mobile viewport (375px). Cards stack, input usable
- "Sign up to run this" links to `/signup.html`
- 4th message shows signup gate

### Phase 3: Chain-to-Signup Handoff

When a visitor signs up after using the discovery agent, their proposed chain should be waiting for them.

**Tasks:**

1. On "Sign up to run this" click, serialize chain to URL parameter: `/signup.html?chain=base64(JSON)`
2. After signup, on `dashboard.html` check for chain parameter
3. If present, decode and display chain with "Run this now" button
4. "Run this now" routes to Agents screen (or for v1, directly calls matching orchestrator route if `matchesExistingWorkflow` is set)

**Constraints:**
- Chain parameter is base64-encoded JSON, not raw JSON in URL
- Enforce auth before execution if workflow requires it
- Show upgrade prompt instead of run button if chain requires paid tier
- Chain parameter expires after first use (remove from URL after rendering)

**Verification:**
- Complete full flow: ask discovery agent > click signup > create account > land on dashboard > see chain > click run
- Paid-tier chains show upgrade prompt instead of run button

### Phase Summary

| Phase | Deliverable | Dependency | Est. Effort |
|---|---|---|---|
| Phase 1 | swarmspaceDiscoveryAgent Cloud Function | Plugin catalogue live, Gemini Flash key | 1-2 days |
| Phase 2 | Inline chat UI on index.html | Phase 1 endpoint live | 2-3 days |
| Phase 3 | Chain-to-signup handoff | Phase 2 + signup.html working | 1 day |

**Total estimated: 4-6 days.** Hard blocker: 404/405 Worker fixes must land first. Without working plugins and orchestrator routes, the discovery agent has nothing real to propose.

---

## 13. COMPLETED (March-April 2026)

- [x] Supabase to Firestore migration (all collections, auth, Stripe webhook, dashboard)
- [x] swarmspaceRouter enforceAuth migration from users to developers collection
- [x] Firebase indexes deployed (stripe_customer_id, api_key on developers; composite on plugins)
- [x] api_keys lookup collection live with atomic batch writes
- [x] Dashboard.html fully wired (Firebase Auth, plan display, API key management, stat cards)
- [x] signup.html fully wired (Google, GitHub, email/password auth)
- [x] submit.html Firebase config inserted, auth guard added, form writes to Firestore
- [x] admin-submissions.html Firebase config inserted, UID whitelist check
- [x] API key generation on first sign-in (ss_ + randomUUID)
- [x] My plugins section on dashboard (queries Firestore)
- [x] SwarmSpace Architecture v7 published
- [x] SwarmSpace Business Model v5.2 published
- [x] Credit enforcement live (20/500/500/unlimited by tier)
- [x] swarmspacePluginCatalog function live
- [x] 23 plugins registered (15 free, 5 standard, 2 premium)
- [x] 12 orchestrator workflow routes deployed (pending wiring)
- [x] Gemma 4 model family confirmed for Desktop Enterprise
- [x] DEVELOPER_GUIDE.md created
- [x] PRISM.md published in Docs/
- [x] security.html live
- [x] prism.html live
- [x] privacy.html live
- [x] SECURITY.md (repo root) created
- [x] Docs/SECURITY-ARCHITECTURE.md created
- [x] Merge `claude/review-swarmspace-backlog-HQOlM` branch into main
- [x] Lumara-workflows Worker deployed with 12 workflow routes and platform selector

---

## Key Infrastructure Reference

| Component | Location |
|-----------|----------|
| Firebase project | arc-epi |
| Firestore collections | developers, api_keys, plugins, plugin_submissions |
| SwarmSpace website | swarmspace.vercel.app (static HTML, no build step) |
| GitHub repo | github.com/marcyap29/swarmspace |
| swarmspaceRouter | Firebase Cloud Function (us-central1-arc-epi) |
| Orchestrator | swarmspace-orchestrator.orbitalai.workers.dev |
| Plugin Workers | swarmspace-plugin-[name].orbitalai.workers.dev |
| LUMARA Workflows | lumara-workflows.orbitalai.workers.dev |
| Auth | Firebase Auth (Email/Password, Google, GitHub) |
| Admin email | marcyap@orbitalai.net |
| Firebase SDK | v10.12.0 via CDN ESM imports (not npm) |
| Design system | Dark terminal aesthetic, IBM Plex Mono/Sans or Inter |

---

## Recurring Agent Scheduler — Durable Objects Implementation Spec

*Added: April 11, 2026*

### Context

Server-side recurring workflow scheduler for SwarmSpace mobile users. Built on Cloudflare Durable Objects with the Alarms API. Paid tier only (Pro $15/mo or Premium $20/mo). Desktop users run the local Dart scheduler — this spec covers mobile only.

**What it does:** Users schedule any `schedulable: true` workflow to run on a cadence. On each run the DO executes the workflow, diffs the output against the previous run, and surfaces the delta to the user. Personal context (CHRONICLE) is injected at execution time, never stored in the DO.

### Architecture Overview

```
LUMARA iOS / SwarmSpace Dashboard
         │
         ▼
  swarmspaceRouter (Firebase CF)
  POST /scheduler/create
  POST /scheduler/pause
  POST /scheduler/delete
  GET  /scheduler/list
  GET  /scheduler/history/:id
         │
         ▼
  SchedulerManager Worker (Cloudflare)
  — creates / manages DO instances
         │
         ▼
  AgentSchedulerDO (Durable Object, one per user per scheduled workflow)
  — stores: schedule config, last-run output, run history
  — fires: Durable Objects Alarms API (cron-style)
  — on alarm: calls swarmspaceRouter to execute workflow
  — on complete: diffs output, writes delta to Firestore, resets alarm
```

### Durable Object Class: `AgentSchedulerDO`

**File:** `workers/scheduler/AgentSchedulerDO.ts`

**Key interfaces:**

```typescript
interface ScheduleConfig {
  id: string;                    // uuid
  uid: string;                   // Firebase UID
  workflow: string;              // workflow slug e.g. 'hiring-intel'
  input: Record<string, unknown>;
  cadence: CadenceConfig;
  delta_mode: boolean;           // true = diff vs last run; false = full output
  created_at: string;
  last_run_at: string | null;
  next_run_at: string | null;
  paused: boolean;
  chronicle_token: string | null; // ephemeral token, fresh context fetched each run
}

interface CadenceConfig {
  type: 'preset' | 'custom';
  preset?: 'daily' | 'weekly' | 'monthly';
  days_of_week?: number[];       // 0=Sun ... 6=Sat
  time_of_day?: string;          // HH:MM UTC
  interval_hours?: number;       // min 6
}

interface RunRecord {
  run_id: string;
  ran_at: string;
  output: string;
  delta: string | null;
  credits_used: number;
  status: 'success' | 'error';
  error?: string;
}
```

**DO endpoints:** `/init` (POST), `/pause` (POST), `/resume` (POST), `/status` (GET), `/history` (GET)

**Alarm handler flow:**
1. Request fresh CHRONICLE context if token available (never stored)
2. Execute workflow via swarmspaceRouter
3. Diff against previous output if delta_mode enabled
4. Store run record (history capped at 10)
5. Write delta to Firestore for LUMARA iOS pickup
6. Schedule next alarm

### Scheduler Manager Worker

**File:** `workers/scheduler/index.ts`

Routes:
- `POST /scheduler/create` — create new scheduled job (paid tier gate)
- `GET /scheduler/list` — list user's scheduled jobs
- `POST /scheduler/pause/:id` — pause a schedule
- `POST /scheduler/resume/:id` — resume a schedule
- `DELETE /scheduler/:id` — delete a schedule
- `GET /scheduler/history/:id` — get run history

DO naming: `{uid}:{scheduleId}` — one DO per user per scheduled workflow.

**Schedulable workflows (v1):**
`news-brief`, `competitor`, `tech-scout`, `hiring-intel` (meeting-prep is on-demand only, not schedulable)

### wrangler.toml Updates

```toml
[[durable_objects.bindings]]
name = "AGENT_SCHEDULER"
class_name = "AgentSchedulerDO"

[[migrations]]
tag = "v1"
new_classes = ["AgentSchedulerDO"]
```

### Firestore Schema

**Collection:** `scheduled_jobs/{schedule_id}`
- `uid`, `workflow`, `input`, `cadence`, `delta_mode`, `paused`
- `created_at`, `last_run_at`, `next_run_at`
- `last_delta`, `last_run_status`, `credits_used_total`

**Subcollection:** `scheduler_results/{schedule_id}/runs/{run_id}`
- `ran_at`, `output`, `delta`, `credits_used`, `status`, `error`

**Rules:** Owner read/write on `scheduled_jobs`, owner read on `scheduler_results`, server-write only on runs.

### swarmspaceRouter Additions

- `POST /scheduler/result` — called by DO on each run, writes result to Firestore (admin only)
- `GET /scheduler/list` — lists user's scheduled jobs from Firestore

### Tier Access

| Tier | Mobile Scheduling | Desktop Scheduling |
|---|---|---|
| Free | Blocked at Worker level | Local Dart scheduler, free APIs only |
| Pro ($15/mo) | Server-side DO | Local + premium plugins |
| Premium ($20/mo) | Server-side DO + CHRONICLE | Local + CHRONICLE + premium |
| Developer Pro | Not available | Own plugins only |

### Credit Handling

- Scheduled runs consume credits at same rate as manual runs
- DO passes `_scheduled: true` in workflow call
- If credits exhausted: run skipped, error recorded as `credit_exhausted`, alarm rescheduled
- LUMARA surfaces: "Your scheduled [workflow] was skipped — credit limit reached"

### Dashboard UI

New section on `dashboard.html`: **Scheduled Workflows**
- List of active schedules with status, last run, next run
- "+ New" button → modal: select workflow, enter input, choose cadence, delta mode toggle
- Pause / Delete / View history per schedule

### Implementation Order

1. DO class + Scheduler Manager Worker → deploy
2. swarmspaceRouter additions → `/scheduler/result` + `/scheduler/list`
3. Firestore collections + rules → `scheduled_jobs`, `scheduler_results`
4. Dashboard UI → Scheduled Workflows section + New Schedule modal
5. LUMARA iOS → Scheduled agent cards, result view
6. Test with `news-brief` first (simplest, daily cadence)
7. Add `competitor` + `tech-scout` recurring variants

### Constraints

- DO must never store CHRONICLE content or raw personal data
- Credit deduction in swarmspaceRouter, not in DO
- Free tier blocked at Worker level before DO creation
- `chronicle_token` is reference only — fresh context fetched each execution
- Minimum interval: 6 hours (enforced in `calculateNextRun`)

---

## 14. TERMINOLOGY UPDATE — April 2026

> **"Outcome Packages" is retired.** All future references use the two-layer model below.
> Do not use "Outcome Packages" in any user-facing copy, developer docs, or new backlog entries.

| Layer | Term | Definition | Audience |
|---|---|---|---|
| Infrastructure | **Work Chain** | A sequenced set of plugins executing a defined workflow. What developers build, list, and maintain on SwarmSpace. | Developers |
| Marketing skin | **Role** | The human-facing name for a Work Chain. e.g. "Your Competitive Intelligence Analyst." What end users browse, deploy, and subscribe to. | End Users |

**Renamed backlog items:**
- "Outcome Packages" (was Section 5 / Layer 2) → **Work Chains**
- "Dream Team UX — pre-configured agent packs" (Section 6) → **Roles** — the end-user skin for Work Chains. Roles are what users browse and deploy. Work Chains are the infrastructure underneath.
- Discovery Agent homepage panel → consumer-facing copy uses **Roles**, developer-facing docs use **Work Chains**
- "Competitive Intelligence Suite", "Content Creator Kit" etc. → these are **Role names** sitting on top of Work Chains. Flag them as such wherever they appear.

---

## 15. WORK CHAINS — CATALOGUE

### 15.1 Live Now — Needs Role Framing and Roles Page Card Only

All six are deployed and functional on the orchestrator. No new build required. Each needs a Role name, plain-language description, and a card on the Roles browsing page.

| Role Name | Work Chain Route | Plugin Chain | Tier |
|---|---|---|---|
| Competitive Intelligence Analyst | `/competitor` | brave-search + news + hackernews → gemini-flash | Free |
| Research Analyst | `/research` + `/academic` | brave-search + wikipedia + semantic-scholar + arxiv + pubmed → gemini-flash | Free |
| Market Intelligence Analyst | `/market-scan` | brave-search + news + currency → gemini-flash | Free |
| Tech Scout | `/tech-scout` | github-public + hackernews + brave-search + arxiv → gemini-flash | Free |
| News Desk | `/news-brief` | news + hackernews + brave-search → gemini-flash | Free |
| Content Brief Writer | `/content-brief` + social-publisher | brave-search + wikipedia + news → gemini-flash + social-publisher | Standard |

### 15.2 Near-Complete — One Plugin Needed to Close the Loop

Research and extraction half is built. Needs a write-side or action plugin to complete the chain.

| Role Name | What Exists | Missing Plugin | Priority |
|---|---|---|---|
| Lead Gen + Outreach Specialist | brave-search, tavily-search, exa-search for prospect research and scoring | CRM write plugin (HubSpot / Airtable) or email draft plugin. This is the action layer that closes the loop from research to outreach. | High — strong subscription candidate |
| Data Entry + Processing Specialist | vision-ocr + jina-reader for unstructured data extraction from PDFs, images, URLs | CRM / spreadsheet write plugin to push extracted data into a structured destination. Without this the chain stops at extraction. | High — high SMB willingness to pay |

### 15.3 Recurring / Subscription Candidates — Durable Object Variants

Strong candidates for DO wrapping. More value on a recurring schedule than as one-off runs.

| Role Name | Cadence | Value Delivered | DO Variant |
|---|---|---|---|
| Competitive Intelligence Analyst | Weekly | Delta report vs. prior week. Highlights only what changed. | Competitor Research DO — already in backlog (Section 5.2) |
| News Desk | Daily | Delta briefing vs. yesterday. No repeated stories. | News Briefing DO — already in backlog (Section 5.2) |
| Tech Scout | Weekly | Community signal shift alerts. Emerging repos, trending discussions. | Trend Spotter DO — already in backlog (Section 5.2) |
| Market Intelligence Analyst | Weekly | Market movement summary with currency, news, and sector signals. | Market Intelligence DO — **added to Section 5.2** |

---

## 16. ROLES BROWSING PAGE — New Surface Required

SwarmSpace currently has no end-user browsing surface for pre-configured Work Chains. The 12 orchestrator routes exist but are not presented as deployable Roles.

A Roles page (or dedicate the homepage) should list each Role with:

- Role name and persona framing
- Plain-language description of what it does
- The Work Chain it runs on (expandable detail for developers)
- Tier required and credit cost per run
- One-click deploy button

| Item | Status | Notes |
|---|---|---|
| Roles browsing page | Not built | Lists all deployable Work Chains as Roles. Consumer-facing. Priority surface before developer outreach. |
| Role cards for 6 live Work Chains | Not built | Name, description, tier, deploy CTA. No new backend required. |
| Market Intelligence Analyst — Durable Object variant | Not started | Added to Section 5.2 alongside existing News Briefing, Competitor Research, and Trend Spotter DO variants. Weekly cadence. market-scan route + currency plugin. |

---

*SwarmSpace Full Backlog — Orbital AI — April 14, 2026*
