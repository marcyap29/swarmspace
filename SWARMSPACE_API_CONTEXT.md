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

### 3. `swarmspacePluginCatalog` — Enriched Plugin Catalog

**URL:** `https://us-central1-arc-epi.cloudfunctions.net/swarmspacePluginCatalog`
**Method:** POST (Firebase callable)
**Auth:** Firebase ID token

**Request body:** `{ "data": {} }` (no params required)

**Response:**
```json
{
  "result": {
    "user_tier": "free",
    "catalog_version": "2026-04-10T18:00:00Z",
    "plugins": [
      {
        "plugin_id": "brave-search",
        "description": "Privacy-focused web search",
        "required_tier": "free",
        "available": true,
        "owner": "swarmspace",
        "author": { "name": "Orbital AI", "type": "first-party" },
        "capabilities": ["web_search", "general"],
        "pricing": { "model": "included", "cost_per_call": null },
        "privacy_data_required": false,
        "version": "1.0.0",
        "deployed_at": "2026-03-01T00:00:00Z",
        "rate_limits": { "free": 20, "standard": 500, "premium": 500 },
        "worker_url": "https://swarmspace-plugin-brave-search.orbitalai.workers.dev",
        "example_query": "What are the latest developments in AI?",
        "cost_tier": "free"
      }
    ],
    "chains": [
      {
        "route": "/research",
        "name": "Deep Research",
        "plugins": ["brave-search", "wikipedia", "semantic-scholar", "gemini-flash"],
        "description": "Web search + Wikipedia + academic papers, synthesized by Gemini",
        "endpoint": "https://swarmspace-orchestrator.orbitalai.workers.dev/research"
      }
    ],
    "upgrade_url": "https://swarmspace.ai/upgrade"
  }
}
```

---

### 4. `swarmspaceWriteCapabilities` — Capabilities Doc Writer (Admin Only)

**URL:** `https://us-central1-arc-epi.cloudfunctions.net/swarmspaceWriteCapabilities`
**Method:** POST (Firebase callable)
**Auth:** Firebase ID token (admin email required)

Writes `swarmspace_capabilities/current` to Firestore so LUMARA can subscribe via real-time listener. Contains plugin count, plugin IDs, chain routes, aggregated capabilities, and catalog version.

**Request body:** `{ "data": {} }`
**Response:** `{ "result": { "success": true, "plugin_count": 21, "chain_count": 12, ... } }`

---

### 5. `validatePluginSubmission` — Server-Side Submission Validation

**URL:** `https://us-central1-arc-epi.cloudfunctions.net/validatePluginSubmission`
**Method:** POST (Firebase callable)
**Auth:** Firebase ID token (any authenticated user)

Server-side validation of plugin submission data before writing to `plugin_submissions`. Checks plugin ID format, required manifest fields, valid category/pricing/auth enums, and endpoint reachability.

---

## Orchestrator Workflow Routes (Cloudflare Worker)

12 workflow routes via `swarmspace-orchestrator.orbitalai.workers.dev`:

| Route | Name | Plugins Used |
|-------|------|--------------|
| `/research` | Deep Research | brave-search, wikipedia, semantic-scholar, gemini-flash |
| `/competitor` | Competitive Analysis | brave-search, news, hackernews, gemini-flash |
| `/marketing` | Marketing Brief | brave-search, news, gemini-flash |
| `/plugins` | Plugin Discovery | brave-search, github-public, gemini-flash |
| `/academic` | Academic Research | semantic-scholar, arxiv, pubmed, gemini-flash |
| `/news-brief` | News Brief | news, hackernews, brave-search, gemini-flash |
| `/market-scan` | Market Scan | brave-search, news, currency, gemini-flash |
| `/location-brief` | Location Brief | nominatim, weather, rest-countries, wikipedia, gemini-flash |
| `/health-research` | Health Research | pubmed, semantic-scholar, wikipedia, gemini-flash |
| `/tech-scout` | Tech Scout | github-public, hackernews, brave-search, arxiv, gemini-flash |
| `/fact-check` | Fact Check | brave-search, wikipedia, semantic-scholar, dictionary-api, gemini-flash |
| `/content-brief` | Content Brief | brave-search, wikipedia, news, gemini-flash |

---

## Firestore: `swarmspace_capabilities` Collection

Single-document collection (`swarmspace_capabilities/current`) used by LUMARA as a real-time Firestore listener for capability discovery.

- **Read:** any authenticated user
- **Write:** server-side only (Admin SDK via `swarmspaceWriteCapabilities`); client writes denied in `firestore.rules`

**Document shape:**
```json
{
  "catalog_version": "2026-04-10T18:00:00Z",
  "plugin_count": 21,
  "plugin_ids": ["gemini-flash", "brave-search", ...],
  "chain_count": 12,
  "chain_routes": ["/research", "/competitor", ...],
  "capabilities": ["academic_search", "biomedical", "community", ...],
  "updated_at": "<server timestamp>",
  "updated_by": "<admin uid>"
}
```

---

## Plugin Registry (from swarmspaceRouter.ts)

**21 plugins** across 3 tiers (15 free, 4 standard, 2 premium). Catalog version: `2026-04-10T18:00:00Z`.

### Free tier (15 plugins)

| plugin_id | Description | Example query | Deployed |
|-----------|-------------|---------------|----------|
| `gemini-flash` | Fast AI synthesis for writing and drafting | "Draft a LinkedIn post about my latest project" | 2026-03-01 |
| `brave-search` | Privacy-focused web search | "What are the latest developments in AI?" | 2026-03-01 |
| `semantic-scholar` | Academic paper and citation search | "Find papers on transformer architectures" | 2026-03-01 |
| `weather` | Current weather and forecasts | "What's the weather in San Francisco?" | 2026-03-01 |
| `wikipedia` | Wikipedia knowledge base | "Who invented the transistor?" | 2026-03-01 |
| `currency` | Currency exchange rates | "What is EUR to USD right now?" | 2026-03-01 |
| `news` | Latest news and headlines (NewsData.io) | "Top tech news today" | 2026-03-01 |
| `arxiv` | Scientific preprints from arXiv | "Recent LLM alignment papers" | 2026-04-01 |
| `nominatim` | Geocoding via OpenStreetMap | "Coords for La Jolla, CA" | 2026-04-10 |
| `rest-countries` | Country data and geography | "Info about Japan" | 2026-04-10 |
| `github-public` | Public GitHub repo and developer data | "Stars on bytedance/deer-flow" | 2026-04-10 |
| `hackernews` | Tech community discussions from Hacker News | "HN posts about MCP today" | 2026-04-10 |
| `dictionary-api` | Word definitions and etymology | "Define interoperability" | 2026-04-10 |
| `jina-reader` | Fetch and extract any URL content | "Read https://example.com" | 2026-04-10 |
| `pubmed` | Biomedical literature from PubMed/NCBI | "Sleep and HRV studies" | 2026-04-10 |

> **April 10 deployment:** 7 new free plugins added: `nominatim`, `rest-countries`, `github-public`, `hackernews`, `dictionary-api`, `jina-reader`, `pubmed`.

**Worker URLs:** `swarmspace-plugin-{plugin_id}.orbitalai.workers.dev`

### Standard tier ($30/mo) — 4 plugins

| plugin_id | Description | Example query |
|-----------|-------------|---------------|
| `vision-ocr` | Extract text (OCR) or understand images with Vision API + Gemini | "Extract text from this screenshot" |
| `url-reader` | Fetch and extract content from URLs | "Read and summarize this article" |
| `media-upload` | Upload image and get a public URL (24h TTL) | "Upload image for sharing" |
| `tavily-search` | AI-optimized search for research | "Deep research on quantum computing" |

### Premium tier — 2 plugins

| plugin_id | Description | Example query |
|-----------|-------------|---------------|
| `exa-search` | Neural semantic search | "Find content similar to this concept" |
| `perplexity-sonar` | Real-time answer synthesis from the web | "Explain the current state of fusion energy" |

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
