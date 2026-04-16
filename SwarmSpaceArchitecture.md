# SwarmSpace Architecture

*Orbital AI — April 2026 — v1.0*

> This document is an onboarding-friendly architecture overview. For the internal technical reference (manifest schemas, Firestore collection shapes, validation pipeline internals), see [`architecture.md`](./architecture.md). For privacy and security implementation detail, see [`Docs/PRISM.md`](./Docs/PRISM.md) and [`ast10.html`](./ast10.html).

---

## 1. What SwarmSpace Is

SwarmSpace is a plugin marketplace and orchestration platform for AI agents. It is the execution surface that lets applications — most notably LUMARA, Orbital AI's consumer app — call third-party tools, chain them into composite workflows, and eventually run persistent, scheduled agents.

Three ways to think of it:

- **For end users (via LUMARA or other clients):** a catalogue of callable capabilities (web search, academic discovery, weather, citations, drafting) that an agent can invoke on their behalf under a credit budget.
- **For independent developers:** a revenue-share marketplace — write a Cloudflare Worker that conforms to the plugin contract, submit via the portal, earn 80% (or 85% as a Founding Developer) on every paid call.
- **For AI agents and automation:** a hardened, privacy-minimizing, consent-gated dispatch layer that can be called from any authenticated client — one plugin at a time, composed into chains, or (future) scheduled to run autonomously.

**What SwarmSpace is NOT:**

- Not an LLM. Synthesis uses external models (Gemini 3.1 Pro Preview, Groq, Workers AI) via dedicated plugins.
- Not a chat application. It is infrastructure that chat applications call.
- Not a general app store. Every plugin is a callable HTTP endpoint with a strict manifest; there is no installable binary.

---

## 2. Who It's For

| Audience | What they do | Primary surface |
|----------|-------------|-----------------|
| **API consumers** | Call plugins directly or through workflows; pay in credits | `swarmspaceRouter` Cloud Function + dashboard |
| **Independent developers** | Ship plugins, earn revenue share, track merit score | `submit-plugin.html` + Developer Submission Portal + earnings dashboard |
| **AI agents (LUMARA, external)** | Dispatch plugin calls with CHRONICLE-derived context under PRISM consent | `swarmspaceRouter` with Firebase ID token auth |
| **Orbital AI (internal)** | Compose premium Layer 2 workflows, run moderation, curate catalogue | Orchestrator Worker, `admin-submissions.html` |

Credit tiers (as of April 2026):

- **Free** — 20 calls/day. 15 plugin catalogue.
- **Pro / Standard** — 500 calls/day, $30/mo. Adds 5 standard plugins (OCR, URL reader, media upload, Tavily, social publisher).
- **Premium** — 500 calls/day. Adds 2 premium plugins (Exa search, Perplexity Sonar) and all paid Layer 2 workflows.
- **Admin** — unlimited.

---

## 3. The Three Layers

SwarmSpace is organized into three layers. Layer 1 is fully live. Layer 2 is live for free orchestrator routes; premium workflows are the next wave. Layer 3 is architectural, not yet shipping.

### Layer 1 — Plugin Marketplace

Individual, callable capabilities. Each plugin is a Cloudflare Worker at `swarmspace-plugin-{slug}.orbitalai.workers.dev`, described by a JSON manifest with strict schema, dispatched via `swarmspaceRouter`. Consumers call one plugin at a time. Credit-gated per tier. PRISM enforcement is live here.

- 22 plugins across Free (15) / Standard (5) / Premium (2) tiers
- Manifest requires: `slug`, `version`, `semantic_tags`, `access_tier`, `trust_tier`, `credit_cost_per_call`, `privacy_data_required`, behavioral flags (`is_read_only`, `is_destructive`, `is_concurrency_safe`, `headless`, `schedulable`)
- First-party plugins shipped from `workers/plugins/*` and registered in `workers/plugins/REGISTRY_ENTRIES.ts`
- Developer plugins promoted from Firestore `plugin_submissions` → `approved_plugins` via `onSubmissionStatusChange` trigger, merged into router dispatch with 5-minute TTL cache

### Layer 2 — Workflow Orchestration (Work Chains)

Composed plugin chains that run to produce a finished outcome — research summary, news briefing, citation-verified draft. Live infrastructure is the **Orchestrator Worker** (`workers/orchestrator/src/index.js`), exposing 12 free POST routes.

**Terminology (April 2026 update):**
- **Work Chain** — the developer-facing, infrastructure-level name for a composed chain.
- **Role** — the consumer-facing marketing skin over a Work Chain (e.g. "Research Assistant," "Market Analyst").

Parallel fan-out is supported where `is_concurrency_safe: true` allows (e.g. `/academic` runs Semantic Scholar + arXiv + PubMed simultaneously, then feeds Gemini Flash synthesis).

Planned — not yet built:
- **Orchestrator execution modes** (`plan` / `auto` / `bubble` / `interactive`) — must land before premium Layer 2 workflows ship and before Layer 3 dispatch.
- **Work Chain Manifest Spec** — formal schema for composed chains beyond the current hard-coded route tables.

### Layer 3 — Persistent Agents

Long-lived, event-triggered, or scheduled agents. Runtime is **Cloudflare Durable Objects** — server-side, no dependency on a desktop client. Not yet shipping.

Future capabilities:
- Durable Object `AgentSchedulerDO` with Alarms API for cron-style recurrence
- **Agent Identity Token (AIT)** — self-registration for autonomous agents with human verification at first registration
- **Autonomy ladder** (Level 0–3): drafts-only → queued approval → per-item veto → fully autonomous
- **Roles catalogue** (Dream Team packs) — curated Work Chains presented as deployable Roles
- Mobile recurring agent tier gating (Pro $15/mo or Premium $20/mo)

Full design in [`Docs/LAYER3_DESIGN_AND_BACKLOG.md`](./Docs/LAYER3_DESIGN_AND_BACKLOG.md) and backlog Section 5.2 / 6 / Recurring Agent Scheduler spec.

---

## 4. Current System Inventory

### Active Agents (4)

| Name | Runtime | Role |
|------|---------|------|
| `swarmspaceRouter` | Firebase Cloud Function | Front door. Auth, tier/credit enforcement, PRISM filtering, plugin dispatch. |
| `swarmspaceDiscoveryAgent` | Firebase Cloud Function | Unauthenticated homepage NLP chat. Gemini Flash, 3-turn sessions, IP rate limited. Chain-to-signup handoff. |
| Orchestrator Worker | Cloudflare Worker | Chains free-tier plugins into 12 Work Chains. |
| Agent Worker | Cloudflare Worker | Two-phase Plan → Execute with user confirmation gate. |

### Orchestrator Work Chains (12, all live)

`/research`, `/competitor`, `/marketing`, `/plugins`, `/academic`, `/news-brief`, `/market-scan`, `/location-brief`, `/health-research`, `/tech-scout`, `/fact-check`, `/content-brief`

### Plugins (22)

- **Free (15):** brave-search, semantic-scholar, weather, wikipedia, currency, news, arxiv, gemini-flash, nominatim, rest-countries, github-public, hackernews, dictionary-api, jina-reader, pubmed
- **Standard (5):** vision-ocr, url-reader, media-upload, tavily-search, social-publisher
- **Premium (2):** exa-search, perplexity-sonar

### Infrastructure Workers (3)

`plugin-registry` (catalogue source of truth), `media-upload` (R2-backed), `social-publisher` (LinkedIn / Bluesky / Threads fan-out).

### Firebase Cloud Functions (20)

| Group | Functions |
|-------|-----------|
| Core dispatch | `swarmspaceRouter`, `swarmspacePluginCatalog`, `swarmspacePluginStatus`, `swarmspaceWriteCapabilities`, `updateUserModelConfig` |
| LUMARA AI | 4 functions (chat, synthesis, embeddings, summarize) |
| API proxies | `newsDataInvoke`, `visionOcrInvoke`, and 3 others (Stripe, etc.) |
| Business | `swarmspaceClaimFoundingSpot`, Stripe checkout, Stripe webhook, subscription sync |
| Data / validation | `validatePluginSubmission` (v2, 7-stage pipeline), `onSubmissionStatusChange` (promotion trigger) |

### Infrastructure Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vercel (static HTML, no build step) |
| Auth | Firebase Auth (Google, GitHub, email/password) |
| Database | Firestore (`developers`, `api_keys`, `plugins`, `plugin_submissions`, `approved_plugins`, `founding_programme`, `discovery_sessions`, `swarmspace_usage`, `plugin_activity_log`, `swarmspace_capabilities`) |
| Plugin runtime | Cloudflare Workers |
| Orchestrator runtime | Cloudflare Worker |
| Payments | Stripe (Checkout + webhooks) |
| LLM synthesis | Gemini 3.1 Pro Preview (primary), gpt-oss-120b on Groq (fallback), Llama 3.1 8B / 3.3 70B on Groq (extraction) |

---

## 5. Security Architecture

### PRISM — Privacy Context Minimization

Active. Plugins declare `privacy_data_required` (array of context field names) in their manifest. The router strips every undeclared field from the context payload before dispatch.

Three privacy tiers:
- **ANONYMOUS** — no user context passed. Works without consent.
- **USER_CONTENT** — user-submitted text / media. Requires `_prism_consent: true`.
- **STRUCTURED_PERSONAL** — CHRONICLE-derived fields (writing style, domain expertise, etc.). Requires consent.

Consent enforcement is blocking, not logging — unconsented non-ANONYMOUS calls throw `HttpsError` with `PRISM_CONSENT_REQUIRED` and are logged as `"blocked"` in `plugin_activity_log`. Every dispatch records `privacy_tier`, `consent_given`, `fields_kept`, `fields_stripped`.

Full spec: [`Docs/PRISM.md`](./Docs/PRISM.md) and [`prism.html`](./prism.html).

### Current vs Target State

| Dimension | Current (April 2026) | Target (Dynamic Workers migration) |
|-----------|---------------------|-----------------------------------|
| Plugin runtime | Static deployed Workers; direct access to `env.SWARMSPACE_INTERNAL_TOKEN` and third-party API keys | V8 hardware-isolated sandboxes via `env.LOADER.get()` |
| Outbound network | Unrestricted `fetch()` | `globalOutbound` gateway with per-plugin domain allowlists derived from manifest `network_permissions` |
| Credentials | Read directly from `env` in plugin code | Injected at gateway boundary; plugin never sees keys |
| Runtime monitoring | Cloudflare analytics | Tail Workers capturing every `fetch` event and console log |
| Deployment | `wrangler deploy` per plugin | Single orchestrator Worker loads plugin code dynamically |

Dynamic Workers (Cloudflare, open beta since March 24, 2026) are the migration target. Per-load cost ~$3/month at ~50 plugins post-beta. Backlog Section 5.1 is the implementation plan.

### AST10 Compliance

Ten OWASP Agentic Skills controls are mapped and published with honest status badges (`In place` / `Partial` / `Planned`) at [`/ast10.html`](./ast10.html). Full detail in [`Docs/OWASP_AST10_COMPLIANCE.md`](./Docs/OWASP_AST10_COMPLIANCE.md).

---

## 6. Future Surfaces

### Premium Layer 2 — Research Writing Assistant (backlog §17)

First premium Work Chain. 6-step chain: intake → parallel literature discovery (Semantic Scholar + arXiv + PubMed) → citation verification → outline generation with user review gate → section drafting → iterative refinement. 40 credits per initial generation, 10 credits per refinement pass. Builds on the live `/academic` route. Hard prerequisite: orchestrator execution modes (§5.3).

### Supporting Standalone Plugins

- **Citation Verifier** (backlog §18) — verifies references against Semantic Scholar → CrossRef fallback. 5 credits standalone. Zero PRISM surface (only paper metadata, never user context).
- **Iterative Refinement Agent** (backlog §19) — processes user annotations against document selections with programmatic boundary enforcement. 10 credits per pass. `is_concurrency_safe: false`.

### Layer 3 — Durable Object Scheduler

Recurring agent runtime. First deployments are delta variants of existing Work Chains (News Briefing delta, Competitor Research weekly diff, Trend Spotter sentiment alerts, Market Intelligence weekly scan). Design spec in backlog Recurring Agent Scheduler section.

### Developer Ecosystem

- **Founding Developer Programme** (live) — 100 slots, permanent 85% revenue share, atomic Firestore claim via `swarmspaceClaimFoundingSpot`.
- **Stripe Connect payouts** (pending) — 80% standard, 85% Founding, on Verified tier transactions.
- **Earnings dashboard** (pending) — calls, revenue, merit score trajectory.
- **Swarms UI** (designed, not built) — per-plugin community spaces for bug reports, use cases, feature requests, developer update notes.

---

## 7. Reference Map

| Subject | Go to |
|---------|-------|
| Manifest schema, Firestore collection shapes, validation pipeline internals | [`architecture.md`](./architecture.md) |
| PRISM enforcement detail | [`Docs/PRISM.md`](./Docs/PRISM.md), [`prism.html`](./prism.html) |
| Security posture and AST10 mapping | [`ast10.html`](./ast10.html), [`Docs/OWASP_AST10_COMPLIANCE.md`](./Docs/OWASP_AST10_COMPLIANCE.md) |
| Layer 3 design | [`Docs/LAYER3_DESIGN_AND_BACKLOG.md`](./Docs/LAYER3_DESIGN_AND_BACKLOG.md), backlog §6 |
| Publishing a plugin | [`developer-guide.html`](./developer-guide.html), [`submit-plugin.html`](./submit-plugin.html) |
| Backend internals and cloud functions | [`Docs/backend.md`](./Docs/backend.md) |
| Active work and priorities | [`backlog.md`](./backlog.md) |
| Privacy policy (user-facing) | [`Privacy.md`](./Privacy.md), [`privacy.html`](./privacy.html) |

---

*SwarmSpace Architecture — Orbital AI — April 16, 2026*
