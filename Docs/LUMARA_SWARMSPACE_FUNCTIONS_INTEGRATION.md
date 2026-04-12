# LUMARA SwarmSpace Cloud Functions Integration Guide

**Document Version:** 1.0.0
**Last Updated:** 2026-04-10
**Editor:** Claude Code

---

## Overview

Both repos deploy to Firebase project **arc-epi** with different codebase labels:

- **LUMARA:** codebase `"default"` (24 functions)
- **SwarmSpace:** codebase `"swarmspace"` (21 functions)

Firebase allows multiple codebases to coexist within a single project. Each codebase deploys independently and manages its own set of Cloud Functions. Because both LUMARA and SwarmSpace target the same Firebase project, they share the same Firestore database, Auth instance, and runtime secrets -- but their functions are namespaced by codebase label.

---

## Function Overlap Map

**14 functions are duplicated in both repos:**

| Category | Functions |
|---|---|
| **Chat & Journal** | `analyzeJournalEntry`, `sendChatMessage`, `generateJournalPrompts`, `generateJournalReflection` |
| **LLM Proxies** | `proxyGemini`, `proxyGroq`, `proxyOllama` |
| **Billing / Stripe** | `getUserSubscription`, `createCheckoutSession`, `stripeWebhook` |
| **API Keys** | `getAssemblyAIToken`, `getWisprApiKey` |
| **Throttle** | `unlockThrottle`, `lockThrottle`, `checkThrottleStatus` |

**LUMARA-only functions (3):**

| Function | Purpose |
|---|---|
| `createPortalSession` | Stripe customer portal for subscription management |
| `cleanupTestCustomers` | Dev utility to purge test Stripe customers |
| `healthCheck` | Simple liveness probe for monitoring |

**SwarmSpace router differences:**

- 26 plugins (vs 14 in LUMARA)
- Quota enforcement per user/tier
- Enhanced PRISM logging with plugin-level telemetry

---

## Architecture Diagram

```
+---------------------+
|    LUMARA App        |
|  (Flutter / iOS)    |
+----------+----------+
           |
           | HTTPS callable / REST
           v
+----------+-------------------------------------------+
|              Firebase Project: arc-epi               |
|                                                      |
|  +---------------------+  +----------------------+  |
|  | Codebase: "default"  |  | Codebase: "swarmspace"|  |
|  | (LUMARA - 24 fns)    |  | (SwarmSpace - 21 fns) |  |
|  |                      |  |                        |  |
|  | sendChatMessage      |  | swarmspaceRouter       |  |
|  | analyzeJournalEntry  |  |   (26 plugins)         |  |
|  | generateJournalProm  |  | analyzeJournalEntry    |  |
|  | generateJournalRefl  |  | sendChatMessage        |  |
|  | proxyGemini          |  | proxyGemini            |  |
|  | proxyGroq            |  | proxyGroq              |  |
|  | proxyOllama          |  | proxyOllama            |  |
|  | getUserSubscription  |  | getUserSubscription    |  |
|  | createCheckoutSess   |  | createCheckoutSession  |  |
|  | stripeWebhook        |  | stripeWebhook          |  |
|  | getAssemblyAIToken   |  | getAssemblyAIToken     |  |
|  | getWisprApiKey       |  | getWisprApiKey         |  |
|  | unlockThrottle       |  | unlockThrottle         |  |
|  | lockThrottle         |  | lockThrottle           |  |
|  | checkThrottleStatus  |  | checkThrottleStatus    |  |
|  | createPortalSession  |  +----------------------+  |
|  | cleanupTestCustomers |                            |
|  | healthCheck          |                            |
|  +---------------------+                            |
|                                                      |
|  +----------------------------------------------+   |
|  |          Shared Resources                     |   |
|  |  Firestore | Auth | Runtime Secrets           |   |
|  +----------------------------------------------+   |
+----------------------------+-------------------------+
                             |
                             | Outbound API calls
                             v
                +---------------------------+
                |   Cloudflare Workers      |
                |   (rate limiting, edge    |
                |    proxy, analytics)      |
                +---------------------------+
```

---

## Canonical Router

SwarmSpace has the more evolved `swarmspaceRouter` with:

- **26 plugins** (vs 14 in LUMARA)
- **Quota enforcement** per user and subscription tier
- **Enhanced PRISM logging** with plugin-level telemetry and latency tracking

The LUMARA app should call `swarmspace:swarmspaceRouter` for any plugin-routed interactions. This avoids duplicating plugin logic in the default codebase and ensures quota/logging consistency.

**Calling convention from the LUMARA client:**

```dart
// Use the swarmspace codebase prefix
final callable = FirebaseFunctions.instanceFor(region: 'us-central1')
    .httpsCallable('swarmspace-swarmspaceRouter');

final result = await callable.call({
  'plugin': 'echo',
  'action': 'analyze',
  'payload': { ... },
});
```

For core functions that are not plugin-routed (e.g., `sendChatMessage`, `analyzeJournalEntry`), continue calling the default codebase directly.

---

## Deploy Commands

**Deploy LUMARA functions (default codebase):**

```bash
FUNCTIONS_DISCOVERY_TIMEOUT=60000 firebase deploy --only functions:default
```

**Deploy SwarmSpace functions (swarmspace codebase):**

```bash
FUNCTIONS_DISCOVERY_TIMEOUT=60000 firebase deploy --only functions:swarmspace
```

**Deploy both codebases at once:**

```bash
FUNCTIONS_DISCOVERY_TIMEOUT=60000 firebase deploy --only functions
```

> The `FUNCTIONS_DISCOVERY_TIMEOUT=60000` environment variable is required for both deployments. Without it, Firebase CLI may time out during function discovery when the combined function count is high.

---

## Shared Secrets

Both codebases access the same Firebase runtime secrets. The following secrets must be configured in the `arc-epi` project:

| # | Secret Name | Used By | Purpose |
|---|---|---|---|
| 1 | `GEMINI_API_KEY` | Both | Google Gemini LLM proxy |
| 2 | `GROQ_API_KEY` | Both | Groq LLM proxy |
| 3 | `STRIPE_SECRET_KEY` | Both | Stripe payment processing |
| 4 | `STRIPE_WEBHOOK_SECRET` | Both | Stripe webhook signature verification |
| 5 | `ASSEMBLYAI_API_KEY` | Both | AssemblyAI transcription token |
| 6 | `WISPR_API_KEY` | Both | Wispr voice API key |
| 7 | `CLOUDFLARE_WORKER_URL` | Both | Cloudflare Workers edge proxy endpoint |
| 8 | `OPENAI_API_KEY` | SwarmSpace | OpenAI fallback / embeddings |
| 9 | `PRISM_LOGGING_KEY` | SwarmSpace | PRISM telemetry authentication |

**Managing secrets:**

```bash
# Set a secret
firebase functions:secrets:set SECRET_NAME

# List all secrets
firebase functions:secrets:access SECRET_NAME

# Grant access to a specific codebase
# (secrets are project-wide, but access can be scoped in function config)
```

> Any secret added or rotated must be verified against both codebases to prevent deployment failures.

---

## Consolidation Recommendations

### Option 1: Current State (Both Deploy Overlapping)

**Pros:**
- Each repo is self-contained and independently deployable
- No cross-repo dependency for CI/CD

**Cons:**
- 14 duplicated functions that can drift out of sync
- Bug fixes must be applied in both repos
- Increased cold-start surface (duplicate function instances)

### Option 2: Clean Split

Deduplicate by assigning clear ownership:

| Owner | Functions |
|---|---|
| **LUMARA (default)** | `sendChatMessage`, `analyzeJournalEntry`, `generateJournalPrompts`, `generateJournalReflection`, `proxyGemini`, `proxyGroq`, `proxyOllama`, `getUserSubscription`, `createCheckoutSession`, `createPortalSession`, `stripeWebhook`, `cleanupTestCustomers`, `healthCheck` |
| **SwarmSpace** | `swarmspaceRouter`, `getAssemblyAIToken`, `getWisprApiKey`, `unlockThrottle`, `lockThrottle`, `checkThrottleStatus` |

SwarmSpace would call default-codebase functions for LLM proxies and Stripe instead of maintaining its own copies.

**Pros:**
- Zero duplication
- Single source of truth for every function

**Cons:**
- Cross-codebase callable invocations add latency
- Tighter coupling between repos for deployments

### Option 3: Single Source (Monorepo Functions)

Move all Cloud Functions into a shared `functions/` package consumed by both repos:

```
shared-functions/
  src/
    chat/
    journal/
    billing/
    proxies/
    throttle/
    swarmspace/
  firebase.json    # defines both codebase labels
```

**Pros:**
- True single source of truth
- Atomic deploys with guaranteed consistency
- Shared tests and type definitions

**Cons:**
- Requires repo restructuring
- Both teams must coordinate on the shared package
- Larger blast radius per deploy

**Recommendation:** Start with **Option 2** (Clean Split) as an incremental step. It eliminates duplication without requiring a monorepo migration. Move to Option 3 only if cross-codebase call latency becomes a measurable issue.

---

## Prevention Rules

To avoid future duplication and ownership ambiguity, follow these rules:

1. **Before adding a new Cloud Function, check if it exists in the other repo.** Search both `LUMARA/functions/src/` and `SwarmSpace/functions/src/` before writing new function code.

2. **SwarmSpace owns:**
   - Plugin routing (`swarmspaceRouter`)
   - Plugin registry and plugin metadata
   - Quota enforcement (per-user, per-tier limits)
   - Activity logging and PRISM telemetry

3. **LUMARA owns:**
   - Core chat (`sendChatMessage`)
   - Journal functions (`analyzeJournalEntry`, `generateJournalPrompts`, `generateJournalReflection`)
   - Stripe billing (`getUserSubscription`, `createCheckoutSession`, `createPortalSession`, `stripeWebhook`, `cleanupTestCustomers`)
   - LLM proxies (`proxyGemini`, `proxyGroq`, `proxyOllama`)
   - App-specific utilities (`healthCheck`)

4. **Any function that exists in both repos must be either:**
   - Kept in exact sync (identical implementation, tested together), **or**
   - Consolidated into a single repo with the other repo calling it cross-codebase

5. **PR checklist item:** Every PR that adds or modifies a Cloud Function must include a note confirming the function does not conflict with the other codebase.

---

*This document should be updated whenever functions are added, removed, or migrated between codebases.*
