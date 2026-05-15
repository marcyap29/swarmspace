# SwarmSpace — Active Plan

## MCP OAuth 2.1 Compliance — Marketplace Submission
**Started:** 2026-05-15
**Branch:** wt/mcp-oauth — commit `0c236b5`
**Goal:** Upgrade MCP server to OAuth 2.1 + DCR + Streamable HTTP, then submit to Anthropic and OpenAI marketplace directories

### Previous phase (complete)
- [x] `workers/mcp-server/` Cloudflare Worker exists and TypeScript-checks clean
- [x] 13 MCP tools defined (one per orchestrator workflow chain)
- [x] HMAC API key validation implemented
- [x] `functions/src/functions/swarmspaceMcpKeys.ts` — generateMcpApiKey + revokeMcpApiKey
- [x] Deployed to `swarmspace-mcp-server.orbitalai.workers.dev`

### OAuth 2.1 phase (complete — pending deployment)
- [x] OAuth Authorization Server endpoints in mcp-server Worker
- [x] Dynamic Client Registration (RFC 7591) — `POST /oauth/register`
- [x] RFC 8414 Authorization Server Metadata — `GET /.well-known/oauth-authorization-server`
- [x] RFC 9728 Protected Resource Metadata — `GET /.well-known/oauth-protected-resource`
- [x] RFC 8707 resource parameter enforced on authorize + token
- [x] PKCE S256 enforced; refresh token rotation
- [x] Streamable HTTP SSE on `tools/call`
- [x] Protocol version → `2025-06-18`; `MCP-Protocol-Version` headers added
- [x] `WWW-Authenticate` on 401 with resource_metadata pointer
- [x] `oauth-consent.html` Firebase login/consent page
- [x] Legacy HMAC `ss_mcp_` key fallback preserved
- [x] Manifest updated to `oauth2` auth type
- [x] `tsconfig.json` added
- [x] TypeScript clean — zero errors
- [x] Committed to `wt/mcp-oauth`

### Pending — Marc to complete
- [ ] `wrangler kv:namespace create OAUTH_CLIENTS` → fill id in `workers/mcp-server/wrangler.toml`
- [ ] `wrangler kv:namespace create OAUTH_CODES` → fill id
- [ ] `wrangler kv:namespace create OAUTH_TOKENS` → fill id
- [ ] `wrangler secret put OAUTH_ISSUER` → `https://swarmspace-mcp-server.orbitalai.workers.dev`
- [ ] `wrangler secret put FIREBASE_PROJECT_ID` → `arc-epi`
- [ ] Review: `git -C ../swarmspace-mcp-oauth diff main..HEAD`
- [ ] Merge: `git checkout main && git merge --no-ff wt/mcp-oauth -m "merge: OAuth 2.1 + DCR + Streamable HTTP (wt/mcp-oauth)"`
- [ ] Deploy worker: `cd workers/mcp-server && wrangler deploy`
- [ ] Deploy consent page: `git push origin main` (Vercel auto-deploys)
- [ ] Submit to Anthropic: `claude.com/connectors` → "Get started"
- [ ] Submit to OpenAI: OpenAI App Directory developer portal

### Files changed in wt/mcp-oauth
- `workers/mcp-server/src/index.ts` — OAuth server + Streamable HTTP + protocol upgrade
- `workers/mcp-server/wrangler.toml` — KV namespace bindings (IDs pending)
- `workers/mcp-server/tsconfig.json` — new file
- `oauth-consent.html` — new file
