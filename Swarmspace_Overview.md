# SwarmSpace — Overview

**Purpose:** Get users and AI agents up to speed on what SwarmSpace is, why it exists, and how it works.

---

## What Is SwarmSpace?

SwarmSpace is a **plugin layer and developer platform** for AI agents and applications. It provides:

1. **API access** — Web search, URL fetching, weather, news, currency, and other capabilities via a unified API layer (used by LUMARA and other clients).
2. **Developer dashboard** — Sign up, get an API key, optionally enable developer mode to submit plugins to the marketplace.
3. **Plugin marketplace** — Discovery and trust layer for capabilities that AI agents can invoke.

---

## Purpose

- **For API consumers:** One account, one API key. Use 7 free plugins (brave-search, wikipedia, weather, news, currency, etc.) or upgrade for more (url-reader, tavily-search, exa-search, perplexity-sonar).
- **For developers:** Submit plugin manifests, get Verified tier via Stripe, track review status.
- **For AI agents (e.g. LUMARA):** Call `swarmspaceRouter` and `swarmspacePluginStatus` with a Firebase ID token; tier determines which plugins are available.

---

## How It Works

### User flow

1. **Sign up** at `/signup` → land on `/dashboard` with API key visible.
2. **API consumer (default):** Use the API key to call plugins. Free tier: 7 plugins.
3. **Developer mode (opt-in):** Enable in dashboard → submit plugin manifests → track review status.
4. **Upgrade:** Stripe Checkout for Verified tier ($30/mo) → unlocks Standard/Premium plugins and Verified plugin trust tier.

### Account model

- **Unified account:** One account serves both API consumption and plugin publishing.
- **API key:** Auto-generated on signup (`ss_` prefix), shown in dashboard. Used for API auth (via Firebase ID token in practice).
- **developer_mode:** Boolean. When `false`, user is API-only. When `true`, can submit plugins.

### Tech stack

| Layer | Tech |
|-------|------|
| Web app (dashboard, signup, marketplace) | Vercel, Supabase (auth + DB), Stripe |
| API layer (plugin invocation) | Firebase Cloud Functions → Cloudflare Workers |
| Plugin workers | Cloudflare Workers wrapping Brave, Tavily, Wikipedia, etc. |

---

## For AI Agents

When working with SwarmSpace in code or docs:

- **Endpoints:** `swarmspaceRouter`, `swarmspacePluginStatus` at `us-central1-arc-epi.cloudfunctions.net`
- **Auth:** Firebase ID token in `Authorization: Bearer <token>`
- **Tiers:** Free (7 plugins) | Standard $30/mo (url-reader, tavily-search) | Premium (exa-search, perplexity-sonar)
- **API reference:** `SWARMSPACE_API_CONTEXT.md` — endpoints, request schemas, plugin registry
- **Setup:** `README.md` — Supabase, Stripe, Vercel env vars
- **Never commit API keys** — add via env vars or locally

---

## Key Documents

| Doc | Use when |
|-----|----------|
| **overview.md** (this file) | First read; orientation |
| **README.md** | Deploying or setting up |
| **SWARMSPACE_API_CONTEXT.md** | Integrating with the API |
| **Docs/FEATURES.md** | Feature list |
| **Docs/backend.md** | Backend structure |
| **architecture.md** | SwarmStore vision; plugin format |

---

*SwarmSpace — Developer dashboard and plugin marketplace. API layer for LUMARA.*
