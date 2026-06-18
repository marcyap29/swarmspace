# LUMARA ↔ SwarmSpace Cloud Functions Integration

**Firebase Project:** `arc-epi`
**Last Updated:** April 10, 2026

Both repos deploy to the same Firebase project using separate codebase labels.

---

## Codebase Labels

| Repo | Codebase Label | Deploy Command |
|------|---------------|----------------|
| LUMARA | `default` | `firebase deploy --only functions` (from LUMARA root) |
| SwarmSpace | `swarmspace` | `FUNCTIONS_DISCOVERY_TIMEOUT=60000 firebase deploy --only functions` (from swarmspace root) |

---

## Function Ownership

### SwarmSpace-Owned Functions (codebase: `swarmspace`)

| Function | Purpose | Notes |
|----------|---------|-------|
| `swarmspaceRouter` | Plugin routing, quota enforcement, PRISM privacy | **Canonical version** — 26+ plugins, full quota/PRISM |
| `swarmspacePluginStatus` | Plugin health checks | |
| `swarmspacePluginCatalog` | Plugin/tier discovery | **Sync channel** — LUMARA calls this to discover plugins |
| `newsDataInvoke` | News API proxy plugin | |
| `visionOcrInvoke` | Vision OCR proxy plugin | |
| `updateUserModelConfig` | User LLM settings | Writes to `developers` collection |
| `validatePluginSubmission` | Server-side manifest validation + endpoint reachability check | |
| `swarmspaceWriteCapabilities` | Admin: writes capabilities doc for LUMARA real-time sync | |
| `swarmspaceDiscoveryAgent` | NL plugin/workflow discovery agent | Public `onRequest`, IP rate-limited (10/hr), multi-turn (3 turns), Gemini 3 Flash |
| `swarmspaceClaimFoundingSpot` | Founding Developer Programme slot claim | Authenticated callable, Firestore transaction, 100-slot atomic cap |

### LUMARA-Owned Functions (codebase: `default`)

| Function | Purpose |
|----------|---------|
| `analyzeJournalEntry` | Journal entry analysis |
| `sendChatMessage` | Chat with LUMARA AI |
| `generateJournalPrompts` | AI journal prompts |
| `generateJournalReflection` | Journal reflection |
| `proxyGemini` | Gemini LLM proxy |
| `proxyGroq` | Groq LLM proxy |
| `proxyOllama` | Ollama LLM proxy |
| `unlockThrottle` | Throttle management |
| `lockThrottle` | Throttle management |
| `checkThrottleStatus` | Throttle management |
| `getUserSubscription` | Subscription status |
| `createCheckoutSession` | Stripe checkout |
| `stripeWebhook` | Stripe webhooks |
| `getAssemblyAIToken` | AssemblyAI token |
| `getWisprApiKey` | Wispr API key |
| `createPortalSession` | Stripe billing portal (LUMARA-only) |
| `cleanupTestCustomers` | Dev utility (LUMARA-only) |
| `healthCheck` | Diagnostics (LUMARA-only) |

---

## Planned SwarmSpace Functions

These will be added as the developer ecosystem grows:

| Function | Purpose | Status |
|----------|---------|--------|
| `swarmspacePackageCatalog` | Role catalogue (Work Chain bundles) | Planned |
| `swarmspaceSubmissionReview` | Automated plugin submission pipeline | Planned |

Developer-submitted plugins may also add Firebase functions (those that can't run as Cloudflare Workers).

---

## Cloudflare Workers (SwarmSpace-owned, outside Firebase)

These are not Firebase functions but are part of the SwarmSpace plugin ecosystem:

### Orchestrator
- `swarmspace-orchestrator.orbitalai.workers.dev` — chains plugins into 12 workflow routes

### Plugin Workers (14+ deployed)
| Worker | Status |
|--------|--------|
| `swarmspace-plugin-brave-search` | Live |
| `swarmspace-plugin-semantic-scholar` | Live |
| `swarmspace-plugin-weather` | Live |
| `swarmspace-plugin-wikipedia` | Live |
| `swarmspace-plugin-currency` | Live |
| `swarmspace-plugin-arxiv` | Live |
| `swarmspace-plugin-gemini-flash` | Live |
| `swarmspace-plugin-nominatim` | Live (deployed April 10, 2026) |
| `swarmspace-plugin-rest-countries` | Live (deployed April 10, 2026) |
| `swarmspace-plugin-github-public` | Live (deployed April 10, 2026) |
| `swarmspace-plugin-hackernews` | Live (deployed April 10, 2026) |
| `swarmspace-plugin-dictionary-api` | Live (deployed April 10, 2026) |
| `swarmspace-plugin-jina-reader` | Live (deployed April 10, 2026) |
| `swarmspace-plugin-pubmed` | Live (deployed April 10, 2026) |

### Agent Worker
- `swarmspace-agent-worker.orbitalai.workers.dev` — Plan Agent execution

### Durable Objects
- `swarmspace-durable-object-news-briefing.orbitalai.workers.dev` — recurring news briefings (§5.2). Routes:
  - `POST /durable-objects/news-briefing/create` — create subscription (paid tier; returns `{do_id}`)
  - `POST /durable-objects/news-briefing/cancel` — cancel by `{do_id}` (owner-only)
  - `GET /durable-objects/news-briefing/{do_id}/latest` — fetch last stored delta
  - `POST /durable-objects/news-briefing/{do_id}/run-now` — owner-only manual refresh; runs orchestrator inline, 60s rate limit, returns `{latest_delta, last_run_at, cadence}` (200) / `429 {retry_after_seconds}` / `410 cancelled` / `502 run_failed`

---

## Sync Mechanism

`swarmspacePluginCatalog` is the **live discovery channel**. LUMARA calls it to get the current plugin list, tiers, and capabilities.

When SwarmSpace changes plugins:
1. Update `PLUGIN_REGISTRY` in `functions/src/functions/swarmspaceRouter.ts`
2. Deploy: `FUNCTIONS_DISCOVERY_TIMEOUT=60000 firebase deploy --only functions`
3. `swarmspacePluginCatalog` automatically reflects changes
4. LUMARA discovers updates on next catalog call

For **structural changes** (new functions, ownership transfers), update this file in both repos.

---

## Consolidation Status

The 14 LUMARA-owned functions are currently duplicated in the SwarmSpace repo for historical reasons. The plan is:
- **SwarmSpace strips LUMARA-owned duplicates** from its `functions/src/index.ts`, keeping only the 10 SwarmSpace-owned functions
- **LUMARA removes its stale `swarmspaceRouter`** copy and uses SwarmSpace's canonical version via the `swarmspace` codebase

**Do not consolidate until both repos are aligned on the clean split.**

---

## Shared Secrets (project-level on `arc-epi`)

Both codebases share these secrets:
- `SWARMSPACE_INTERNAL_TOKEN`
- `GEMINI_API_KEY`
- `GROQ_API_KEY`
- `ASSEMBLYAI_API_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `NEWSDATA_API_KEY`
- `WISPR_FLOW_API_KEY`
- `LLM_SETTINGS_ENCRYPTION_KEY`

---

*This file must be kept in sync across both repos. SwarmSpace is the source of truth for plugin/agent functions. LUMARA is the source of truth for core app functions.*
