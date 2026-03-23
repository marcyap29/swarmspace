# SwarmSpace Changelog

**Version:** 1.1.3  
**Last Updated:** 2026-03-23

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
