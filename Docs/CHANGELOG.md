# SwarmSpace Changelog

**Version:** 1.7.0
**Last Updated:** 2026-05-20

---

## [1.7.0] - 2026-05-20 — OpenAI App Directory submission + MCP quota fix

### Added

- **`chatgpt-app-submission.json`** — Full OpenAI App Directory submission schema at repo root. Schema v1, 13 tools with `justifications` objects (snake_case keys), 7 positive test cases, 3 negative test cases. Ready to submit pending demo recording.
- **Hero logo overhaul** — Replaced `logo.svg` with landscape `SwarmSpace_Logo.svg` (1598×1031, transparent background). Centered above hero grid at `max-width:680px`, hero padding tightened to `56px 40px 80px`.

### Fixed

- **BUG-ORCH-001: `headers is not defined` in orchestrator** — commit `7fadc23` accidentally deleted the `headers` variable declaration while adding `_via_mcp` data mutation. Restored in `723a20c`; also moved `if (ctx.viaMcp) data._via_mcp = true;` outside the service-token block so all MCP calls propagate the flag unconditionally.
- **BUG-MCP-001: MCP quota bypass not propagating end-to-end** — mcp-server never included `_via_mcp: true` in outbound request body, so `isMcpSession` was always false in `swarmspaceRouter`; admin user was hitting the 20/day free-tier cap over MCP. Fixed: mcp-server SSE and sync paths now send `{ ...body, _via_mcp: true }`; orchestrator context propagates unconditionally. Admin unlimited over MCP confirmed working.
- **SVG logo background** — Changed `fill="#020202"` → `fill="none"` so logo background matches any page background.

### Changed

- **mcp-server CSP header** — `Content-Security-Policy: default-src 'none'; connect-src https://www.googleapis.com` added to `corsHeaders()` for OpenAI App Directory compliance (commit `f1f0d15`).
- **`openWorldHint: true`** — Added to all 13 tool definitions in `workers/mcp-server/src/tools.ts` per OpenAI submission requirements (commit `f1f0d15`).

### Deployments
- mcp-server: Cloudflare worker `707aec0c` (f1f0d15), `35ec6f27` (723a20c)
- orchestrator: Cloudflare worker `ff5aa88b` (723a20c)
- index.html: Vercel (17ea561)

---

## [1.6.0] - 2026-05-19 — Milestone: SwarmSpace Initially Working 🚀

This release marks the first complete end-to-end working state of SwarmSpace: MCP Remote Server live with OAuth 2.1, all 15 plugin Workers deployed, service binding in place, and ready for marketplace submission.

### Added

- **Cloudflare Service Binding (mcp-server → orchestrator)** — `workers/mcp-server` now calls the orchestrator via `env.ORCHESTRATOR: Fetcher` (Cloudflare Service Binding) instead of HTTP egress. Eliminates network hop and egress cost; inherits platform CPU time budget (removed `AbortSignal.timeout`).
- **SwarmSpace logo + favicon** — Logo added to nav and hero section on `index.html`; square SVG favicon added for directory listing.

### Fixed

- **Orchestrator service-token auth** — Service-token bypass path in `workers/orchestrator/src/index.js` no longer sends an `Authorization` header. Firebase Functions v2 rejects non-JWT at the runtime layer before the handler; bypass relies on `request.data._service_token` only.
- **MCP token pipeline** — Token sync hardened; OAuth user provisioning flow corrected so newly registered OAuth clients receive properly scoped tokens.

### Changed

- **`DOCS/claude.md` v1.6.3 → v1.6.4** — Removed ~216 lines of duplicate content (Task Management SOP, Core Documentation, Documentation Update Rules, Role prompt block, sub-agent prompt expansions). Fixed `Planner.md` → `planner.md` invariant violation in SOP-PLAN. Fixed all remaining `Docs/` path references → `DOCS/`. Replaced dangling `SOP-REVIEW` reference with `SOP-ORCH reviewer step`. Footer version corrected from 1.5.1 to 1.6.4.

### Milestone Status

| Component | Status |
|---|---|
| MCP Remote Server (`swarmspace-mcp-server.orbitalai.workers.dev`) | ✅ Live |
| OAuth 2.1 AS (DCR, PKCE, refresh rotation, Streamable HTTP) | ✅ Live |
| All 15 plugin Workers | ✅ Deployed |
| Cloudflare Service Binding (mcp→orchestrator) | ✅ Live |
| Marketplace submission (Anthropic + OpenAI) | 🟡 Ready — pending submission |

---

## [1.5.3] - 2026-05-15

### Added

- **MCP OAuth 2.1 Authorization Server** — `workers/mcp-server/src/index.ts` upgraded from HMAC-only to a full OAuth 2.1 Authorization Server. New endpoints: `POST /oauth/register` (RFC 7591 Dynamic Client Registration), `GET /oauth/authorize`, `POST /oauth/authorize/complete` (Firebase ID token consent callback), `POST /oauth/token` (authorization code + refresh token grants). PKCE S256 enforced on all authorization code flows. Refresh token rotation mandatory per OAuth 2.1. Public client model (no `client_secret`).
- **RFC 8414 Authorization Server Metadata** — `GET /.well-known/oauth-authorization-server` returns full metadata JSON including all endpoint URLs, supported grant types, PKCE methods, and scopes.
- **RFC 9728 Protected Resource Metadata** — `GET /.well-known/oauth-protected-resource` returns resource + authorization server pointer. Required by current MCP spec for client discovery.
- **RFC 8707 `resource` parameter** — enforced on both `GET /oauth/authorize` and `POST /oauth/token`. Requests without `resource` return 400.
- **Streamable HTTP SSE** — `POST /mcp` now detects `Accept: text/event-stream` on `tools/call` requests and returns a streaming `text/event-stream` response via `TransformStream`. All other methods (`initialize`, `tools/list`, `notifications/initialized`) remain synchronous JSON.
- **MCP protocol version `2025-06-18`** — `protocolVersion` field updated; `MCP-Protocol-Version: 2025-06-18` response header added to all `/mcp` responses.
- **`WWW-Authenticate` header on 401** — includes `resource` and `resource_metadata` pointers per RFC 9728.
- **`oauth-consent.html`** — new Firebase login/consent page deployed to Vercel at `swarmspace.app/oauth-consent.html`. Supports email and Google sign-in (Firebase SDK 10.12.0, project `arc-epi`). Posts `firebase_id_token` + `login_state` to `/oauth/authorize/complete` and redirects on success.
- **Cloudflare KV namespaces** — three new KV namespaces created and bound: `OAUTH_CLIENTS` (`7d638fbc0c3449e0a3127db8cf27db5d`), `OAUTH_CODES` (`b600c0991fda48b69b0ebd31f67f98b5`), `OAUTH_TOKENS` (`aade11e503d644c5849d75e56d15eca4`).
- **`workers/mcp-server/tsconfig.json`** — new file. `target: ES2022`, `module: ES2022`, `moduleResolution: Bundler`, `types: ["@cloudflare/workers-types"]`.

### Changed

- **MCP manifest `auth.type`** — changed from `hmac` to `oauth2`; `authorization_url`, `token_url`, `registration_url`, and `scopes` added to manifest at `/.well-known/mcp/manifest.json`.
- **Token validation** — `getUid()` now checks OAuth KV token first (SHA-256 hash lookup in `OAUTH_TOKENS`), falls back to legacy HMAC `ss_mcp_` key validation. Existing API key users are unaffected.
- **New secrets** — `OAUTH_ISSUER` and `FIREBASE_PROJECT_ID` added via `wrangler secret put`. `MCP_KEY_SECRET` and `SWARMSPACE_INTERNAL_TOKEN` unchanged.

### Deployment

- Worker deployed 2026-05-15, version `c5aa5f33-b20f-4a13-a87c-360285db8610`
- `wt/mcp-oauth` worktree merged to `main` with `--no-ff`; pushed to GitHub

---

---

## [1.5.2] - 2026-05-01

### Added

- **§4.4 `/catalogue/updates` (extended `swarmspacePluginCatalog`)** — accepts new optional params `since` (ISO timestamp) and `interest_tags` (string[]). When `since` is provided, returns only plugins with `deployed_at > since`, sorted descending; rate-limited to 1 call per 6 hours per UID via new Firestore collection `catalogue_update_rate_limits`. Tags are SHA-256-hashed (lowercased input, first 16 hex chars) and matched against the same hashing applied to plugin `capabilities`. Unblocks LUMARA's session-start delta discovery. Backwards-compatible: existing callers without `since` see no behavior change. Commit `891ccc2`.
- **§22 Meeting Prep — SwarmSpace half** — three pieces:
  - New `/meeting-prep` orchestrator route (`workers/orchestrator/src/index.js`): parallel web + LinkedIn search via `brave-search`, LinkedIn page fetch via `jina-reader`, synthesis via `gemini-flash`. CHRONICLE context and document snippets are passed by LUMARA as string params and never flow through the plugin registry or PRISM.
  - New `calendar-reader` Cloudflare Worker (`workers/plugins/calendar-reader/`): wraps Google Calendar API v3, reads upcoming events, returns structured `{events, source, count}`. Standard tier. Returns `calendar_auth_expired` on Google 401 so LUMARA can refresh and retry.
  - New `calendar-reader` entry in `PLUGIN_REGISTRY` in `swarmspaceRouter.ts` (Standard tier, STRUCTURED_PERSONAL privacy). Extended `PluginConfig` with optional manifest behavioral fields: `is_read_only`, `is_destructive`, `schedulable`, `headless`. Commits `e165496` + `b2e4fd5` + (this commit).
- **§5.2 News Briefing Durable Object v1 (API-only)** — new `workers/durable-objects/news-briefing/` Worker. Three HTTP routes: `POST /durable-objects/news-briefing/create` (tier-gated; `free` rejected with `403 paid_tier_required`), `POST /durable-objects/news-briefing/cancel`, `GET /durable-objects/news-briefing/{do_id}/latest`. `NewsBriefingDO` class extends `DurableObject` from `cloudflare:workers`, stores config + previous output in SQLite, fires alarms (daily/weekly), calls orchestrator's `/news-brief` with service-token bypass auth, computes delta against previous run. Tier gate reads `users/{uid}.plan` from Firestore via REST + service-account JWT. LUMARA wires the "keep watching this" UI later. Commit `306983a`.
- **Service-token bypass auth path** on `swarmspaceRouter` (`functions/src/functions/swarmspaceRouter.ts`) — when `request.data._service_token` matches `SWARMSPACE_INTERNAL_TOKEN` AND `_run_as_uid` is provided, skips Firebase ID token verification and runs as that uid. Required by §5.2 DO at alarm time when no user-bound Firebase ID token is available. Internal-infrastructure-only; existing LUMARA-app callers (Firebase ID token path) unchanged. Orchestrator's `callPlugin` propagates these headers in the data envelope when present. Commit `b2e4fd5`.

### Changed

- **`backlog.md` §22 spec correction** — original spec mislabeled L-1 ("add `calendar-reader` to PLUGIN_REGISTRY") as a LUMARA task, but `swarmspaceRouter.ts` lives in the SwarmSpace repo per `Docs/CLAUDE.md` Cross-Repo Ownership Rules. LUMARA Claude confirmed via pre-flight `ls` that no swarmspace-prefixed functions live in their repo. Relocated as **SS-5** in §SwarmSpace Tasks. SS-2's stale "LUMARA task L-1" pointer updated to "SS-5". LUMARA tasks renumbered L-2→L-1, L-3→L-2, L-4→L-3. New L-4 added: allowlist `/meeting-prep` in `SwarmSpaceOrchestratorService.v1RouteSet` (LUMARA-side gate flagged by LUMARA Claude during pre-flight, missed by original spec).
- **`.gitignore`** — added `node_modules/` so the new `workers/durable-objects/news-briefing/` Worker can carry `package.json` + `package-lock.json` without committing dependencies.
- **`PluginConfig` interface** in `swarmspaceRouter.ts` — added optional fields `is_read_only`, `is_destructive`, `schedulable`, `headless` (forward-looking; per §22 manifest spec and backlog §6 Layer 3 manifest-v2). Currently no consumer in the router; metadata only.

---

## [1.5.1] - 2026-05-01

### Security

- **Credential isolation (§2.3)** — `swarmspaceRouter` now injects `GITHUB_TOKEN`, `JINA_API_KEY`, and `NCBI_API_KEY` per-request into worker bodies. `github-public`, `jina-reader`, and `pubmed` workers read credentials from request body; env declarations removed. Plugin Workers no longer hold long-lived secrets. Commit `4311c49`.
- **Gemini API key removed from repo + history** — Server-side Gemini key was redacted from `functions/SETUP_API_KEYS.md` and rewritten across all 137 commits via `git filter-repo`; force-pushed to `origin/main`. `scripts/get-test-token.js` removed from tracking and added to `.gitignore`. Commit `af723ea`. **User action:** rotate the key in Google AI Studio (force-push removes from future clones but the key may have been cached).

### Added

- **§16 Roles browsing page** (`roles.html`) — End-user surface for Work Chains. 6 cards (5 Free, 1 Standard) with role name + tagline, expandable plugin chain detail, tier badge, and signed-in/guest CTAs. Linked from `index.html` nav. Commit `cd71c9c`.
- **§12 Phase 2 discovery agent JS complete** — `index.html` discovery agent now handles `requires_paid` chains, mobile 375px breakpoint, 3-turn gate with signup link, 429 rate-limit message with signup link, and `.chain-paid` styling. Commit `0e2e85c`.
- **`Docs/Agents.md` cross-repo dependency rule** — Every SwarmSpace feature must explicitly state whether it has a LUMARA dependency. References `LUMARA_SWARMSPACE_FUNCTIONS_INTEGRATION.md` and the `useOrchestrator` flag location. Commit `36fa6e3`.

### Changed

- **`Docs/claude.md` → v1.5.1** — Removed all `Docs/RULE.md` references (RULE.md was deleted in 1.5.0 but pointers remained). Removed all `overview.md` references (canonical filename is `Swarmspace_Overview.md`). Refreshed Backlog Sections Reference table (§12 Phase 2 done, §16 done). Fixed version footer (was 1.3.0). Updated File Structure to include `Agents.md`, `context.md`, `CHRONICLE.md`, and `roles.html`.
- **`Docs/CONFIGURATION_MANAGEMENT.md`** — Key Documents table cleaned of stale references; inventory refreshed; `roles.html` and `Docs/context.md` added.

### Removed

- **`Planner.md` (uppercase)** — Removed from git index. Case-collided with lowercase `planner.md` (the canonical filename used throughout the SOPs). Two distinct blobs were tracked despite macOS case-insensitive FS hiding the conflict; would have broken Linux/CI checkouts.
- **Unused Cloud Functions** — Deleted `getAssemblyAIToken`, `getWisprApiKey`, `proxyOllama`. Commit `d293bd5`.
- **Orphaned `workers/plugin-registry/`** — Stub worker with 3/22 plugins, not wired to any frontend or Firebase function. Commit `4311c49`.
- **`social-publisher` plugin** — Removed from plugin registry; stateful OAuth model doesn't fit the stateless plugin contract. Commit `4311c49`.

---

## [1.5.0] - 2026-04-19

### Fixed

- **Orchestrator `_prism_consent: true`** — Added implicit PRISM consent flag to all `callPlugin()` calls in `workers/orchestrator/src/index.js`. Orchestrator-initiated workflow calls were being blocked by PRISM consent gating; consent is now implicitly granted for first-party orchestrator workflows.
- **`swarmspaceRouter` gemini-flash PRISM fields** — Added `"prompt"` to `privacy_data_required` and `dataTypes` for the gemini-flash plugin. PRISM was stripping the prompt field before gemini-flash received it, breaking synthesis.
- **Lazy-load `admin.firestore()` propagated to LUMARA functions** — Applied `getDb()` pattern to `authGuard.ts`, `stripeWebhook.ts`, `analyzeJournalEntry.ts`, `createCheckoutSession.ts`, `generateJournalPrompts.ts`, `getUserSubscription.ts`, `sendChatMessage.ts`, `unlockThrottle.ts`, `quotaGuards.ts`, `rateLimiter.ts`, `saveUserModelConfig.ts`, `crisisIntervention.ts`, `prism/rivet/resolve.ts`. Fixes Firebase 10s deployment timeout across all shared functions.

### Changed

- **`firebase-functions` bumped `^7.2.3` → `^7.2.5`** in `functions/package.json`.
- **`SWARMSPACE_API_CONTEXT.md`** — Added full Workflow / Work Chain API documentation: 12 orchestrator routes, authentication, common request/response envelope, timeout contract, and detailed contracts for `/research`, `/news-brief`, and `/competitor` (remaining 9 follow same pattern).
- **`Docs/claude.md` → v1.4.0** — Added `earnings.html` to Quick Reference; added Backlog Sections Reference table.
- **`backlog.md`** — Recorded discoveries: Stripe Connect partial build in Vercel API layer (§3.3), `agent-worker` plan/execute prototype (§5.3), orphaned plugin-registry worker (§5.5). Updated §7.1 / §8 with `useOrchestrator` flag location in LUMARA.
- **`Docs/RULE.md` deleted** — Removed; rules consolidated into `Docs/claude.md` SOPs.

### Added

- **`scripts/test-workflows.sh`** — Live smoke-test script for 3 primary workflows (research, competitor, news-brief).
- **`scripts/get-test-token.js`** — Helper to retrieve a Firebase ID token for manual API testing.
- **`Docs/CHRONICLE.md`** — CHRONICLE summary generation and layered compression reference.
- **`Docs/Agents.md`** — Agent prompt rules reference.

### Verified

- **Community launch gate CLEARED** — All 3 required workflows pass live smoke tests: `/research` (brave-search + wikipedia + semantic-scholar + gemini-flash), `/competitor` (brave-search + news + hackernews + gemini-flash), `/news-brief` (news + hackernews + brave-search + gemini-flash). 3/3, 0 failures.

---

## [1.4.1] - 2026-04-13

### Added

- **validatePluginSubmission v2 automated validation pipeline** — Ajv JSON Schema validation for fetched plugin manifests (draft-07).
- **3-sample latency profiler** with p50/p95 and `latency_class` comparison.
- **Security header audit** (6-check weighted score: HSTS, X-Content-Type-Options, Content-Type, X-Frame-Options, CSP, HTTPS).
- **Network domain DNS validation** with private IP detection.
- **7 prompt injection probes** (system prompt leak, instruction override, role confusion, data exfil, SQL injection, XSS, path traversal).
- **90-second timeout budget** with graceful degradation.
- **`validation_version` and `validated_at` fields** in validation response.

### Changed

- **Function timeout** increased from 30s to 120s.
- **Added `ajv` and `ajv-formats` dependencies** to `functions/package.json`.

---

## [1.4.0] - 2026-04-13

### Added

- **PRISM enforcement in `swarmspaceRouter`** — `PrivacyTier` enum, context field filtering, consent gating per privacy tier.
- **Developer Submission Portal (3.1)** — `onSubmissionStatusChange.ts` Firestore trigger for promotion pipeline.
- **Developer plugin merge in `swarmspaceRouter`** — TTL-cached (5 min) loading from `approved_plugins` collection.
- **Resubmission flow** for rejected/needs-info plugin submissions.
- **Real-time developer status dashboard** with `onSnapshot` listeners.
- **Plugin revocation handling** — approved → rejected removes from `approved_plugins`.

### Fixed

- **Orchestrator plugin ID mismatches:** `newsapi` → `news`, `open-meteo` → `weather`, `exchange-rates` → `currency`.
- **SSRF protection in `validatePluginSubmission`** — `isPrivateUrl`, redirect blocking, IPv4-mapped IPv6, carrier-grade NAT.
- **Endpoint reachability hardened:** 5xx/timeout now blocking errors, response shape validation.
- **Duplicate detection** for plugin submissions (same name/endpoint in pending/approved).
- **Validation check result shape mismatch** in `submit-plugin.html` (was reading wrong property names).

### Changed

- **Documentation honesty pass:** `security.html`, `prism.html`, `OWASP_AST10_COMPLIANCE.md`, `DEVELOPER_GUIDE.md` — removed false claims, added transparency notes.
- **AST10 compliance page:** 4 renamed categories to official OWASP names with _(formerly: X)_ annotations.
- **Developer Guide:** removed Experimental tier, changed `privacy_data_required` to `string[]`, added PRISM fields.
- **Trust tier claim corrected** in AST09 (designed not enforced).
- **5 new form fields in `submit-plugin.html`:** `access_tier`, `capabilities`, `example_query`, `version`, `rate_limits`.
- **Extended server-side schema validation** for new fields (`access_tier` + `capabilities` now required).

---

## [1.3.0] - 2026-04-11

### Added

- **Discovery Agent (`swarmspaceDiscoveryAgent`)** — Natural-language plugin/workflow discovery, homepage chat UI, IP rate limiting, multi-turn sessions.
- **Founding Developer Programme** — `swarmspaceClaimFoundingSpot` Cloud Function, `founding-developers.html` landing page, seed script.
- **`developer-guide.html`** — HTML conversion of DEVELOPER_GUIDE.md with styled code blocks and table of contents.
- **Chain-to-signup handoff** — Discovery chain preserved through auth flow to dashboard.
- **Firestore collections:** `founding_programme`, `discovery_rate_limits`, `discovery_sessions`.
- **Founding Developers link** in homepage Resources section and footer.

### Fixed

- **Discovery Agent `invoker: "public"`** — Unauthenticated access was returning 403.
- **Gemini model updated to `gemini-3-flash-preview`** — 2.0 model deprecated and returning 404.
- **Stray CSS backticks in `index.html`** breaking nav layout.

---

## [1.2.0] - 2026-04-11

### Added

- **7 new free plugin workers:** nominatim, rest-countries, github-public, hackernews, dictionary-api, jina-reader, pubmed.
- **`ast10.html`** — AST10 (OWASP Agentic Security Top 10) compliance page.
- **`validatePluginSubmission` Cloud Function** — Server-side manifest validation and endpoint reachability checks.
- **`swarmspaceWriteCapabilities` Cloud Function** — Firestore real-time sync for LUMARA capability discovery.
- **Enriched `swarmspacePluginCatalog` response** — Now includes chains, pricing, capabilities, and deploy dates.
- **12 orchestrator workflow chain definitions** added to the plugin catalog.
- **`LUMARA_SWARMSPACE_FUNCTIONS_INTEGRATION.md`** — Cross-repo function ownership documentation.
- **Resources section on landing page** with links to all key pages.
- **`swarmspace_capabilities` Firestore collection** + corresponding security rules.

### Fixed

- **Orchestrator 405 error** — Redeployed to resolve method-not-allowed responses.
- **PRISM consent enforcement** — Was logging-only; now actively blocks unconsented calls.
- **Plugin worker error handling** — Added try/catch on `request.json()` for github-public, hackernews, dictionary-api, jina-reader.
- **jina-reader response format** — Wrapped output in `results` array for consistency.
- **Landing page (`index.html`)** — Removed phantom Reddit plugin, added Dictionary API, fixed 4 slug mismatches.
- **`upgrade.html`** — Removed 5 phantom plugins, added 4 real missing plugins.
- **`faq.html`** — Renamed SwarmStore to SwarmSpace (~61 occurrences).
- **Stray CSS backticks in `index.html`** breaking nav layout.

### Changed

- **Documentation honesty pass:** `security.html`, `prism.html`, `DEVELOPER_GUIDE.md`, `OWASP_AST10_COMPLIANCE.md` — removed aspirational language, aligned with actual implementation.
- **`architecture.md`** — Reconciled with codebase (manifest format, plugin counts, trust tiers).
- **`DEVELOPER_GUIDE.md`** — Removed Experimental tier, fixed `privacy_data_required` to boolean, corrected endpoint contract.
- **Firestore rules** — Added `swarmspace_capabilities` collection.

---

## [1.1.6] - 2026-04-06

### Added

- **`prism.html`** — Public PRISM context-minimization reference (linked from landing, privacy, and security footers).
- **`privacy.html`** — Public privacy policy page; cross-links PRISM and security pages.
- **`Docs/PRIVACY.md`** and **`Privacy.md`** — Markdown privacy policy (companion to the HTML page).

### Changed

- **`index.html`** — Navigation and footer updates for PRISM and privacy routes.
- **`security.html`** — Content updates; footer links corrected (`/security.html`, `/prism.html`, `/privacy.html`).
- **`functions`** — Lazy `import()` for `@google-cloud/vision` and `@google/generative-ai` in `visionOcrInvoke` and `proxyGemini` so Firebase deploy discovery stays within timeout; `firebase-functions` bumped to **^7.2.3**; `scripts/deploy-functions.sh` executable bit set.
- **Documentation** — README file tree; FEATURES; backend Functions note; CONFIGURATION_MANAGEMENT; claude.md; bugtracker (doc-config-git-backup).

---

## [1.1.5] - 2026-04-04

### Added

- **`DEVELOPER_GUIDE.md`** — End-to-end developer reference: manifest field table, JSON Schema draft-07, endpoint requirements, submission checklist.
- **`security.html`** — Public security & trust architecture page (OWASP Agentic Top 10 alignment, PRISM, tiers, limitations); linked from landing, dashboard, signup, upgrade.

### Changed

- **`admin-submissions.html`** — Reads and updates **`plugin_submissions`** (was `submissions`); maps review fields (`status`, `review_notes`, `reviewed_at`, `reviewed_by`) consistent with the submit portal.
- **`firestore.rules`** — `isPluginSubmissionAdmin()` allowlist; developers read own rows; admins read all submissions; admin **update** only when `developer_uid` unchanged and changed keys limited to `status`, `review_notes`, `reviewed_at`, `reviewed_by`.
- **`firestore.indexes.json`** — Composite indexes cleared (portal uses equality on `developer_uid` plus client-side sort by `submitted_at`).
- **`submit-plugin.html`** — Query without composite index; sort submission history in the client.
- **`upgrade.html`** — Footer “Submit plugin” points to `submit-plugin.html`; Security link.
- **`index.html`**, **`signup.html`**, **`dashboard.html`** — Security navigation; dashboard site footer with core links.
- **`Docs/PRISM.md`** — Expanded reference content.
- **Documentation** — README (file tree, Firestore notes), `Docs/backend.md` (admin policy, indexes), FEATURES, CONFIGURATION_MANAGEMENT, claude.md reference paths, bugtracker row (doc-config-git-backup).

---

## [1.1.4] - 2026-04-04

### Added

- **`submit-plugin.html`** — Developer submission portal (manifest fields, endpoint probe, history table); writes `plugin_submissions` with `developer_uid`, `status: pending`, `submitted_at`. Linked from landing and dashboard.
- **`Docs/RULE.md`** — Cursor/agent rules for SwarmSpace (API context, security, doc workflows).
- **`firestore.indexes.json`** — Composite index on `plugin_submissions` (`developer_uid` ASC, `submitted_at` DESC); registered in `firebase.json`.

### Changed

- **`firestore.rules`** — `plugin_submissions`: creates limited to `developer_uid` + `status == pending`; developers may read their own rows; client update/delete denied (admin via server tooling).
- **`signup.html`** — Post-auth redirect accepts safe `?redirect=` targets, including `/submit-plugin.html` and shorthand `submit-plugin`.
- **`submit.html`** — Writes `developer_uid` on create so documents satisfy `plugin_submissions` security rules alongside legacy submitter fields.
- **Documentation** — README, FEATURES, backend, CONFIGURATION_MANAGEMENT, claude.md quick reference, bugtracker reference table updated for the above (doc-config-git-backup sync).

---

## [1.1.3] - 2026-03-23

### Added

- **`submit.html`** — Public developer plugin submission (Firebase Auth + Firestore `plugin_submissions`, idea vs manifest modes). Clean URL `/submit` via `vercel.json`.
- **`admin-submissions.html`** — Admin review panel (allowlisted email, approve / needs info / reject). Clean URL `/admin-submissions` via `vercel.json`.

### Changed

- **README.md** — File structure lists submit/admin pages; aligns with Firebase submit/admin guidance.
- **Docs/backend.md** — `vercel.json` rewrite table includes `/submit` and `/admin-submissions`.
- **Docs/FEATURES.md** — Catalog rows for developer submit portal and admin submissions review.
- **Docs/CONFIGURATION_MANAGEMENT.md** — Inventory + change log for doc-config-git-backup sync.

---

## [1.1.1] - 2026-03-03

### Changed

- **Signup/login:** OAuth + generic email signup. "Continue with Google" and "Continue with GitHub" at top; "or sign up with email" / "or sign in with email" for email/password. Single `handleOAuth(provider)` for both providers.
- README: document enabling Google (and optional GitHub) in Supabase Auth providers.

---

## [1.1.2] - 2026-03-23

### Changed

- Added explicit Firebase submit/admin setup guidance in `README.md` for `plugin_submissions`, including where to place `firebaseConfig`, how to set `ADMIN_EMAIL`, and a minimum Firestore rules template.
- Updated `Docs/backend.md` with Firebase submit/admin tasking policy: authenticated users can create submissions; only admin email can read/update; client delete denied.

---

## [1.1.0] - 2026-03-03

### Added

- **Dashboard — API key:** Overview shows API key with Reveal, Copy, and Regenerate (confirmation required)
- **Dashboard — API usage examples:** Request/response JSON samples and code tabs (cURL, JavaScript fetch) for `swarmspaceRouter`
- **Forgot password:** Sign-in form link to “Forgot password?”; email form sends reset link via Supabase
- **reset-password.html:** Page for completing password reset from email link; README note for Supabase redirect URL

### Changed

- FEATURES.md: user auth and developer dashboard rows updated for new flows and API key UI

---

## [1.0.0] - 2026-03-01

### Added

- Documentation structure from Starter Repo (CONFIGURATION_MANAGEMENT, CHANGELOG, FEATURES, backend, git, SECURITY_CHECKLIST, UI_UX, bugtracker)
- Docs/claude.md reset for SwarmSpace (context guide, Documentation & Config Manager prompt)
- README file structure updated (marketplace.html, faq.html, Docs/claude.md)
- upgrade.html (API tier pricing page)
- SWARMSPACE_API_CONTEXT.md (API reference for LUMARA)
- .cursorrules (Cursor rules for SwarmSpace)

### Changed

- vercel.json: added /upgrade rewrite
- Doc backup sync: CONFIGURATION_MANAGEMENT, CHANGELOG, backend.md updated for current repo state
- **Unified account model:** developers table now has `developer_mode`, `developer_accepted_terms_at`, `api_key` (auto-generated on signup with prefix `ss_`)
- Signup/login redirects: post-auth now goes to `/dashboard.html` instead of `/thankyou.html`

### Changelog Format

Use [Keep a Changelog](https://keepachangelog.com/) format:

- **Added** — new features
- **Changed** — changes in existing functionality
- **Deprecated** — soon-to-be removed features
- **Removed** — removed features
- **Fixed** — bug fixes
- **Security** — vulnerability fixes

---

## Versioning

- **MAJOR.MINOR.PATCH** (semantic versioning recommended)
