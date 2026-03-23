# SwarmSpace Backend & Infrastructure

**Last Updated:** 2026-03-23

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

## Firebase Submit/Admin Tasking (Firestore)

If you implement a Firebase-backed submit/admin review flow, use one consistent web SDK pattern across pages (modular v10 via `https://www.gstatic.com/firebasejs/10.12.5/...` imports in `<script type="module">`).

### Required config in each Firebase page

- `firebaseConfig` object from Firebase Console (Project settings → General → Web app config)
- Admin allowlist constant in `admin-submissions.html` (`ADMIN_EMAIL_ALLOWLIST`; replace placeholder emails), or a single `ADMIN_EMAIL` if you simplify the page
- App initialization:
  - `initializeApp(firebaseConfig)`
  - `getAuth(app)`
  - `getFirestore(app)`

### Firestore collection policy

Collection: `plugin_submissions`

- **Create:** any authenticated user can create a submission for themselves
- **Read/update:** only admin email can read/update submissions
- **Delete:** deny from client

Use these minimum Firestore rules (replace admin email):

```rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /plugin_submissions/{submissionId} {
      allow create: if request.auth != null
        && request.resource.data.submitterUid == request.auth.uid
        && request.resource.data.submitterEmail == request.auth.token.email;
      allow read, update: if request.auth != null
        && request.auth.token.email == "admin@example.com";
      allow delete: if false;
    }
  }
}
```

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
| `/submit` | `/submit.html` |
| `/admin-submissions` | `/admin-submissions.html` |
| `/upgrade` | `/upgrade.html` |
| `/dashboard` | `/dashboard.html` |
| `/marketplace` | `/marketplace.html` |
| `/thankyou` | `/thankyou.html` |
