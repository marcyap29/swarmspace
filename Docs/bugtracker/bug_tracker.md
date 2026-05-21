# SwarmSpace Bug Tracker

**Version:** 1.0.1  
**Last Updated:** 2026-05-20  
**Record count:** 0 individual bug records in [records/](records/) — 2 inline entries below (no full records needed for fixed one-commit bugs)

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
