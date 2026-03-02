# SwarmSpace API Context Report

**Purpose:** Reference for Cursor when working with SwarmSpace integration. Add API keys yourself — never commit them.

---

## Overview

SwarmSpace is the plugin layer used by LUMARA for web search, URL fetching, and other external APIs. Requests go through Firebase Cloud Functions, which validate auth and forward to Cloudflare Workers. Each worker wraps a third‑party API (Brave, Tavily, Wikipedia, etc.).

---

## Exact APIs & Endpoints

### 1. `swarmspaceRouter` — Main Plugin Invocation

**URL:** `https://us-central1-arc-epi.cloudfunctions.net/swarmspaceRouter`  
**Method:** POST (Firebase callable — use `Authorization: Bearer <firebaseIdToken>`)  
**Timeout:** 25 seconds

**Request body (wrapped in `data` for callable):**
```json
{
  "data": {
    "plugin_id": "<plugin_id>",
    "params": { ... }
  }
}
```

**Response:** Plugin-specific. Often includes `quota` object:
```json
{
  "result": {
    "quota": {
      "limit": 100,
      "used": 42,
      "remaining": 58,
      "resets_at": "2026-03-01T00:00:00Z"
    },
    ...
  }
}
```

**Error codes:** `invalid-argument`, `not-found`, `permission-denied`, `resource-exhausted` (429), `unavailable`, `internal`

---

### 2. `swarmspacePluginStatus` — Plugin Availability Check

**URL:** `https://us-central1-arc-epi.cloudfunctions.net/swarmspacePluginStatus`  
**Method:** POST  
**Auth:** Same as above (Firebase ID token)  
**Timeout:** 10 seconds  
**Quota:** None consumed

**Request body:**
```json
{
  "data": {
    "plugin_id": "<plugin_id>"
  }
}
```

**Response:**
```json
{
  "result": {
    "available": true,
    "plugin_id": "brave-search",
    "user_tier": "free",
    "required_tier": "free",
    "reason": null,
    "upgrade_url": null
  }
}
```

When unavailable: `available: false`, `reason: "unknown_plugin"` or `"tier_insufficient"`, `upgrade_url` set.

---

## Plugin Registry (from swarmspaceRouter.ts)

### Free tier (7 plugins)

| plugin_id | Description | Example query |
|-----------|-------------|---------------|
| `gemini-flash` | Fast AI synthesis for writing and drafting | "Draft a LinkedIn post about my latest project" |
| `brave-search` | Privacy-focused web search | "What are the latest developments in AI?" |
| `semantic-scholar` | Academic paper and citation search | "Find papers on transformer architectures" |
| `weather` | Current weather and forecasts | "What's the weather in San Francisco?" |
| `wikipedia` | Wikipedia knowledge base | "Who invented the transistor?" |
| `currency` | Currency exchange rates | "What is EUR to USD right now?" |
| `news` | Latest news and headlines (NewsData.io) | "Top tech news today" |

**Worker URLs:** `swarmspace-plugin-{plugin_id}.orbitalai.workers.dev`

### Paid tiers

- **Standard ($30/mo):** `url-reader` (fetch page content), `tavily-search` (AI-optimized search)
- **Premium:** `exa-search` (neural search), `perplexity-sonar` (Perplexity)

---

## Plugin Request Schemas (from code usage)

### brave-search
```json
{
  "query": "string",
  "count": 8
}
```
**Response shape:** `web.results` or `results` array of `{ title, description, url }`

### tavily-search
```json
{
  "query": "string",
  "max_results": 8,
  "include_answer": true,
  "search_depth": "basic"
}
```
**Response:** `answer` (string), `results` array of `{ title, content, url, published_date }`

### wikipedia
```json
{
  "query": "string",
  "mode": "search",
  "limit": 3
}
```
**Response:** `results` array of `{ title, snippet, url }`

### url-reader (standard tier)
```json
{
  "url": "string",
  "summarize": false,
  "max_length": 6000,
  "include_metadata": true
}
```
**Response:** `extracted.text`, `metadata.title`

---

## Client Usage (Flutter)

- **SwarmSpaceClient** (`lib/services/swarmspace/swarmspace_client.dart`) — singleton, direct HTTP POST + manual ID token.
- **SwarmSpaceWebSearchTool** (`lib/lumara/agents/research/swarmspace_web_search_tool.dart`) — implements `WebSearchTool`; tier routing: free → brave + wikipedia, standard → tavily + brave fallback, premium → exa + tavily fallback. Uses `url-reader` for `fetchPage()`.
- **Used by:** `lumara_assistant_cubit.dart` → Research Agent.

---

## Backend (Firebase)

- **Router:** `functions/src/functions/swarmspaceRouter.ts`
- **Secrets:** `SWARMSPACE_INTERNAL_TOKEN` — shared secret with Cloudflare workers. Set via:
  ```bash
  firebase functions:secrets:set SWARMSPACE_INTERNAL_TOKEN
  ```
- **Tier mapping:** Firestore `user.plan` + `isPremium` → `free` | `standard` | `premium`. `pro` → `standard`.

---

## API Keys (You Add These)

These are consumed by the Cloudflare workers, not by the Firebase functions. Configure them in your Cloudflare Worker / SwarmSpace deployment:

- **Brave Search API** — used by brave-search worker
- **Tavily API** — used by tavily-search worker
- **Exa API** — used by exa-search worker
- **Perplexity API** — used by perplexity-sonar worker
- **Semantic Scholar** — used by semantic-scholar worker
- Others as needed for weather, currency, news, url-reader

Worker URLs live under `orbitalai.workers.dev`. You deploy those separately; the router only forwards requests with `SWARMSPACE_INTERNAL_TOKEN` and user headers.
