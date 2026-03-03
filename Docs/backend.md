# SwarmSpace Backend & Infrastructure

**Last Updated:** 2026-03-01

---

## Overview

SwarmSpace is a static web app with serverless API endpoints. Auth and database via Supabase; payments via Stripe; hosting on Vercel.

---

## Database (Supabase)

### developers table

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | FK to auth.users |
| email | text | |
| plan | text | `free` \| `verified` |
| developer_mode | boolean | Default false; API consumer vs Developer mode |
| developer_accepted_terms_at | timestamptz | When dev mode was enabled |
| api_key | text | Auto-generated on signup (`ss_` prefix), unique |

---

## Services

| Service | Purpose | Tech |
|---------|---------|------|
| Supabase | Auth, database (developers, plugins) | Supabase |
| Stripe | Checkout, subscriptions, webhooks | Stripe API |
| Vercel | Hosting, serverless functions | Vercel |
| API (external) | swarmspaceRouter, swarmspacePluginStatus | Firebase Cloud Functions |

---

## API Endpoints (Vercel)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/create-checkout` | POST | Creates Stripe Checkout session for upgrade |
| `/api/stripe-webhook` | POST | Handles Stripe webhooks (checkout.session.completed, subscription.updated, etc.) |

---

## Environment & Config

- **Env vars (Vercel):** STRIPE_SECRET_KEY, STRIPE_VERIFIED_PRICE_ID, STRIPE_WEBHOOK_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, APP_URL
- **Secrets:** Never commit API keys. Add via Vercel env vars or locally.
- **Supabase:** Replace SUPABASE_URL and SUPABASE_ANON_KEY in signup.html and dashboard.html.

---

## Deployment

- **CI/CD:** Vercel (git push → deploy)
- **Hosting:** Vercel
- **Config:** vercel.json for URL rewrites

### vercel.json rewrites

| Source | Destination |
|--------|-------------|
| `/` | `/index.html` |
| `/signup` | `/signup.html` |
| `/upgrade` | `/upgrade.html` |
| `/dashboard` | `/dashboard.html` |
| `/marketplace` | `/marketplace.html` |
| `/thankyou` | `/thankyou.html` |
