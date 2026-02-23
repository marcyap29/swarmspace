# SwarmStore: Architecture & Hosting Recommendations
*Orbital AI — Internal Technical Reference | February 2026*

---

## 1. Plugin Format — What a "Plugin" Actually Is

**Short answer: HTTPS API endpoint + JSON manifest. Nothing installs on user devices. Ever.**

Plugins in SwarmStore are not executables (`.exe`), packages (`.zip`), or locally-installed software. They are:

1. **A hosted HTTPS endpoint** — the developer runs this, not SwarmStore
2. **A JSON manifest** — describes the plugin in a format any LLM can parse
3. **An OpenAPI spec** (optional but recommended) — for schema validation

SwarmStore holds the index and trust layer only. When a plugin "activates," the agent makes API calls to the developer's endpoint. SwarmStore never sees the payload.

### Manifest Format: `swarmstore-manifest.json`

```json
{
  "schema_version": "1.0",
  "id": "com.example.plugin-name",         // reverse-DNS, globally unique
  "name": "Human-readable plugin name",
  "version": "1.0.0",                       // semver
  "capability": "Natural language description of exactly what this plugin does and what problems it solves. This field is the primary semantic search target — write it as if explaining to an intelligent assistant.",
  "trust_tier": "verified|community|experimental",
  "trust_score": 9.4,                       // set by SwarmStore, not developer
  "endpoint": "https://api.yourdomain.com/v1/plugin",
  "health_endpoint": "https://api.yourdomain.com/health",
  "latency_class": "low|medium|high",       // low <200ms, medium <2s, high >2s
  "pricing": {
    "model": "free|per_call|subscription",
    "free_tier": 100,                        // calls/month, if applicable
    "cost_per_call_usd": 0.001              // if per_call
  },
  "data_required": ["user.name"],           // explicit list — empty array = no user context needed
  "data_never_stored": true,               // developer assertion, audited for Verified tier
  "auth_method": "oauth2|api_key|none",
  "input_schema": { /* JSON Schema */ },
  "output_schema": { /* JSON Schema */ },
  "tags": ["category1", "category2"],       // for filtered discovery
  "mcp_compatible": true,
  "canonical_url": "https://swarmstore.io/plugins/your-plugin",
  "agent_summary": "One-sentence description optimized for agent-to-agent passing. Include what it does and trust tier.",
  "developer": {
    "name": "Developer or org name",
    "email": "contact@yourdomain.com",
    "website": "https://yourdomain.com"
  },
  "created_at": "2026-02-01T00:00:00Z",
  "updated_at": "2026-02-15T00:00:00Z"
}
```

**Why JSON, not YAML?**
- JSON is natively parseable by every language without dependencies
- Fewer ambiguity edge cases (YAML has several)
- Direct compatibility with OpenAPI specs
- LLMs handle JSON schemas extremely well

**Why not `.exe` or installable packages?**
- Zero installation attack surface for users
- No OS compatibility issues
- Plugins can be updated by developers without user action
- SwarmStore can revoke access to a compromised plugin immediately by removing it from the index — no uninstall required

---

## 2. Where to Host — Quickly and Cheaply

### For the SwarmStore Index/API (Your Core Infrastructure)

**Primary recommendation: Cloudflare Workers + Cloudflare R2 + D1**

| Component | Solution | Cost | Why |
|---|---|---|---|
| API / query engine | Cloudflare Workers | ~$5/mo for 10M requests | Edge-distributed, near-zero latency globally |
| Manifest storage | Cloudflare R2 | ~$0.015/GB | S3-compatible, no egress fees |
| Plugin index DB | Cloudflare D1 | Free tier generous | SQLite at the edge |
| Vector search | Cloudflare Vectorize | ~$0.04/1M queries | For semantic plugin discovery |
| Domain | Cloudflare Registrar | ~$9/yr | |

**Total month-one cost: ~$15-30/month** for a production-grade, globally distributed system.

**Why not Squarespace / Webflow / similar?**
Squarespace and similar are website builders — they can't host an API. They're fine for a marketing page, but SwarmStore's core value is the queryable index API. You need real infrastructure for that.

**What Squarespace IS good for:** If you want a quick marketing/waitlist page before the full product is built, Squarespace or Framer is fine. But the architecture document you're reading assumes you're building the real thing.

### Alternative Stack (if you prefer more familiarity)

| Component | Solution | Cost |
|---|---|---|
| API | Vercel (serverless functions) | Free → $20/mo |
| Database | PlanetScale MySQL | Free → $39/mo |
| Vector search | Pinecone | Free tier → $70/mo |
| Storage | AWS S3 | ~$0.023/GB |
| CDN | Cloudflare (free tier) | Free |

**Recommendation: Start with Cloudflare.** The Workers + D1 + Vectorize stack is purpose-built for exactly this: a globally distributed, low-latency, semantically searchable index. It also has built-in DDoS protection and WAF at no additional cost.

### For the Landing Page (index.html)

Cloudflare Pages: **Free tier is more than enough.** Deploy by pushing to a GitHub repo. Zero configuration. Automatic CDN. Custom domain with SSL included. No reason to pay for anything else at this stage.

---

## 3. Security Protocols

SwarmStore is a trust layer for an ecosystem of AI agent capabilities. Security isn't optional — it's the core value proposition. Here's the full protocol stack:

### 3.1 Manifest Signing (Verified Tier)

All Verified tier plugins have cryptographically signed manifests:

```
Developer submits manifest
  → SwarmStore signs with private key: Ed25519
  → Signature stored in manifest: "swarmstore_signature": "..."
  → Agents verify signature against SwarmStore public key before installation
  → Any manifest modification invalidates signature immediately
```

Why Ed25519: fast, small signatures, widely supported, immune to timing attacks.

### 3.2 Plugin Submission Security

- **Rate limiting on submissions**: max 10 submissions/day per developer account
- **Schema validation**: manifest must fully conform to JSON schema before entering review queue — invalid manifests rejected immediately
- **Endpoint reachability check**: health endpoint must respond 200 before submission accepted
- **Automated static analysis**: the manifest's `capability` and `data_required` fields are checked for inconsistencies by LLM review (e.g., a plugin claiming to need no user data but describing accessing contact lists)
- **No executable uploads**: SwarmStore never accepts file uploads of any kind — manifest only
- **Abuse detection**: duplicate plugin detection, namespace squatting protection (prevent `com.google.calendar` style impersonation)

### 3.3 Runtime Security (Agent-Side)

Agents integrating SwarmStore should enforce:

```
Before calling SwarmStore:
  → Agent permission level check (does this agent have permission to install plugins?)

Before presenting plugin to user:
  → Verify manifest signature (Verified tier only)
  → Check trust_tier vs. agent permission level
  → Display data_required clearly to user
  → Never auto-install — always require explicit user confirmation

Before calling plugin endpoint:
  → Only pass fields listed in data_required — no more
  → Log the call (endpoint, timestamp, data fields passed)
  → Set request timeout (respect latency_class)
```

### 3.4 API Security for the SwarmStore API Itself

- **Auth**: API key required for write operations (plugin submission, ratings). Read/discovery API is public but rate-limited.
- **Rate limiting**: 
  - Discovery API: 1000 req/min per IP (unauthenticated), 10K/min per API key
  - Submission API: 10 submissions/day per developer
  - Enforce via Cloudflare Rate Limiting rules
- **Input sanitization**: all query strings sanitized before vector search to prevent prompt injection via search queries
- **CORS**: strict origin whitelist for write operations
- **No user data at rest**: SwarmStore stores manifests only — never plugin transaction payloads
- **HTTPS only**: HSTS enforced, no HTTP fallback

### 3.5 Trust Revocation

This is critical and often overlooked:

```
If a plugin is found to be malicious or compromised:
  1. SwarmStore removes plugin from index immediately
  2. Manifest signature is invalidated (public key updated to invalidate old sig)
  3. Agents checking the index will stop seeing the plugin instantly
  4. No uninstall action required from users (nothing was installed)
  5. Incident published in SwarmStore security changelog
```

This is a major architectural advantage over installable software. Revocation is instant and universal.

### 3.6 Prompt Injection Defense

Plugins can potentially be used as a vector for prompt injection attacks — a malicious plugin returns crafted text designed to manipulate the agent's behavior. Mitigations:

- Plugin outputs must conform to declared `output_schema` — agents should reject out-of-schema responses
- Plugin outputs should be treated as untrusted data by the agent, not as instructions
- LUMARA (and any well-designed agent) should wrap plugin results in explicit context: "The following is data returned by an external plugin:" before presenting to the LLM
- Verified tier review includes prompt injection resistance testing

---

## 4. Hosting Architecture Diagram

```
[User / Agent]
      |
      | HTTPS
      ↓
[Cloudflare Workers — SwarmStore API]
  ├── /v1/search     → Vectorize (semantic search over plugin manifests)
  ├── /v1/plugins/:id → D1 (manifest retrieval)
  ├── /v1/submit     → Validation pipeline → Review queue
  └── /v1/verify     → Signature verification
      |
      | (plugin activation)
      ↓
[Developer's API Endpoint — SwarmStore doesn't touch this]
```

SwarmStore never sits in the middle of plugin transactions. It's a discovery and trust layer, not a proxy.

---

## 5. Quick Start Priorities

In order:

1. **Deploy the landing page** to Cloudflare Pages. Use the `index.html` provided. Point `swarmstore.io` at it.
2. **Set up Cloudflare Workers** with a basic `/v1/search` endpoint that returns mock results — enough to demo to integration partners.
3. **Define the manifest schema** v1.0 formally and publish at `swarmstore.io/docs/manifest`.
4. **Onboard LUMARA as first integration** — this validates the API before external developers touch it.
5. **Open plugin submissions** with Experimental tier only — manual review until processes are established.
6. **Build the signing pipeline** for Verified tier once you have enough Experimental and Community plugins to justify the review overhead.

---

*SwarmStore. The trust layer between agents and capabilities.*
