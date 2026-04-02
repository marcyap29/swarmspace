# SwarmSpace OWASP AST10 Compliance Posture
*Orbital AI — March 2026*

## Overview

The OWASP Agentic Skills Top 10 (AST10), published March 2026, is the first comprehensive security framework for AI agent skills. SwarmSpace aligns with AST10 as a core trust differentiator.

## Compliance Matrix

### AST01 — Malicious Skills
**Status: Addressed**
- All Verified plugins require Ed25519 cryptographic signing
- `content_hash` field (SHA-256) verified at listing and runtime
- Trust revocation is instant — removing from index disables the plugin universally with no uninstall needed

### AST02 — Supply Chain Compromise
**Status: Addressed**
- Manifest signing with Ed25519 prevents tampering
- `content_hash` re-verified before every execution for Verified tier
- No executable uploads — plugins are API endpoints, not installable code

### AST03 — Over-Privileged Skills
**Status: Addressed**
- `network_permissions` field replaces binary network on/off with explicit domain allowlist
- `deny_write` field protects identity, memory, and context files (maps to LUMARA CHRONICLE and PRISM)
- `data_required` field explicitly lists what user data a plugin needs — agents pass only those fields

### AST04 — Inadequate Sandboxing
**Status: Addressed via Architecture**
- Plugins run as isolated Cloudflare Workers — separate V8 isolates per request
- No shared state between plugins
- Plugins cannot access SwarmSpace infrastructure (only the reverse: router calls plugins)
- 25-second execution timeout enforced

### AST05 — Insecure Inter-Skill Communication
**Status: Addressed**
- All inter-service calls authenticated via `SWARMSPACE_INTERNAL_TOKEN`
- Plugin responses treated as untrusted data by agents (output schema validation)
- No direct plugin-to-plugin communication path exists

### AST06 — Insufficient User Consent
**Status: Addressed (PRISM)**
- Plugins with `privacy_data_required: true` trigger PRISM consent flow
- `data_required` field is displayed to users before activation
- `_prism_consent` parameter tracks explicit user approval
- Activity log records all plugin calls with privacy metadata

### AST07 — Update Drift
**Status: Addressed**
- `version_pinning` field requires Verified plugins to pin dependency versions to immutable hashes
- SwarmSpace alerts users when a previously-scanned plugin updates
- Updated plugins flagged for re-review before continued execution

### AST08 — Poor Scanning
**Status: Partially Addressed**
- `scan_status` field records scanner version and results in manifest
- Schema validation on all submissions
- LLM-based consistency analysis of `capability` vs `data_required` fields
- **Gap:** Full behavioral/semantic scanning pipeline not yet deployed (currently manual review)

### AST09 — No Governance
**Status: Addressed**
- `risk_tier` field enables automated governance: L0=safe, L1=low, L2=elevated, L3=destructive
- Trust tiers (experimental/community/verified) gate which risk tiers are accessible
- Monthly merit reviews (manual at launch, tooling planned)

### AST10 — Lack of Observability
**Status: Addressed**
- `plugin_activity_log` collection records every plugin call with:
  - User ID, plugin ID, tier, privacy metadata, consent status, result, error messages
- PRISM transaction logging at pre-invoke and post-invoke phases
- Dashboard stat cards show live usage data

## OWASP "Lethal Trifecta" Mapping

OWASP defines the lethal trifecta as three capabilities that, combined, create maximum risk:
1. **Access to private data** — SwarmSpace: `data_required` field + PRISM consent flow
2. **Exposure to untrusted content** — SwarmSpace: output schema validation + untrusted data wrapping
3. **Ability to communicate externally** — SwarmSpace: `network_permissions` allowlist + `deny_write` protection

PRISM addresses all three. This mapping substantiates privacy claims in the Developer Agreement.

## Compliance Timeline

| Milestone | Status |
|---|---|
| Manifest spec aligned with AST10 fields | Complete |
| PRISM consent flow for privacy-sensitive plugins | Complete |
| Activity logging and observability | Complete |
| Ed25519 manifest signing for Verified tier | Complete |
| Behavioral scanning pipeline | Planned |
| Public compliance page on swarmspace.vercel.app | Planned |
