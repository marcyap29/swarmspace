# SwarmSpace Backend & Infrastructure

**Last Updated:** 2026-04-13

---

## Overview

SwarmSpace is a static web app with serverless API endpoints. Auth and database via Firebase; payments via Stripe; hosting on Vercel.

---

## Database (Firestore)

### `users/{uid}` collection

| Field | Type | Notes |
|-------|------|-------|
| email | string | |
| plan | string | `free` \| `verified` |
| isPremium | boolean | Whether user has premium access |
| api_key | string | Auto-generated on signup (`ss_` prefix), unique |
| createdAt | timestamp | Account creation time |
| callsToday | number | API calls made today |
| callsReset | timestamp | When callsToday was last reset |

### `submissions` collection
Plugin submissions from developers.

### `plugins` collection
Plugin registry. **21 plugins** across 3 tiers (15 free, 4 standard, 2 premium).

### `swarmspace_capabilities` collection
Real-time capability snapshot consumed by LUMARA via Firestore listener. Single document `swarmspace_capabilities/current` containing plugin count, plugin IDs, chain routes, and aggregated capabilities list.

- **Read:** any authenticated user (`request.auth != null`)
- **Write:** server-side only (Admin SDK via `swarmspaceWriteCapabilities`); client writes denied

### `founding_programme` collection
Programme metadata for the Founding Developer Programme. Single document `founding_programme/meta` with `totalSlots`, `claimedSlots`, `isOpen`. Written by `swarmspaceClaimFoundingSpot` via Firestore transaction; seeded by `scripts/seed-founding-programme.js`.

### `discovery_rate_limits` collection
IP-based rate limiting for the public `swarmspaceDiscoveryAgent` endpoint. Keyed by IP address; tracks request count and window expiry (10 requests/hr).

### `discovery_sessions` collection
Multi-turn conversation sessions for `swarmspaceDiscoveryAgent`. Each document stores session context, turn history, and turns remaining (max 3 turns per session).

### `approved_plugins` collection
Contains approved developer plugin manifests (PluginConfig shape). Written by the `onSubmissionStatusChange` Firestore trigger when a submission transitions to `approved`. Read by `swarmspaceRouter` with a 5-minute TTL cache. Each document is keyed by `plugin_id`.

---

## Services

| Service | Purpose | Tech |
|---------|---------|------|
| Firebase | Auth, database (users, submissions, plugins) | Firebase Authentication, Firestore |
| Stripe | Checkout, subscriptions, webhooks | Stripe API |
| Vercel | Hosting, serverless functions | Vercel |
| API (external) | swarmspaceRouter, swarmspacePluginStatus, swarmspacePluginCatalog, swarmspaceWriteCapabilities, validatePluginSubmission, onSubmissionStatusChange | Firebase Cloud Functions |
| Orchestrator | 12 workflow routes via Cloudflare Worker | `swarmspace-orchestrator.orbitalai.workers.dev` |

### Firebase Cloud Functions (`functions/`)

- **Package:** `firebase-functions` **^7.2.3** (see `functions/package.json`).
- **Deploy discovery:** Large dependencies (`@google-cloud/vision`, `@google/generative-ai`) are loaded with **dynamic `import()`** inside handlers where used (e.g. `visionOcrInvoke`, `proxyGemini`) so Firebase’s deploy-time module discovery stays within timeout.
- **Scripts:** `scripts/deploy-functions.sh` (executable) for targeted deploys when used in your workflow.
- **`swarmspaceWriteCapabilities`** — Admin-only callable. Writes aggregated catalog snapshot to `swarmspace_capabilities/current` in Firestore so LUMARA can subscribe via real-time listener. Includes plugin IDs, chain routes, capability list, and catalog version.
- **`validatePluginSubmission`** — Authenticated callable. **v2 automated validation pipeline:** Ajv JSON Schema validation for fetched plugin manifests (draft-07), 3-sample latency profiler (p50/p95 with `latency_class` comparison), security header audit (6-check weighted 100-point score: HSTS, X-Content-Type-Options, Content-Type, X-Frame-Options, CSP, HTTPS), network domain DNS validation with private IP detection, 7 prompt injection probes (system prompt leak, instruction override, role confusion, data exfil, SQL injection, XSS, path traversal), and 90-second timeout budget with graceful degradation. Returns `validation_version: "2.0.0"` and `validated_at` in the response. Also includes SSRF protection (private IP blocking), duplicate detection (existing plugin ID and endpoint checks), endpoint hardening (5xx/timeout blocking), and validation for submission fields (`access_tier`, `capabilities`, `example_query`, `version`, `rate_limits`). Called before writing to `plugin_submissions`.
- **`swarmspaceDiscoveryAgent`** — Public `onRequest` Cloud Function. Natural-language discovery endpoint that maps user intent to SwarmSpace workflows and plugins. IP rate-limited (10 requests/hr via `discovery_rate_limits`), supports multi-turn conversation (3 turns per session via `discovery_sessions`), powered by Gemini 3 Flash.
- **`swarmspaceClaimFoundingSpot`** — Authenticated callable. Claims a Founding Developer Programme slot using a Firestore transaction against `founding_programme/meta`. Atomic 100-slot cap; returns slot number, remaining slots, and revenue share percentage.
- **`onSubmissionStatusChange`** — Firestore `onDocumentUpdated` trigger on `plugin_submissions/{docId}`. On transition to `approved`: builds a PluginConfig object and writes it to `approved_plugins/{plugin_id}`. On transition from `approved` to `rejected`: deletes the corresponding document from `approved_plugins`. Idempotent.
- **Developer plugin merging** is now active in `swarmspaceRouter`. The router merges the built-in `PLUGIN_REGISTRY` with approved developer plugins loaded from the `approved_plugins` Firestore collection (TTL-cached, 5 min). Developer plugins carry `source: "developer"`. On plugin ID collision, first-party plugins take priority (`{ ...devPlugins, ...PLUGIN_REGISTRY }`).
- **PRISM consent enforcement** is now active in `swarmspaceRouter`. Plugins flagged with `privacy_data_required: true` that receive sensitive payloads (image, URL) without `_prism_consent` are blocked and logged.

---

## Firebase Submit/Admin Tasking (Firestore)

If you implement a Firebase-backed submit/admin review flow, use one consistent web SDK pattern across pages (modular v10 via `https://www.gstatic.com/firebasejs/10.12.5/...` imports in `<script type="module">`).

### Required config in each Firebase page

- `firebaseConfig` object from Firebase Console (Project settings → General → Web app config)
- Admin allowlist constant in `admin-submissions.html` (`ADMIN_EMAIL_ALLOWLIST`; replace placeholder emails), or a single `ADMIN_EMAIL` if you simplify the page
- App initialization:
  - `initializeApp(firebaseConfig)`
  - `getAuth(app)`
  - `getFirestore(app)`

### Firestore collection policy

Collection: `plugin_submissions`

- **Create:** authenticated user only if `request.resource.data.developer_uid == request.auth.uid` and `status == "pending"`.
- **Read:** owning developer **or** allowlisted admin (`isPluginSubmissionAdmin()` in `firestore.rules` — keep emails aligned with `admin-submissions.html`).
- **Update:** allowlisted admins only; `developer_uid` must match existing data; updates may touch only `status`, `review_notes`, `reviewed_at`, `reviewed_by` (enforced in rules via diff key checks).
- **Delete:** denied from clients.

**Admin UI:** `admin-submissions.html` lists and updates this collection (not legacy `submissions`).

**Indexes:** `firebase.json` registers `firestore.indexes.json`. The submit portal uses a single-field equality query on `developer_uid` and sorts by `submitted_at` in the browser; the indexes file may be empty until you add composite indexes for new queries.

Canonical rules live in root `firestore.rules`.

---

## API Endpoints (Vercel)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/create-checkout` | POST | Creates Stripe Checkout session for upgrade |
| `/api/stripe-webhook` | POST | Handles Stripe webhooks (checkout.session.completed, subscription.updated, etc.) |

---

## Environment & Config

- **Env vars (Vercel):** STRIPE_SECRET_KEY, STRIPE_VERIFIED_PRICE_ID, STRIPE_WEBHOOK_SECRET, FIREBASE_PROJECT_ID, FIREBASE_API_KEY, APP_URL
- **Secrets:** Never commit API keys. Add via Vercel env vars or locally.

---

## Deployment

- **CI/CD:** Vercel (git push → deploy)
- **Hosting:** Vercel
- **Config:** vercel.json for URL rewrites

### vercel.json rewrites

| Source | Destination |
|--------|-------------|
| `/` | `/index.html` |
| `/signup` | `/signup.html` |
| `/submit` | `/submit.html` |
| *(direct)* | `/submit-plugin.html` (no rewrite; linked from app pages) |
| *(direct)* | `/security.html` (no rewrite; linked from app pages) |
| *(direct)* | `/prism.html` (no rewrite; linked from app pages) |
| *(direct)* | `/privacy.html` (no rewrite; linked from app pages) |
| `/admin-submissions` | `/admin-submissions.html` |
| `/upgrade` | `/upgrade.html` |
| `/dashboard` | `/dashboard.html` |
| `/marketplace` | `/marketplace.html` |
| `/thankyou` | `/thankyou.html` |
| `/founding-developers` | `/founding-developers.html` |
| `/developer-guide` | `/developer-guide.html` |

---

## Scripts

Utility scripts in `scripts/`. Run from the project root.

### `scripts/seed-founding-programme.js`

**Purpose:** Seeds the `founding_programme/meta` Firestore document that the Founding Developer Programme needs to function. Without this document, the claim function (`swarmspaceClaimFoundingSpot`) returns "Programme not found."

**Run:**
```bash
node scripts/seed-founding-programme.js
```

**What it does:**
- Creates `founding_programme/meta` with `totalSlots: 100`, `claimedSlots: 0`, `isOpen: true`
- Safe to run multiple times — skips if document already exists
- Uses Firebase Admin SDK with your local credentials (same auth as `firebase deploy`)

**When to run:**
- Once, before the Founding Developer Programme goes live
- After a Firestore wipe or project reset

### `scripts/deploy-functions.sh`

**Purpose:** Targeted Firebase function deploys (if used in your workflow).

---

## Work Chains & Roles (Planned)

> **Terminology update (April 2026):** "Outcome Packages" is retired. Infrastructure uses **Work Chains** (what developers build and list). End users see **Roles** (the marketing skin for a Work Chain).

**Status:** Defined | **Priority:** After Discovery Agent (Idea 1) ships | **Added:** April 2026

### Overview

Work Chains are sequenced sets of plugins executing a defined workflow. What developers build, list, and maintain on SwarmSpace. Roles are the human-facing names for Work Chains — what end users browse, deploy, and subscribe to (e.g. "Your Competitive Intelligence Analyst").

Instead of selling individual plugin calls or workflow runs, sell Roles like "Competitive Intelligence Analyst" or "Content Creator Kit." Each Role sits on top of a Work Chain that bundles multiple workflows, configures them for a specific persona, and includes recurring agent variants where applicable.

This is the Roles concept from the backlog (formerly "Dream Team"), reframed as a purchasable product with its own landing page, pricing, and onboarding flow.

**Example:** A "Personal Trainer AI" package includes a client check-in workflow (scheduled), a workout log generator, a nutrition research chain, and a progress tracking agent. The trainer buys the package, and the outcome is a functioning AI-assisted training practice.

### Market Validation

1. **Niche-specific workflow templates convert better than generic offerings.** A "Personal Trainer AI" package outperforms a generic "Health & Fitness Bundle" even targeting fewer people
2. **Outcome-based pricing (~30% SaaS adoption).** Customers pay more when value is framed as a complete solution
3. **Tiered bundles (Starter/Pro/Complete)** with good-better-best positioning create natural expansion paths

| Source | Pattern | Application |
|---|---|---|
| FlowHunt marketplace | Pre-built agent templates as complete solutions | Each Role = complete solution for a persona |
| n8n Self-Hosted AI Starter Kit | Bundles tools as single installable unit | One purchase, fully configured, no assembly |
| Zapier Agent templates | Pre-configured multi-step automations, NL config | Pre-configured chains, user customizes via CHRONICLE context |
| agenticaipricing.com | Essential/Professional/Enterprise tiers | Free preview / Pro / Premium per package |

### Starter Roles (5)

#### Role 1: Competitive Intelligence Analyst (Work Chain: `/competitor`, `/news-brief`, `/tech-scout`, `/market-scan`)
- **Persona:** Founders, product managers, marketing leads
- **Workflows:** `/competitor`, `/news-brief`, `/tech-scout`, `/market-scan`
- **Recurring Agents:** Weekly Competitor Diff, Daily News Briefing, Trend Spotter alerts
- **CHRONICLE:** User tells LUMARA competitors once; every workflow uses that context
- **Free Preview:** One-shot `/competitor` run | **Pro ($15/mo):** All 4 + recurring on mobile | **Premium ($20/mo):** + CHRONICLE personalization

#### Role 2: Content Creator Kit (Work Chain: `/content-brief`, `/research`, `/news-brief`, `/marketing`)
- **Persona:** Solo creators, indie writers, small marketing teams
- **Workflows:** `/content-brief`, `/research`, `/news-brief`, `/marketing`
- **Recurring Agents:** Daily trend feed, Weekly content calendar seed
- **CHRONICLE:** Writing voice, topic interests, audience profile shape every output
- **Free Preview:** One-shot `/content-brief` | **Pro:** All 4 + trending alerts | **Premium:** + CHRONICLE voice calibration + recurring calendar

#### Role 3: Research & Academic Analyst (Work Chain: `/academic`, `/research`, `/fact-check`, `/health-research`)
- **Persona:** Graduate students, researchers, analysts, consultants
- **Workflows:** `/academic`, `/research`, `/fact-check`, `/health-research`
- **Recurring Agents:** Weekly literature watch (keyword alerts), Monthly field review
- **CHRONICLE:** Research interests, citation preferences, methodological notes
- **Free Preview:** One-shot `/research` | **Pro:** All 4 + literature alerts | **Premium:** + CHRONICLE-enriched summaries

#### Role 4: Startup Founder (Work Chain: `/competitor`, `/market-scan`, `/tech-scout`, `/plugins`, `/content-brief`)
- **Persona:** Early-stage founders, solo entrepreneurs, indie hackers
- **Workflows:** `/competitor`, `/market-scan`, `/tech-scout`, `/plugins`, `/content-brief`
- **Recurring Agents:** Weekly competitor diff, Market pulse (monthly), Tech landscape shifts
- **CHRONICLE:** Company description, product positioning, target market feed all outputs
- **Free Preview:** One-shot `/competitor` | **Pro:** All 5 + recurring intelligence | **Premium:** + full CHRONICLE strategic framing

#### Role 5: Location & Travel Intelligence (Work Chain: `/location-brief`, `/market-scan`, `/research`, `/news-brief`)
- **Persona:** Digital nomads, relocation researchers, travel planners, real estate investors
- **Workflows:** `/location-brief`, `/market-scan`, `/research`, `/news-brief`
- **Recurring Agents:** Monthly location pulse, News alerts for target cities
- **Free Preview:** One-shot `/location-brief` | **Pro:** Multi-location + recurring | **Premium:** + CHRONICLE priorities (cost of living, climate, visa) weight outputs

### Prerequisites

| Prerequisite | Status | Blocks |
|---|---|---|
| 404/405 Worker fixes | DONE | Work Chains are workflow bundles. Workflows must work. |
| At least 3 workflows working E2E | UNBLOCKED | Roles depend on working Work Chains. |
| Credit system enforcement | LIVE | Role pricing maps to credits. |
| swarmspacePluginCatalog | LIVE | Role display pulls from this. |
| Discovery Agent (Idea 1) shipped | LIVE | Primary funnel into Roles. |
| Durable Object prototype | NOT STARTED | Recurring variants are the premium differentiator. At least one DO needed for launch. |

### Data Model

**Firestore collection:** `roles`

```json
{
  "roleId": "string",
  "name": "string",
  "description": "string",
  "persona": "string",
  "workChainRoutes": ["route slugs"],
  "includedPlugins": ["plugin slugs"],
  "recurringVariants": ["DO variant definitions"],
  "tiers": {
    "free": { "description": "...", "price": 0 },
    "pro": { "description": "...", "price": 15 },
    "premium": { "description": "...", "price": 20 }
  },
  "featured": "boolean",
  "sortOrder": "integer",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

**Cloud Function:** `swarmspacePackageCatalog` — returns all Roles sorted by sortOrder, no auth required.

**Constraints:**
- Roles curated by Orbital AI, not user-created (editorial, not UGC)
- Role tiers map 1:1 to existing SwarmSpace tiers (Free/Pro/Premium)
- No Role editor UI for v1. Seed via Firestore console or scripts

### Implementation Phases

#### Phase 1: Role Data Model & Catalogue (1 day)
- Create `roles` Firestore collection
- Create `swarmspacePackageCatalog` Cloud Function
- Seed 5 starter Roles

#### Phase 2: Roles Browsing Page (2-3 days)
- `/roles.html` master listing (grid of cards: Role name, persona, Work Chain detail, tier badges, CTA)
- `/role.html?id={roleId}` detail page (full description, Work Chain routes, recurring capabilities, tier comparison, signup/upgrade CTA)
- Add "Roles" to main nav
- "Try this now (free)" buttons route through discovery agent
- "Popular Roles" section on homepage below discovery agent
- Static HTML, no build step. Data loaded from `swarmspacePackageCatalog`

#### Phase 3: Discovery Agent Role Awareness (1 day)
- Extend `swarmspaceDiscoveryAgent` to query `swarmspacePackageCatalog`
- If chain matches a Role's `workChainRoutes`, add `matchedRole` to response
- If user intent maps to a persona, prioritize showing matching Role over custom chain

#### Phase 4: Role Onboarding Flow (1-2 days)
- `/signup.html?role={roleId}` parameter
- Dashboard welcome screen showing Role Work Chains + "Run your first workflow" CTA
- Store `selectedRole` on `developers/{uid}` (UI personalization, not purchase)
- Surface Role Work Chains prominently on dashboard
- Upgrade prompt on recurring agents for free-tier users

**Total estimated: 5-7 days.** Critical path: Discovery Agent (Idea 1) should ship first.

### Cross-Idea Sequencing

| Week | Idea 1 (Discovery Agent) | Idea 2 (Work Chains & Roles) |
|---|---|---|
| Pre-work | Fix 404/405 blockers | Role specs defined (this document) |
| Week 1 | Phase 1: Cloud Function | Phase 1: Data model + seed Firestore |
| Week 2 | Phase 2: Homepage chat UI | Phase 2: Roles page (after Idea 1 UI patterns) |
| Week 3 | Phase 3: Chain-to-signup handoff | Phase 3: Role-aware agent + Phase 4: Onboarding |
| Week 4 | Polish, test full flow | Polish, connect both ideas end-to-end |

Both ideas converge in Week 3 when the discovery agent becomes Role-aware. From that point, the front-page agent is both a standalone conversion tool and the entry point into Roles.
