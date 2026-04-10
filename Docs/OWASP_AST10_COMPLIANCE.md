# SwarmSpace OWASP AST10 Compliance Posture
*Orbital AI — March 2026*

## Status Legend

| Status | Meaning |
|--------|---------|
| **Implemented** | Code exists and is enforced in production |
| **Partially Implemented** | Some controls are enforced in code; gaps remain |
| **Designed** | Spec fields and architecture defined; no runtime enforcement yet |
| **Planned** | Acknowledged but not yet designed or built |

## Overview

The OWASP Agentic Skills Top 10 (AST10), published March 2026, is the first comprehensive security framework for AI agent skills. SwarmSpace aligns with AST10 as a core trust differentiator.

> **Naming note:** This document was drafted against a pre-release AST10 taxonomy. The final OWASP AST10 v1.0 (2026 Edition) renamed several controls. Where our internal naming differs from the published standard, the official name is noted in parentheses.

## Compliance Matrix

### AST01 — Malicious Skills
**Status: Designed**
- Manifest spec includes Ed25519 signing and `content_hash` (SHA-256) fields, but no signing or verification code has been implemented yet
- Trust revocation is instant — removing from index disables the plugin universally with no uninstall needed (this is architecturally true today)

### AST02 — Supply Chain Compromise
**Status: Partially Designed**
- Manifest spec includes Ed25519 signing and `content_hash` fields, but no hash verification code exists yet
- No executable uploads — plugins are API endpoints, not installable code (architecturally true today)

### AST03 — Over-Privileged Skills
**Status: Designed**
- `network_permissions`, `deny_write`, and `data_required` fields exist in the manifest spec but have no runtime enforcement
- Intent: `network_permissions` replaces binary network on/off with explicit domain allowlist; `deny_write` protects identity, memory, and context files; `data_required` lists what user data a plugin needs
- No code currently validates or enforces these constraints at execution time

### AST04 — Inadequate Sandboxing *(OWASP official: "Insecure Metadata")*
**Status: Partially Implemented**
- Plugins run as isolated Cloudflare Workers — separate V8 isolates per request (real, enforced)
- No shared state between plugins (architecturally true)
- Plugins cannot access SwarmSpace infrastructure; only the reverse: router calls plugins (real)
- 25-second execution timeout enforced (real)
- **Gap:** Credential isolation — plugin credentials are not yet scoped per-tenant

### AST05 — Insecure Inter-Skill Communication *(OWASP official: "Prompt Injection via Skills")*
**Status: Partially Implemented**
- All inter-service calls authenticated via `SWARMSPACE_INTERNAL_TOKEN` (real, enforced)
- No direct plugin-to-plugin communication path exists (architecturally true)
- **Gap:** Output schema validation is not yet implemented — plugin responses are not validated against a declared schema before being passed to agents

### AST06 — Insufficient User Consent *(OWASP official: "Weak Isolation")*
**Status: Designed, Not Enforced**
- Manifest spec defines `privacy_data_required`, `data_required`, and `_prism_consent` fields for consent tracking
- Consent passthrough exists at `swarmspaceRouter.ts:455` but is not enforced as a gate — plugins can be invoked without confirmed consent
- Activity log records plugin calls with privacy metadata (real)

### AST07 — Update Drift
**Status: Designed**
- Manifest spec includes a `version_pinning` field, but no pinning or version-check code exists yet
- Alerting on plugin updates and re-review flagging are planned but not implemented

### AST08 — Poor Scanning
**Status: Partially Addressed**
- `scan_status` field records scanner version and results in manifest
- Schema validation on all submissions
- LLM-based consistency analysis of `capability` vs `data_required` fields
- **Gap:** Full behavioral/semantic scanning pipeline not yet deployed (currently manual review)

### AST09 — No Governance
**Status: Partially Implemented**
- Trust tiers (community/verified) gate plugin access in production (real, enforced)
- `risk_tier` field (L0–L3) exists in the manifest spec but is not enforced at runtime
- Monthly merit reviews (manual at launch, tooling planned)

### AST10 — Lack of Observability *(OWASP official: "Cross-Platform Reuse")*
**Status: Implemented**
- `plugin_activity_log` collection records every plugin call with:
  - User ID, plugin ID, tier, privacy metadata, consent status, result, error messages
- PRISM transaction logging at pre-invoke and post-invoke phases
- Dashboard stat cards show live usage data

## OWASP "Lethal Trifecta" Mapping

OWASP defines the lethal trifecta as three capabilities that, combined, create maximum risk:
1. **Access to private data** — SwarmSpace: `data_required` field + PRISM consent flow (designed, not enforced)
2. **Exposure to untrusted content** — SwarmSpace: output schema validation (planned, not implemented) + untrusted data wrapping
3. **Ability to communicate externally** — SwarmSpace: `network_permissions` allowlist + `deny_write` protection (spec-only, no runtime enforcement)

PRISM consent fields are defined in the manifest spec; runtime enforcement is not yet in place. Full lethal trifecta coverage requires implementing the controls listed in the Compliance Timeline.

## Compliance Timeline

| Milestone | Status |
|---|---|
| Manifest spec aligned with AST10 fields | Complete (spec only — no runtime enforcement) |
| PRISM consent flow for privacy-sensitive plugins | Designed, not enforced |
| Activity logging and observability | Complete |
| Ed25519 manifest signing for Verified tier | Designed (no signing code exists) |
| Runtime enforcement of `network_permissions`, `deny_write`, `risk_tier` | Planned |
| Output schema validation for plugin responses | Planned |
| Version pinning and update alerting | Planned |
| Behavioral scanning pipeline | Planned |
| Public compliance page on swarmspace.vercel.app | Planned |
