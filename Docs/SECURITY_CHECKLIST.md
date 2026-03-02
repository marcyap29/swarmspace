# Security Checklist

**Purpose:** Quick security review checklist for SwarmSpace. Adapt as needed. For full audits, use a dedicated DevSecOps workflow.

---

## Egress & PII

- [ ] All external API calls scrub or validate PII before send
- [ ] Secrets (API keys, tokens) never logged or committed
- [ ] Reversible PII maps not persisted to cloud

## Auth & Secrets

- [ ] Auth enforced server-side for sensitive operations (Supabase)
- [ ] API keys in env vars or secure secrets (not in repo)
- [ ] Stripe webhook signature verified (STRIPE_WEBHOOK_SECRET)
- [ ] Token refresh and expiry handled correctly

## Input & Storage

- [ ] User input validated/sanitized (injection, path traversal)
- [ ] Sensitive data at rest uses secure storage
- [ ] Backup/export excludes secrets and reversible maps

## Logging & Debug

- [ ] Production logs don't contain PII, tokens, or raw keys
- [ ] Debug prints guarded with release-mode checks

## Dependencies

- [ ] Known vulnerable dependencies updated
- [ ] Dependency scanning in CI (e.g. `npm audit`)

## SwarmSpace-Specific

- [ ] Supabase URL and anon key in client (anon key is public; RLS protects data)
- [ ] SUPABASE_SERVICE_ROLE_KEY only in server env (Vercel)
- [ ] Stripe webhook events validate signature before processing
