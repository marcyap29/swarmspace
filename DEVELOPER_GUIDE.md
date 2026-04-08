# SwarmSpace Developer Guide

*Orbital AI · April 2026*

---

## 1. What is SwarmSpace?

SwarmSpace is the first consumer-grade plugin marketplace for AI agents. Developers build HTTP API endpoints, register them with SwarmSpace, and agents discover and call those plugins at runtime.

- **23 plugins live** across three tiers (Free, Standard, Premium)
- **12 workflow routes** chain plugins into multi-step operations
- **OWASP AST10 aligned** — the first AI agent marketplace with a published compliance posture
- **Revenue share**: 80% to developers, 20% platform (85% for Founding Developers)

SwarmSpace handles discovery, authentication, tier enforcement, credit tracking, and privacy consent. You handle the API.

---

## 2. How Plugins Work

A plugin is an **HTTPS API endpoint** that SwarmSpace calls on behalf of agents. Nothing installs on user devices. Nothing runs on your servers unless a request comes in.

### Request flow

```
User / Agent
  → Firebase Auth (proves identity)
  → swarmspaceRouter (Firebase Cloud Function)
      → Validates auth token
      → Checks user's plan/tier
      → Enforces daily call quota
      → Logs the call (PRISM activity log)
      → Forwards request to YOUR endpoint with:
          Authorization: Bearer <SWARMSPACE_INTERNAL_TOKEN>
          X-SwarmSpace-User-Id: <firebase_uid>
          X-SwarmSpace-User-Tier: free|standard|premium
          Content-Type: application/json
  → Your endpoint processes the request
  → Returns JSON to swarmspaceRouter
  → Router attaches quota info and returns to agent
```

Your endpoint never talks to users directly. SwarmSpace handles all authentication and billing.

---

## 3. Building Your First Plugin

### Step 1: Create your API endpoint

Here's a minimal Cloudflare Worker that wraps a public API (the pattern all SwarmSpace plugins follow):

```typescript
export interface Env {
  SWARMSPACE_INTERNAL_TOKEN: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    const url = new URL(request.url);

    // Accept POST at both / and /invoke
    if (request.method === "POST" && (url.pathname === "/" || url.pathname === "/invoke")) {

      // Validate internal token (if present)
      const auth = request.headers.get("Authorization");
      if (auth && auth !== `Bearer ${env.SWARMSPACE_INTERNAL_TOKEN}`) {
        return json({ error: "Unauthorized" }, 401);
      }

      // Parse request body
      const body = await request.json() as { query?: string; limit?: number };
      const query = body.query;
      if (!query) {
        return json({ error: "Missing required field: query" }, 400);
      }

      const limit = Math.min(Math.max(body.limit ?? 5, 1), 20);

      // Call your upstream API
      const apiResponse = await fetch(
        `https://your-api.com/search?q=${encodeURIComponent(query)}&limit=${limit}`,
        { signal: AbortSignal.timeout(15_000) }
      );

      if (!apiResponse.ok) {
        return json({ error: `Upstream API error: ${apiResponse.status}` }, 502);
      }

      const data = await apiResponse.json() as { items: any[] };

      // Return structured results
      return json({
        results: data.items,
        source: "your-plugin-id",
        count: data.items.length,
      });
    }

    return json({ error: "Not found" }, 404);
  },
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders() },
  });
}

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}
```

### Key requirements for your endpoint

- **HTTPS only** — HTTP endpoints are rejected
- **Accept POST** at `/` and `/invoke`
- **Respond within 25 seconds** — the router times out at 25s
- **Return JSON** — structured results, not raw HTML or plain text
- **Handle errors gracefully** — return `{ "error": "message" }` with appropriate status codes
- **Set CORS headers** — required for browser-based testing

### Step 2: Deploy

**Cloudflare Workers (recommended):**
```bash
npx wrangler deploy
npx wrangler secret put SWARMSPACE_INTERNAL_TOKEN
```

Any hosting that serves HTTPS and responds within 25 seconds works: Vercel, AWS Lambda, Google Cloud Functions, Railway, Fly.io, etc.

### Step 3: Submit your plugin

Go to **[swarmspace.vercel.app/submit-plugin](https://swarmspace.vercel.app/submit-plugin)**

Fill out:
- **Plugin name** — human-readable, max 60 characters
- **Category** — Research, Productivity, Finance, Health, Creative, Developer Tools, Communication, Data, Other
- **Description** — what agents read to decide if your plugin matches their need (50-500 characters)
- **Endpoint URL** — your HTTPS endpoint
- **Auth method** — None, API Key, or OAuth 2.0
- **Pricing model** — Free (Community tier) or Credits (requires Verified status)
- **Semantic tags** — comma-separated capability tags (2-10 tags)

### Step 4: Review process

| Tier | Review | Timeline |
|------|--------|----------|
| Community | Safety review | 2-3 business days |
| Verified | Merit-based qualification | Earned over time |

Safety review checks:
- Endpoint reachability (health check)
- Schema validation
- Description/capability consistency
- No obvious security issues

---

## 4. Plugin Manifest Spec

The full manifest describes your plugin in a format any agent can parse. Not all fields are required at submission — the manifest is built progressively as your plugin moves through tiers.

```json
{
  "schema_version": "1.0",
  "id": "com.yourdomain.your-plugin",
  "name": "Your Plugin Name",
  "version": "1.0.0",
  "capability": "Natural language description of what this plugin does",
  "trust_tier": "community",
  "endpoint": "https://your-api.com/v1/plugin",
  "health_endpoint": "https://your-api.com/health",
  "latency_class": "medium",
  "auth_method": "api_key",
  "pricing": {
    "model": "free",
    "free_tier": 100,
    "cost_per_call_usd": 0
  },
  "input_schema": {},
  "output_schema": {},
  "tags": ["category1", "category2"],
  "data_required": [],
  "data_never_stored": true,
  "developer": {
    "name": "Your Name",
    "email": "you@example.com",
    "website": "https://yourdomain.com"
  },

  "network_permissions": {
    "mode": "allowlist",
    "allowed_domains": ["api.example.com"],
    "denied_domains": []
  },
  "content_hash": "sha256:...",
  "scan_status": {
    "scanner": "swarmspace-scanner",
    "scanner_version": "1.0.0",
    "scan_date": "2026-04-01T00:00:00Z",
    "result": "pass",
    "findings": []
  },
  "risk_tier": "L0",
  "deny_write": {
    "identity_files": true,
    "memory_files": true,
    "context_files": true,
    "exceptions": []
  },
  "version_pinning": {
    "dependencies_hash": "sha256:...",
    "pinned_at": "2026-04-01T00:00:00Z"
  }
}
```

### Field reference

| Field | Required | Description |
|-------|----------|-------------|
| `id` | Yes | Reverse-DNS format, globally unique |
| `name` | Yes | Human-readable name |
| `capability` | Yes | What agents read to decide if your plugin fits their task |
| `endpoint` | Yes | Your HTTPS API endpoint |
| `health_endpoint` | Yes | Must return HTTP 200 for approval |
| `auth_method` | Yes | `none`, `api_key`, or `oauth2` |
| `tags` | Yes | Category filters for discovery |
| `data_required` | Yes | User context fields your plugin needs (empty array = none) |
| `network_permissions` | Verified | Explicit domain allowlist (replaces binary on/off) |
| `content_hash` | Verified | SHA-256 of manifest, verified at runtime |
| `risk_tier` | Verified | L0=safe, L1=low, L2=elevated, L3=destructive |
| `deny_write` | Verified | Write protection for identity/memory/context files |

---

## 5. Trust Tiers

| Tier | Review | Revenue | Access |
|------|--------|---------|--------|
| **Experimental** | None | Not eligible | Self-published, no review needed |
| **Community** | Safety review | Not eligible | Free to users, listed after review |
| **Verified** | Merit-based | 80% share (85% Founding) | Can charge credits, Ed25519 signed |

### How to earn Verified status

Verified is **earned, not purchased**. It's based on a composite merit score reviewed monthly:

- Plugin upvotes from users
- Call volume and retention
- Developer activity and update frequency
- Error rate and uptime
- Community engagement

There is no payment that grants Verified status.

---

## 6. Revenue & Pricing

### For Community tier
- Plugins must be **free to users**
- No credit charging permitted
- No revenue share (you're building reputation)

### For Verified tier
- Plugins can charge **credits per call**
- Revenue share: **80% to developer, 20% platform**
- Payouts via **Stripe Connect** — connect your account at [swarmspace.vercel.app/earnings](https://swarmspace.vercel.app/earnings)

### Founding Developer Programme

The first **100 developers** to earn Verified status receive:
- **85% revenue share permanently** (vs standard 80%)
- **Founding Developer badge** on profile and plugins
- Early ecosystem influence

Submit your first plugin to get in the queue.

---

## 7. Privacy Requirements (PRISM)

SwarmSpace enforces privacy through the PRISM (Privacy, Rights, and Information Security Module) layer.

### If your plugin handles sensitive data

If your plugin processes images, reads URLs, or accesses user context:

1. **Declare it** — set `privacy_data_required: true` in your manifest
2. **List what you need** — the `data_required` field must explicitly name every user context field your plugin accesses
3. **Users consent** — SwarmSpace shows users what data will be sent before your plugin executes
4. **Everything is logged** — every call is recorded with: plugin ID, user tier, privacy metadata, consent status, data fields sent

### Default deny

Plugins **cannot** write to:
- User identity files
- Memory/journal files (CHRONICLE)
- Context files

This is enforced by the `deny_write` manifest field. Defaults are all `true` (deny). If your plugin needs write access, declare exceptions explicitly — they will be reviewed.

---

## 8. Security Requirements (OWASP AST10)

SwarmSpace aligns with the OWASP Agentic Skills Top 10 (March 2026). What this means for developers:

| AST Risk | What you must do |
|----------|------------------|
| **AST01/02** Malicious Skills / Supply Chain | Verified plugins require Ed25519 signing. `content_hash` verified at runtime |
| **AST03** Over-Privileged Skills | Declare `network_permissions` (domain allowlist) and `deny_write` protections |
| **AST07** Update Drift | Pin dependency versions. Updates trigger re-review before continued execution |
| **AST08** Poor Scanning | Submissions undergo behavioral scanning, not just schema validation |
| **AST09** No Governance | Declare `risk_tier` (L0-L3). Higher risk tiers require higher trust tiers |

Full compliance matrix: [Docs/OWASP_AST10_COMPLIANCE.md](Docs/OWASP_AST10_COMPLIANCE.md)

---

## 9. API Reference

### swarmspaceRouter — Plugin invocation

```
POST https://us-central1-arc-epi.cloudfunctions.net/swarmspaceRouter
Authorization: Bearer <firebase_id_token>
Content-Type: application/json

{
  "data": {
    "plugin_id": "your-plugin-id",
    "params": {
      "query": "search query",
      "limit": 5
    }
  }
}
```

**Response:**
```json
{
  "results": [...],
  "source": "your-plugin-id",
  "count": 5,
  "quota": {
    "limit": 20,
    "used": 3,
    "remaining": 17,
    "resets_at": "2026-04-09T00:00:00.000Z"
  }
}
```

### swarmspacePluginStatus — Availability check

```
POST https://us-central1-arc-epi.cloudfunctions.net/swarmspacePluginStatus
Authorization: Bearer <firebase_id_token>

{ "data": { "plugin_id": "your-plugin-id" } }
```

Returns: `{ "available": true, "user_tier": "free", "required_tier": "free" }`

### swarmspacePluginCatalog — Full catalog

```
POST https://us-central1-arc-epi.cloudfunctions.net/swarmspacePluginCatalog
Authorization: Bearer <firebase_id_token>

{ "data": {} }
```

Returns all plugins with metadata and availability for the current user's tier.

### Rate limits

| Tier | Daily limit | Enforcement |
|------|-------------|-------------|
| Free | 20 calls/day | Hard block at ceiling |
| Standard | 500 calls/day | Hard block at ceiling |
| Premium | 500 calls/day | Hard block at ceiling |
| Admin | Unlimited | Bypass |

Quota resets at midnight UTC. The `quota` object is included in every response so clients can display remaining calls.

---

## 10. Founding Developer Programme

| Detail | Value |
|--------|-------|
| Spots | 100 (first-come) |
| Revenue share | 85% permanent (vs 80% standard) |
| Badge | Founding Developer — shown on profile and plugins |
| Requirement | Earn Verified status |
| How to start | Submit your first plugin at [swarmspace.vercel.app/submit-plugin](https://swarmspace.vercel.app/submit-plugin) |

The programme rewards early builders who help establish the ecosystem. The 85% rate is permanent — it never reverts to 80%, even after the 100 spots fill.

---

## 11. Getting Help

- **Submit issues:** [github.com/marcyap29/swarmspace](https://github.com/marcyap29/swarmspace)
- **Contact:** developer@orbitalai.net
- **Architecture docs:** [architecture.md](architecture.md)
- **Privacy docs:** [Docs/PRISM.md](Docs/PRISM.md)
- **Security docs:** [Docs/OWASP_AST10_COMPLIANCE.md](Docs/OWASP_AST10_COMPLIANCE.md)

---

*SwarmSpace Developer Guide · Orbital AI · April 2026*
