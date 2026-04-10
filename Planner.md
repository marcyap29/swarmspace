# SwarmSpace — Active Plan: Critical Path Unblock
*Started: April 10, 2026*

---

## Status Summary

| Item | Backlog Ref | Status |
|------|-------------|--------|
| Firestore Security Rules (1.3) | CRITICAL | ~~ALREADY DONE~~ |
| authGuard.ts Migration (1.4) | CRITICAL | ~~ALREADY DONE~~ |
| 7 Plugin Workers Deploy (1.1) | CRITICAL | ~~Code fixed, ready for deploy~~ |
| Orchestrator 405 Fix (1.2) | CRITICAL | ~~Code correct, needs redeploy~~ |
| security.html Honesty (2.1) | HIGH | ~~DONE~~ |
| prism.html Honesty (2.1) | HIGH | ~~DONE~~ |
| DEVELOPER_GUIDE.md Honesty (2.4) | HIGH | ~~DONE — 7 of 10 issues fixed~~ |
| OWASP AST10 Compliance (2.1) | HIGH | ~~DONE~~ |
| PRISM Enforcement (2.2) | HIGH | ~~Change A DONE (consent block active)~~ |

---

## Phase 1: Plugin Worker Fixes (pre-deploy)

- [x] Validate all 7 plugin workers (nominatim, rest-countries, github-public, hackernews, dictionary-api, jina-reader, pubmed)
- [ ] Fix missing try/catch on `request.json()` in github-public, hackernews, dictionary-api, jina-reader
- [ ] Fix jina-reader response format inconsistency (wrap in `results` array)
- [ ] Remove unused `summarize` parameter from jina-reader
- [ ] Validate orchestrator code and wrangler.toml — DONE, code is correct

## Phase 2: Documentation Honesty Pass

### security.html (9 claims audited: 0 implemented, 3 partial, 1 logging-only, 5 not implemented)
- [ ] Fix V8 sandboxing claim → "planned API restriction"
- [ ] Fix credential injection claim → "planned"
- [ ] Fix globalOutbound:null claim → "planned"
- [ ] Fix PRISM enforcement claim → "logging only"
- [ ] Fix runtime monitoring claim → "planned"
- [ ] Fix content_hash/signing claim → "planned"
- [ ] Fix merit-based tier claim → "planned"
- [ ] Fix human safety review claim → "partial, manual"
- [ ] Fix trust tier claims → "payment tiers exist, trust tiers planned"

### prism.html (10 claims audited: 0 enforced, 1 logging-only, 9 not implemented)
- [ ] Fix privacy_data_required claim → not a field list, just a boolean
- [ ] Fix Dynamic Worker sandbox claim → static Workers
- [ ] Fix globalOutbound:null claim → not implemented
- [ ] Fix credential injection claim → not implemented
- [ ] Fix context minimization 5-step flow → not implemented
- [ ] Fix behavioral manifest fields claim → not implemented
- [ ] Fix Durable Objects recurring agents → not implemented
- [ ] Fix catalogue/tag-hashes discovery → not implemented
- [ ] Fix runtime monitoring claim → logging only
- [ ] Fix consent blocking → logging only, passthrough

### DEVELOPER_GUIDE.md (10 issues found)
- [ ] A: Remove "Experimental" trust tier (keep only Community, Verified)
- [ ] B: Fix privacy_data_required — reconcile boolean vs string[] with current code
- [ ] C: Add user context field vocabulary table
- [ ] D: Add behavioral manifest fields (is_read_only, is_destructive, etc.)
- [ ] E: Fix endpoint contract section (actual format: {query, limit?} → {results, source, count})
- [ ] F: Fix "Dynamic Worker" → "static Cloudflare Workers"
- [ ] G: Fix plugin ID format (use slug-style, not reverse-domain)
- [ ] H: Reconcile manifest schema divergence with architecture.md
- [ ] I: Fix PRISM enforcement description to match actual state
- [ ] J: Remove phantom plugins not in router

### OWASP_AST10_COMPLIANCE.md
- [ ] Reconcile control naming with official OWASP AST10 v1.0 (2026)
- [ ] Change "Addressed" → "Designed"/"Planned" for AST01, AST02, AST03, AST07, AST08
- [ ] Change → "Partially Implemented" for AST04, AST05, AST06, AST09
- [ ] Keep AST10 (observability) as "Implemented"

## Phase 3: PRISM Enforcement (code changes)

- [ ] Change A: Activate consent block at swarmspaceRouter.ts:455 (remove passthrough)
- [ ] Change B: Upgrade privacy_data_required from boolean to PrivacyTier enum
- [ ] Change C: Add field-level context minimization (future — requires client changes)

## Phase 4: Deployment (user action required)

- [ ] Deploy 7 plugin workers via `wrangler deploy` (each needs `SWARMSPACE_INTERNAL_TOKEN` secret)
- [ ] Redeploy orchestrator via `wrangler deploy`
- [ ] Deploy updated Firestore rules (already current)
- [ ] Redeploy Firebase functions after PRISM changes
- [ ] Test all 12 orchestrator routes end-to-end
