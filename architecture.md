# SwarmSpace: Architecture & Technical Reference
*Orbital AI — Internal Technical Reference | March 2026*

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
  "privacy_data_required": false,
  "auth_method": "api_key|none",
  "tags": ["web_search", "general"],
  "developer": {
    "name": "Orbital AI",
    "type": "first-party"
  },
  "deployed_at": "2026-03-01T00:00:00Z"
}
```

> **Note:** The manifest format above reflects the current implementation. Plugin IDs use slug format (e.g., `brave-search`), not reverse-domain notation. Fields like `network_permissions`, `content_hash`, `scan_status`, `deny_write`, and `version_pinning` are designed for future AST10 compliance but are not yet enforced at runtime. See `Docs/OWASP_AST10_COMPLIANCE.md` for implementation status.

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
| `submit.html` | Plugin submission form |
| `admin-submissions.html` | Admin review of submitted plugins |
| `marketplace.html` | Plugin discovery and browsing |
| `upgrade.html` | Plan upgrade / pricing |
| `thankyou.html` | Post-checkout confirmation |
| `faq.html` | Frequently asked questions |
| `reset-password.html` | Password reset flow |

### Authentication — Firebase Auth

- Providers: Google OAuth, GitHub OAuth, email/password
- User documents stored in Firestore `users/{uid}` collection
- Fields: `email`, `plan`, `isPremium`, `api_key`, `createdAt`, `callsToday`, `callsReset`

### API Layer — Firebase Cloud Functions

| Function | Purpose | Timeout |
|---|---|---|
| `swarmspaceRouter` | Main plugin invocation endpoint | 25s |
| `swarmspacePluginStatus` | Plugin availability check | 10s |
| `swarmspacePluginCatalog` | Enriched plugin/chain discovery for LUMARA | 10s |
| `swarmspaceWriteCapabilities` | Admin: writes capabilities doc for real-time sync | 10s |

`swarmspaceRouter` URL: `https://us-central1-arc-epi.cloudfunctions.net/swarmspaceRouter`

Flow: validates Firebase ID token, resolves user tier from Firestore, enforces rate limits and tier access, then forwards the request to the appropriate Cloudflare Worker.

### Plugin Workers — Cloudflare Workers

Each plugin runs as a Cloudflare Worker at `swarmspace-plugin-{plugin_id}.orbitalai.workers.dev`. Workers wrap third-party APIs and are authenticated via the shared secret `SWARMSPACE_INTERNAL_TOKEN`.

### Payments — Stripe via Vercel Edge Functions

| Endpoint | Purpose |
|---|---|
| `api/create-checkout.js` | Creates Stripe checkout sessions |
| `api/stripe-webhook.js` | Handles subscription lifecycle events (upgrades, downgrades, cancellations) |

### Data — Firestore Collections

| Collection | Purpose | Key Fields |
|---|---|---|
| `users/{uid}` | User profile, plan, API key, call tracking | `email`, `plan`, `isPremium`, `api_key`, `createdAt`, `callsToday`, `callsReset` |
| `submissions` | Plugin submissions from submit.html | `name`, `category`, `description`, `trustTier`, `pricingModel`, `manifestUrl`, `authMethod`, `website`, `tags`, `submittedBy`, `status` |
| `plugins` | Approved/listed plugins | From dashboard submit form |

---

## 3. Plugin Registry — 21 Plugins Across 3 Tiers

### Free Tier (15 plugins)
`gemini-flash`, `brave-search`, `semantic-scholar`, `weather`, `wikipedia`, `currency`, `news`, `arxiv`, `pubmed`, `nominatim`, `rest-countries`, `github-public`, `hackernews`, `dictionary-api`, `jina-reader`

### Standard Tier (4 plugins)
`vision-ocr`, `url-reader`, `media-upload`, `tavily-search`, `social-publisher`

### Premium Tier (2 plugins)
`exa-search`, `perplexity-sonar`

> **Note:** Plugin IDs use slug format. The orchestrator uses internal aliases for some plugins: `newsapi` → `news`, `exchange-rates` → `currency`, `open-meteo` → `weather`. The canonical IDs above match `PLUGIN_REGISTRY` in `swarmspaceRouter.ts`.

### Pricing Plans

| Plan | Price | Access | Limits |
|---|---|---|---|
| Free | $0/mo | 15 free-tier APIs | 20 calls/day |
| SwarmSpace Pro | $15/mo | Unlimited standard calls | Monthly credit allocation for premium |
| LUMARA Premium | $20/mo | Full bundle including CHRONICLE personalisation | — |
| Developer Pro | $0/mo | Full access for active publishers | Requires 1+ published plugin |

---

## 4. Security Protocols

SwarmSpace is a trust layer for an ecosystem of AI agent capabilities. Security is the core value proposition.

### 4.1 Manifest Signing (Verified Tier) — Planned

> **Status: Designed, not implemented.** No Ed25519 signing code exists in the codebase. This is planned for when the platform accepts third-party Verified tier submissions.

Verified tier plugins will have cryptographically signed manifests using Ed25519. Any manifest modification will invalidate the signature.

### 4.2 Plugin Submission Security

- **Rate limiting on submissions**: max 10 submissions/day per developer account
- **Schema validation**: manifest must fully conform to JSON schema before entering review queue
- **Endpoint reachability check**: health endpoint must respond 200 before submission accepted
- **Automated static analysis**: the manifest's `capability` and `data_required` fields are checked for inconsistencies by LLM review
- **No executable uploads**: SwarmSpace never accepts file uploads of any kind — manifest only
- **Abuse detection**: duplicate plugin detection, namespace squatting protection

### 4.3 Runtime Security

The `swarmspaceRouter` function enforces:

- Firebase ID token validation on every request
- Tier-based access control (free users cannot invoke standard/premium plugins)
- Per-user daily call limits tracked in Firestore (`callsToday`, `callsReset`)
- Inter-service authentication via `SWARMSPACE_INTERNAL_TOKEN` for Cloudflare Worker calls
- Request timeouts (25s for plugin invocation, 10s for status checks)

### 4.4 Prompt Injection Defense

Plugins can potentially be used as a vector for prompt injection attacks. Mitigations:

- Plugin outputs are treated as untrusted data, not as instructions
- LUMARA wraps plugin results in explicit context before presenting to the LLM
- Output schema validation and prompt injection resistance testing are planned for Verified tier

### 4.5 Trust Revocation

```
If a plugin is found to be malicious or compromised:
  1. SwarmSpace removes plugin from index immediately
  2. Manifest signature is invalidated
  3. Agents checking the index stop seeing the plugin instantly
  4. No uninstall action required from users (nothing was installed)
```

---

## 5. Architecture Diagram

```
[User / LUMARA Client]
      |
      | HTTPS
      ↓
[Vercel — Static Pages]              [Firebase Auth]
  index.html, dashboard.html,    ←→   Google OAuth
  marketplace.html, etc.               GitHub OAuth
      |                                Email/Password
      | (API calls with Firebase ID token)
      ↓
[Firebase Cloud Functions]
  swarmspaceRouter (25s timeout)
  swarmspacePluginStatus (10s timeout)
      |
      | 1. Validate Firebase ID token
      | 2. Resolve user tier from Firestore
      | 3. Enforce rate limits & tier access
      | 4. Forward request with SWARMSPACE_INTERNAL_TOKEN
      ↓
[Cloudflare Workers — Plugin Workers]
  swarmspace-plugin-{id}.orbitalai.workers.dev
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
```

### LUMARA Integration

LUMARA is the primary consumer of SwarmSpace. The `SwarmSpaceClient` (Flutter) calls `swarmspaceRouter` with a Firebase ID token. Tier-aware plugin routing determines which plugins are available:

| User Tier | Search Plugins | Notes |
|---|---|---|
| Free | brave-search, wikipedia | Basic web + reference |
| Standard | tavily-search, brave-search | Enhanced search quality |
| Premium | exa-search, tavily-search | Full neural search stack |

---

## 6. Current State

- **21 plugins live** across free, standard, and premium tiers
- **12 orchestrator workflows** chaining plugins into curated multi-step routes
- **Firebase + Vercel + Cloudflare** stack fully deployed and operational
- **LUMARA integration** active as primary consumer with tier-aware routing and enriched catalog (chains, pricing, capabilities)
- **Stripe billing** handling subscriptions for Pro and LUMARA Premium plans
- **Plugin submission pipeline** accepting community submissions via submit.html with admin review at admin-submissions.html
- **PRISM consent enforcement** active — unconsented privacy-requiring calls are blocked
- **Ed25519 signing** designed for Verified tier manifests (not yet implemented)

---

*SwarmSpace. The trust layer between agents and capabilities.*
