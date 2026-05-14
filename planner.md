# SwarmSpace — Active Plan

## MCP Remote Server — claude.ai Marketplace Submission
**Started:** 2026-05-14  
**Goal:** Build Remote MCP Server to submit SwarmSpace to claude.ai/platform/marketplace

### Definition of Done
- [x] `workers/mcp-server/` Cloudflare Worker exists and TypeScript-checks clean
- [x] 13 MCP tools defined (one per orchestrator workflow chain)  
- [x] HMAC API key validation implemented in Worker
- [x] `functions/src/functions/swarmspaceMcpKeys.ts` — generateMcpApiKey + revokeMcpApiKey
- [x] `functions/src/index.ts` exports new functions
- [x] `cd functions && npm run build` passes zero new TS errors
- [x] Test agent has reviewed and signed off
- [x] context.md updated with session block
- [x] CONFIGURATION_MANAGEMENT.md updated
- [ ] Committed and pushed to branch claude/review-swarm-agents-workflows-0BqPd

### Files Being Created
- `workers/mcp-server/package.json`
- `workers/mcp-server/wrangler.toml`
- `workers/mcp-server/src/tools.ts` — 13 MCP tool definitions
- `workers/mcp-server/src/index.ts` — MCP protocol + HMAC auth + orchestrator proxy
- `functions/src/functions/swarmspaceMcpKeys.ts` — API key generation/revocation
- `functions/src/index.ts` — (updated: add two exports)

### Architecture Notes
- Auth: HMAC-SHA256 signed API keys (`ss_mcp_{uidB64}.{tsB64}.{hmacHex}`)
- Call chain: Claude → MCP Worker → Orchestrator (service token bypass) → swarmspaceRouter → plugin workers
- No changes to swarmspaceRouter, orchestrator, or any existing plugin worker

### Deployment Checklist (post-review)
- [ ] `wrangler secret put MCP_KEY_SECRET` (new secret, both repos consistent)
- [ ] `wrangler secret put SWARMSPACE_INTERNAL_TOKEN` (already set in DO, reuse same value)
- [ ] `firebase functions:secrets:set MCP_KEY_SECRET` (same value as above)
- [ ] `wrangler deploy` from workers/mcp-server/
- [ ] Submit to claude.ai/platform/marketplace
