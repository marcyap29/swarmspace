# SwarmSpace Changelog

**Version:** 1.0.0  
**Last Updated:** 2026-03-01

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
