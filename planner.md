# SwarmSpace — Active Plan
*Started: 2026-04-23*

---

## Task A: Delete plugin-registry worker — DONE
- Deleted `workers/plugin-registry/` — stub with 3/22 plugins, out of sync with live registry.

## Task B: Credential Isolation (§2.3) — DONE (pending deploy + secret rotation)
- swarmspaceRouter: injects GITHUB_TOKEN, JINA_API_KEY, NCBI_API_KEY per-request into worker body
- github-public, jina-reader, pubmed: read credential from body, removed from Env interface
- social-publisher removed from plugin registry (doesn't fit stateless plugin model)

## Pending user actions before deploying:
1. Set the 3 new Firebase secrets:
   ```
   firebase functions:secrets:set GITHUB_TOKEN
   firebase functions:secrets:set JINA_API_KEY
   firebase functions:secrets:set NCBI_API_KEY
   ```
2. Deploy Firebase functions:
   ```
   cd functions && npm run build && cd .. && firebase deploy --only functions --project arc-epi
   ```
3. Remove GITHUB_TOKEN, JINA_API_KEY, NCBI_API_KEY from each worker's Cloudflare Worker secrets
   (Cloudflare dashboard → each worker → Settings → Variables & Secrets → delete)

---

No further code tasks. Check `backlog.md` for next priorities.
