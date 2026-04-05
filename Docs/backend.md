# SwarmSpace Backend & Infrastructure

**Last Updated:** 2026-04-04

---

## Overview

SwarmSpace is a static web app with serverless API endpoints. Auth and database via Firebase; payments via Stripe; hosting on Vercel.

---

## Database (Firestore)

### `users/{uid}` collection

| Field | Type | Notes |
|-------|------|-------|
| email | string | |
| plan | string | `free` \| `verified` |
| isPremium | boolean | Whether user has premium access |
| api_key | string | Auto-generated on signup (`ss_` prefix), unique |
| createdAt | timestamp | Account creation time |
| callsToday | number | API calls made today |
| callsReset | timestamp | When callsToday was last reset |

### `submissions` collection
Plugin submissions from developers.

### `plugins` collection
Plugin registry.

---

## Services

| Service | Purpose | Tech |
|---------|---------|------|
| Firebase | Auth, database (users, submissions, plugins) | Firebase Authentication, Firestore |
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

- **Create:** authenticated user only if `request.resource.data.developer_uid == request.auth.uid` and `status == "pending"`.
- **Read:** owner only (`resource.data.developer_uid == request.auth.uid`).
- **Update / delete:** denied from clients; admin workflows use server-side or Admin SDK.

**Indexes:** `firebase.json` registers `firestore.indexes.json`. Composite index: `plugin_submissions` — `developer_uid` ASC, `submitted_at` DESC (for the portal history query).

Canonical rules live in root `firestore.rules`; excerpt:

```rules
match /plugin_submissions/{docId} {
  allow create: if request.auth != null
                && request.resource.data.developer_uid == request.auth.uid
                && request.resource.data.status == "pending";
  allow read: if request.auth != null
              && resource.data.developer_uid == request.auth.uid;
  allow update, delete: if false;
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

- **Env vars (Vercel):** STRIPE_SECRET_KEY, STRIPE_VERIFIED_PRICE_ID, STRIPE_WEBHOOK_SECRET, FIREBASE_PROJECT_ID, FIREBASE_API_KEY, APP_URL
- **Secrets:** Never commit API keys. Add via Vercel env vars or locally.

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
| *(direct)* | `/submit-plugin.html` (no rewrite; linked from app pages) |
| `/admin-submissions` | `/admin-submissions.html` |
| `/upgrade` | `/upgrade.html` |
| `/dashboard` | `/dashboard.html` |
| `/marketplace` | `/marketplace.html` |
| `/thankyou` | `/thankyou.html` |
