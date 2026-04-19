# SwarmSpace Changelog

**Version:** 1.5.0
**Last Updated:** 2026-04-19

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
