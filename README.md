# SwarmSpace — Setup Guide

Get live in ~20 minutes.

---

## 1. Supabase

1. Go to https://supabase.com → New project
2. Save your **Project URL** and **anon public key** (Settings → API)
3. Go to **SQL Editor** → paste and run `supabase-setup.sql`
4. Go to **Authentication → Providers** → enable **GitHub** (optional but recommended)
   - Create a GitHub OAuth app at https://github.com/settings/developers
   - Callback URL: `https://YOUR_SUPABASE_PROJECT.supabase.co/auth/v1/callback`

5. Replace in both `signup.html` and `dashboard.html`:
   ```
   const SUPABASE_URL = 'YOUR_SUPABASE_URL';
   const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
   ```

---

## 2. Stripe

1. Go to https://stripe.com → create account
2. Go to **Products** → Add product:
   - Name: `SwarmSpace Verified`
   - Price: `$29.00` / month / recurring
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
| `SUPABASE_URL` | `https://xxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | your service role key (Settings → API) |
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
2. Check Supabase → Authentication → Users (you should see the new user)
3. Check Supabase → Table Editor → developers (auto-created row)
4. Go to `/dashboard.html` → submit a plugin
5. Click Upgrade → Verified → you'll land in Stripe Checkout (test mode)
6. Use Stripe test card: `4242 4242 4242 4242`, any expiry/CVC
7. After success, check developers table — plan should update to `verified`

---

## File Structure

```
swarmspace/
├── index.html          ← Landing page
├── signup.html         ← Auth (login + signup)
├── dashboard.html      ← Developer dashboard
├── api/
│   ├── create-checkout.js   ← Stripe checkout session
│   └── stripe-webhook.js    ← Stripe event handler
├── supabase-setup.sql  ← Run once in Supabase SQL editor
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
