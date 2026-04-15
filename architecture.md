# SwarmSpace: Architecture & Technical Reference
*Orbital AI — Internal Technical Reference | v1.4.1, April 2026*

---

## 1. Plugin Format — What a "Plugin" Actually Is

**Short answer: Cloudflare Worker wrapping a third-party API + JSON manifest. Nothing installs on user devices. Ever.**

Plugins in SwarmSpace are not executables, packages, or locally-installed software. Each plugin is:

1. **A Cloudflare Worker** — hosted at `swarmspace-plugin-{plugin_id}.orbitalai.workers.dev`, wrapping a third-party API
2. **A JSON manifest** — describes the plugin in a format any LLM can parse (`swarmstore-manifest.json`)

When a plugin is invoked, the Firebase Cloud Function (`swarmspaceRouter`) forwards the request to the appropriate Cloudflare Worker, which calls the underlying third-party API and returns the result. SwarmSpace authenticates inter-service calls via a shared secret (`SWARMSPACE_INTERNAL_TOKEN`).

### Manifest Format: `swarmstore-manifest.json`

```json
{
  "schema_version": "1.0",
  "id": "brave-search",
  "name": "Privacy-focused web search",
  "version": "1.0.0",
  "capability": "Natural language description of what this plugin does. Primary semantic search target.",
  "trust_tier": "community|verified",
  "endpoint": "https://swarmspace-plugin-brave-search.orbitalai.workers.dev",
  "health_endpoint": "https://swarmspace-plugin-brave-search.orbitalai.workers.dev/health",
  "pricing": {
    "model": "included|per_call|subscription",
    "cost_per_call": null
  },
  "privacy_data_required": [],
  "privacyTier": "ANONYMOUS|USER_CONTENT|STRUCTURED_PERSONAL",
  "dataTypes": ["public_data"],
  "auth_method": "api_key|none",
  "tags": ["web_search", "general"],
  "owner": "swarmspace",
  "developer": {
    "name": "Orbital AI",
    "type": "first-party"
  },
  "rateLimits": { "free": 20, "standard": 500, "premium": 500 },
  "deployed_at": "2026-03-01T00:00:00Z"
}
```

> **Note:** Plugin IDs use slug format (e.g., `brave-search`), not reverse-domain notation. The `privacy_data_required` field is a string array of dot-notation CHRONICLE field names (e.g. `["user.location"]`, `["user.display_name", "user.email"]`), not a boolean. Use `[]` to indicate no personal data is required. The `privacyTier` field gates PRISM consent enforcement at runtime (see Section 5). The `dataTypes` field declares the categories of data the plugin processes. The `owner` field distinguishes first-party (`swarmspace`) from developer-submitted (`developer`) plugins. The `rateLimits` field sets per-tier daily call ceilings.

#### Planned AST10 Manifest Fields (not yet implemented)

These fields are designed but not yet enforced. They will be added to the manifest schema as enforcement is built:

- **`network_permissions`** (AST03): Domain allowlist/denylist for outbound network access
- **`content_hash`** (AST01/AST02): SHA-256 hash of manifest content for integrity verification
- **`scan_status`** (AST08): Behavioral/semantic scan results
- **`risk_tier`** (AST09): `L0`=safe through `L3`=destructive, gates trust tier access
- **`deny_write`** (AST03): Write protection for identity, memory, and context files
- **`version_pinning`** (AST07): Dependency hash for update drift detection

**Why JSON, not YAML?**
- JSON is natively parseable by every language without dependencies
- Fewer ambiguity edge cases (YAML has several)
- Direct compatibility with OpenAPI specs
- LLMs handle JSON schemas extremely well

---

## 2. Hosting & Infrastructure

### Frontend — Vercel

Static HTML pages deployed on Vercel with URL rewrites configured in `vercel.json`:

| Page | Purpose |
|---|---|
| `index.html` | Landing page |
| `signup.html` | Account creation |
| `dashboard.html` | User dashboard |
| `marketplace.html` | Plugin discovery and browsing |
| `upgrade.html` | Plan upgrade / pricing |
| `thankyou.html` | Post-checkout confirmation |
| `faq.html` | Frequently asked questions |
| `reset-password.html` | Password reset flow |
| `submit.html` | Simple plugin idea submission |
| `submit-plugin.html` | Full manifest-style developer submission with extended fields, status dashboard, resubmission flow |
| `admin-submissions.html` | Admin review of submitted plugins (allowlisted reviewers) |
| `security.html` | OWASP Agentic Top 10 mapping, trust architecture, PRISM overview |
| `prism.html` | PRISM context minimization reference |
| `privacy.html` | Public privacy policy |
| `ast10.html` | OWASP Agentic Security Top 10 compliance posture |
| `founding-developers.html` | Founding Developer Programme landing page |
| `developer-guide.html` | Styled HTML developer guide for plugin authors |
| `earnings.html` | Developer earnings (planned) |

### Authentication — Firebase Auth

- Providers: Google OAuth, GitHub OAuth, email/password
- User documents stored in Firestore `users/{uid}` collection
- Fields: `email`, `plan`, `isPremium`, `api_key`, `createdAt`, `callsToday`, `callsReset`
- Developer documents stored in `developers/{uid}` with `isFoundingDeveloper`, `foundingDeveloperSlot`, etc.

### API Layer — Firebase Cloud Functions

SwarmSpace-owned functions (deployed to `us-central1-arc-epi` under `swarmspace` codebase label):

| Function | Type | Purpose | Timeout |
|---|---|---|---|
| `swarmspaceRouter` | onCall | Main plugin invocation; merges built-in + developer plugins (5-min TTL cache); PRISM consent gating; context field filtering | 25s |
| `swarmspacePluginStatus` | onCall | Plugin availability check for a user | 10s |
| `swarmspacePluginCatalog` | onCall | Enriched plugin/chain discovery for LUMARA (includes chains, pricing, capabilities) | 10s |
| `swarmspaceWriteCapabilities` | onCall | Admin: writes capabilities doc to Firestore for real-time sync | 10s |
| `validatePluginSubmission` | onCall | V2 automated validation pipeline: schema, SSRF, duplicates, latency profiling, security headers, manifest validation, prompt injection probes | 120s |
| `onSubmissionStatusChange` | Firestore trigger | Promotes/demotes plugins on status change; writes/deletes from `approved_plugins` | — |
| `newsDataInvoke` | onCall | Invoke NewsData.io API | 10s |
| `visionOcrInvoke` | onCall | Invoke Vision OCR | 10s |
| `updateUserModelConfig` | onCall | Update user LLM model preferences | 10s |
| `swarmspaceDiscoveryAgent` | onRequest | Unauthenticated NL plugin/workflow discovery (public, IP rate limited, 3-turn sessions) | 30s |
| `swarmspaceClaimFoundingSpot` | onCall | Atomic founding developer slot claim | 10s |

`swarmspaceRouter` URL: `https://us-central1-arc-epi.cloudfunctions.net/swarmspaceRouter`

Flow: validates Firebase ID token, resolves user tier from Firestore, enforces rate limits and tier access, applies PRISM consent gating and context field filtering, then forwards the request to the appropriate Cloudflare Worker.

### Plugin Workers — Cloudflare Workers

Each plugin runs as a Cloudflare Worker at `swarmspace-plugin-{plugin_id}.orbitalai.workers.dev`. Workers wrap third-party APIs and are authenticated via the shared secret `SWARMSPACE_INTERNAL_TOKEN`.

### Orchestrator — Cloudflare Worker

The orchestrator (`swarmspace-orchestrator.orbitalai.workers.dev`) chains multiple free-tier plugin calls then synthesizes results through `gemini-flash`. It authenticates to `swarmspaceRouter` using `SWARMSPACE_INTERNAL_TOKEN`. 12 workflow routes are defined (see Section 6). The same chain definitions are mirrored as `CHAIN_DEFINITIONS` in `swarmspaceRouter.ts` for catalog enrichment.

### Payments — Stripe via Vercel Edge Functions

| Endpoint | Purpose |
|---|---|
| `api/create-checkout.js` | Creates Stripe checkout sessions |
| `api/stripe-webhook.js` | Handles subscription lifecycle events (upgrades, downgrades, cancellations) |

### Data — Firestore Collections

| Collection | Purpose | Key Fields |
|---|---|---|
| `users/{uid}` | User profile, plan, API key, call tracking | `email`, `plan`, `isPremium`, `api_key`, `createdAt`, `callsToday`, `callsReset` |
| `developers/{uid}` | Developer profiles, founding dev flags | `isFoundingDeveloper`, `foundingDeveloperSlot`, `foundingDeveloperRevenueShare` |
| `plugin_submissions` | Plugin submission queue from submit-plugin.html | `name`, `category`, `description`, `trustTier`, `pricingModel`, `manifestUrl`, `authMethod`, `website`, `tags`, `submittedBy`, `status`, `access_tier`, `capabilities`, `example_query`, `version`, `rate_limits` |
| `approved_plugins` | Developer plugin manifests (PluginConfig shape); written by `onSubmissionStatusChange` | `plugin_id`, `endpoint`, `capabilities`, `source`, `access_tier`, `privacyTier`, `dataTypes`, `owner`, `author` |
| `swarmspace_usage` | Per-user daily call quota tracking | `uid`, `date`, `count` |
| `plugin_activity_log` | PRISM activity logging for every plugin call | `privacy_required`, `consent_given`, `data_fields_sent`, `plugin_id`, `uid` |
| `swarmspace_capabilities` | Capabilities doc for LUMARA real-time sync | (single document) |
| `founding_programme/meta` | Founding developer programme configuration | `totalSlots`, `claimedSlots`, `isOpen` |
| `discovery_rate_limits` | Discovery agent IP rate limit tracking | `ip_hash`, `count`, `window_start` |
| `discovery_sessions` | Discovery agent multi-turn session state | `session_id`, `messages`, `created_at`, `expires_at` |

---

## 3. Plugin Registry — 22 Plugins Across 3 Tiers

### Free Tier (15 plugins)
`gemini-flash`, `brave-search`, `semantic-scholar`, `weather`, `wikipedia`, `currency`, `news`, `arxiv`, `pubmed`, `nominatim`, `rest-countries`, `github-public`, `hackernews`, `dictionary-api`, `jina-reader`

### Standard Tier (5 plugins)
`vision-ocr`, `url-reader`, `media-upload`, `tavily-search`, `social-publisher`

### Premium Tier (2 plugins)
`exa-search`, `perplexity-sonar`

> **Note:** Plugin IDs use slug format. The orchestrator uses internal aliases for some plugins: `newsapi` → `news`, `exchange-rates` → `currency`, `open-meteo` → `weather`. The canonical IDs above match `PLUGIN_REGISTRY` in `swarmspaceRouter.ts`.

### Privacy Tier Distribution

| Privacy Tier | Plugins | Consent Required |
|---|---|---|
| `ANONYMOUS` | brave-search, semantic-scholar, weather, wikipedia, currency, news, arxiv, pubmed, nominatim, rest-countries, github-public, hackernews, dictionary-api | No |
| `USER_CONTENT` | gemini-flash, jina-reader, url-reader, tavily-search, exa-search, perplexity-sonar | Yes |
| `STRUCTURED_PERSONAL` | vision-ocr, media-upload, social-publisher | Yes |

### Pricing Plans

| Plan | Price | Access | Limits |
|---|---|---|---|
| Free | $0/mo | 15 free-tier APIs | 20 calls/day |
| SwarmSpace Pro | $30/mo | 22 APIs including standard tier | 500 calls/day |
| LUMARA Premium | $20/mo | Full bundle including CHRONICLE personalisation | 500 calls/day |
| Developer Pro | $0/mo | Full access for active publishers | Requires 1+ published plugin |

---

## 4. Security Protocols

SwarmSpace is a trust layer for an ecosystem of AI agent capabilities. Security is the core value proposition.

### 4.1 Manifest Signing (Verified Tier) — Planned

> **Status: Designed, not implemented.** No Ed25519 signing code exists in the codebase. This is planned for when the platform accepts third-party Verified tier submissions.

Verified tier plugins will have cryptographically signed manifests using Ed25519. Any manifest modification will invalidate the signature.

### 4.2 Plugin Submission Security (v2 Pipeline)

The `validatePluginSubmission` function runs a 7-stage automated validation pipeline (120s timeout, 90s budget):

1. **Schema validation**: plugin_name, plugin_id (regex), description, category, endpoint_url (HTTPS), pricing_model, auth_method, tags/semantic_tags, access_tier, capabilities, example_query, version (semver), rate_limits
2. **Duplicate detection**: queries `plugin_submissions` for matching endpoint_url or name (case-insensitive) in pending/approved states
3. **Endpoint latency profiling**: 3 sequential POST requests to `{endpoint_url}/invoke`, p50/p95 measurement, response structure validation, latency class classification
4. **Security header audit**: 6-check weighted score (HSTS, X-Content-Type-Options, Content-Type, X-Frame-Options, CSP, HTTPS) scored out of 100
5. **Manifest fetch + JSON Schema validation**: fetches `manifest_url`, validates required fields, validates against Ajv JSON Schema (draft-07)
6. **Network domain DNS validation**: resolves declared domains, blocks private IP addresses (SSRF protection via `isPrivateUrl()`)
7. **Prompt injection probes**: 7 adversarial queries (system_prompt_leak, instruction_override, role_confusion, data_exfil_attempt, sql_injection_basic, xss_probe, path_traversal), flags responses containing indicator strings

Additional submission constraints:
- **Rate limiting**: max 10 submissions/day per developer account
- **No executable uploads**: SwarmSpace never accepts file uploads — manifest only
- **SSRF protection**: `isPrivateUrl()` blocks private/internal IPs (IPv4 and IPv6), carrier-grade NAT ranges, redirect chains

### 4.3 Runtime Security

The `swarmspaceRouter` function enforces:

- Firebase ID token validation on every request
- Tier-based access control (free users cannot invoke standard/premium plugins)
- Per-user daily call limits tracked in Firestore (`swarmspace_usage` collection)
- Inter-service authentication via `SWARMSPACE_INTERNAL_TOKEN` for Cloudflare Worker calls
- Request timeouts (25s for plugin invocation, 10s for status checks)
- **PRISM consent gating** — blocks requests for non-ANONYMOUS plugins when `_prism_consent` is not provided (see Section 5)
- **Context field filtering** — strips undeclared request parameters before forwarding to workers (see Section 5)

### 4.4 Prompt Injection Defense

Plugins can potentially be used as a vector for prompt injection attacks. Mitigations:

- Plugin outputs are treated as untrusted data, not as instructions
- LUMARA wraps plugin results in explicit context before presenting to the LLM
- **v2 validation pipeline includes 7 prompt injection probes** at submission time
- Output schema validation and prompt injection resistance testing are planned for Verified tier

### 4.5 Trust Revocation

```
If a plugin is found to be malicious or compromised:
  1. Admin rejects the plugin in admin-submissions.html
  2. onSubmissionStatusChange trigger fires (approved → rejected)
  3. Plugin is deleted from approved_plugins collection
  4. swarmspaceRouter stops serving the plugin within 5 min (TTL cache expiry)
  5. No uninstall action required from users (nothing was installed)
```

---

## 5. PRISM — Privacy & Consent Enforcement

PRISM (Privacy-Respecting Inference Service Management) is the runtime consent and data-minimization layer enforced by `swarmspaceRouter`. It ensures plugins only receive the data they declare, and users explicitly consent before sensitive data leaves the platform.

### Privacy Tiers

| Tier | Meaning | Consent Required | Example Plugins |
|---|---|---|---|
| `ANONYMOUS` | No personal data required | No | brave-search, wikipedia, weather |
| `USER_CONTENT` | User-provided text/URLs required | Yes | gemini-flash, jina-reader, tavily-search |
| `STRUCTURED_PERSONAL` | Personal files, images, or identity data required | Yes | vision-ocr, media-upload, social-publisher |

### Consent Gating

When a plugin has `privacyTier` other than `ANONYMOUS`, the client must pass `_prism_consent: true` in the request parameters. If consent is not provided, the router blocks the call with error code `PRISM_CONSENT_REQUIRED`.

### Context Field Filtering

Before forwarding a request to a Cloudflare Worker, the router:

1. Reads `privacy_data_required` from the plugin config (declared fields)
2. Builds an allowlist of declared fields + system keys (`query`, `limit`, `count`, `mode`, etc.)
3. Strips any parameter key not in the allowlist
4. Logs `fields_stripped` to the PRISM activity log

This prevents undeclared data from leaking to plugin workers.

### Activity Logging

Every plugin invocation (success, error, or blocked) writes to `plugin_activity_log`:

- `privacy_required` — the plugin's privacy tier
- `consent_given` — whether consent was provided
- `data_fields_sent` — which data fields were included
- `plugin_id`, `uid`, `timestamp`

PRISM transaction logs include `pre_invoke` phase records with `privacy_tier`, `privacy_data_required`, `consent_given`, `fields_kept`, and `fields_stripped`.

---

## 6. Orchestrator & Workflow Chains

The orchestrator is a Cloudflare Worker (`swarmspace-orchestrator`) that chains multiple free-tier plugin calls and synthesizes results through `gemini-flash`. It calls `swarmspaceRouter` with `SWARMSPACE_INTERNAL_TOKEN` for each step in the chain.

### 12 Workflow Routes

| Route | Chain |
|---|---|
| POST `/research` | brave-search + wikipedia + semantic-scholar → gemini-flash |
| POST `/competitor` | brave-search + news + hackernews → gemini-flash |
| POST `/marketing` | brave-search + news → gemini-flash |
| POST `/plugins` | brave-search + github-public → gemini-flash |
| POST `/academic` | semantic-scholar + arxiv + pubmed → gemini-flash |
| POST `/news-brief` | news + hackernews + brave-search → gemini-flash |
| POST `/market-scan` | brave-search + news + currency → gemini-flash |
| POST `/location-brief` | nominatim + weather + rest-countries + wikipedia → gemini-flash |
| POST `/health-research` | pubmed + semantic-scholar + wikipedia → gemini-flash |
| POST `/tech-scout` | github-public + hackernews + brave-search + arxiv → gemini-flash |
| POST `/fact-check` | brave-search + wikipedia + semantic-scholar + dictionary-api → gemini-flash |
| POST `/content-brief` | brave-search + wikipedia + news → gemini-flash |

> **Note:** `news` is a Firebase function (`newsDataInvoke`), not a Cloudflare Worker. `weather` = `swarmspace-plugin-weather`, `currency` = `swarmspace-plugin-currency`. The chain definitions are mirrored in `swarmspaceRouter.ts` as `CHAIN_DEFINITIONS` for catalog enrichment via `swarmspacePluginCatalog`.

### Planned Execution Modes

Not yet implemented. Must land before Work Chain chaining and Durable Objects dispatch:

- **`plan`** — full chain proposal, no execution until confirmation
- **`auto`** — headless dispatch for Durable Objects/scheduler runs; destructive plugins auto-deny
- **`bubble`** — child plugins inherit parent chain authorization
- **`interactive`** — per-plugin approval for gap discovery

---

## 7. Discovery Agent

`swarmspaceDiscoveryAgent` is an **unauthenticated** `onRequest` function providing natural-language plugin and workflow discovery. It powers the homepage chat UI.

- **Model**: Gemini 3 Flash Preview (`gemini-3-flash-preview`) with JSON response mode
- **Rate limiting**: 10 requests/hour per IP (SHA-256 hashed), tracked in `discovery_rate_limits`
- **Sessions**: Multi-turn (max 3 turns), stored in `discovery_sessions` with 30-min TTL
- **System prompt**: Embeds full `PLUGIN_CATALOGUE` (20+ plugins) and `CHAIN_CATALOGUE` (12 workflows)
- **Response schema**: `{intent, suggested_chain, alternatives, cta, session_id, turns_remaining, rate_limit_remaining}`
- **Signup gate**: After 3 turns, returns `signup_gate: true` directing to `/signup.html`
- **Chain-to-signup handoff**: Discovery chain context preserved through auth flow to dashboard

---

## 8. Founding Developer Programme

`swarmspaceClaimFoundingSpot` implements an atomic slot-claim system for the founding developer programme:

- **100 total slots** (configured in `founding_programme/meta` Firestore document)
- **85% revenue share** for founding developers (vs 80% standard)
- **Atomic claim**: Uses Firestore `runTransaction` to prevent double-claims
- **Checks**: programme is open, slots remain, user hasn't already claimed
- **On success**: writes `isFoundingDeveloper: true`, `foundingDeveloperSlot`, `foundingDeveloperJoinedAt`, `foundingDeveloperRevenueShare: 85` to `developers/{userId}`
- **Landing page**: `founding-developers.html`

---

## 9. Plugin Promotion Pipeline

Developer-submitted plugins follow a structured path from submission to live availability:

```
Developer submits via submit-plugin.html
  → validatePluginSubmission v2 (7-stage pipeline: schema, duplicates, latency, security headers, manifest, DNS, prompt injection)
  → Writes to plugin_submissions collection (status: "pending")
  → Admin reviews in admin-submissions.html
  → Admin approves → updates status to "approved"
  → onSubmissionStatusChange trigger fires
  → Builds PluginConfig, writes to approved_plugins/{plugin_id}
  → swarmspaceRouter loads approved_plugins (5-min TTL cache)
  → Developer plugin is live in catalog and dispatch
```

### State Transitions

```
pending → approved | rejected | needs-info
needs-info → approved | rejected
approved → rejected (revocation)
```

### Revocation

When an approved plugin is rejected, `onSubmissionStatusChange` deletes it from `approved_plugins/{plugin_id}`. The router stops serving it within 5 minutes (TTL cache expiry).

### Key Constraints

- **`approved_plugins` contains manifests only, not executable code.** The collection stores PluginConfig objects describing the plugin's endpoint, capabilities, and metadata.
- **Developer must deploy their own Cloudflare Worker** at the declared endpoint. SwarmSpace validates reachability during submission but does not host developer code.
- **Router merge order:** `{ ...devPlugins, ...PLUGIN_REGISTRY }` — first-party plugins always win on ID collision. Developer plugins carry `source: "developer"` to distinguish them from built-in plugins.
- **Privacy tier derivation**: On promotion, `privacyTier` is derived from `privacy_data_required` — empty array → `anonymous`, contains personal items → `structured_personal`, otherwise → `user_content`.
- **Idempotent promotion**: If `approved_plugins/{pluginId}` already exists, the trigger skips the write.

### Resubmission

Developers with `rejected` or `needs-info` status can resubmit through `submit-plugin.html`, updating their existing submission document.

---

## 10. Architecture Diagram

```
[User / LUMARA Client]
      |
      | HTTPS
      ↓
[Vercel — Static Pages]                    [Firebase Auth]
  index.html, dashboard.html,          ←→   Google OAuth
  marketplace.html, submit-plugin.html,      GitHub OAuth
  security.html, founding-developers.html,   Email/Password
  (18 pages total)
      |
      | (API calls with Firebase ID token)
      ↓
[Firebase Cloud Functions]
  swarmspaceRouter (25s) — PRISM consent gating, context filtering
  swarmspacePluginStatus (10s)
  swarmspacePluginCatalog (10s) — chains + pricing + capabilities
  validatePluginSubmission (120s) — v2 7-stage pipeline
  onSubmissionStatusChange — Firestore trigger
  swarmspaceDiscoveryAgent (onRequest, public) — NL discovery
  swarmspaceClaimFoundingSpot — founding dev slot claim
  newsDataInvoke, visionOcrInvoke, updateUserModelConfig
      |
      | 1. Validate Firebase ID token
      | 2. Resolve user tier from Firestore
      | 3. Enforce rate limits & tier access
      | 4. PRISM: consent check + context field filtering
      | 5. Forward request with SWARMSPACE_INTERNAL_TOKEN
      ↓
[Cloudflare Workers]
  Plugin Workers: swarmspace-plugin-{id}.orbitalai.workers.dev
  Orchestrator: swarmspace-orchestrator.orbitalai.workers.dev
      |
      | Authenticated third-party API call
      ↓
[Third-Party APIs]
  Brave, Tavily, Exa, Perplexity,
  Gemini, Groq, PubMed, arXiv, etc.

[Stripe] ←→ [Vercel Edge Functions]
                api/create-checkout.js
                api/stripe-webhook.js
                      ↓
               [Firestore — users/{uid}]
               Updates plan, isPremium

[Firestore Collections]
  users, developers, plugin_submissions, approved_plugins,
  swarmspace_usage, plugin_activity_log, swarmspace_capabilities,
  founding_programme, discovery_rate_limits, discovery_sessions
```

### LUMARA Integration

LUMARA is the primary consumer of SwarmSpace. The `SwarmSpaceClient` (Flutter) calls `swarmspaceRouter` with a Firebase ID token. Tier-aware plugin routing determines which plugins are available:

| User Tier | Search Plugins | Notes |
|---|---|---|
| Free | brave-search, wikipedia | Basic web + reference |
| Standard | tavily-search, brave-search | Enhanced search quality |
| Premium | exa-search, tavily-search | Full neural search stack |

`swarmspacePluginCatalog` provides the enriched discovery channel — LUMARA calls it to get the current list of available plugins, tiers, capabilities, chains, and pricing.

---

## 11. Current State

- **22 plugins live** across free (15), standard (5), and premium (2) tiers
- **12 orchestrator workflows** chaining plugins into curated multi-step routes
- **Firebase + Vercel + Cloudflare** stack fully deployed and operational
- **LUMARA integration** active as primary consumer with tier-aware routing and enriched catalog (chains, pricing, capabilities)
- **Stripe billing** handling subscriptions for Pro and LUMARA Premium plans
- **Plugin submission pipeline** accepting community submissions via `submit-plugin.html` with admin review at `admin-submissions.html`
- **Plugin promotion pipeline** live — approved submissions automatically promoted to `approved_plugins` via `onSubmissionStatusChange` trigger and merged into router dispatch
- **PRISM consent enforcement** active — context field filtering, consent gating, activity logging
- **validatePluginSubmission v2** live — 7-stage automated validation with latency profiling, security headers, DNS checks, and prompt injection probes
- **Discovery Agent** live — unauthenticated NL plugin/workflow discovery, 3-turn sessions, signup gate
- **Founding Developer Programme** live — 100 slots, 85% revenue share, atomic claims
- **10 Firestore collections** supporting users, developers, submissions, approvals, usage tracking, activity logging, capabilities sync, and programme management
- **Ed25519 signing** designed for Verified tier manifests (not yet implemented)
- **Orchestrator execution modes** (plan/auto/bubble/interactive) planned, not yet implemented
- **Durable Objects** for recurring agent runtime — planned, depends on execution modes

---

*SwarmSpace. The trust layer between agents and capabilities.*