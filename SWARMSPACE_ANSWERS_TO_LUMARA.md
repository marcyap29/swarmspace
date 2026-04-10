# SwarmSpace Answers to LUMARA Questions

**Date:** 2026-04-10
**In response to:** LUMARA Questions v1.0.0

---

## Migration Order: Confirmed

We agree with LUMARA's proposed migration order. SwarmSpace will **not** strip the 14 duplicates until LUMARA confirms it's calling `swarmspace:` codebase versions for the 6 SwarmSpace-owned functions.

---

## Answers

### 1. Manifest Endpoint Enhancement

**Answer: Extend `swarmspacePluginCatalog`, don't create a separate endpoint.**

We'll add these fields to the catalog response:

```json
{
  "plugins": [
    {
      "id": "brave-search",
      "description": "...",
      "tiers": ["free", "standard", "premium"],
      "owner": "swarmspace",
      "author": { "name": "Orbital AI", "type": "first-party" },
      "pricing": { "model": "included", "cost_per_call": null },
      "privacy_data_required": false,
      "capabilities": ["search", "web"],
      "version": "1.0.0",
      "deployed_at": "2026-04-10T00:00:00Z",
      "rate_limits": { "free": 20, "standard": 500, "premium": null }
    }
  ],
  "chains": [...],
  "catalog_version": "2026-04-10T18:00:00Z"
}
```

One endpoint, richer response. The `catalog_version` timestamp lets LUMARA know if anything changed since last poll.

### 2. Planner Agent Integration

**Answer: Hybrid approach — SwarmSpace defines curated chains, planner agent can also compose freely.**

- SwarmSpace will add a `chains` array to the catalog response listing the 12 validated orchestrator workflows (e.g., `/research`, `/competitor`, etc.) with their plugin sequences
- The planner agent CAN compose freely based on plugin capabilities — that's its value
- We will NOT build a `/workflows/validate-chain` endpoint for now. The orchestrator already defines the validated chains. If the planner wants to go off-script, it can call plugins individually via `swarmspaceRouter`
- Future: if developer-submitted chains become a thing, we'll add validation

**Catalog `chains` field format:**
```json
{
  "chains": [
    {
      "route": "/research",
      "name": "Deep Research",
      "plugins": ["brave-search", "wikipedia", "semantic-scholar", "gemini-flash"],
      "description": "Web search + Wikipedia + academic papers, synthesized by Gemini",
      "endpoint": "https://swarmspace-orchestrator.orbitalai.workers.dev/research"
    }
  ]
}
```

### 3. Developer Plugin Schema

**Answer:**

Developer-submitted plugins will include:
- `name`, `description`, `capabilities` (tag array), `version`
- `author`: developer name, developer_uid, website
- `trust_tier`: `community` or `verified` (no experimental)
- `pricing`: `{ model: "free" | "per_call" | "subscription", cost_per_call: number | null }`
- `privacy_data_required`: boolean (field-level declaration planned)
- `rate_limits`: per-tier limits
- `endpoint`: the plugin's Worker URL
- `is_first_party`: boolean

**Yes**, developer plugins will appear in the same `swarmspacePluginCatalog` response. LUMARA can distinguish first-party from third-party via `author.type` (`"first-party"` vs `"developer"`), or via the `is_first_party` boolean.

### 4. Pricing Integration

**Answer: SwarmSpace handles billing. LUMARA shows cost info from catalog.**

- Pricing per plugin will be in the catalog response (`pricing.cost_per_call`)
- LUMARA's plan review screen can show estimated cost by summing `cost_per_call` for each plugin in the chain
- **SwarmSpace's Stripe Connect** handles developer payouts (80/20 split, 85/15 for Founding Developers)
- LUMARA's existing Stripe handles user subscriptions (Free/Standard/Premium tiers)
- User's subscription tier determines which plugins they can access — credit enforcement stays in `swarmspaceRouter`
- No double billing — user pays their LUMARA subscription, SwarmSpace deducts credits per call, developers get paid from the platform's share

### 5. Push vs Pull for New Capabilities

**Answer: Option (c) — Firestore listener on a `swarmspace_capabilities` doc. Plus keep (a) as fallback.**

We'll implement:
- **Primary:** SwarmSpace writes to a `swarmspace_capabilities` Firestore doc whenever `PLUGIN_REGISTRY` changes. Fields: `catalog_version` (timestamp), `plugin_count`, `last_added_plugin`, `chains_count`. LUMARA listens for changes in real-time.
- **Fallback:** `swarmspacePluginCatalog` pull on app start (keep existing behavior)
- **Not needed now:** FCM push notifications (overkill for plugin updates)

This is lightweight — one Firestore doc write on deploy, LUMARA gets instant awareness.

### 6. Integration Doc Auto-Generation

**Answer: Yes, SwarmSpace agrees. SwarmSpace generates the canonical version.**

SwarmSpace owns the plugin ecosystem, so it's the source of truth for:
- Plugin list, capabilities, pricing
- Chain definitions
- Function ownership

**Proposal:** Add a `swarmspaceIntegrationManifest` Cloud Function (or extend `swarmspacePluginCatalog`) that returns the full integration state as JSON. Both repos can consume this to auto-generate their local `LUMARA_SWARMSPACE_FUNCTIONS_INTEGRATION.md`.

We'll add this to the backlog. Low priority — the manual doc works for now.

### 7. Planned New Functions — Timeline

| Function | Expected | LUMARA Impact |
|----------|----------|---------------|
| `swarmspaceDiscoveryAgent` | Next sprint | LUMARA needs: homepage chat UI integration |
| `swarmspacePackageCatalog` | After discovery agent | LUMARA needs: package browsing UI, onboarding flow |
| `swarmspaceSubmissionReview` | After developer portal ships | LUMARA needs: nothing (admin-only) |
| Developer plugin proxies | Ongoing after Founding Developer programme | LUMARA needs: catalog UI for browsing/searching, pricing display |

**Blocking dependency:** The 7 plugin workers and orchestrator were deployed today (April 10). Discovery agent is next in the backlog. We'll update the integration doc when each ships.

LUMARA should plan for:
1. **Near-term:** Catalog UI that handles growing plugin list (filtering, search, categories)
2. **Mid-term:** Price display in plan review screen
3. **Later:** Package browsing, developer profiles

### 8. Testing Coordination

**Answer: Production only, for now.** No staging environment exists.

- All Cloudflare Workers deploy to `*.orbitalai.workers.dev` (production)
- Firebase functions deploy to `arc-epi` (production)
- SwarmSpace can test individual plugins via direct POST to their Worker URLs before connecting them to the orchestrator
- For coordinated changes, we'll flag in the integration doc and give LUMARA a heads-up

**Future:** If we need staging, Cloudflare supports preview deployments (`wrangler deploy --env staging`). We'd create `swarmspace-plugin-*-staging.orbitalai.workers.dev` endpoints. Not worth the overhead yet.

---

## SwarmSpace's Current State (for LUMARA's reference)

- Branch: `main`
- Deployed today (April 10, 2026):
  - 7 new plugin workers (nominatim, rest-countries, github-public, hackernews, dictionary-api, jina-reader, pubmed)
  - Orchestrator redeployed (405 fix)
  - Firebase functions redeployed (PRISM consent enforcement activated)
- Documentation honesty pass completed (security.html, prism.html, DEVELOPER_GUIDE.md, OWASP_AST10_COMPLIANCE.md)
- Total live plugin workers: 14+
- Total orchestrator routes: 12
- swarmspacePluginCatalog: live, returning current plugin list
- PRISM: consent blocking now active (was logging-only before today)

---

*Share this with LUMARA. We'll update LUMARA_SWARMSPACE_FUNCTIONS_INTEGRATION.md as the answers above get implemented.*
