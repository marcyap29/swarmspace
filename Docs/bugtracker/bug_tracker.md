# SwarmSpace Bug Tracker

**Version:** 1.0.2  
**Last Updated:** 2026-06-14  
**Record count:** 0 individual bug records in [records/](records/) — 8 inline entries below (no full records needed for fixed one-commit bugs)

---

## How to use

- **Index:** Use the sections below to find bugs by category. Each entry links to a detailed record in `records/`.
- **Fix instructions:** Each record should include a **How to fix** section.
- **Recent code changes:** Table below links fixes to CHANGELOG versions.

---

## Bug Tracker Index

### Auth

- (none yet)

### Stripe / Payments

- (none yet)

### API / Backend

- **BUG-ORCH-001** — `headers is not defined` in orchestrator — commit `7fadc23` deleted `headers` variable declaration while adding `_via_mcp` mutation; fixed `723a20c` (2026-05-20)
- **BUG-MCP-001** — MCP quota bypass not propagating — mcp-server never sent `_via_mcp: true` in outbound body; `isMcpSession` always false in swarmspaceRouter; admin user hitting free-tier cap over MCP. Fixed `723a20c`: mcp-server sets `{ ...body, _via_mcp: true }`; orchestrator propagates unconditionally (2026-05-20)
- **BUG-PLUGIN-001** — github-public 401 GitHub API error — GITHUB_TOKEN secret was never set; GitHub API now requires auth on search endpoints. Fix: set GITHUB_TOKEN secret via wrangler (2026-06-14)
- **BUG-PLUGIN-002** — semantic-scholar 500 Upstream connection failed — Worker had no source files, only .wrangler/cache/; registered in PLUGIN_REGISTRY but never built/deployed. Fix: built complete new Worker calling Semantic Scholar v1 API with retry-on-429; set S2_API_KEY secret. Deployed: swarmspace-plugin-semantic-scholar.orbitalai.workers.dev version a882c0b4 (2026-06-14)
- **BUG-PLUGIN-003** — rest-countries 500 invalid response — restcountries.com v3.1 fully deprecated; API returns deprecation JSON. Fix: rewrote plugin to use World Bank API (api.worldbank.org/v2/country/{iso2}) with built-in 100-entry country name→ISO2 lookup table; added safe JSON parsing. Deployed: swarmspace-plugin-rest-countries.orbitalai.workers.dev version 23c22154 (2026-06-14)
- **BUG-PLUGIN-004** — pubmed 429 rate limit — no NCBI API key set; unauthenticated rate limit ~3 req/sec on shared IPs; no retry/backoff logic. Fix: added fetchWithRetry (3 retries, exponential backoff 1s/2s/4s); added NCBI_API_KEY env var support. Deployed: swarmspace-plugin-pubmed.orbitalai.workers.dev version 8f656acf (2026-06-14)
- **BUG-PLUGIN-005** — weather 500 Unauthorized — Worker live but source code not in repo; SWARMSPACE_INTERNAL_TOKEN secret never set. Fix: built new Worker using open-meteo.com (free, no API key); two-step geocode + forecast. Deployed: swarmspace-plugin-weather.orbitalai.workers.dev version d068626f (2026-06-14)
- **BUG-PLUGIN-006** — currency 500 Unauthorized — same as weather: Worker live, no source in repo, SWARMSPACE_INTERNAL_TOKEN never set. Fix: built new Worker using Frankfurter API (api.frankfurter.app, free). Deployed: swarmspace-plugin-currency.orbitalai.workers.dev version 4a36695a (2026-06-14)

### UI / UX

- (none yet)

---

## Individual Bug Records

Detailed bug reports live in [records/](records/). Use the standardized format from [records/_TEMPLATE_BUG_RECORD.md](records/_TEMPLATE_BUG_RECORD.md) when creating new records.

---

## Recent code changes (reference for bug tracker)

| Fix / change | Version | Bug record | Notes |
|--------------|---------|------------|-------|
| Plugin submission portal, Firestore rules, indexes, RULE.md, doc sync | 1.1.4 | — | See CHANGELOG [1.1.4] |
| Admin `plugin_submissions`, security page, developer guide, PRISM docs | 1.1.5 | — | See CHANGELOG [1.1.5]; merged to `main` |
| prism/privacy HTML, PRIVACY.md, Functions lazy-load + firebase-functions 7.2.3 | 1.1.6 | — | See CHANGELOG [1.1.6] |
| `headers is not defined` orchestrator regression — BUG-ORCH-001 | 1.7.0 | inline | Introduced `7fadc23`, fixed `723a20c` |
| MCP quota bypass not propagating — BUG-MCP-001 | 1.7.0 | inline | `_via_mcp` flag never sent from mcp-server; fixed `723a20c` |
| CSP header + `openWorldHint` for OpenAI App Directory | 1.7.0 | — | Kimi K2.6 impl, verified; commit `f1f0d15` |
| 6 plugin Worker fixes — BUG-PLUGIN-001 through -006 | 1.9.0 (pending) | inline | github-public secret; semantic-scholar/weather/currency new Workers; rest-countries rewrite; pubmed retry logic |
