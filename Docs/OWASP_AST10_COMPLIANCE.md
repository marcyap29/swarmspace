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

> **Naming note:** This document was drafted against a pre-release AST10 taxonomy. The final OWASP AST10 v1.0 (2026 Edition) renamed several controls. Headings now use the official OWASP names; former internal names are retained as "(formerly: X)" for one version cycle.

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

### AST04 — Insecure Metadata (formerly: Inadequate Sandboxing)
**Status: Partially Addressed**
- Inconsistent or misleading metadata formats allow skill impersonation and misrepresentation
- Manifest schema validation on all plugin submissions (real, enforced)
- `scan_status` field records scanner version and results in the manifest
- LLM-based consistency analysis of `capability` vs `data_required` fields
- Structured, typed metadata fields in manifest spec (`capability`, `data_required`, `network_permissions`, etc.)
- **Gap:** No runtime enforcement of metadata accuracy — a plugin's declared capabilities may differ from its actual behavior; Ed25519 metadata signing is spec-only (no verification code exists)

### AST05 — Unsafe Deserialization (formerly: Insecure Inter-Skill Communication)
**Status: Partially Implemented**
- YAML/JSON/Markdown deserialization vulnerabilities enable code execution on skill load
- Plugins are API endpoints, not installable code — no local deserialization of executable plugin content (architecturally true)
- No YAML or Markdown executable loading occurs in the plugin pipeline
- JSON schema validation on all plugin submissions
- **Gap:** Plugin JSON responses are not validated against a declared output schema before being passed to agents, leaving a vector for malformed or adversarial output injection

### AST06 — Weak Isolation (formerly: Insufficient User Consent)
**Status: Partially Implemented**
- Running skills without containerization/sandboxing exposes the host system
- Plugins run as isolated Cloudflare Workers — static, pre-deployed V8 isolates (not dynamically created per request); each invocation runs in its own isolate with no shared mutable state (real, enforced)
- No shared state between plugins (architecturally true)
- Plugins cannot access SwarmSpace infrastructure; only the reverse: router calls plugins (real)
- 25-second execution timeout enforced (real)
- **Gap:** Credential isolation — plugin credentials are not yet scoped per-tenant

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
- Subscription-based access tiers (Free/Standard/Premium) gate plugin access in production (real, enforced); trust-based quality tiers (community/verified) are planned but not yet enforced
- `risk_tier` field (L0–L3) exists in the manifest spec but is not enforced at runtime
- Monthly merit reviews (manual at launch, tooling planned)

### AST10 — Cross-Platform Reuse (formerly: Lack of Observability)
**Status: Designed**
- Security properties lost when skills are ported across platforms without translation
- Plugins are HTTP API endpoints, inherently platform-agnostic by design
- Manifest spec defines security properties (`network_permissions`, `deny_write`, `risk_tier`) that travel with the plugin declaration
- **Gap:** Security properties defined in the manifest are only enforced within the SwarmSpace runtime — when plugins are accessed outside the SwarmSpace router (e.g., direct API calls), declared security properties have no enforcement mechanism; no cross-platform security property translation or verification exists

## OWASP "Lethal Trifecta" Mapping

OWASP defines the lethal trifecta as three capabilities that, combined, create maximum risk:
1. **Access to private data** — SwarmSpace: `privacy_data_required` string[] field + PRISM consent flow (enforced in router: blocks unconsented calls, strips undeclared fields)
2. **Exposure to untrusted content** — SwarmSpace: output schema validation (planned, not implemented) + untrusted data wrapping
3. **Ability to communicate externally** — SwarmSpace: `network_permissions` allowlist + `deny_write` protection (spec-only, no runtime enforcement)

PRISM consent gating and context field filtering are enforced in the router. Items 2 and 3 (output validation and network restrictions) remain spec-only. Full lethal trifecta coverage requires implementing the controls listed in the Compliance Timeline.

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
