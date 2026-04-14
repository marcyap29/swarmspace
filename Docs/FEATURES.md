# SwarmSpace Features

**Version:** 1.4.1
**Last Updated:** 2026-04-13

---

## Feature List

### Core Features

| Feature | Description | Status |
|---------|-------------|--------|
| Landing page | 21 plugins (15 free, 4 standard, 2 premium), upgrade CTA, resources section; nav/footer links to PRISM, privacy, AST10 | ✅ |
| User auth | Signup/login via Firebase: email signup + OAuth (Google, GitHub); forgot password + reset page | ✅ |
| Unified account model | One account, API key (`ss_` prefix), developer_mode toggle | ✅ |
| Developer dashboard | Plugin submission, status; API key reveal/copy/regenerate; API usage examples (JSON, cURL, JS) | ✅ |
| Upgrade flow | Stripe Checkout for Verified tier ($30/mo) | ✅ |
| Marketplace | Plugin discovery | ✅ |
| Thank-you page | Post-signup marketplace preview | ✅ |
| FAQ | FAQ page (SwarmSpace branding) | ✅ |
| Developer submit portal (`/submit` → `submit.html`) | Firebase sign-in; idea or manifest modes; writes `plugin_submissions` with `developer_uid` + pending | ✅ |
| Submit plugin portal (`submit-plugin.html`) | Full manifest-style flow with extended fields (access_tier, capabilities, example_query, version, rate_limits); SSRF-protected endpoint validation; duplicate detection (name + endpoint); resubmission flow for rejected/needs-info submissions; real-time developer status dashboard (onSnapshot listener, status timeline, check results); same `plugin_submissions` collection; landing + dashboard links | ✅ |
| Automated promotion pipeline | `onSubmissionStatusChange` Firestore trigger: approved submissions promoted to `approved_plugins` collection and live in router; revocation (approved→rejected) removes from live registry | ✅ |
| Server-side submission validation (`validatePluginSubmission`) | Cloud Function: v2 automated validation pipeline — Ajv JSON Schema validation for fetched manifests, 3-sample latency profiler (p50/p95), security header audit (6-check weighted score), network domain DNS validation, 7 prompt injection probes, 90s timeout budget. Returns `validation_version: "2.0.0"` | ✅ |
| Admin submissions (`/admin-submissions`) | Allowlisted reviewer; list/filter/search on **`plugin_submissions`**; approve / needs info / reject → Firestore | ✅ |
| Security & trust (`security.html`) | OWASP Agentic Top 10 mapping, PRISM, trust tiers; linked from main nav and dashboard | ✅ |
| AST10 compliance (`ast10.html`) | OWASP Agentic Security Top 10 compliance reference page | ✅ |
| PRISM reference (`prism.html`) | Context minimization; consent enforcement active (blocks unconsented calls) | ✅ |
| Privacy policy (`privacy.html` + `Docs/PRIVACY.md`) | Public policy; Markdown companion in `Docs/` and root `Privacy.md` | ✅ |
| Developer guide (`DEVELOPER_GUIDE.md`) | Manifest specification, JSON Schema, endpoint and submission guidance for plugin authors | ✅ |
| Catalog enrichment (`swarmspacePluginCatalog`) | Returns chains, pricing, capabilities, deploy dates; 12 orchestrator workflow routes | ✅ |
| Capabilities sync (`swarmspaceWriteCapabilities`) | Cloud Function: writes `swarmspace_capabilities` to Firestore for real-time LUMARA discovery | ✅ |
| Discovery Agent (`swarmspaceDiscoveryAgent`) | NL plugin/workflow discovery via homepage chat UI; IP rate limiting; multi-turn sessions | ✅ |
| Founding Developer Programme (`founding-developers.html`) | `swarmspaceClaimFoundingSpot` function, landing page, seed script; `founding_programme` Firestore collection | ✅ |
| Developer guide (`developer-guide.html`) | HTML conversion of DEVELOPER_GUIDE.md with styled code blocks and table of contents | ✅ |
| Chain-to-signup handoff | Discovery chain preserved through auth flow to dashboard | ✅ |

### Integrations

| Integration | Purpose |
|-------------|---------|
| Firebase | Auth, Firestore (users, submissions, plugins, swarmspace_capabilities, founding_programme, discovery_rate_limits, discovery_sessions collections) |
| Stripe | Checkout, subscriptions, webhooks |
| Vercel | Hosting, serverless API |
| Firebase (external) | swarmspaceRouter, swarmspacePluginStatus, swarmspaceDiscoveryAgent, swarmspaceClaimFoundingSpot for LUMARA |
| Firebase (web app) | Optional: Auth + Firestore for `plugin_submissions` on submit + admin pages |

### API Tiers

| Tier | Price | Plugins |
|------|-------|---------|
| Free | $0 | 15 plugins (nominatim, rest-countries, github-public, hackernews, dictionary-api, jina-reader, pubmed, + originals) |
| Standard | $30/mo | 4 plugins (url-reader, tavily-search, + others); Verified tier |
| Premium | — | 2 plugins (exa-search, perplexity-sonar) |

---

## Platform Support

| Platform | Status |
|----------|--------|
| Web | ✅ |

---

## Roadmap

- **Phase 1:** [Current / near-term]
- **Phase 2:** [Next]
- **Phase 3:** [Future]
