# SwarmSpace Features

**Version:** 1.1.4  
**Last Updated:** 2026-04-04

---

## Feature List

### Core Features

| Feature | Description | Status |
|---------|-------------|--------|
| Landing page | 7 free APIs, upgrade CTA | ✅ |
| User auth | Signup/login via Firebase: email signup + OAuth (Google, GitHub); forgot password + reset page | ✅ |
| Unified account model | One account, API key (`ss_` prefix), developer_mode toggle | ✅ |
| Developer dashboard | Plugin submission, status; API key reveal/copy/regenerate; API usage examples (JSON, cURL, JS) | ✅ |
| Upgrade flow | Stripe Checkout for Verified tier ($30/mo) | ✅ |
| Marketplace | Plugin discovery | ✅ |
| Thank-you page | Post-signup marketplace preview | ✅ |
| FAQ | FAQ page | ✅ |
| Developer submit portal (`/submit` → `submit.html`) | Firebase sign-in; idea or manifest modes; writes `plugin_submissions` with `developer_uid` + pending | ✅ |
| Submit plugin portal (`submit-plugin.html`) | Full manifest-style flow, endpoint probe, submission history; same `plugin_submissions` collection; landing + dashboard links | ✅ |
| Admin submissions (`/admin-submissions`) | Allowlisted reviewer; list/filter/search; approve / needs info / reject → Firestore | ✅ |

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
