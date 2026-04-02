# SwarmSpace — Setup Guide

Get live in ~20 minutes.

**API integration:** See `SWARMSPACE_API_CONTEXT.md` for the SwarmSpace API (swarmspaceRouter, swarmspacePluginStatus, plugin registry, request schemas). Used by LUMARA and other clients. Auth: Firebase ID token. Add API keys yourself — never commit them.

---

## 1. Firebase

1. Go to [Firebase Console](https://console.firebase.google.com/) → select project **arc-epi** (or create it)
2. Enable **Authentication** with providers: Google, GitHub, email/password
3. Enable **Cloud Firestore** with the following collections:
   - `users/{uid}` — fields: `email`, `plan`, `isPremium`, `api_key`, `createdAt`, `callsToday`, `callsReset`
   - `submissions` — plugin submissions
   - `plugins` — plugin registry
4. In **Project settings → General → Your apps (Web app)**, copy your Firebase web config
5. Add your Firebase config to each page that requires auth (e.g. `signup.html`, `dashboard.html`)

---

## 1.5 Firebase Submit/Admin Flow (`plugin_submissions`)

Use this if you are wiring a Firebase-backed plugin submission flow (submit page + admin review page). Keep this setup in the page script itself (or a shared JS module), and do not commit secrets.

1. In Firebase Console, create/select your project and enable:
   - **Authentication** (email/password or your provider)
   - **Cloud Firestore**
2. In **Project settings → General → Your apps (Web app)**, copy your Firebase web config.
3. In each Firebase-powered page (for example `submit.html` and `admin-submissions.html`), add the Firebase modular SDK imports and config in a `<script type="module">` block.
4. Set `ADMIN_EMAIL` in the same script block (or a local env-injected value if you are bundling).

Example pattern (use consistently across pages):

```html
<script type="module">
  import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
  import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
  import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

  const firebaseConfig = {
    apiKey: "REPLACE_ME",
    authDomain: "REPLACE_ME.firebaseapp.com",
    projectId: "REPLACE_ME",
    storageBucket: "REPLACE_ME.appspot.com",
    messagingSenderId: "REPLACE_ME",
    appId: "REPLACE_ME"
  };

  const ADMIN_EMAIL = "admin@example.com";

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);
</script>
```

### Minimum Firestore Rules (`plugin_submissions`)

- Authenticated users can **create** their own submission.
- Only `ADMIN_EMAIL` can **read** or **update** submissions.
- No client-side delete access by default.

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

Replace `"admin@example.com"` in rules to match your `ADMIN_EMAIL` value in code.

---

## 2. Stripe

1. Go to https://stripe.com → create account
2. Go to **Products** → Add product:
   - Name: `SwarmSpace Verified`
   - Price: `$30.00` / month / recurring (Standard API tier; plugin Verified tier)
   - Copy the **Price ID** (starts with `price_`)

3. Go to **Developers → API keys** → copy **Secret key** (starts with `sk_`)

4. Set up webhook:
   - Developers → Webhooks → Add endpoint
   - URL: `https://YOUR_VERCEL_URL/api/stripe-webhook`
   - Events to listen for:
     - `checkout.session.completed`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_failed`
   - Copy the **Webhook signing secret** (starts with `whsec_`)

---

## 3. Vercel Environment Variables

In your Vercel project → Settings → Environment Variables, add:

| Key | Value |
|-----|-------|
| `STRIPE_SECRET_KEY` | `sk_live_...` |
| `STRIPE_VERIFIED_PRICE_ID` | `price_...` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` |
| `FIREBASE_PROJECT_ID` | `arc-epi` |
| `FIREBASE_API_KEY` | your Firebase API key (Project settings → General) |
| `APP_URL` | `https://your-vercel-domain.vercel.app` |

---

## 4. Deploy

```bash
cd swarmspace
vercel --yes --name swarmspace
```

After first deploy, set `APP_URL` in Vercel env vars to your actual domain, then redeploy:

```bash
vercel --prod
```

---

## 5. Test the flow

1. Go to `/signup.html` → create an account
2. You’ll land on `/dashboard.html` (API key visible)
3. Check Firebase Console → Authentication → Users (you should see the new user)
4. Check Firestore → `users/{uid}` (auto-created doc with `api_key`)
5. Go to `/dashboard.html` → enable developer mode to submit a plugin
6. Click Upgrade → Verified → you'll land in Stripe Checkout (test mode)
7. Use Stripe test card: `4242 4242 4242 4242`, any expiry/CVC
8. After success, check Firestore `users/{uid}` doc — plan should update to `verified`

---

## File Structure

```
swarmspace/
├── overview.md         ← Orientation: purpose, flow, for users and agents
├── index.html          ← Landing page (7 free APIs, upgrade CTA)
├── signup.html         ← Auth (login + signup)
├── submit.html         ← Developer plugin submission (Firebase; `/submit`)
├── admin-submissions.html ← Admin review queue (Firebase; `/admin-submissions`)
├── upgrade.html        ← API tier pricing (Free / Standard $30 / Premium)
├── dashboard.html      ← Developer dashboard
├── marketplace.html    ← Plugin marketplace
├── thankyou.html       ← Post-signup (marketplace preview)
├── reset-password.html ← Complete password reset from Firebase email link
├── faq.html            ← FAQ
├── SWARMSPACE_API_CONTEXT.md   ← API reference for LUMARA integration
├── .cursorrules        ← Cursor rules (API context, tiers, never commit keys)
├── Docs/
│   ├── claude.md, CONFIGURATION_MANAGEMENT.md, CHANGELOG.md, FEATURES.md
│   ├── backend.md, git.md, SECURITY_CHECKLIST.md, UI_UX.md
│   └── bugtracker/
├── api/
│   ├── create-checkout.js   ← Stripe checkout session
│   └── stripe-webhook.js    ← Stripe event handler
├── vercel.json         ← URL rewrites
└── README.md
```

---

## Stripe test cards

| Card | Result |
|------|--------|
| `4242 4242 4242 4242` | Success |
| `4000 0000 0000 9995` | Payment declined |
| `4000 0025 0000 3155` | 3D Secure required |
