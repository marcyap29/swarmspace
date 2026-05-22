# SwarmSpace — Active Plan

## Next: Marketplace Submissions
**Updated:** 2026-05-15

OAuth 2.1 + DCR + Streamable HTTP compliance is **complete and live** (`wrangler deploy` confirmed 2026-05-15, worker version `c5aa5f33-b20f-4a13-a87c-360285db8610`). Both marketplace listings are now unblocked.

### MCP OAuth 2.1 phase — ✅ COMPLETE
- [x] OAuth Authorization Server endpoints in mcp-server Worker
- [x] Dynamic Client Registration (RFC 7591) — `POST /oauth/register`
- [x] RFC 8414 Authorization Server Metadata — `GET /.well-known/oauth-authorization-server`
- [x] RFC 9728 Protected Resource Metadata — `GET /.well-known/oauth-protected-resource`
- [x] RFC 8707 resource parameter enforced on authorize + token
- [x] PKCE S256 enforced; refresh token rotation
- [x] Streamable HTTP SSE on `tools/call`
- [x] Protocol version → `2025-06-18`; `MCP-Protocol-Version` headers added
- [x] `WWW-Authenticate` on 401 with resource_metadata pointer
- [x] `oauth-consent.html` Firebase login/consent page (Vercel, `swarmspace.app/oauth-consent.html`)
- [x] Legacy HMAC `ss_mcp_` key fallback preserved
- [x] Manifest updated to `oauth2` auth type
- [x] KV namespaces created and bound (`OAUTH_CLIENTS`, `OAUTH_CODES`, `OAUTH_TOKENS`)
- [x] Secrets set (`OAUTH_ISSUER`, `FIREBASE_PROJECT_ID`)
- [x] Deployed: `https://swarmspace-mcp-server.orbitalai.workers.dev`
- [x] `wt/mcp-oauth` merged → `main`, pushed to GitHub

### Now — Marketplace Submissions
- [x] Submit to Anthropic MCP Directory ✅ (submitted 2026-05-19)
- [x] OpenAI App Directory — code gaps fixed (CSP, openWorldHint); category, ID verification, logo done ✅
- [x] Connected SwarmSpace to ChatGPT (developer mode, OAuth); 13 tools confirmed live ✅
- [x] `chatgpt-app-submission.json` generated and schema-validated ✅
- [x] Orchestrator `headers is not defined` bug fixed (BUG-ORCH-001) ✅
- [x] MCP quota bypass end-to-end (`_via_mcp` flag propagated mcp-server → orchestrator → router) ✅
  - [x] **Demo recording** — uploaded to YouTube ✅
  - [x] Screenshots + test prompts ✅
  - [x] **Submitted to OpenAI App Directory** (2026-05-21) ✅ — pending review
- [x] Dynamic AI routing pipeline (intent.js + rank.js + chain.js) — committed `c6ab31d`, deployed `4c628257` ✅
- [ ] Write anchor content: "How I use SwarmSpace to run Orbital AI as a solo founder"
