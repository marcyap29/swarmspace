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

**Catalog sources:** The catalog merges **first-party plugins** (from the built-in `PLUGIN_REGISTRY`) with **approved developer plugins** (from the `approved_plugins` Firestore collection, TTL-cached for 5 minutes). Developer plugins include `source: "developer"` in the response; first-party plugins include `source: "first-party"` (or omit the field).

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

### 6. `swarmspaceDiscoveryAgent` — Natural-Language Discovery

**URL:** `https://swarmspacediscoveryagent-6sdvtdka3a-uc.a.run.app`
**Method:** POST (`onRequest` — public HTTP, not Firebase callable)
**Auth:** None required (IP rate-limited: 10 requests/hr)

**Request body:**
```json
{
  "message": "I need to research competitors",
  "session_id": "optional-existing-session-id"
}
```

**Response:**
```json
{
  "intent": "competitive_analysis",
  "suggested_chain": "/competitor",
  "alternatives": ["/market-scan", "/news-brief"],
  "cta": "Try the Competitive Analysis workflow →",
  "session_id": "abc123",
  "turns_remaining": 2
}
```

Multi-turn: up to 3 turns per session. Pass `session_id` from a previous response to continue the conversation. Powered by Gemini 3 Flash.

---

### 7. `swarmspaceClaimFoundingSpot` — Founding Developer Programme Claim

**URL:** `https://us-central1-arc-epi.cloudfunctions.net/swarmspaceClaimFoundingSpot`
**Method:** POST (Firebase callable)
**Auth:** Firebase ID token (any authenticated user)

Claims a Founding Developer Programme slot. Uses a Firestore transaction against `founding_programme/meta` for atomic 100-slot enforcement.

**Request body:** `{ "data": {} }` (no params required)

**Response:**
```json
{
  "result": {
    "success": true,
    "slotNumber": 42,
    "remainingSlots": 58,
    "revenueShare": "5%"
  }
}
```

**Error codes:** `not-found` (programme not seeded), `failed-precondition` (programme closed or full), `already-exists` (user already claimed), `unauthenticated`

---

### 8. `onSubmissionStatusChange` — Promotion Pipeline Trigger (Backend Only)

**Type:** Firestore `onDocumentUpdated` trigger on `plugin_submissions/{docId}`
**Not callable by clients** — this is a backend trigger that fires automatically when a submission's status changes in Firestore.

**Behavior:**
- When a submission transitions to `approved`: the trigger promotes the plugin into the `approved_plugins` collection with `source: "developer"`, making it discoverable via `swarmspacePluginCatalog` (after the 5-minute TTL cache expires).
- When a submission transitions from `approved` to `rejected`: the trigger removes the corresponding document from `approved_plugins`, revoking the plugin from the live registry.
- Other status transitions (e.g. `pending` → `needs-info`) are logged but take no promotion action.

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

## Workflow / Work Chain API — LUMARA Integration Contract

The orchestrator worker exposes 12 workflow routes. LUMARA calls these directly (bypassing `swarmspaceRouter`) to run multi-plugin Work Chains. The three primary workflows are documented in detail below; the remaining nine follow the same request/response conventions.

### Base URL

```
https://swarmspace-orchestrator.orbitalai.workers.dev
```

### Authentication

All routes require a Firebase ID token in the `Authorization` header. The orchestrator forwards this token to `swarmspaceRouter` when calling individual plugins.

### Common Request Format

```http
POST https://swarmspace-orchestrator.orbitalai.workers.dev/{route}
Authorization: Bearer <firebase-id-token>
Content-Type: application/json

{
  "query": "search terms"
}
```

The `query` field is required. Some routes accept additional `params` fields (e.g., `/market-scan` accepts `currency`, `/content-brief` accepts `format`).

### Common Response Envelope

Every successful response uses the same envelope:

```json
{
  "workflow": "/{route}",
  "result": { ... }
}
```

The shape of `result` varies per workflow (documented below).

### Timeout

30 seconds (Cloudflare Worker limit). Individual plugin calls within a workflow run in parallel where possible to stay within this budget.

---

### Primary Workflow: `/research` — Deep Research

**Plugins chained:** `brave-search`, `wikipedia`, `semantic-scholar`, `gemini-flash`

**Request:**
```http
POST https://swarmspace-orchestrator.orbitalai.workers.dev/research
Authorization: Bearer <firebase-id-token>
Content-Type: application/json

{ "query": "search terms" }
```

**Response:**
```json
{
  "workflow": "/research",
  "result": {
    "sources": {
      "brave-search": { ... },
      "wikipedia": { ... },
      "semantic-scholar": { ... }
    },
    "synthesis": { ... }
  }
}
```

`sources` contains the raw output from each plugin (keyed by plugin ID). `synthesis` contains the Gemini-generated structured summary with key findings, sources cited, and gaps.

---

### Primary Workflow: `/news-brief` — News Intelligence Brief

**Plugins chained:** `news`, `hackernews`, `brave-search`, `gemini-flash`

**Request:**
```http
POST https://swarmspace-orchestrator.orbitalai.workers.dev/news-brief
Authorization: Bearer <firebase-id-token>
Content-Type: application/json

{ "query": "search terms" }
```

**Response:**
```json
{
  "workflow": "/news-brief",
  "result": {
    "sources": {
      "news": { ... },
      "hackernews": { ... },
      "brave-search": { ... }
    },
    "brief": { ... }
  }
}
```

`sources` contains raw plugin outputs. `brief` contains the Gemini-generated intelligence brief structured as: Headlines Summary, Detailed Analysis, Community Reaction, What To Watch.

---

### Primary Workflow: `/competitor` — Competitive Analysis

**Plugins chained:** `brave-search`, `news`, `hackernews`, `gemini-flash`

**Request:**
```http
POST https://swarmspace-orchestrator.orbitalai.workers.dev/competitor
Authorization: Bearer <firebase-id-token>
Content-Type: application/json

{ "query": "search terms" }
```

**Response:**
```json
{
  "workflow": "/competitor",
  "result": {
    "sources": {
      "brave-search": { ... },
      "news": { ... },
      "hackernews": { ... }
    },
    "analysis": { ... }
  }
}
```

`sources` contains raw plugin outputs. `analysis` contains the Gemini-generated competitive intelligence brief structured as: Overview, Key Players, Recent Moves, Community Sentiment, Strategic Implications.

---

### Error Responses

All error responses use the same JSON envelope:

```json
{ "error": "<message>" }
```

| HTTP Status | Condition | Example `error` value |
|-------------|-----------|----------------------|
| 401 | Missing or malformed `Authorization` header | `"Missing Authorization header"` |
| 400 | Request body is not valid JSON | `"Invalid JSON body"` |
| 404 | Route does not exist | `"Unknown route"` (includes `available` array of valid routes) |
| 405 | HTTP method is not POST (or OPTIONS) | `"POST required"` |
| 500 | Workflow execution error (plugin failure, timeout, etc.) | `"Plugin brave-search failed (502): ..."` |

### CORS

All responses include permissive CORS headers. `OPTIONS` preflight is handled automatically (returns 204).

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: POST, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

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

---

## MCP Server — OAuth 2.1 Remote MCP

**Base URL:** `https://swarmspace-mcp-server.orbitalai.workers.dev`  
**Protocol:** MCP `2025-06-18`; Streamable HTTP (SSE on `tools/call`)  
**Auth:** OAuth 2.1 (PKCE S256, DCR) — legacy `ss_mcp_` HMAC keys still accepted as fallback  
**Deployed:** 2026-05-15, version `c5aa5f33-b20f-4a13-a87c-360285db8610`

### Discovery Endpoints (no auth required)

```
GET /.well-known/oauth-authorization-server   # RFC 8414 metadata
GET /.well-known/oauth-protected-resource     # RFC 9728 metadata
GET /.well-known/mcp/manifest.json            # MCP manifest
```

### OAuth Flow

```
POST /oauth/register        # Dynamic Client Registration (RFC 7591) — returns client_id, no client_secret
GET  /oauth/authorize       # Start auth flow (requires: client_id, redirect_uri, code_challenge, code_challenge_method=S256, resource)
POST /oauth/authorize/complete  # Consent callback with Firebase ID token → issues auth code
POST /oauth/token           # Exchange code or refresh token → access_token + refresh_token
```

**PKCE:** S256 only. `code_challenge_method=plain` is rejected.  
**`resource` parameter:** Required on both `/authorize` and `/token` per RFC 8707. Value: `https://swarmspace-mcp-server.orbitalai.workers.dev`  
**Redirect URI:** `https://claude.ai/api/mcp/auth_callback` and RFC 8252 loopback (`localhost` / `127.0.0.1`, any port) are accepted.  
**Token TTLs:** access token 1h, refresh token 30d. Refresh token rotation is mandatory (old token invalidated on use).

### MCP Endpoint

```http
POST /mcp
Authorization: Bearer <access_token>
Content-Type: application/json
Accept: application/json          # synchronous JSON response
Accept: text/event-stream         # SSE stream (tools/call only)
MCP-Protocol-Version: 2025-06-18
```

**Supported JSON-RPC methods:** `initialize`, `tools/list`, `tools/call`, `notifications/initialized`

**On 401:** Response includes `WWW-Authenticate` header with `resource` and `resource_metadata` pointers for automatic client discovery.

### MCP Tools

13 tools, one per orchestrator workflow chain:

| Tool | Orchestrator Route | Description |
|------|--------------------|-------------|
| `research` | `/research` | Deep research: web + Wikipedia + academic papers |
| `competitor_analysis` | `/competitor` | Competitive intelligence |
| `marketing_brief` | `/marketing` | Marketing brief generator |
| `plugin_discovery` | `/plugins` | Plugin and tech discovery |
| `academic_research` | `/academic` | Academic paper synthesis |
| `news_brief` | `/news-brief` | News briefing with community reaction |
| `market_scan` | `/market-scan` | Market and currency intelligence |
| `location_brief` | `/location-brief` | Location-aware research |
| `health_research` | `/health-research` | Biomedical literature synthesis |
| `tech_scout` | `/tech-scout` | GitHub + HN + arXiv tech evaluation |
| `fact_check` | `/fact-check` | Multi-source fact verification |
| `content_brief` | `/content-brief` | Content research and framing |
| `meeting_prep` | `/meeting-prep` | Attendee research and meeting brief |
