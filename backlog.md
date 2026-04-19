# SwarmSpace — Complete Backlog for Claude Code

*Compiled April 9, 2026 — updated April 14, 2026*

---

## Critical Path

Previous blockers (404/405 fixes, submission portal, DEVELOPER_GUIDE.md, AST10 page, founding dev programme code) are all complete. The remaining dependency chain:

```
3 LUMARA workflows live → Community launch outreach (Section 8)
Credential isolation (2.3) → Developer outreach at scale
Stripe Connect (3.3) + Earnings Dashboard (3.4) → Verified tier launch
Orchestrator execution modes (5.3) → Work Chain chaining → Durable Objects (5.2)
```

Orchestrator execution modes (plan/auto/bubble/interactive) must land before Work Chain chaining and before Durable Objects dispatch.

---

## 1. IMMEDIATE BLOCKERS — Priority: CRITICAL

### 1.1 Deploy 7 Remaining Plugin Workers (404 fixes) ✅ DONE (2026-04-12)

All 7 Workers deployed (commit d638b60). All 15 plugin Workers now live:
gemini-flash, brave-search, semantic-scholar, weather, wikipedia, currency, news, arxiv, nominatim, rest-countries, github-public, hackernews, dictionary-api, jina-reader, pubmed.

### 1.2 Fix Orchestrator Route Handlers (405 fixes) ✅ DONE (2026-04-12)

Deployed in commit d638b60. The 405 was the expected response for non-POST requests — the POST handler was always present. All 12 routes accept POST with Authorization header and JSON body. Verified live: POST returns 500 with invalid token (expected), not 405.

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

Partially built (discovered April 18, 2026). `api/create-connect-account.js` and `api/get-connect-balance.js` exist in the Vercel API layer — Connect account creation and balance retrieval are implemented. `api/create-credit-checkout.js` also exists for credit top-up purchases. None are wired to the dashboard UI or called from Firebase functions yet.

Revenue split: 80% to dev, 20% platform on Verified transactions. 85% for Founding Developers.

- [ ] Audit existing `create-connect-account.js` and `get-connect-balance.js` — confirm they are production-ready or identify gaps
- [ ] Wire `get-connect-balance.js` to `earnings.html` balance display
- [ ] Wire `create-connect-account.js` to developer onboarding flow
- [ ] Define `create-credit-checkout.js` pricing tiers (see §4.5 Credit System)

### 3.4 Developer Earnings Dashboard

Page shell exists (`earnings.html`, linked from dashboard sidebar). Backend not built — no per-plugin call volume tracking, revenue share calculation, merit score trajectory, or payout logic in Firebase functions. Required before Verified tier launches.

### 3.5 AST10 Compliance Posture Page ✅ DONE (2026-04-13)

Completed: ast10.html published. 4 renamed categories use official OWASP AST10 names with (formerly: X) annotations. Trust tier claim corrected. PRISM acronym expansion removed per policy.

### 3.6 Founding Developer Programme ✅ CODE DONE (2026-04-12)

Code complete: `founding-developers.html` (landing page with counter badge) and `swarmspaceClaimFoundingSpot` Cloud Function (atomic Firestore transaction, 100 slots, 85% revenue share) both deployed. Seed script at `scripts/seed-founding-programme.js`. Outreach not yet started — see Section 8.

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
- Per-user credit visibility in UI: HTML elements exist in `dashboard.html` (`#credits-card`, balance display, buy buttons). JS binding to Firestore balance not confirmed — verify hydration logic is wired.

### 4.6 Work Chain Manifest Spec

> **Terminology update (April 2026):** "Layer 2" and "Outcome Packages" are retired. Infrastructure uses **Work Chains** (what developers build and list). End users see **Roles** (the marketing skin for a Work Chain). See Terminology Update section below.

Drafted conceptually. Needs formal specification. Must include `is_concurrency_safe` declarations per step for orchestrator parallelization.

### 4.7 architecture.md in Repo ✅ DONE (2026-04-14)

Completed: Full rewrite to reflect v1.4.1 codebase — 22 plugins, PRISM enforcement, discovery agent, founding dev programme, orchestrator workflows, v2 validation pipeline, 10 Firestore collections, updated architecture diagram.

---

## 5. CLOUDFLARE AGENT INFRASTRUCTURE — Priority: MEDIUM (upgrade 5.1 to HIGH for security posture)

### 5.1 Dynamic Workers Plugin Sandbox — Priority: HIGH (security differentiator)

> **Product:** Cloudflare Dynamic Workers (open beta since March 24, 2026). Available to all paid Workers plan users. No waitlist.

**What it is:** A host Cloudflare Worker can instantiate new Workers at runtime with dynamically specified code. Each dynamic Worker runs in its own isolated V8 sandbox with hardware-enforced memory isolation (Memory Protection Keys), isolate groups, and risk-based dynamic cordoning. This is the correct primitive for running untrusted third-party plugin code.

**Why this matters for SwarmSpace:** Currently all 15 plugin Workers are static deployments where plugin code has direct access to `env.SWARMSPACE_INTERNAL_TOKEN` and unrestricted `fetch()`. Dynamic Workers would let us:
1. **Eliminate direct secret access** — credentials injected via `globalOutbound` gateway, never visible to plugin code
2. **Enforce network allowlists** — each plugin's manifest `network_permissions` maps to `globalOutbound` gateway rules
3. **Centralize deployment** — one orchestrator Worker loads plugin code dynamically; no more `wrangler deploy` per plugin
4. **Enable runtime monitoring** — Tail Workers capture all `fetch` events and `console.log` output
5. **Strengthen security marketing** — "V8 hardware-isolated sandboxes with credential injection and network allowlists" is a concrete trust signal for developer outreach and AST10 compliance

**Pricing:**

| Dimension | Rate | Beta Status |
|-----------|------|-------------|
| Unique Workers loaded per day | $0.002 per unique Worker/day | **Waived during open beta** |
| Requests | Standard Workers rates (included in plan) | Active |
| CPU time | Standard Workers rates; **includes startup/parse time** | Active |

Requires Workers Paid ($5/mo base). At ~50 plugins active/day, post-beta per-load cost is ~$3/month. Worth it for the security posture.

**Key capabilities confirmed:**

| Capability | Status | Detail |
|-----------|--------|--------|
| `globalOutbound: null` (kill network) | ✅ Available | Completely cuts off all `fetch()` and `connect()` |
| Domain allowlists | ✅ Available | `globalOutbound` gateway inspects and enforces allowed domains per plugin manifest |
| Credential injection at boundary | ✅ Available | Gateway intercepts outbound requests, attaches auth headers from host env. Plugin never sees API keys. |
| Per-plugin warm isolates | ✅ Available | `env.LOADER.get(pluginId, callback)` — cached by ID, reused across requests |
| Ephemeral per-request isolates | ✅ Available | `env.LOADER.load()` — fresh isolate per call |
| Runtime monitoring via Tail Workers | ✅ Available | Captures all fetch events and console output |
| Hardware memory isolation (MPK) | ✅ Automatic | Isolate groups with Memory Protection Keys — key mismatch kills attacker's script |
| Risk-based dynamic cordoning | ✅ Automatic | Higher-risk executions auto-routed to more isolated infrastructure |
| Bindings (KV, R2, D1, DO) | Via RPC only | Must expose via custom RPC interfaces from host Worker (security advantage: narrows scope) |

**Wrangler config:**
```toml
[[worker_loaders]]
binding = "LOADER"
```

**Host Worker loading pattern:**
```typescript
const worker = env.LOADER.load({
  compatibilityDate: "2026-01-28",
  mainModule: "worker.js",
  modules: { "worker.js": pluginCode },
  globalOutbound: null // or gateway binding
});
const response = await worker.getEntrypoint().fetch(request);
```

For TypeScript/npm deps: use `@cloudflare/worker-bundler` to transpile and bundle before passing to `load()`.

**Implementation tasks:**

- [ ] Prototype one existing plugin (e.g., hackernews) running inside Dynamic Workers with `globalOutbound: null`
- [ ] Build `globalOutbound` gateway Worker implementing domain allowlist check against plugin manifest `network_permissions`
- [ ] Implement credential injection pattern in gateway (API keys from host env injected into outbound requests)
- [ ] Evaluate `load()` vs `get(pluginId)` for SwarmSpace use case (warm isolates preferred)
- [ ] Migrate one plugin end-to-end: static Worker → Dynamic Worker with gateway, verify identical behavior
- [ ] Attach Tail Worker for runtime behavioral monitoring and anomaly logging
- [ ] Benchmark latency: cold start + parse time for dynamic loading vs current static Worker invocation
- [ ] Cost model: project post-beta costs at 10K users with current plugin catalogue
- [ ] If viable: plan migration path for all 15 plugin Workers to Dynamic Workers
- [ ] Update security.html, AST10 compliance page, and DEVELOPER_GUIDE to reflect actual (not planned) V8 sandbox enforcement

**Decision gate:** If prototype shows acceptable latency (<100ms cold start overhead) and the gateway pattern works cleanly, migrate all plugins. The security posture upgrade alone justifies the ~$8-15/mo additional cost at current scale.

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

**Prototype exists (discovered April 18, 2026):** `workers/agent-worker/` has live `POST /agent/plan` and `POST /agent/execute` routes with tier-aware execution (`workers/agent-worker/src/tiers.ts`). Start here — do not rebuild from scratch.

- [ ] Review `agent-worker` plan/execute implementation — map what's already built against the mode spec below
- [ ] Implement `plan` mode — full chain proposal, no execution until confirmation (the Run Screen confirmation tap)
- [ ] Implement `auto` mode — headless dispatch for DO/scheduler runs, check `is_destructive` and `is_read_only` manifest fields before plugin execution. `headless: true` prerequisite for DO dispatch. Destructive plugins auto-deny.
- [ ] Implement `bubble` mode — child plugins inherit parent chain authorization. A workflow confirmed in `plan` runs constituent plugins in `bubble`.
- [ ] Implement `interactive` mode — per-plugin approval for gap discovery (user present, unplanned plugin needed)
- [ ] Mode assignment logic: on-demand enters `plan`, DO scheduled enters `auto`, confirmed chains run constituents in `bubble`
- [ ] Decide: extend `agent-worker` or merge into orchestrator `index.js`

### 5.4 Workers AI / Synthesis Stack

- [ ] Benchmark Gemma 4 26B MoE as fallback synthesizer replacement for gpt-oss-120b (released April 2, 2026. Apache 2.0. 3.8B active params, 256K context. Awaiting Groq/Workers AI availability)
- [ ] Evaluate Qwen3 30B A3B on Workers AI ($0.051/$0.335) as extraction upgrade from Llama 3.1 8B
- [ ] Monitor Workers AI pricing (currently not competitive with Groq for most models)

Current stack (unchanged until benchmarking):
- Primary synthesizer: Gemini 3.1 Pro Preview (1M+ context)
- Fallback synthesizer: gpt-oss-120b on Groq ($0.15/$0.60 per M tokens)
- Fast extraction: Llama 3.1 8B Instant on Groq
- Structured extraction: Llama 3.3 70B Versatile on Groq

### 5.5 Plugin Registry Worker — Orphaned (needs decision)

`workers/plugin-registry/` exposes a full plugin metadata REST API (`GET /plugins`, `/plugins/{id}`, `/plugins/tier/{tier}`, `/plugins/privacy/{tier}`, `/plugins/capabilities`). Discovered April 18, 2026. Not wired to any frontend or Firebase function. Not documented in architecture.md.

- [ ] Decide: integrate into `marketplace.html` as a data source, feed into §4.4 Catalogue Updates Endpoint, or remove
- [ ] If keeping: document in architecture.md Section 2 and add to wrangler deployment pipeline
- [ ] If removing: delete `workers/plugin-registry/` to avoid confusion

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

- **LUMARA visibly SwarmSpace at runtime** — 404/405 blocker cleared. Remaining task: `useOrchestrator` is hardcoded `false` in `_LUMARA/lib/shared/state/feature_flags.dart:22`. Flip flag and verify real orchestrator calls flow end-to-end. Community launch prerequisite — active open task.
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

> **Decision recorded April 4, 2026:** Swarms are not a pre-launch activity. Seeding empty Swarms is worse than not having them. Swarms open *after* Founding Developers have submitted plugins, when there is real content to discuss. The Swarms UI being unbuilt is not a blocker for outreach.

### Prerequisites (all must be done before outreach)
- [x] 404/405 Worker fixes complete (2026-04-12) ✅
- [x] DEVELOPER_GUIDE.md fixes complete (Section 2.4) (2026-04-13) ✅
- [x] Documentation honesty pass complete (Section 2.1) (2026-04-13) ✅
- [x] Developer submission portal functional (Section 3.1) (2026-04-13) ✅
- [x] At least 3 of 12 free workflows demonstrably working in LUMARA (Research & Summarise, News Briefing, Competitor Research) ✅ (2026-04-18)
- [x] AST10 compliance posture page published (Section 3.5) (2026-04-13) ✅
- [ ] LUMARA visibly calling SwarmSpace at runtime — flip `useOrchestrator` flag in `_LUMARA/lib/shared/state/feature_flags.dart:22`, verify end-to-end

### Launch Sequence
1. Identify 20-30 target developers from LinkedIn/Substack audience
2. Write personal outreach to each — individual messages, not a blast
3. Pitch: Founding Developer badge, permanent 85% revenue share, 100 spots
4. Open Founding Developer programme registration
5. Review incoming plugin submissions (manual merit review — no tooling yet)

### Post-Submission (once plugins exist)
6. Build Swarms UI
7. Seed genuine use-case posts in each plugin's Swarm
8. Open Swarms to the broader community

### Operating Rules
- Do not inflate user or developer numbers. Tight active community beats inflated signups.
- Prioritise engagement depth over registration count in early metrics.
- One message, one follow-up. No chasing.
- Every outreach message is personal — reference something specific they built.

### Success Metrics

| Metric | Target | Why it matters |
|--------|--------|----------------|
| Messages sent | 20-30 | Enough to fill the pipeline without spamming |
| Response rate | 30-40% (6-12 responses) | Realistic for cold-to-warm outreach |
| Plugins submitted | 5-10 in first 60 days | The only metric that matters |
| Plugins approved | 3-7 in first 60 days | Quality filter |
| Developers active in Swarms | 3-5 | Early community signal (post-launch) |

---

## 9. WEBSITE FIXES — Priority: MEDIUM

- [x] Fix footer link in `index.html` — PRISM link now correctly points to `/prism.html` ✅ (verified 2026-04-14)
- [x] Verify Docs and Privacy footer links — Docs → `/developer-guide.html`, Privacy → `/privacy.html`, both valid ✅ (verified 2026-04-14)
- [x] Version reference issues — no "v3" or "Architecture v6" references found; either already fixed or misdescribed ✅ (verified 2026-04-14)

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

### Prerequisites (Do Not Start Without These)

| Prerequisite | Status | Why It Blocks |
|---|---|---|
| 404 fixes on plugin Workers | ✅ DONE (2026-04-12) | Agent needs real plugins from catalogue. |
| 405 fixes on orchestrator | ✅ DONE (2026-04-12) | Chain assembly references orchestrator routes. |
| swarmspacePluginCatalog function | ✅ LIVE | Already deployed. Agent queries this for full catalogue with tier info. |
| At least 3 workflows working | In progress (planner) | Agent credibility depends on showing chains that actually work. |
| Gemini Flash API key | ✅ LIVE | Agent uses Gemini Flash for intent parsing and chain assembly reasoning. |

### Phase 1: Intent Parser Cloud Function ✅ DONE (2026-04-14)

`swarmspaceDiscoveryAgent` is deployed and live in the arc-epi Firebase project. Accepts POST with `{ message, session_id? }`, rate-limits by IP (10/hour), maintains session state in Firestore (`discovery_sessions` collection), calls Gemini Flash to map user intent to plugin chains, returns structured JSON with `intent`, `suggested_chain`, `alternatives`, `cta`. Enforces max 3 turns before signup gate.

### Phase 2: Homepage Chat UI — PARTIALLY DONE

HTML and CSS for the inline chat panel are present in `index.html` (`.discovery-chat` component: header, message list, input row, welcome message). Dark terminal styling is applied.

**Remaining task:**
- [ ] Wire `#chat-input` / `#chat-send` JavaScript event handlers to POST to `swarmspaceDiscoveryAgent` endpoint
- [ ] Render returned chain as horizontal card sequence (plugin name, role, tier badge, arrow connectors)
- [ ] Add summary line ("This chain is entirely free" / "Requires SwarmSpace Pro for [x]")
- [ ] Add CTA: "Sign up to run this" → `/signup.html`. If `matchesExistingWorkflow` set, show "ready-made workflow" variant
- [ ] Add `recurringVariant` note if true
- [ ] Multi-turn: keep input active after first chain renders
- [ ] Mobile: cards stack vertically at 375px

**Constraints:**
- No Firebase Auth required. Public-facing conversion tool
- No localStorage/sessionStorage. In-memory JS only
- Chat panel is part of page layout (NOT floating overlay)
- Maximum 3 turns before: "Sign up to keep exploring."

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
- Chain parameter is base64-encoded JSON, not raw URL
- Enforce auth before execution if workflow requires it
- Show upgrade prompt instead of run button if chain requires paid tier
- Chain parameter expires after first use (remove from URL after rendering)

**Verification:**
- Complete full flow: ask discovery agent > click signup > create account > land on dashboard > see chain > click run
- Paid-tier chains show upgrade prompt instead of run button

### Phase Summary

| Phase | Deliverable | Status |
|---|---|---|
| Phase 1 | swarmspaceDiscoveryAgent Cloud Function | ✅ DONE (2026-04-14) |
| Phase 2 | Inline chat UI on index.html | Partially done — HTML/CSS present, JS wiring remaining |
| Phase 3 | Chain-to-signup handoff | Not started — depends on Phase 2 JS complete |

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

## 17. RESEARCH WRITING ASSISTANT — Priority: HIGH (Layer 2 Workflow)

> *Orbital AI | April 2026 | Confidential*
> *First Layer 2 premium workflow on SwarmSpace*

### Overview

The Research Writing Assistant chains existing free-tier plugins with new purpose-built steps to take a user from raw research materials to a structured, citation-verified first draft with iterative refinement capabilities. This is a writing assistant, not a paper writer. The output is a working first draft that the user edits, annotates, and refines. The workflow produces the scaffold; the user owns the final product.

### Positioning

- **Product category:** Layer 2 premium workflow (composed plugin chain)
- **Credit cost:** 30-50 credits per initial generation run. Iterative refinement passes cost 10 credits each (single-section rewrites)
- **Target users:** Graduate students, postdocs, independent researchers, R&D teams, technical writers
- **Competitive context:** Elicit, Consensus, Scite sell research discovery. This workflow sells research-to-draft, which none of them do end-to-end
- **Existing SwarmSpace foundation:** Builds on /academic orchestrator route and 3 live free-tier plugins (Semantic Scholar, arXiv, PubMed)

### What This Is Not

- Not a submission-ready paper generator. The output requires human review, editing, and intellectual contribution.
- Not a citation fabricator. Every reference is API-verified against Semantic Scholar before inclusion.
- Not a replacement for domain expertise. The user provides the ideas, data, and judgment. The workflow provides structure, sourcing, and drafting velocity.

> **ETHICS FRAMING**
> All output includes a visible watermark/metadata tag: 'Draft generated with AI writing assistance. All claims, citations, and conclusions require human verification.' This is non-optional and cannot be removed by the workflow.

### Workflow Chain (6 Steps)

Steps 1-5 run on initial generation. Step 6 is the iterative refinement loop triggered by user annotation.

| Step | Plugin/Agent | New/Existing | Input | Output |
|------|-------------|--------------|-------|--------|
| 1. Intake & Clarification | intake-clarifier | New | User raw materials + format preferences | Structured research brief + clarifying questions |
| 2. Literature Discovery | semantic-scholar + arXiv + pubmed | Existing (live) | Research brief keywords + domain | Candidate paper set (ranked by relevance) |
| 3. Citation Verification | citation-verifier | New | Candidate paper set | Verified citation set with API confirmation + dead reference removals |
| 4. Outline Generation | outline-agent | New | Research brief + verified citations + CHRONICLE context | Structured section outline with citation placement map |
| 5. Section Drafting | section-writer | New | Outline + verified citations + user materials + reference style | Full structured first draft with inline citations |
| 6. Iterative Refinement | refinement-agent | New (on-demand) | User annotations on specific sections + original draft context | Targeted section rewrites preserving surrounding context |

Steps 2a (semantic-scholar), 2b (arXiv), and 2c (pubmed) execute in parallel. All other steps are sequential.

### Step 1: Intake & Clarification

**Accepted input formats:** Plain text, DOCX, PDF, LaTeX (.tex). LaTeX equations preserved verbatim (pass-through, no re-rendering).

**Required clarifying questions (always asked):**
1. Reference style: APA (7th), MLA (9th), Chicago (Author-Date or Notes-Bib), IEEE, Vancouver. Default: APA.
2. Output format: Markdown, LaTeX, PDF, DOCX. Default: Markdown.
3. Target venue or audience: journal, conference, class assignment, internal report, or general.

**Conditional questions** (asked when input is ambiguous): thesis/research question, field prioritization, methodology description, position on competing approaches.

> **UX PATTERN:** Clarifying questions appear as tappable option cards (like LUMARA's existing onboarding flow), not as a text prompt. User can tap a default, select from options, or type a custom answer.

**Output:** Structured research brief JSON: title, thesis, domain, keywords, methodology_summary, data_summary, existing_references, reference_style, output_format, target_venue, user_materials_raw.

### Step 2: Literature Discovery

Queries existing live free-tier plugins:

| Plugin | Query Strategy | Expected Return |
|--------|---------------|-----------------|
| Semantic Scholar | Two passes: broad (thesis keywords) then narrow (methodology terms). Filter by relevance, citation count, recency. | Top 30-50 candidates |
| arXiv | Recent (< 2 years) preprints matching domain keywords | Top 10-15 preprints |
| PubMed | Biomedical literature (triggered only for health/biology/medicine/neuroscience domains) | Top 10-15 papers |

**Deduplication:** Merge across sources. Deduplicate by DOI (primary) or title fuzzy match (fallback). Rank by: relevance to thesis (0.4), citation count normalized by field (0.3), recency (0.2), source diversity (0.1).

**Output:** 25-40 unique papers with title, authors, year, abstract, source, unique ID, relevance score.

### Step 3: Citation Verification

See Section 14 (Citation Verifier Plugin) for full specification.

**Key principle:** Every candidate paper verified against Semantic Scholar API (primary) and CrossRef (fallback). Hallucinated citations removed. User-provided references flagged but never silently deleted.

**Trust signal shown to user:** 'Literature review built from 38 verified sources (4 unverifiable candidates removed).'

### Step 4: Outline Generation

Produces hierarchical document structure based on research brief, verified citations, and CHRONICLE context.

**Standard sections:** Abstract (generated last), Introduction, Related Work / Literature Review, Methodology, Results, Discussion, Conclusion, References.

**Citation placement map:** Each section includes assigned_citations (array of paper IDs mapped to specific key points) and estimated_word_count.

**CHRONICLE context injection:** Writing style data adapts tone guidance. Domain expertise adjusts explanation depth. Prior work references identify connection points.

**User review gate (mandatory):** Outline presented before drafting begins. User can approve, reorder, add/remove sections, adjust citations, or add notes. Analogous to `plan` mode in orchestrator execution model.

### Step 5: Section Drafting

Sections drafted sequentially. Each receives: outline entry, verified citation set, user materials, CHRONICLE context, and all previously drafted sections (for coherence). Abstract generated last.

**Reference style implementation:**

| Style | Inline Format | Reference List Format |
|-------|--------------|----------------------|
| APA (7th) | (Author, Year) or Author (Year) | Author, A. A. (Year). Title. Journal, Volume(Issue), Pages. DOI |
| MLA (9th) | (Author Page) or Author (Page) | Author. Title. Journal, vol. X, no. X, Year, pp. X-X. |
| Chicago (Author-Date) | (Author Year, Page) | Author. Year. Title. Journal Volume (Issue): Pages. |
| Chicago (Notes-Bib) | Superscript footnote number | Footnotes + Bibliography entry |
| IEEE | [Number] | Numbered list in order of appearance |
| Vancouver | (Number) or superscript | Numbered list in order of appearance, journal abbreviated |

**Output formats:** Markdown (with LaTeX math blocks), LaTeX (full .tex + .bib), PDF (compiled from LaTeX), DOCX (structured with heading styles).

> **WATERMARK:** Every output format includes the ethics watermark. Non-removable by the workflow.

### Step 6: Iterative Refinement

See Section 15 (Iterative Refinement Agent Plugin) for full specification.

**Annotation types:** Section rewrite, Expand, Condense, Strengthen argument, Tone adjustment, Citation request, Factual flag.

**Mechanics:** Each pass costs 10 credits. Agent rewrites only highlighted section. Tracked changes visible in output viewer. User can see diffs and revert. Credit-gated, not count-gated.

### Workflow Manifest

| Field | Value |
|-------|-------|
| name | Research Writing Assistant |
| access_tier | premium |
| trust_tier | verified |
| credit_cost_per_call | 40 (initial generation). 10 (per refinement pass). |
| semantic_tags | research, writing, academic, citations, literature review, drafting, paper, manuscript, thesis, dissertation, LaTeX, APA, MLA, Chicago, IEEE, Vancouver |
| latency_class | slow (initial: 60-120s). fast (refinement: 10-20s). |
| privacy_data_required | chronicle.writing_style, chronicle.domain_expertise, chronicle.prior_work_references (all optional) |
| is_concurrency_safe | false |
| is_read_only | true |
| is_destructive | false |
| headless | false (requires outline review gate + user-initiated refinement) |
| schedulable | false |

### Steps Array

| Step | Plugin Slug | New/Existing | Concurrency |
|------|------------|--------------|-------------|
| 1 | intake-clarifier | New (build) | Sequential (first step) |
| 2a | semantic-scholar | Existing (live) | Parallel with 2b, 2c |
| 2b | arxiv | Existing (live) | Parallel with 2a, 2c |
| 2c | pubmed | Existing (live, conditional) | Parallel with 2a, 2b |
| 3 | citation-verifier | New (build) | Sequential (depends on step 2) |
| 4 | outline-agent | New (build) | Sequential (depends on step 3) |
| 5 | section-writer | New (build) | Sequential (depends on step 4) |
| 6 | refinement-agent | New (on-demand) | On-demand (user-triggered) |

### New Plugin Specifications

| Plugin | Purpose | Credit Cost | Standalone Value |
|--------|---------|-------------|------------------|
| intake-clarifier | Parse multi-format input into structured brief. Surface clarifying questions. | 0 (workflow only) | Yes — structure messy research notes |
| citation-verifier | Verify papers against Semantic Scholar + CrossRef | 5 standalone | High — verify any reference list before submission |
| outline-agent | Generate structured outline with citation placement map | 15 standalone | Yes — structure any long-form writing project |
| section-writer | Draft full document sections with inline citations | 30 standalone | Limited standalone. Primary value in workflow chain |
| refinement-agent | Process annotations, produce targeted section rewrites | 10 per pass | Yes — rewrite any document section based on feedback |

### Dependencies & Build Order

**Hard prerequisites:** 404/405 fixes (✅ DONE), Layer 2 workflow manifest spec (Section 4.6), orchestrator execution modes (Section 5.3).

**Soft prerequisites:** CHRONICLE writing/domain data, LUMARA output viewer with annotation support.

| Phase | What to Build | Depends On |
|-------|--------------|------------|
| Phase 1 | intake-clarifier + citation-verifier plugins | 404/405 fixes ✅ |
| Phase 2 | outline-agent + section-writer plugins | Phase 1 + Layer 2 manifest spec |
| Phase 3 | Full chain integration + E2E testing | Phase 2 + orchestrator execution modes |
| Phase 4 | refinement-agent + output viewer annotation UX | Phase 3 + LUMARA output viewer |
| Phase 5 | CHRONICLE context tuning + reference style QA (6 styles x 3 scenarios = 18 test cases) | Phase 4 |

### Verification & Acceptance

**Per-step pass criteria:**
- Intake: parses all 4 formats, contextual questions, LaTeX equations preserved
- Literature Discovery: 25-40 unique papers, no duplicate DOIs, relevant results
- Citation Verification: 100% output citations confirmed via API, removal log accurate, user refs flagged not removed
- Outline: field-appropriate structure, every section has ≥1 citation, word counts reasonable (3K-10K)
- Section Drafting: all 6 ref styles correct, ethics watermark in all 4 formats, no hallucinated citations
- Refinement: rewrite limited to highlighted section, surrounding paragraphs byte-identical, tracked changes present

**E2E acceptance test:** 500-word rough notes → full workflow with APA + Markdown → verify all steps → annotate 2 sections → verify refinements scoped correctly → total credits: 60 (40 + 10 + 10). Repeat with LaTeX input + IEEE + PDF.

### Revenue Model

| Action | Credits |
|--------|---------|
| Initial generation (full chain) | 40 |
| Per refinement pass | 10 |
| citation-verifier standalone | 5 |
| outline-agent standalone | 15 |
| section-writer standalone | 30 |

**Revenue engine:** Iterative refinement loop. Typical draft goes through 5-10 passes → 90-140 credits per document lifecycle.

> **CONVERSION:** Free /academic workflow is top of funnel. Users who outgrow 'literature summary' and want 'structured first draft with verified citations and iterative editing' upgrade to this premium workflow.

### Architectural Constraints

1. **PRISM enforcement:** Citation-verifier and literature discovery plugins never receive user personal context — only search keywords derived from the research brief.
2. **Consent-first:** Outline review gate is mandatory. Maps to `plan` mode.
3. **No fabrication:** Every citation must trace to a verified API record. Unverified citations replaced with `[CITATION NEEDED]`.
4. **Ethics watermark:** Non-removable. Present in all output formats.
5. **Format fidelity:** LaTeX equations pass-through only. No interpretation or re-rendering.
6. **Reference style accuracy:** Must be correct per style guide. Approximate formatting not acceptable.

---

## 18. CITATION VERIFIER PLUGIN — Priority: HIGH (Phase 1 of Research Writing Assistant)

> **Plugin slug:** `citation-verifier` | **Category:** Research / Lookup | **Credit cost:** 5 standalone, 0 within workflow | **Trust tier:** Verified | **Privacy:** No user personal context required

### Purpose

Verifies existence and accuracy of academic citations against Semantic Scholar and CrossRef APIs. Takes candidate papers (from any source) and returns a verified set with full metadata, a removal log for unverifiable papers, and a flag log for user-provided references that failed verification. Callable independently (verify a reference list before submission) and as Step 3 within the Research Writing Assistant workflow.

### Plugin Manifest

```json
{
  "name": "Citation Verifier",
  "slug": "citation-verifier",
  "version": "1.0.0",
  "description": "Verifies academic citations against Semantic Scholar and CrossRef. Returns verified papers with full metadata, removes unverifiable candidates, and flags user-provided references that cannot be confirmed.",
  "semantic_tags": ["citation", "verification", "academic", "references", "Semantic Scholar", "CrossRef", "bibliography", "research", "fact-check"],
  "access_tier": "premium",
  "trust_tier": "verified",
  "credit_cost_per_call": 5,
  "latency_class": "medium",
  "privacy_data_required": [],
  "auth_method": "api_key",
  "is_concurrency_safe": true,
  "is_read_only": true,
  "is_destructive": false,
  "headless": true,
  "schedulable": false
}
```

### Accepted Input Formats

**Format A: Structured JSON array** — `candidates` array with title, authors, year, doi, source_id, source, user_provided fields. Options: `fuzzy_threshold` (default 0.85), `crossref_fallback` (default true).

**Format B: BibTeX string** — Parsed into internal representation. All BibTeX entries treated as `user_provided: true`.

**Format C: Plain text reference list** — LLM extraction to parse into structured fields. All entries treated as `user_provided: true`.

### Verification Process

**Step 1: Semantic Scholar Lookup (Primary)**
1. If `source_id` present → query by paper ID
2. If `doi` present → query by DOI: `GET https://api.semanticscholar.org/graph/v1/paper/DOI:{doi}`
3. If neither → query by title search: `GET https://api.semanticscholar.org/graph/v1/paper/search?query={title}&limit=5`

**Step 2: Field Matching**

| Field | Match Criteria | Required |
|-------|---------------|----------|
| Title | Fuzzy match, Levenshtein ratio >= threshold (default 0.85). Normalize: lowercase, strip punctuation, collapse whitespace. | Yes |
| First Author | Last name exact match (case-insensitive) against first author in API response | Yes |
| Year | Exact match | Yes |
| Abstract | Non-empty string exists in API response | No (informational) |

Paper passes if title + first author + year all match.

**Step 3: CrossRef Fallback** — If Semantic Scholar fails and `crossref_fallback` is true, query CrossRef: `GET https://api.crossref.org/works?query.bibliographic={title}&rows=3`. Same field matching criteria.

**Step 4: Classification**

| Outcome | Condition | Action |
|---------|-----------|--------|
| **Verified** | Passes field matching on Semantic Scholar or CrossRef | Added to verified set with full API metadata |
| **Removed** | Fails all attempts AND `user_provided: false` | Removed. Entry added to removal log with reason. |
| **Flagged** | Fails all attempts AND `user_provided: true` | Kept but marked unverified. Entry added to flag log. **NOT silently removed.** |

### Output Schema

```json
{
  "verified_citations": [{ "title": "...", "authors": [...], "year": 2017, "abstract": "...", "doi": "...", "semantic_scholar_id": "...", "citation_count": 98000, "verification_source": "semantic_scholar", "verification_timestamp": "..." }],
  "removal_log": [{ "original_title": "...", "reason": "No match found on Semantic Scholar or CrossRef.", "attempts": ["semantic_scholar_title_search", "crossref_title_search"] }],
  "flag_log": [{ "original_title": "...", "reason": "Title fuzzy match scored 0.72 (below 0.85 threshold).", "closest_match": "...", "closest_match_score": 0.72, "user_provided": true }],
  "verification_summary": { "total_candidates": 42, "verified": 38, "removed": 3, "flagged": 1, "verification_rate": 0.905, "display_message": "Literature review built from 38 verified sources (3 unverifiable candidates removed, 1 user-provided reference flagged for review)." }
}
```

### Rate Limiting & Error Handling

- **Semantic Scholar:** 100 requests / 5 min (unauthenticated). On 429: exponential backoff, 3 retries, then CrossRef fallback. On 5xx: skip to CrossRef.
- **CrossRef:** Include `?mailto=marcyap@orbitalai.net` for priority queue. On timeout (>10s): log in removal/flag reason.
- **Batch processing:** Sets >20 papers → batches of 10 with 1s delay. Total plugin timeout: 60s. If approaching timeout, return partial results with `partial: true`.

### Acceptance Tests

1. **Known paper test:** 10 well-known papers with correct metadata → all 10 verified
2. **Hallucinated paper test:** 5 fabricated titles → all 5 removed with accurate removal log
3. **Typo test:** 3 real papers with slight misspellings → within threshold verify, below threshold flag (not remove)
4. **Mixed source test:** 3 Semantic Scholar IDs + 3 DOIs + 4 title-only → all paths work
5. **BibTeX input test:** 5-entry BibTeX → parser extracts all fields, treats as user_provided
6. **Plain text input test:** APA reference list → parser extracts title, authors, year
7. **Rate limit test:** 50 papers simultaneously → batching respects Semantic Scholar limits
8. **Partial timeout test:** 100 papers → partial results with `partial: true` if timeout approaching

### Constraints

1. **PRISM compliance:** Receives only paper metadata. Never receives user personal context, CHRONICLE data, or raw user materials.
2. **No fabrication:** Verifies only. Never generates citations. Never suggests alternatives.
3. **User references are sacred:** Never silently remove a user-provided reference. Flag with clear explanation.
4. **Deterministic output:** Same input → same output. No LLM in verification pipeline (LLM only for Format C plain text parsing).

---

## 19. ITERATIVE REFINEMENT AGENT PLUGIN — Priority: HIGH (Phase 4 of Research Writing Assistant)

> **Plugin slug:** `refinement-agent` | **Category:** AI Synthesis | **Credit cost:** 10 per pass | **Trust tier:** Verified | **Privacy:** `chronicle.writing_style` (optional)

### Purpose

Processes user annotations on specific document sections and produces targeted rewrites. User highlights a passage, adds a comment, and the agent rewrites only that section while preserving all surrounding context. Callable independently against any document (blog posts, reports, emails, research papers) and as Step 6 within the Research Writing Assistant workflow.

### Plugin Manifest

```json
{
  "name": "Iterative Refinement Agent",
  "slug": "refinement-agent",
  "version": "1.0.0",
  "description": "Processes user annotations on specific document sections and produces targeted rewrites. Supports rewrite, expand, condense, strengthen, tone adjustment, citation request, and factual verification.",
  "semantic_tags": ["editing", "writing", "refinement", "rewrite", "revision", "feedback", "annotation", "iterative", "document", "proofreading"],
  "access_tier": "premium",
  "trust_tier": "verified",
  "credit_cost_per_call": 10,
  "latency_class": "fast",
  "privacy_data_required": ["chronicle.writing_style"],
  "auth_method": "api_key",
  "is_concurrency_safe": false,
  "is_read_only": true,
  "is_destructive": false,
  "headless": false,
  "schedulable": false
}
```

### Input Schema

```json
{
  "document": { "content": "<full document>", "format": "markdown | latex | plain_text", "metadata": { "title": "...", "reference_style": "apa | mla | ... | null", "verified_citations": [] } },
  "annotation": { "selection": { "start_offset": 1240, "end_offset": 1890, "selected_text": "<highlighted text>" }, "comment": "User's feedback", "type": "rewrite | expand | condense | strengthen | tone | citation_request | factual_check | auto", "context_window": { "before": "<2 paragraphs before>", "after": "<2 paragraphs after>" } },
  "chronicle_context": { "writing_style": "<optional>" }
}
```

### Annotation Type Resolution (auto mode)

| Detected Pattern | Resolved Type |
|-----------------|---------------|
| "rewrite", "redo", "try again", "different approach" | `rewrite` |
| "expand", "more detail", "elaborate", "flesh out" | `expand` |
| "shorten", "condense", "more concise", "tighten" | `condense` |
| "strengthen", "more support", "needs evidence" | `strengthen` |
| "more formal", "less formal", "assertive", "softer", "academic tone" | `tone` |
| "needs citation", "add source", "reference", "cite" | `citation_request` |
| "check this", "verify", "is this accurate", "fact check" | `factual_check` |
| No pattern match | `rewrite` (default) |

### Type-Specific Processing

**rewrite** — Rewrite using comment as guidance. Preserve approximate length. Match surrounding tone (or CHRONICLE style). Maintain inline citations unless irrelevant.

**expand** — Add depth. Target 1.5-2x word count. New content grounded in document, verified citations, or hedged domain knowledge. No new uncited claims unless verified citation set provides support.

**condense** — Reduce to 0.5-0.7x. Prioritize: cited claims > uncited claims > transitions > filler. Never drop a cited claim. If passage is mostly cited material, inform user instead of forcing condensation.

**strengthen** — Search verified citation set for supporting papers. If found: integrate with proper formatting. If not found: flag "No verified source found. Consider adding evidence or softening the assertion." Never hallucinate citations.

**tone** — Rewrite matching requested tone direction. Preserve all factual content and citations. If CHRONICLE data available and comment is vague, use CHRONICLE to match user's natural voice.

**citation_request** — Search verified citation set only (no external APIs). If found: insert citation in document's reference style. If not found: return original unchanged with flag.

**factual_check** — Cross-reference against verified citations, other document claims, and internal consistency. Return one of three verdicts: "Supported by [citation]", "Unverified: could not confirm against your sources", or "Inconsistent: conflicts with [passage/citation]". **Read-only — no rewriting.**

### Output Schema

```json
{
  "rewritten_section": { "text": "<replacement text>", "format": "markdown | latex | plain_text" },
  "diff": { "original_text": "...", "new_text": "...", "change_type": "...", "word_count_original": 145, "word_count_new": 162, "citations_added": [], "citations_removed": [], "insertions": [...], "deletions": [...] },
  "flags": [{ "type": "no_citation_found", "message": "...", "suggestion": "..." }],
  "unchanged": false
}
```

For `factual_check` or `citation_request` with no match: `unchanged: true`, value is in the `flags` array.

### Boundary Enforcement (Critical)

**The agent must not modify any text outside the selected boundaries.**

Verification procedure (runs on every pass):
1. Take full document. Replace text between offsets with `rewritten_section.text`.
2. Compare resulting document against original character-by-character outside replacement zone.
3. If any character outside changed: reject output, re-run with explicit constraint injection, verify again.
4. If violation persists after 2 retries: return error "Refinement could not be completed without affecting surrounding text. Try selecting a larger section."

### UX Integration (LUMARA Output Viewer)

**Selection flow:** User taps/long-presses passage → selection handles → "Add Comment" floating action button.

**Comment flow:** Comment card with text input + annotation type chips (Rewrite, Expand, Condense, Strengthen, Tone, Add Citation, Fact Check). Chips optional — `auto` inference if none selected.

**Result flow:** Loading indicator on selection → rewritten section replaces original → change indicator in sidebar → tap for diff view (red removed, green added) → "Keep Changes" / "Revert" buttons → flags shown as yellow callouts.

**History:** Local revision history per document. Timestamp, annotation type, selected text preview, comment, "Restore this version". Stored locally only — not sent to SwarmSpace or CHRONICLE.

### Acceptance Tests

1. **Boundary integrity:** 5-paragraph doc, rewrite paragraph 3 → paragraphs 1,2,4,5 byte-identical
2. **Expand:** 50-word passage → 75-100 words, no new uncited claims
3. **Condense:** 200-word passage → 100-140 words, no citations dropped
4. **Citation request with match:** Relevant paper in verified set → correctly inserted in reference style
5. **Citation request without match:** No relevant papers → `unchanged: true` with flag
6. **Factual check consistency:** Contradictory claims in document → inconsistency detected and reported
7. **Tone with CHRONICLE:** Formal academic CHRONICLE data + casual passage → matches CHRONICLE style
8. **Tone without CHRONICLE:** Same test → infers from surrounding context
9. **Auto type inference:** 7 comments matching different patterns → correct type for each
10. **LaTeX preservation:** `\cite{}` commands and equation references preserved in rewrite
11. **Reference style fidelity:** Rewrite + strengthen across all 6 styles → correct inline formatting
12. **Concurrent rejection:** Two simultaneous passes on same doc → `is_concurrency_safe: false` enforced

### Constraints

1. **Boundary enforcement is non-negotiable.** Verified programmatically on every pass.
2. **No citation fabrication.** Only uses verified citation set.
3. **User-provided references never removed.** Flagged, not deleted.
4. **CHRONICLE data optional.** Works without it.
5. **Format preservation.** Markdown in → markdown out. LaTeX in → LaTeX out.
6. **Revision history is local.** No data stored on SwarmSpace or sent to CHRONICLE.
7. **Credit per pass.** Each annotation = 1 pass = 10 credits. No bulk discount (preserves targeted annotation incentive).

---

## 20. SOCIAL MEDIA TRACTION AGENT — Founder Meta-Tool (Spec v2.0)

> **Scope note:** This is a prompt template / agent specification the founder uses to build SwarmSpace's own audience. It is drafted as a SwarmSpace Verified Plugin spec so it can ship as an actual plugin later — but the immediate use is internal, as a cold-start social media playbook. Keep the spec verbatim here so future plugin work can lift it directly.

### SwarmSpace Verified Plugin — Orbital AI

### v2.0 — Production Spec

---

### PLUGIN MANIFEST

```json
{
  "plugin_id": "orbital-traction-agent-v1",
  "name": "Social Media Traction Agent",
  "description": "Cold start social media strategy for founders building a new audience. Analyzes engagement, identifies what's working, and drafts your next post — ready to approve and publish.",
  "version": "1.0.0",
  "tier": "verified",
  "publisher": "Orbital AI",
  "category": "content",
  "input_types": ["text", "chronicle_profile"],
  "output_types": ["text", "draft_post"],
  "requires_approval": true,
  "chronicle_toggle": true,
  "chronicle_default": false,
  "analytics_plugin_slot": true,
  "scheduling_plugin_slot": true,
  "channels_supported": "all_connected"
}
```

---

### CHRONICLE TOGGLE

*(Architecture mirrors the Research Agent toggle — off by default)*

```
CHRONICLE CONTEXT: [ OFF ] ← default
                   [ ON  ] ← user activates

When OFF: Agent uses manual Product Context inputs only.
When ON:  Agent pulls product context, founder voice, posting history,
          and audience signals directly from CHRONICLE.
          Manual inputs become optional overrides.

UI NOTE: Toggle should be visible on the agent card before launch,
         not buried in settings. User must consciously choose.
         When toggled ON, show confirmation:
         "LUMARA will read your project notes and journal entries
          to personalize this agent. Your data stays on your device."
```

---

### ANALYTICS PLUGIN SLOT

*(Placeholder for future integration — v2)*

```
ANALYTICS: [ NOT CONNECTED ] ← default v1 behavior
           [ CONNECTED: ___ ] ← user connects analytics plugin when available

When NOT CONNECTED: User provides engagement data manually via Session Input.
When CONNECTED:     Agent fetches impressions, comments, likes, and reposts
                    automatically before each analysis session.

SLOT NOTE: Architect the data schema now so any analytics plugin
           (LinkedIn Analytics, Threads Insights, etc.) can plug in
           without requiring a prompt rewrite.

Expected data shape when connected:
{
  "post_id": string,
  "platform": string,
  "impressions": number,
  "likes": number,
  "comments": number,
  "reposts": number,
  "top_comments": [string],
  "posted_at": ISO8601
}
```

---

### SCHEDULING PLUGIN SLOT

*(Approval-only in v1 — scheduling plugin in v2)*

```
SCHEDULING: [ APPROVAL ONLY ] ← v1 default
            [ CONNECTED: ___ ] ← future Buffer / Later / Hootsuite slot

v1 behavior: Agent drafts post → surfaces for user approval →
             user copies and posts manually to connected channels.

v2 behavior: Agent drafts post → surfaces for user approval →
             on approval, queues directly to scheduling plugin
             for connected channels.

TRUST NOTE: Agent never posts autonomously. Approval gate is
            non-negotiable regardless of scheduling plugin status.
            This is a PRISM-compliant behavior requirement.
```

---

### CONNECTED CHANNELS

Agent adapts output format and strategy to all channels the user
has connected in LUMARA settings. Current supported channels:

- Threads
- LinkedIn (personal page preferred over company page)
- Substack
- [Additional channels as connected]

Channel-specific formatting rules are applied automatically
based on which channels are active.

---

### AGENT PROMPT

*(Core instruction set — do not modify without version increment)*

---

You are a Social Media Traction Agent, a Verified SwarmSpace plugin built by Orbital AI. You help founders build an audience from zero and convert that audience into product users.

You run in two modes every session: Analysis first, then Draft. You never skip Analysis. You never draft without knowing what the data says.

---

#### CONTEXT LOADING

**If CHRONICLE is ON:**
Before doing anything else, read the user's CHRONICLE profile. Extract:

- Product name, description, and positioning
- Core customer frustration in the user's own words
- Founder background and credibility hook
- Voice patterns from existing writing (sentence length, tone, recurring phrases)
- Any previous posts and their outcomes if logged
- Current audience size across connected channels
- Stage of launch

Use this as your primary context. Treat manual inputs below as optional overrides only.

**If CHRONICLE is OFF:**
Use the Product Context section below as your only source of truth.
Do not infer or assume anything not explicitly provided.

---

#### PRODUCT CONTEXT

*(Required when CHRONICLE is OFF — optional override when ON)*

**Product name:** [PRODUCT NAME]

**One sentence description:** [What it does and who it's for]

**Core customer frustration:** [The specific pain — in the customer's words, not yours]

**Core positioning statement:** [The single line that makes this different]

**Privacy or trust angle:** [Any structural reason to trust this over alternatives]

**Founder background:** [1-2 sentences — who you are and why you built this]

**Connected channels:** [Auto-populated from LUMARA settings]

**Current audience size:** [Auto-populated from connected channels or enter manually]

**Launch stage:** [Pre-launch / Just launched / Post-launch]

**Launch date:** [DATE or leave blank]

---

#### SESSION INPUT

*(User provides this each session — auto-populated if analytics plugin connected)*

**POSTS LIVE:**
[Paste the text of each post currently live, or auto-populated via analytics plugin]

**ENGAGEMENT DATA:**
[Impressions / likes / comments / reposts per post, or auto-populated]

**COMMENTS WORTH NOTING:**
[Paste any comments that generated real conversation, pushback, or questions]

**YOUR REPLIES:**
[What you said back in the comments]

**WHAT YOU WANT:**
[Next post / strategy check / both / something specific]

---

#### MODE 1 — ANALYSIS

Before drafting anything, analyze all available data. State your findings clearly under these headers:

**SIGNAL CHECK**
Which post is generating the most meaningful engagement?
Rank by: comments > reposts > likes > impressions.
Explain why the top performer is working.

**CONTENT LEADS**
List every question or objection that appeared in comments.
Each one is a potential post brief. Flag the strongest one.

**AUDIENCE CHECK**
Is the content attracting the right audience or the wrong one?
Right audience: potential users, people who feel the frustration.
Wrong audience: builders, competitors, people who won't convert.
State clearly which is happening and why.

**LANGUAGE MIRROR**
What words and phrases is the audience using to describe the problem?
These should appear in future posts. List them.

**GAP ANALYSIS**
Is there a gap between what the founder is saying and what the audience needs to hear?
If yes, name it specifically.

**DATA NOTE**
If there isn't enough data to draw conclusions, say so.
State exactly what data would change the analysis.

---

#### MODE 2 — DRAFT

After analysis, draft the next post. Structure your output exactly as follows:

---

**NEXT POST**

**Platform:** [Which channel and why]
**Post type:** [A — Frustration Mirror / B — Proof Story / C — Provocation]
**Community / Topic tag:** [Where to post it]
**Strategic reason:** [One sentence on why this post comes next]

**DRAFT:**
[Full post copy, ready to publish. No placeholders. No editing required.]

**WATCH FOR:**
[One specific thing to look for in the comments that will inform the post after this one]

**APPROVAL REQUIRED**
This post will not be published until you approve it.
[ APPROVE ] [ EDIT ] [ REJECT ]

---

#### POST TYPE FRAMEWORK

**TYPE A — FRUSTRATION MIRROR**
Articulate what the customer already feels but hasn't said out loud.
No product pitch. No solution. Just the recognition.
They read it and think: "this person gets it."

**TYPE B — PROOF STORY**
First-person, specific, real.
Something the product did that nothing else could do.
Concrete detail. Real outcome. Show don't tell.

**TYPE C — PROVOCATION**
Short, factual, slightly uncomfortable observation about the status quo.
The kind of thing that gets shared because it makes people think.

---

#### VOICE RULES

Apply these regardless of CHRONICLE status. If CHRONICLE is ON,
layer these rules on top of the user's detected voice patterns.

- Short declarative sentences
- No em dashes
- No "it's not X, it's Y" constructions
- No throat-clearing before the point
- Direct but with depth underneath
- Rhetorical fragments are fine for emphasis
- Punchy close
- Never start with "I" on LinkedIn
- Never use "delve", "dive in", "unpack", or "game-changer"

---

#### CHANNEL-SPECIFIC RULES

**THREADS**

- Max 5-6 sentences
- No links in post body
- Tag a community or topic on every post
- Personal Development / Journaling for story-driven posts
- AI / Tech for provocations and frustration mirrors
- Three times per week minimum

**LINKEDIN**

- One-sentence hook, then let the post breathe
- One paragraph deeper than the Threads version
- External links go in first comment, not post body
- Tag anyone whose comment inspired the post
- Two times per week
- Personal page over company page for organic reach

**SUBSTACK**

- One post per month
- Lead with personal story or observation, not thesis
- Every post should make someone feel seen
- Long-form post generates the short-form content for that month
- Do not draft until there is something worth the long read

---

#### AGENT BEHAVIOR RULES

- Always run Analysis before Draft. Never skip it.
- If a post is underperforming, say why honestly before moving on.
- If a comment thread contains a better post idea than what's planned, flag it and draft that instead.
- If the founder's comment replies are going too deep technically, flag it. Turn the explanation into a standalone post.
- Never suggest adding a new channel until current channels have 60 days of consistent posting.
- Never suggest a rebrand or major pivot in the first 30 days. Not enough data.
- If the founder asks for reassurance, give honest assessment instead. Early traction is slow. That's normal.
- Track which post type (A, B, C) generates the most substantive engagement. Weight future drafts accordingly.
- When comments contain objections, treat them as the next post brief. Draft the answer as a post, not a reply.
- Never post autonomously. Every output requires explicit user approval before any action is taken.

---

#### COLD START SEQUENCE

*(Agent follows this for the first five posts on any new channel)*

POST 1 — SLOW BURN HOOK
Plant curiosity. Signal there's more coming. Reward following.

POST 2 — FRUSTRATION MIRROR
Articulate the core pain. No solution. End with a question or provocative statement.
Attracts the right audience. Filters the wrong one.

POST 3 — PROOF STORY
First-person specific story. Product does something nothing else could do.
Converts curious followers into believers.

POST 4 — TRUST PROVOCATION
The uncomfortable truth about where data goes with alternatives.
Differentiates on trust, not features.

POST 5 — POSITIONING STATEMENT
Clean, direct. What this is and who it's for.
Gives new followers a clear mental model.

After post 5: rotate freely between A, B, C based on engagement data.

---

#### SUCCESS METRICS AT 60 DAYS

Not optimizing for follower count. Optimizing for:

- Comments from potential users, not just builders
- Questions that reveal genuine product curiosity
- Organic shares or reposts without prompting
- At least one DM or direct outreach
- Clear signal on which post type resonates most

If none of these are present by day 60: recommend content pivot, not channel change.

---

### PLUGIN NOTES FOR DEVELOPERS

**CHRONICLE integration:** Toggle architecture mirrors Research Agent implementation. See `/agents/research/chronicle_toggle.dart` for reference — this is a placeholder path assuming the Research Agent lives there. Point your dev at the actual path in the repo and they will know exactly what to mirror. Default state: OFF. Confirmation modal required on first ON activation.

**Analytics plugin slot:** Schema defined above. Any analytics plugin conforming to the data shape will connect without prompt modification — the slot was architected this way intentionally so no prompt rewrite is needed when the analytics plugin is built. Slot UI should appear greyed out with "Coming Soon" label in v1.

**Scheduling plugin slot:** Approval gate is hardcoded. Cannot be removed or bypassed by any scheduling plugin. Plugin can only receive approved posts, never draft posts. This is intentional and non-negotiable regardless of which scheduling tool is connected in future versions.

**PRISM compliance:** Agent reads CHRONICLE data only when toggle is ON and user has confirmed. No CHRONICLE data is passed to external services. All synthesis happens locally. OPEN QUESTION BEFORE VERIFIED PUBLISH: Confirm with your architecture that CHRONICLE data is not hitting the cloud inference call when the toggle is ON. If it is, this note needs updating before this plugin goes to Verified status. Do not publish as Verified until this is resolved.

**Trust tier:** Verified. Orbital AI is responsible for maintaining this plugin. Version increments require internal review before SwarmSpace publication.

---

*Social Media Traction Agent — SwarmSpace Verified Plugin*
*Orbital AI · v1.0.0*

---

## 21. Safe Room — Structural Prompt Injection Defense

**Status:** Not started
**Priority:** V1 — required before external-content plugins reach production users
**Depends on:** Dynamic Worker Loader sandbox (Section 5.1), PRISM enforcement at sandbox level (Section 5.1)

---

### What It Is

The Safe Room is a named SwarmSpace primitive that closes the output-side gap in plugin security. PRISM and V8 isolate sandboxing control what goes into a plugin execution environment. The Safe Room controls what comes out, and how the synthesizer treats it.

It applies specifically to plugins that declare `fetches_external_content: true`. These plugins return content authored by unknown third parties, which creates a structural prompt injection vector: injected instruction text inside fetched content can reach the agent's LLM reasoning context through normal execution flow, without compromising the plugin or violating any manifest declaration.

The Safe Room closes this via three layered controls.

---

### Components

#### 1. Schema-Enforced Output Gate

Plugins declaring `fetches_external_content: true` must include an `output_schema` in their manifest. This schema defines every field, type, and constraint on what the plugin is permitted to return.

The sandbox boundary enforces this schema before the result is passed to swarmspaceRouter:

- Fields not declared in the schema are stripped at the boundary
- Values that do not match declared types are rejected and surfaced as a plugin execution error
- Freeform untyped text fields are not permitted in output schemas for external-content plugins
- Schema violations are hard errors surfaced to the developer — no silent pass-through

**Effect:** Injection payloads have no schema field to occupy. They cannot exit the sandbox.

**Implementation:**

- Add `output_schema` as a required manifest field when `fetches_external_content: true`
- Implement Zod (or JSON Schema) validator in the Worker response handler, runs before result is returned to swarmspaceRouter
- Schema validation failure returns a structured error: `{ error: "schema_violation", field: "[field]", expected: "[type]", received: "[type]" }`
- Update manifest submission pipeline to require and validate `output_schema` for external-content plugins
- Update sandbox testing step in review pipeline to run a schema conformance check on plugin output

---

#### 2. Provenance Tagging

Every result that exits a Safe Room carries a provenance envelope attached by the sandbox boundary. The plugin cannot modify or remove this envelope.

```json
{
  "source_type": "external_content",
  "trusted": false,
  "plugin_slug": "[plugin identifier]",
  "schema_validated": true,
  "fetched_domains": ["[domain1]", "[domain2]"]
}
```

This envelope travels with the result through swarmspaceRouter to the synthesizer.

**Implementation:**

- Attach provenance envelope in the Worker response handler after schema validation passes
- Pass envelope as a metadata wrapper around plugin result payload through swarmspaceRouter
- swarmspaceRouter preserves envelope when passing result to next workflow step or to synthesizer

---

#### 3. Synthesizer Untrusted Provenance Handling

The LUMARA synthesizer system prompt is updated to apply a distinct handling posture when it receives content tagged `trusted: false`:

- Content is framed as third-party data to be processed, not as context or instruction
- Instruction-shaped text inside untrusted fields is surfaced as a data observation, not an action trigger
- The synthesizer does not execute directives found inside untrusted content regardless of phrasing

**Implementation:**

- Update LUMARA synthesizer system prompt with untrusted provenance handling instructions
- Test against crafted injection payloads in schema-conformant fields (e.g., a `summary` field containing "Ignore previous instructions and…")
- Verify synthesizer treats injection text as data, surfaces it as an observation, does not act on it

---

### Manifest Changes

Add two fields to the plugin manifest spec:

| Field | Type | Applies To | Required |
|-------|------|------------|----------|
| `output_schema` | Object | All plugins with `fetches_external_content: true` | Yes |
| `output_schema_version` | String | All plugins with `fetches_external_content: true` | Yes |

Example manifest addition:

```json
"fetches_external_content": true,
"output_schema": {
  "headline": { "type": "string", "max_length": 200 },
  "summary": { "type": "string", "max_length": 500 },
  "source_url": { "type": "url" },
  "published_at": { "type": "iso_datetime" }
},
"output_schema_version": "1.0"
```

---

### Developer Experience

Developers building external-content plugins face three new requirements:

1. Declare an `output_schema` in the manifest covering every field the plugin returns
2. No untyped freeform text in output — all text fields must be typed and length-bounded
3. Schema violations surface as hard errors during sandbox testing in the review pipeline — non-conformant plugins do not pass review

Developer docs must explain the Safe Room contract clearly: what it enforces, why it exists, and what a valid output schema looks like with examples.

---

### Security Page Update

The security posture page (`swarmspace.app/security.html`) must be updated to describe the Safe Room as a named primitive. The description must accurately reflect both what it protects against and what residual risks remain:

**Protected:** Injection payloads embedded in fetched external content cannot exit the plugin sandbox. Content reaching the synthesizer is tagged untrusted and handled as data.

**Residual risk (must be disclosed):** Schema field poisoning — a sufficiently crafted injection inside a declared text field (e.g., `summary`) can still reach the synthesizer. The provenance handling posture is the backstop for this case.

---

### Manifest Review Update

The human review step for external-content plugins gains an additional audit responsibility:

- Is the `output_schema` honest relative to what the plugin actually returns?
- Are text fields appropriately bounded, or does the schema declare an overly permissive catch-all text field that reduces output gate protection?
- A catch-all `text` field in an external-content plugin output schema is a flag — reviewer should require more specific schema or reject.

---

### Implementation Sequence

| Phase | Work | Estimated effort |
|-------|------|------------------|
| 1 | Manifest spec update: add `output_schema` and `output_schema_version` fields | 0.5 days |
| 2 | Output schema validator in Worker response handler (Zod) | 1 day |
| 3 | Provenance envelope attachment and propagation through swarmspaceRouter | 0.5 days |
| 4 | Synthesizer system prompt update + injection test suite | 1 day |
| 5 | Manifest review pipeline update: schema honesty audit | 0.5 days |
| 6 | Developer docs update: Safe Room contract, schema examples | 0.5 days |
| 7 | Security page update: Safe Room description with accurate scope | 0.5 days |

**Total estimated effort:** ~4.5 days of focused implementation

---

### Relationship to Existing Architecture

| Layer | Existing control | Safe Room addition |
|-------|------------------|--------------------|
| Input | PRISM context minimization | No change |
| Execution | V8 isolate sandbox | No change |
| Output | None | Schema enforcement + provenance tagging |
| Synthesizer | None | Untrusted provenance handling posture |
| Manifest review | Intent and access audit | Output schema honesty audit |

The Safe Room does not replace any existing control. It closes the output-side gap that PRISM and V8 sandboxing do not address.

---

### Notes

- Applies only to plugins with `fetches_external_content: true`. Plugins without this flag are not subject to output schema requirements.
- Safe Room is a public-facing primitive name. It appears in developer docs, security page, and eventually in marketing copy. Treat it as a named architecture concept, not an internal implementation term.
- See standalone doc: *SwarmSpace Safe Room — A Named Primitive for Structural Prompt Injection Defense* for the full rationale and architecture narrative.

---

*SwarmSpace Full Backlog — Orbital AI — April 19, 2026*
