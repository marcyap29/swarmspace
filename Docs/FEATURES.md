# SwarmSpace Features

**Version:** 1.1.6  
**Last Updated:** 2026-04-06

---

## Feature List

### Core Features

| Feature | Description | Status |
|---------|-------------|--------|
| Landing page | 7 free APIs, upgrade CTA; nav/footer links to PRISM and privacy pages | ✅ |
| User auth | Signup/login via Firebase: email signup + OAuth (Google, GitHub); forgot password + reset page | ✅ |
| Unified account model | One account, API key (`ss_` prefix), developer_mode toggle | ✅ |
| Developer dashboard | Plugin submission, status; API key reveal/copy/regenerate; API usage examples (JSON, cURL, JS) | ✅ |
| Upgrade flow | Stripe Checkout for Verified tier ($30/mo) | ✅ |
| Marketplace | Plugin discovery | ✅ |
| Thank-you page | Post-signup marketplace preview | ✅ |
| FAQ | FAQ page | ✅ |
| Developer submit portal (`/submit` → `submit.html`) | Firebase sign-in; idea or manifest modes; writes `plugin_submissions` with `developer_uid` + pending | ✅ |
| Submit plugin portal (`submit-plugin.html`) | Full manifest-style flow, endpoint probe, submission history; same `plugin_submissions` collection; landing + dashboard links | ✅ |
| Admin submissions (`/admin-submissions`) | Allowlisted reviewer; list/filter/search on **`plugin_submissions`**; approve / needs info / reject → Firestore | ✅ |
| Security & trust (`security.html`) | OWASP Agentic Top 10 mapping, PRISM, trust tiers; linked from main nav and dashboard | ✅ |
| PRISM reference (`prism.html`) | Public technical page for context minimization; links to `Docs/PRISM.md` and privacy | ✅ |
| Privacy policy (`privacy.html` + `Docs/PRIVACY.md`) | Public policy; Markdown companion in `Docs/` and root `Privacy.md` | ✅ |
| Developer guide (`DEVELOPER_GUIDE.md`) | Manifest specification, JSON Schema, endpoint and submission guidance for plugin authors | ✅ |

### Integrations

| Integration | Purpose |
|-------------|---------|
| Firebase | Auth, Firestore (users, submissions, plugins collections) |
| Stripe | Checkout, subscriptions, webhooks |
| Vercel | Hosting, serverless API |
| Firebase (external) | swarmspaceRouter, swarmspacePluginStatus for LUMARA |
| Firebase (web app) | Optional: Auth + Firestore for `plugin_submissions` on submit + admin pages |

### API Tiers

| Tier | Price | Plugins |
|------|-------|---------|
| Free | $0 | 7 plugins |
| Standard | $30/mo | url-reader, tavily-search, Verified tier |
| Premium | — | exa-search, perplexity-sonar |

---

## Platform Support

| Platform | Status |
|----------|--------|
| Web | ✅ |

---

## Roadmap

- **Phase 1:** [Current / near-term]
- **Phase 2:** [Next]
- **Phase 3:** [Future]
