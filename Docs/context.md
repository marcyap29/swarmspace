## Session: 2026-05-22 — News Briefing "Keep Watching This" UI (§5.2)

**Branch:** main (LUMARA repo)

### What was done
- **News Briefing Service** — Created `lib/shared/swarmspace/news_briefing_service.dart` with `createSubscription()`, `cancelSubscription()`, `getLatest()`, local persistence via SharedPreferences, and "New" badge detection (`hasNewContent`/`markViewed`).
- **Subscriptions Management** — Created `lib/shared/lumara/agents/screens/news_briefing_subscriptions_screen.dart` with list, add topic sheet, cadence picker (daily/weekly), detail view with flutter_markdown, swipe-to-cancel, and "NEW" badge.
- **Agents Screen card** — Added `_WatchedTopicsCard` to Agents screen between Plugin Activity and Capabilities Catalog.
- **Chat affordance** — Added `_KeepWatchingButton` inside `lumara_chat_redesign_screen.dart` message bubble, gated on `metadata['swarmspace_route'] == 'news-brief'`.
- **Orchestrator metadata** — Modified `lumara_assistant_cubit.dart` to attach `{'swarmspace_route': 'news-brief', 'swarmspace_topic': text}` to assistant messages for the news-brief route.

### Files changed (LUMARA repo)
- `lib/shared/swarmspace/news_briefing_service.dart` (new)
- `lib/shared/lumara/agents/screens/news_briefing_subscriptions_screen.dart` (new)
- `lib/shared/lumara/agents/screens/agents_screen.dart` — add import + WatchedTopicsCard
- `lib/mobile/screens/arc/chat/ui/lumara_chat_redesign_screen.dart` — add import + KeepWatchingButton
- `lib/shared/arc/chat/bloc/lumara_assistant_cubit.dart` — metadata on assistantMsg

### Verification
- `dart analyze` on all 5 target files — zero errors ✅

### LUMARA dependency
None — all changes are LUMARA-internal. SwarmSpace endpoints already live.

---

## Session: 2026-05-21 — LUMARA Agents Tab: History, Background Execution, Stop Button

**Branch:** main (LUMARA repo)

### What was done
- **Query History** — Wired `AgentSearchHistoryStorage` into `agents_screen.dart`. History icon (conditional) in AppBar opens bottom sheet with last 20 queries, swipe-to-dismiss, Clear all. Tapping repopulates input + `useChronicle`. Saves on every `_handleSubmit()`.
- **Background Execution** — Added `flutter_foreground_task: ^8.16.0` to pubspec. iOS `UIBackgroundModes` (fetch, processing) and Android `FOREGROUND_SERVICE` + service declaration added. `run_screen.dart` init/stop/callback wired; task starts on run, stops on result/error/stop/dispose.
- **Stop Button** — Replaced `SizedBox(width: 52)` in `_buildTopBar()` with red "Stop" TextButton visible only while `_phase == 'running'`. Cancels stream + stops foreground task + pops back.

### Files changed (LUMARA repo)
- `lib/shared/lumara/agents/screens/agents_screen.dart` — history load/save/sheet
- `lib/shared/agents/run_screen.dart` — foreground task lifecycle + stop button
- `pubspec.yaml` — `flutter_foreground_task` dependency
- `ios/Runner/Info.plist` — `UIBackgroundModes`
- `android/app/src/main/AndroidManifest.xml` — foreground service permissions

### Verification
- `flutter pub get` — `flutter_foreground_task 8.17.0` resolved ✅
- `dart analyze` — zero new errors in target files; remaining warnings pre-existing ✅

### LUMARA dependency
None — all changes are LUMARA-internal.

---

## Session: 2026-05-21 (continued) — OpenAI App Directory submitted

**Branch:** main

### What was done

- **Domain verification token** — Added `OPENAI_CHALLENGE_TOKEN` secret to mcp-server Worker; route `/.well-known/openai-apps-challenge` was already wired up. Deployed worker `e3744316`. Token verified live.
- **OpenAI App Directory submitted** — All fields complete: MCP server URL, OAuth auto-discovered, 13 tool justifications filled, domain verified, policy compliance checked, release notes written (v1.0), submitted under Orbital AI. Pending OpenAI review.
- **YouTube demo video** — Screen recording uploaded for the 5-tool demo requirement.

### Status
- Anthropic MCP Directory: submitted ✅ (2026-05-19)
- OpenAI App Directory: submitted ✅ (2026-05-21) — pending review

### Next (SwarmSpace)
1. Write anchor content: "How I use SwarmSpace to run Orbital AI as a solo founder"
2. Session broker / orchestrator execution modes (backlog §5.3)

---

## Session: 2026-05-21 — Dynamic AI routing pipeline (intent.js + rank.js + chain.js), Granola meeting prep brief, Proxycurl cleanup

**Branch:** main

### What was done

- **Granola-inspired meeting prep brief restructure:** `buildMeetingPrepPrompt` in `workers/orchestrator/src/index.js` redesigned with two named sections — "FROM YOUR NOTES" (personal context only) and "WHAT MATTERS NOW" (current web intel with source URL citations). Multi-deliverable support added: `brief`, `talking_points`, `follow_up_email`, `one_pager`, `questions`.
- **Proxycurl plugin removed:** Proxycurl API was dead (LinkedIn lawsuit Jan 2025, settled and shut down). All proxycurl Worker code and REGISTRY_ENTRIES deleted. Orchestrator `/meeting-prep` reverted to jina-reader fallback. Commits: `400583d`, `ac1d743`.
- **Dynamic AI routing pipeline (Kimi K2.6):** New `/dynamic` route in orchestrator using two-phase routing — Workers AI intent classifier → capability scorer → plugin chain executor.
  - `workers/orchestrator/src/intent.js` — 22-entry ROUTING_TABLE, `resolveIntent()` via `@cf/meta/llama-3.1-8b-instruct`, keyword fallback, JSON fence stripping
  - `workers/orchestrator/src/rank.js` — `rankCandidates()` with free/standard/premium tier gate, capability overlap scoring, latency/trust bonuses, 70% dedup threshold; `assembleChain()` always appends gemini-flash last
  - `workers/orchestrator/src/chain.js` — `callPlugin`, `parallel`, `executeChain` moved here to break circular import; `executeChain` accumulates results for synthesis prompt
  - `workers/orchestrator/src/rank.test.js` — 21 assertions, all pass (fixed T6 maxCandidates semantics, fixed T10 empty-chain edge case)
  - `workers/orchestrator/src/intent.smoke.js` — 9 smoke tests with mock AI
  - `swarmspaceRouter.ts` PLUGIN_REGISTRY extended: `agent_guidance`, `latency_class`, `trust_tier` fields on all 22 plugins
  - `wrangler.toml`: `[ai] binding = "AI"` added
  - Committed `c6ab31d`, deployed worker version `4c628257`
- **MCP unlimited access confirmed:** All MCP sessions (Claude/ChatGPT) get unlimited plugin calls via `_via_mcp` flag → `enforceSwarmSpaceQuota` returns `{ limit: -1 }`.

### Commits this session
- `400583d` — fix(meeting-prep): revert orchestrator to jina-reader; remove proxycurl
- `ac1d743` — chore: delete proxycurl worker directory and registry entries
- `c6ab31d` — feat(orchestrator): two-phase AI routing — intent.js + rank.js + chain.js

### Next (SwarmSpace)
1. OpenAI App Directory — **demo recording is the only remaining blocker** (record 5 tool calls in ChatGPT developer mode, upload to YouTube/Loom)
2. Write anchor content: "How I use SwarmSpace to run Orbital AI as a solo founder"
3. Session broker / orchestrator execution modes (backlog §5.3)

---

## Session: 2026-05-20 — OpenAI submission, hero logo, orchestrator headers bug, MCP quota fix

**Branch:** main

### What was done

- **OpenAI App Directory submission prep:** Connected SwarmSpace to ChatGPT in developer mode via OAuth. Diagnosed and fixed 13-tool connection errors. Generated `chatgpt-app-submission.json` at repo root (schema v1, 13 tools, 7 test cases, 3 negative test cases). Iteratively fixed schema validation errors: missing `$schema`, invalid `app_info.category` (`PRODUCTIVITY`), wrong `justification` → `justifications` object, snake_case key names (`read_only_justification`, `destructive_justification`, `open_world_justification`), `prompt` → `user_prompt`, `tools_triggered` must be string not array. Submission unblocked pending demo recording.
- **Hero logo iterations:** Replaced `logo.svg` with `SwarmSpace_Logo.svg` (landscape 1598×1031, transparent background). Fixed SVG background `fill="#020202"` → `fill="none"`. Centered logo above hero grid at full page width (`max-width:680px`, `margin:0 auto 24px`). Tightened hero padding from `120px 40px 96px` → `56px 40px 80px`. Four commits total (`5e8deff`, `e78eb80`, `1c76dca`, `17ea561`) — final deployed to Vercel.
- **Orchestrator `headers is not defined` bug (BUG-ORCH-001):** Commit `7fadc23` accidentally deleted the `headers` variable declaration in `workers/orchestrator/src/index.js` while adding `_via_mcp` data mutation. Fixed in `723a20c`: restored `headers` declaration and moved `if (ctx.viaMcp) data._via_mcp = true;` outside the service-token block so MCP sessions always propagate the flag.
- **MCP quota bypass end-to-end fix:** Two root causes: (1) mcp-server never sent `_via_mcp: true` in outbound body — `isMcpSession` was always false in swarmspaceRouter; (2) `isAdminUser` was false because `request.auth` is null for SWARMSPACE_INTERNAL_TOKEN calls (not a Firebase ID token). Fix: mcp-server SSE + sync paths now send `{ ...body, _via_mcp: true }`; orchestrator propagates unconditionally. Admin user (`marcyap@orbitalai.net`) over MCP no longer hits free-tier quota cap. Committed `723a20c`, deployed workers `35ec6f27` (mcp-server) + `ff5aa88b` (orchestrator).
- **Code gap fixes for OpenAI (Kimi K2.6):** CSP header added to `corsHeaders()` in `mcp-server/index.ts`; `openWorldHint: true` added to all 13 tool definitions in `tools.ts`. Committed `f1f0d15`, deployed `707aec0c`.

### Commits this session
- `f1f0d15` — feat(mcp-server): add CSP header and openWorldHint annotations for OpenAI App Directory
- `5e8deff` — fix(hero): transparent logo bg + centered layout; add OpenAI submission JSON
- `e78eb80` — fix(hero): use square logo, transparent bg, larger display size
- `1c76dca` — fix(hero): center logo above grid across full page width
- `17ea561` — fix(hero): landscape logo, transparent bg, larger size, tighter padding
- `723a20c` — fix(quota): propagate _via_mcp flag from mcp-server through orchestrator to router

### Bugs filed this session
- `BUG-ORCH-001` — `headers is not defined` in orchestrator (regression in `7fadc23`, fixed `723a20c`)

### Next (SwarmSpace)
1. OpenAI App Directory submission — **demo recording is the only remaining blocker** (record 5 tool calls in ChatGPT developer mode, upload to YouTube/Loom, paste URL into submission form)
2. Write anchor content: "How I use SwarmSpace to run Orbital AI as a solo founder"
3. Session broker / orchestrator execution modes (backlog §5.3)

---

## Session: 2026-05-19 — CLAUDE.md v1.7.0: SOP overhaul + Karpathy principles

**Branch:** main

### What was done
- **DOCS/claude.md + root CLAUDE.md v1.7.0:** Major SOP overhaul across 13 changes:
  - Added STEP 2.5 (DECIDE: SCOPE · AGENTS · DEFINITION OF DONE) — mandatory planning gate before any implementation. Forces agents to classify scope, declare agent count/types/ownership, and write a definition of done in chat before touching files.
  - Updated STEP 5 (REVIEW) to include: run existing test suite, verify against definition of done, confirm completeness — not just linter.
  - Added Code Quality Principles section (4 rules from Karpathy): Think Before Coding, Simplicity First, Surgical Changes, Goal-Driven Execution.
  - Fixed SOP-TASK Step 4: autonomous by default; pause only for shared/critical-path changes (authGuard, router, billing).
  - Fixed SOP-ORCH: replaced vague "simulate" note with structured ### Lead Agent / ### Sub-task [N] / ### Review output format.
  - Fixed SOP-BUG: defined risky areas explicitly (swarmspaceRouter.ts, authGuard.ts, orchestrator, auth/quota/billing/secret paths).
  - Added SOP-DEBUG escalation rule: stop after 2 failed hypotheses; document and surface to user.
  - Added SOP-SECURITY (new, was missing from Step 3E): 6-step security audit — secrets scan, auth/authz, input validation, OWASP cross-check, document findings.
  - Fixed SOP-PLAN: added Step 7 — preserve partial work at session close; wipe-clean only on full feature completion.
  - Fixed SOP-WORKTREE: split teardown into Step 9 (verify clean) and Step 10 (actual remove) with explicit "surface to user if dirty" guard.
  - Merged duplicate Reviewer Agent section into pointer + 4 checks (definition of done met, no scope creep, tests pass, principles upheld).
- **Applied to three repos simultaneously:** SwarmSpace (v1.7.0), LUMARA (STEP 2.5 + STEP 5 + Code Quality Principles added to CLAUDE.md), Starter Repo (v1.1.0 — all universal changes applied to claude.md and agents_sop.md).

### Commits this session
- None yet — CLAUDE.md update only; commit separately if needed.

### Next (SwarmSpace)
1. OpenAI App Directory submission — demo recording pending (activate developer mode first)
2. Write anchor content: "How I use SwarmSpace to run Orbital AI as a solo founder"
3. Session broker / orchestrator execution modes (backlog §5.3)

---

## Session: 2026-05-19 — Anthropic submission, benchmark, MCP quota bypass

**Branch:** main

### What was done
- **Anthropic MCP Directory submission:** Gap analysis against submission form. Created `terms.html` (11-section ToS, Orbital AI Inc.), added "Connecting SwarmSpace to Claude" section to `developer-guide.html` (6-step setup, 13-tool table, troubleshooting), added ToS link to `index.html` footer, created `mcp-docs.html` (standalone user setup page). Fixed OAuth access token lifetime 7 days → 30 days (`index.ts` 3 places, `2592000`). Confirmed CORS headers and safety annotations already present. Committed `1681200` + `ffef258`.
- **6-model AI benchmark:** Ran mcp-docs.html generation task across Gemma4 (10/10), Kimi K2.6 (10/10 — selected for production, best semantic HTML), GLM 5.1 (10/10), DeepSeek V4 Pro (10/10), DeepSeek V4 Flash (10/10 — identical to Pro, use as default), GPT OSS 120B (9/10 — missing `<code>` tags). Created `DOCS/agent-profiles.md` with per-model strengths, failure modes, prompt rules. Updated memory `reference_gemma4_tendencies.md` to cover all 6 models.
- **OpenAI App Directory gap analysis:** Identified 2 code gaps (CSP header, `openWorldHint` annotation) + non-code gaps (org verification, logo, screenshots, test prompts). Code gaps fixed by Kimi K2.6: added `Content-Security-Policy: default-src 'none'; connect-src https://www.googleapis.com` to `corsHeaders()` and `openWorldHint: true` to all 13 tools. Committed `f1f0d15`. **Submission on hold** — category, identity verification, and logo done; demo recording pending (needs developer mode activation).
- **MCP quota bypass (Claude+SwarmSpace):** Free tier cap (20/day) preserved for standalone users; unlimited for Claude+MCP sessions. Tagged `_via_mcp: true` at mcp-server, threaded through orchestrator context, detected in `swarmspaceRouter` → `enforceSwarmSpaceQuota` bypasses when `isMcpSession`. Three files: `mcp-server/index.ts`, `orchestrator/index.js`, `swarmspaceRouter.ts`. Committed `7fadc23`, all three deployed.

### Commits this session
- `1681200` — feat(submission): add MCP docs, terms, agent profiles for Anthropic MCP Directory
- `ffef258` — fix(mcp-server): extend OAuth access token lifetime to 30 days
- `f1f0d15` — feat(mcp-server): add CSP header and openWorldHint annotations for OpenAI App Directory
- `7fadc23` — feat(quota): bypass daily call limit for Claude+SwarmSpace MCP sessions

### Next (SwarmSpace)
1. OpenAI App Directory submission — demo recording pending (activate developer mode first); screenshots + test prompts still needed
2. Write anchor content: "How I use SwarmSpace to run Orbital AI as a solo founder"
3. Session broker / orchestrator execution modes (backlog §5.3)

---

## Session: 2026-05-19 — v1.6.0 doc sync + milestone tag

**Branch:** main

### What was done
- **DOCS/claude.md v1.6.3 → v1.6.4:** Removed ~216 lines of duplicate content (Task Management SOP, Core Documentation, Documentation Update Rules, Role prompt block, sub-agent prompt expansions). Fixed `Planner.md` → `planner.md` (SOP-PLAN invariant violation). Fixed all remaining `Docs/` → `DOCS/` paths throughout. Replaced dangling `SOP-REVIEW` reference. Corrected footer version from 1.5.1 to 1.6.4. Both `DOCS/claude.md` and root `CLAUDE.md` updated; mirror copied to `DOCS/Startup Onboard/SWARMSPACE_Claude.md`.
- **DOCS/CHANGELOG.md v1.5.3 → v1.6.0:** Added v1.6.0 entry documenting service binding, token pipeline fixes, logo/favicon, and CLAUDE.md cleanup. Milestone status table added.
- **DOCS/CONFIGURATION_MANAGEMENT.md:** Fixed all `Docs/` → `DOCS/` path references in Key Documents table and inventory. Updated DOCS/claude.md inventory row to v1.6.4. Added v1.6.0 change log entry. Last updated date bumped.
- **DOCS/context.md (this file):** Session block prepended.
- **Committed and pushed:** v1.6.0, tagged `v1.6.0` with milestone annotation "SwarmSpace initially working."
- **Mirrors updated:** SWARMSPACE_Context.md, SWARMSPACE_Claude.md in `DOCS/Startup Onboard/`.

### Next (SwarmSpace)
1. Submit to Anthropic: `claude.com/connectors` → "Get started"
2. Submit to OpenAI App Directory
3. Write anchor content: "How I use SwarmSpace to run Orbital AI as a solo founder"

---

## Session: 2026-05-18 — Kimi K2.6 review; service binding deploy; both repos clean

**Branch:** main

### What was done
- Reviewed Kimi K2.6 cross-repo analysis — scored 6/10. Confirmed findings: root CLAUDE.md drift, LUMARA uncommitted changes, Agents.md `1111#` corruption, Coordinate_LUMARA.md empty. Rejected findings: wrong path case direction (`DOCS/` IS correct), misread SwarmSpace symlink as git-tracked files (it's also a Hub symlink).
- **SwarmSpace root CLAUDE.md synced** to v1.6.3 (was drifted since yesterday's DOCS/claude.md update).
- **Agents.md line 1 fixed**: removed `1111#` prefix corruption.
- **Service binding deployed by user:** `workers/mcp-server` now calls orchestrator via Cloudflare Service Binding (`env.ORCHESTRATOR: Fetcher`) instead of HTTP egress. No network hop, no egress cost. `AbortSignal.timeout(55_000)` removed (inherits platform CPU time budget).
- **Orchestrator auth bug fixed:** service-token bypass no longer sends `Authorization` header (Firebase Functions v2 rejects non-JWT at runtime layer before handler — bypass relies on `request.data._service_token` only). `workers/orchestrator/src/index.js` updated.
- **LUMARA uncommitted changes committed** (`0af05419`): `_skipPlanning` fallback fix, `lookbackYears→timeWindowDays` rename, context selector 2-tier fallback, `device_calendar` pod, v1.0.6→1.1.0, LUMARA Hub symlink recovered, DOCS/claude.md Coordinate split updated.
- All committed: `79fdf05`, `f12c6d9` (yesterday) + `6caad4c` (today SwarmSpace), `0af05419` (today LUMARA).

### Next (SwarmSpace)
1. Submit to Anthropic: `claude.com/connectors` → "Get started"
2. Submit to OpenAI App Directory
3. Write anchor content: "How I use SwarmSpace to run Orbital AI as a solo founder"
4. LUMARA: Coordinate_LUMARA.md is empty — LUMARA Claude should migrate its dialog entries there next session

---

## Session: 2026-05-17 — Repo + SOP housekeeping; LUMARA cross-reference

**Branch:** main

### What was done
- Full repo review: identified 4 issues (git state, uncommitted mcp-server change, SOP drift, untracked package-lock)
- **DOCS/claude.md v1.6.2 → v1.6.3:** Updated all `Coordinate.md` references to use split files (`Coordinate_SS.md` for SwarmSpace dialog, `Coordinate_LUMARA.md` read-only). Fixed STEP 1/6 path refs from `Docs/` → `DOCS/`. Fixed cp commands to use `DOCS/context.md` and `DOCS/claude.md` (not `Docs/CLAUDE.md`). Updated STEP 1 ORIENT addition and rules-of-the-road section.
- **Git cleanup:** Committed staged deletions of `Docs/Startup Onboard/` + staged untracked `DOCS/Startup Onboard/` directory (previously untracked — files were at risk if working tree lost). Committed uncommitted `workers/mcp-server/src/index.ts` (access token expiry 1hr → 7 days) and `workers/mcp-server/package-lock.json`.
- **Mirrors refreshed:** SWARMSPACE_Claude.md, SWARMSPACE_Context.md, SWARMSPACE_Planner.md updated in `DOCS/Startup Onboard/`.
- **LUMARA cross-reference:** No action needed from SwarmSpace. LUMARA items §4.4 Catalogue Delta Sync and §5.2 News Briefing UI remain open on LUMARA's side (per last LUMARA session 2026-05-16). No new blockers. LUMARA's CLAUDE.md File Directory table still references `Coordinate.md` — flagged for LUMARA Claude to fix in their next session.

- **mcp-server redeployed:** `wrangler deploy` confirmed by user — 7-day access tokens now live in production.

### Next (SwarmSpace)
1. Submit to Anthropic: `claude.com/connectors` → "Get started"
2. Submit to OpenAI App Directory
3. Write anchor content: "How I use SwarmSpace to run Orbital AI as a solo founder"

---

## Session: 2026-05-16 — Doc close-out; LUMARA Mode 1 fix (cross-repo assist)

**Branch:** main — doc-only updates

### What was done
- SOP-DOC close-out for both repos after LUMARA Mode 1 no-entries hallucination fix session.
- No new SwarmSpace code shipped this session. OAuth 2.1 + DCR + Streamable HTTP work remains live from prior session (deployed `c5aa5f33`, committed `0c236b5`, merged to `main` 2026-05-15).
- **LUMARA bug fixed (cross-repo):** LUMARA Personal mode (Mode 1) was offering to search past journal entries then retracting — hallucination from unconditional wording. Fixed in 3 source files + 3 new test files (23 tests passing). LUMARA version bumped to v1.0.22.
- Updated `Docs/context.md` (this file), `Docs/CONFIGURATION_MANAGEMENT.md` in SwarmSpace.
- Updated `DOCS/context.md`, `DOCS/CHANGELOG.md` (v1.0.22), `DOCS/CONFIGURATION_MANAGEMENT.md` in LUMARA.
- Updated `Coordinate_SS.md` in Hub with LUMARA fix status.

### Next (SwarmSpace)
1. Submit to Anthropic marketplace: `claude.com/connectors` → "Get started" — MCP endpoint `https://swarmspace-mcp-server.orbitalai.workers.dev/mcp`
2. Submit to OpenAI App Directory — same endpoint + OAuth server
3. Write anchor content: "How I use SwarmSpace to run Orbital AI as a solo founder"

---

## Session: 2026-05-15 — OAuth 2.1 + Streamable HTTP (wt/mcp-oauth)

**Branch:** wt/mcp-oauth — committed `0c236b5`, NOT yet merged to main

### What was done
- Implemented full OAuth 2.1 Authorization Server in `workers/mcp-server/src/index.ts`
- RFC 7591 Dynamic Client Registration: `POST /oauth/register`
- RFC 8414 Authorization Server Metadata: `GET /.well-known/oauth-authorization-server`
- RFC 9728 Protected Resource Metadata: `GET /.well-known/oauth-protected-resource`
- RFC 8707 resource parameter enforced on `/oauth/authorize` and `/oauth/token`
- PKCE S256 enforced; refresh token rotation (OAuth 2.1 mandatory for public clients)
- Streamable HTTP: `tools/call` detects `Accept: text/event-stream`, returns SSE via `TransformStream`
- Protocol version bumped `2024-11-05` → `2025-06-18`; `MCP-Protocol-Version` header on all `/mcp` responses
- `WWW-Authenticate` header on 401 with resource_metadata pointer
- `oauth-consent.html` — Firebase email + Google sign-in consent page (Vercel-deployed, matches site visual style)
- Legacy HMAC `ss_mcp_` key validation preserved as fallback — existing API key users unaffected
- Manifest `auth.type` updated from `bearer` to `oauth2`
- `tsconfig.json` added to `workers/mcp-server/` (matches Durable Object pattern)
- TypeScript clean: zero errors

### Pending (Marc must do before deployment)
1. `wrangler kv:namespace create OAUTH_CLIENTS` → copy id into `workers/mcp-server/wrangler.toml`
2. `wrangler kv:namespace create OAUTH_CODES` → copy id
3. `wrangler kv:namespace create OAUTH_TOKENS` → copy id
4. `wrangler secret put OAUTH_ISSUER` (value: `https://swarmspace-mcp-server.orbitalai.workers.dev`)
5. `wrangler secret put FIREBASE_PROJECT_ID` (value: `arc-epi`)
6. Review diff: `git -C ../swarmspace-mcp-oauth diff main..HEAD`
7. Merge: `git merge --no-ff wt/mcp-oauth -m "merge: OAuth 2.1 + DCR + Streamable HTTP (wt/mcp-oauth)"`
8. Deploy: `cd workers/mcp-server && wrangler deploy`
9. Push for Vercel (oauth-consent.html): `git push origin main`
10. Submit to Anthropic: `claude.com/connectors` → "Get started"
11. Submit to OpenAI: OpenAI App Directory developer portal

### Architecture notes
- OAuth flow: Claude → `GET /oauth/authorize` → redirect to `swarmspace.app/oauth-consent.html` → Firebase login → `POST /oauth/authorize/complete` (validates Firebase token, issues auth code) → Claude exchanges at `POST /oauth/token` (PKCE verified) → access + refresh tokens stored in OAUTH_TOKENS KV
- Firebase token validation: fetches Google public keys, extracts SPKI from X.509 DER cert, verifies RS256 JWT signature using Web Crypto
- KV TTLs: access tokens 1hr, refresh tokens 30 days, auth codes 10min, clients no TTL

---

## Session: 2026-05-14 — SMB Intelligence Layer Backlog + MCP Deployment Confirmed

### What was done
- MCP Remote Server cherry-picked to `main` and deployed (LUMARA session 50). `swarmspace-mcp-server.orbitalai.workers.dev` live. `generateMcpApiKey` + `revokeMcpApiKey` Firebase functions deployed to `arc-epi`. Both secrets set (`MCP_KEY_SECRET` in Google Secret Manager + Cloudflare; `SWARMSPACE_INTERNAL_TOKEN` in Cloudflare).
- SMB Intelligence Layer Backlog added to `backlog.md` — 5 areas: MCP compliance audit (gates both marketplace listings), Anthropic + OpenAI marketplace applications, anchor content piece, homepage copy update, Profile D developer outreach, Roles page seeding, Decision Synthesis workflow (later).
- **Niche decision locked:** SwarmSpace positions as a business intelligence connector in both Anthropic and OpenAI marketplace directories.
- Resolved stale merge conflict at end of `backlog.md` (lines 2775-2778, from commit 733d5a9).

### Next
1. MCP compliance audit — OAuth 2.1 + Dynamic Client Registration (OpenAI gate); Remote MCP Server + MCP Apps (Anthropic gate). One audit clears both.
2. Anchor content piece — solo founder use case, LinkedIn + Substack.
3. Homepage copy update — "business intelligence layer for people running lean".

---

## Session: 2026-05-14 — MCP Remote Server

**Branch:** claude/review-swarm-agents-workflows-0BqPd  
**Status:** Complete — test agent PASS  

### What was done
- Audited swarmspaceRouter against MCP Remote Server spec; identified 3 blocking gaps (transport, tool definitions, auth)
- Built `workers/mcp-server/` Cloudflare Worker: MCP JSON-RPC 2.0 endpoint, 13 tools from orchestrator chains, HMAC-SHA256 API key validation, service-token bypass to orchestrator
- Built `functions/src/functions/swarmspaceMcpKeys.ts`: generateMcpApiKey + revokeMcpApiKey (max 5 keys/user, keys never stored in Firestore)
- TypeScript build clean; all MCP protocol checks passed

### Architecture
- Auth: `ss_mcp_{uidB64}.{tsB64}.{hmacHex}` — HMAC-SHA256, validated in Worker via Web Crypto
- Call chain: Claude → `swarmspace-mcp-server.orbitalai.workers.dev/mcp` → Orchestrator (service-token bypass) → swarmspaceRouter → plugin workers
- No changes to existing swarmspaceRouter, orchestrator, or plugin workers

### Next steps (deployment — not done yet)
1. `wrangler secret put MCP_KEY_SECRET` (new shared secret, same value for Worker + Firebase)
2. `wrangler secret put SWARMSPACE_INTERNAL_TOKEN` (reuse existing DO value) from `workers/mcp-server/`
3. `firebase functions:secrets:set MCP_KEY_SECRET`
4. `wrangler deploy` from `workers/mcp-server/`
5. Wire key generation UI in LUMARA settings page (LUMARA dependency)
6. Submit to claude.ai/platform/marketplace

### LUMARA dependency
LUMARA needs to add a "MCP API Keys" section to the settings page calling `generateMcpApiKey` and `revokeMcpApiKey`. No other LUMARA changes required.

---

# context.md — Agent Handoff Log

## Current State
> **Overwrite this section at session start. Ground truth only — no prose. Verify against `git status` before writing.**

- **Branch:** `main`
- **Working tree:** Modified: `Docs/CLAUDE.md`, `CLAUDE.md`, `Docs/context.md`, `DOCS/Startup Onboard/` (multiple files). Untracked: `.claude/`, `swarmspace.code-workspace`. Verified 2026-05-03.
- **Last commit:** `6b6e4ca` — docs: adopt Coordinate.md SOP + cross-repo Meeting Prep confirmation
- **Deployed:** All 23 Firebase functions, calendar-reader Worker, orchestrator (with `/meeting-prep`), News Briefing DO Worker, and gemini-flash Worker secret rotation — all live as of 2026-05-02
- **planner.md:** Cleaned — no active tasks
- **Cross-repo mirror:** Active. SwarmSpace → `DOCS/Startup Onboard/SWARMSPACE_*.md` (now git-tracked inside repo). Path updated in `Docs/CLAUDE.md` v1.6.2. Old external path (`/Volumes/Marc Working Drive/Development/Startup Onboard/`) is superseded.
- **Next action:** Commit this session's doc changes. Then pull from `backlog.md`. Top open items: §3.3 Stripe Connect wiring, §5.3 Orchestrator Execution Modes, §3.4 earnings backend.

---

## SESSION — 2026-05-03 — SwarmSpace Claude (Sonnet 4.6) — Relocate Startup Onboard to DOCS/ + update all path refs

### 2026-05-03 — Startup Onboard relocated and all path references updated
- **Files touched:** `Docs/CLAUDE.md`, `CLAUDE.md`, `DOCS/Startup Onboard/README.md`, `DOCS/Startup Onboard/Coordinate.md`, `DOCS/Startup Onboard/SWARMSPACE_*.md` (mirrors refreshed), `Docs/context.md`
- **Changes:** User moved the Startup Onboard shared mailbox from the external untracked path (`/Volumes/Marc Working Drive/Development/Startup Onboard/`) into the git-tracked `DOCS/Startup Onboard/` inside this repo. Updated all path references in both `Docs/CLAUDE.md` and root `CLAUDE.md` (v1.6.1 → v1.6.2). Updated README.md to note git-tracked status + new LUMARA cp command path. Added a `Coordinate.md` infrastructure-update entry for LUMARA. Refreshed all SWARMSPACE_* mirror files.
- **Outcome:** `DOCS/Startup Onboard/` is the new canonical shared mailbox. Both CLAUDE.md files are in sync at v1.6.2. LUMARA can now write its mirror files to this path.
- **Open items / handoff:** Commit this session's changes. LUMARA needs to update its cp commands to use `ONBOARD="/Volumes/Marc Working Drive/Development/swarmspace/DOCS/Startup Onboard"` — this is noted in `Coordinate.md`.

---

This file is the working memory for any agent (Claude or otherwise) operating in this repo. Every meaningful action goes here so the next agent can resume without re-deriving what already happened.

## How to Use This File

**Read it first.** Before doing anything in this repo, read this file top to bottom. The most recent session is at the top.

**Write to it as you work.** After every meaningful action, append a new entry to the top. Don't batch a whole session into one entry at the end. If you crash, restart, or get interrupted, the next agent needs the trail up to the last completed step.

**One entry per meaningful action.** A meaningful action is anything that changes state or matters for the next agent: a file created, a file edited, a command run that mutated the system, a decision made with the user, a plan committed to, a question raised. Read-only exploration (cat, ls, grep) doesn't need its own entry. Roll those into the entry for the action they supported.

**Newest on top.** Sessions, then entries within a session, are ordered most-recent first. The next agent gets current state in the first screen.

## Entry Format

Each session opens with a session header. Each action under that session is its own block.

```markdown
## SESSION — YYYY-MM-DD HH:MM TZ — <agent identity> — <one-line goal>

### YYYY-MM-DD HH:MM — <verb-led summary>
- **Files touched:** path1, path2
- **Commands run:** `cmd` (only if it mutated state)
- **Decisions:** what was decided and why, including user input
- **Outcome:** what state the repo is now in
- **Open items / handoff:** what's unfinished, what the next agent should know
```

Skip any field that doesn't apply. Keep prose tight. Link to commits, PRs, or external docs when relevant.

## Conventions

- Use absolute paths from the repo root (e.g. `Agents.md`, `bugtracker/bug_tracker.md`).
- Quote user instructions verbatim when a decision hinges on their exact wording.
- If a previous entry is now wrong (e.g. a fix was reverted), don't delete it. Add a new entry that supersedes it and reference the old one by timestamp.
- When a session ends, leave a final "Open items / handoff" line on the most recent entry so the next agent knows where to pick up.
- **At session start:** Run `git status` and update the Current State section at the top before doing anything else. Never trust prior session notes about uncommitted work without verifying.
- **Close the loop:** When work that was logged as "not yet committed" gets committed, append `→ committed [hash]` inline to the original outcome line. Do not delete it.

---

## SESSION — 2026-05-03 — Claude Opus 4.7 (Claude Code) — Answered LUMARA's 10 cross-repo questions

### 2026-05-03 — Answered all 10 LUMARA questions in `Startup Onboard/Coordinate.md`
- **Files touched:** `Startup Onboard/Coordinate.md` (3 inline answer blocks: Meeting Prep Phase 2, §4.4 Catalog Delta Sync, §5.2 News Briefing DO)
- **Decisions:** LUMARA opened tracking entries 2026-05-03 with 10 specific questions across the three cross-repo features. Answered each with source-cited specifics:
  - **Meeting Prep Phase 2 (3):** (1) single-attendee only today; recommend `attendees: []` array param on same route, not `/meeting-prep-multi`. (2) Auto-fire — recommend server-side DO variant (replicate News Briefing pattern with calendar-reader input). (3) OAuth refresh contract locked — entirely LUMARA's responsibility on `calendar_auth_expired` 401.
  - **§4.4 Catalog Delta Sync (3):** (1) Use `YYYY-MM-DDTHH:MM:SSZ` (`Z` suffix, no `+00:00` — lexicographic compare against `deployed_at` fields would misorder same-second timestamps). (2) Rate limit returns HTTP 429 + standard Firebase callable error envelope (`{"error":{"message":"...","status":"RESOURCE_EXHAUSTED"}}`); no retry-after header. (3) Cache-bust = omit `since` or send `since: null`; never `since: ""` (empty fails validation).
  - **§5.2 News Briefing DO (4):** (1) ⚠️ Downgrade leak today — `alarm()` doesn't re-check tier; downgraded users keep getting paid feature. Will fix to auto-pause on tier re-check. (2) `latest_delta` is most recent run only, not cumulative; LUMARA owns "last viewed" client-side. (3) No push/webhook; LUMARA polls (suggested: on app foreground after 5+ min background). (4) No server-side topic/count caps today; LUMARA enforces client-side; will add server caps as follow-up.
- **Outcome:** LUMARA has authoritative answers to all 10 questions, all source-cited to files+lines.

### 2026-05-03 — Added 4 follow-up items to backlog
- **Files touched:** `backlog.md`
- **Decisions:** Promised LUMARA in Coordinate.md that I'd track these — added to make sure they don't fall off:
  - **§5.2: Meeting Prep DO variant** — auto-fire on calendar event proximity (LUMARA Phase 2 Q2, ~1-1.5 days)
  - **§5.2 🐛: News Briefing DO alarm-fire tier re-check** — fix the downgrade leak (LUMARA §5.2 Q1)
  - **§5.2: News Briefing DO server-side caps** — max topics per DO + max DOs per user (LUMARA §5.2 Q4)
  - **§22 Phase 2: multi-attendee briefs** — refactor `/meeting-prep` to accept `attendees: []` array (LUMARA Phase 2 Q1)
  - Plus updated §22 header to reflect LUMARA L-1/L-2/L-3 code-complete status from Coordinate.md.
- **Outcome:** All four items tracked in SwarmSpace backlog with cross-references back to Coordinate.md.

---

## SESSION — 2026-05-03 — Claude Opus 4.7 (Claude Code) — Coordinate.md SOP adoption + Meeting Prep cross-repo confirmation

### 2026-05-03 — Adopted Coordinate.md bidirectional SOP in `Docs/CLAUDE.md` (v1.6.0 → v1.6.1)
- **Files touched:** `Docs/CLAUDE.md`
- **Decisions:** LUMARA Claude introduced `Startup Onboard/Coordinate.md` 2026-05-03 as the bidirectional dialog file (both sides edit, sign `[<REPO> <date>]`). Updated my STEP 1 ORIENT to read it for cross-repo work. Updated my STEP 6 CLOSE SESSION to edit it when cross-repo state changes. Cross-Repo Coordination table now distinguishes one-way mirrors (`SWARMSPACE_*` / `LUMARA_*`) from BIDIRECTIONAL `Coordinate.md`. Added rules of the road: `Edit` not `Write`/`cp`, sign every entry, never delete LUMARA entries, never edit LUMARA status claims (rebut with new entry). Per user instruction: 30-40s pause + retry on edit failure (sleep 35, re-read, retry; max 3 attempts before surfacing) — both sides may write concurrently.
- **Outcome:** SwarmSpace fully participates in the Coordinate.md dialog. CLAUDE.md mirrored to Startup Onboard.

### 2026-05-03 — Confirmed Meeting Prep status to LUMARA via Coordinate.md
- **Files touched:** `/Volumes/Marc Working Drive/Development/Startup Onboard/Coordinate.md`
- **Decisions:** LUMARA Claude asked for SwarmSpace's confirmation on SS-1 through SS-5 status (they had verified via 4 parallel Explore agents and wanted my own confirmation). Added `[SWARMSPACE 2026-05-03]` confirmation entry citing exact commits: `e165496` (Worker + REGISTRY_ENTRIES.ts), `b2e4fd5` (orchestrator route + service-token), `e90547b` (PLUGIN_REGISTRY entry). All v1.5.2-tagged, deployed to arc-epi 2026-05-02, smoke-tested.
- **Outcome:** LUMARA verification corroborated; cleanup item closed in same edit (see next entry).

### 2026-05-03 — Resolved REGISTRY_ENTRIES.ts cleanup flagged by LUMARA
- **Files touched:** `workers/plugins/REGISTRY_ENTRIES.ts` (added `rateLimits: { free: 0, standard: 500, premium: 500 }` to `calendar-reader` entry, line 75)
- **Decisions:** LUMARA flagged that REGISTRY_ENTRIES.ts was missing the `rateLimits` field that the §22 spec lists. Fixed it. Note: REGISTRY_ENTRIES.ts is documentation-only (the live enforcement is SS-4's PLUGIN_REGISTRY in `swarmspaceRouter.ts`, which already had the field), so no redeploy needed. Reported resolution back to LUMARA in `Coordinate.md` under the Meeting Prep section.
- **Outcome:** REGISTRY_ENTRIES.ts now matches the spec.

### 2026-05-03 — Raised two open requests to LUMARA in Coordinate.md
- **Files touched:** `/Volumes/Marc Working Drive/Development/Startup Onboard/Coordinate.md`
- **Decisions:** Added "Open requests across repos" entry from SwarmSpace surfacing two LUMARA-side wirings now unblocked by shipped infrastructure: (1) §4.4 catalogue updates delta sync — LUMARA can switch session-start discovery to send `since: <last sync ISO>`; backwards-compatible; (2) §5.2 News Briefing DO — LUMARA can wire "keep watching this" UI calling the three live endpoints (`/create`, `/cancel`, `/{do_id}/latest`). Both Pro/Premium gated server-side. Neither blocks LUMARA's current sprint; surfaced for visibility per Coordinate.md's "need something from the other side" trigger.
- **Outcome:** Open requests visible in the cross-repo dialog.

---

## SESSION — 2026-05-03 — Claude Opus 4.7 (Claude Code) — Cross-repo mirror set up + Starter Repo SOP adopted

### 2026-05-03 — Mirrored canonical docs to unified dir
- **Files touched:** `/Volumes/Marc Working Drive/Development/Startup Onboard/SWARMSPACE_{Backlog,Context,Planner,Claude}.md` (created — mirrors of `backlog.md`, `Docs/context.md`, `planner.md`, `Docs/CLAUDE.md` respectively)
- **Decisions:** Matched LUMARA's actual file-naming convention (`<REPO>_<Title>.md`, Title Case, not the ALL_CAPS the README documents). Fixed `SWARMSPACE_Context.md` permission from 600 → 644 since the source is user-only but mirrors should be readable. Did NOT mirror `Docs/Agents.md` — convention only mirrors the SOP entry-point doc (CLAUDE.md), not the broader project reference.
- **Outcome:** Unified dir now has parallel `LUMARA_*` and `SWARMSPACE_*` mirrors. A third-party agent can onboard from this single directory without traversing either repo.

### 2026-05-03 — Adopted Starter Repo entry-point pattern in `Docs/CLAUDE.md` (v1.5.1 → v1.6.0)
- **Files touched:** `Docs/CLAUDE.md`
- **Decisions:** Added STEP 1-6 Standard Procedure box at the top (matching LUMARA's CLAUDE.md pattern, adapted for SwarmSpace stack: linter is `cd functions && npm run build`, not `dart analyze`). Added Key Invariants section with 7 SwarmSpace-specific non-negotiables (Gemini model pinning, LUMARA dependency declaration, admin-email auto-promote, secrets rule, lowercase planner.md, swarmspaceRouter.ts ownership, service-token internal-only). Added Cross-Repo Coordination section with the mirror table + concrete `cp` commands + the explicit rule: "I am free to edit any `.md` in this repo as the canonical source. After editing, I MUST mirror the changed files to the unified dir at STEP 6 close-session." Existing SOP-TASK / SOP-ORCH / SOP-BUG / SOP-DEBUG / SOP-DOC / SOP-PROMPT / SOP-PLAN preserved verbatim below the new top sections — they're SwarmSpace-specific implementations that the new STEP 1-6 procedure now references explicitly.
- **Added SOP-WORKTREE** inline (slim version of Starter Repo's). When/why to use, naming convention (`wt/<id>` branch, sibling `../<repo>-<id>` worktree), full lifecycle (worktree add → bootstrap → implement → review → no-ff merge → teardown), safety guards. Notes that v1.5.2 sprint used this pattern (3 sub-agents in `.claude/worktrees/agent-*`).
- **Fixed three uppercase `Planner.md` references** to lowercase per Key Invariant — drift left over from the case-collision deletion 2026-05-01.
- **Outcome:** `Docs/CLAUDE.md` is now the canonical entry-point doc (STEP 1 ORIENT lands here) and codifies the cross-repo mirror rule. SwarmSpace SOPs preserved.
- **Open items / handoff:** Larger Starter Repo adoption (folder restructure into `Docs/operations md files/` + `Docs/agents md files/` + `Docs/tracking md files/`, pulling in `agents_handoff.md`, `agents_orchestrator.md`, `agents_doc_backup.md`, `agent_scoping.md`, `startup.md`, `BUG_PREVENTION.md`, etc.) was deferred to a dedicated session — flagged but not done. CLAUDE.md plus existing SOPs are sufficient for now; the file-split is purely organizational.

---

## SESSION — 2026-05-02 — Claude Opus 4.7 (Claude Code) — v1.5.2 deploy + smoke tests + Gemini key resync

### 2026-05-02 — v1.5.2 deployed to production (committed → pushed → deployed)
- **Commits deployed:** `b2e4fd5` (lead orchestrator + service-token), `891ccc2` (Track 1 §4.4 catalogue updates), `e165496` (Track 2 §22 calendar-reader Worker), `306983a` (Track 3 §5.2 News Briefing DO), `e90547b` (SS-5 calendar-reader registry + spec correction), `036d31b` (closeout). All in `main`, all pushed, all tagged.
- **Deploys executed by user (not Claude):**
  - Firebase functions: `firebase deploy --only functions --project arc-epi` — all 23 functions updated successfully (re-ran once after initial deploy didn't pick up Track 1 changes, second deploy worked).
  - Cloudflare: `swarmspace-plugin-calendar-reader` (new), `swarmspace-orchestrator` (updated with `/meeting-prep`), `swarmspace-durable-object-news-briefing` (new with DO bindings + Alarms).
- **Secrets set on Workers:**
  - `calendar-reader`: SWARMSPACE_INTERNAL_TOKEN
  - `news-briefing` DO: SWARMSPACE_INTERNAL_TOKEN, FIREBASE_API_KEY, FIRESTORE_SERVICE_ACCOUNT_JSON
- **Outcome:** All §22 SwarmSpace-side, §4.4, §5.2 Worker tasks shipped. LUMARA-side handoff pending.

### 2026-05-02 — Service account created for News Briefing DO Firestore reads
- **Created:** `news-briefing-do-firestore@arc-epi.iam.gserviceaccount.com` with `Cloud Datastore Viewer` role (read-only).
- **Key incident:** original key leaked into terminal scrollback during `wrangler secret put` interactive paste (multi-line JSON broke when prompt closed mid-paste). Old key revoked in GCP within seconds. New key generated and uploaded via `cat key.json | wrangler secret put` (stdin pipe — no interactive paste, no scrollback exposure). Cleanup: `rm -P` on downloaded JSONs, `rm ~/.zsh_history`, `rm -rf ~/.wrangler/logs/`.
- **Lesson:** never paste multi-line secrets into `wrangler secret put` interactive prompt. Always pipe via stdin, or base64-flatten first. `.gitignore` updated to add `node_modules/` (DO Worker now carries package.json).

### 2026-05-02 — Gemini key resynced to gemini-flash Worker
- **Issue:** Gemini key was rotated 2026-05-01 in Google AI Studio (closing the loop on the credential leak from 2026-04-19), but the `swarmspace-plugin-gemini-flash` Cloudflare Worker still held the old (revoked) key. All gemini-flash synthesis calls returning 500 "Upstream Gemini API error". Affected every workflow ending in synthesis (`/research`, `/news-brief`, `/meeting-prep`, etc.).
- **Fix:** uploaded current Gemini key to `swarmspace-plugin-gemini-flash` via `pbpaste | wrangler secret put GEMINI_API_KEY --name swarmspace-plugin-gemini-flash`. Verified key works directly against Gemini API with `gemini-3-flash-preview` model.
- **Worker source:** NOT in this repo. Lives somewhere external — likely worth locating in a future session for proper version control.

### 2026-05-02 — Smoke tests run, deploy verified
- **Test 1 (full catalogue):** ✅ returns ~22 plugins
- **Test 1b (catalogue with `since`):** ✅ filtered, sorted desc by deployed_at, calendar-reader first as expected
- **Test 2 (calendar-reader auth):** ✅ returned 400 "Missing required parameter: access_token" (only after resyncing the Worker secret to match Firebase's value — initial deploy paste was slightly different)
- **Test 3 (`/meeting-prep`):** ✅ chain runs end-to-end. Initial 500 was stale Gemini key; after resync, hit free-tier 20/day quota cap (anonymous test user) — proves quota gating works as designed. Production users on Pro/Premium (or admin auto-promoted) bypass this.
- **Test 4 (DO `/create`):** Skipped — needs OAuth-authenticated user; agreed not load-bearing for deploy verification.
- **Open items / handoff:** All SwarmSpace-side work for §4.4, §22, §5.2 complete and live. LUMARA-side: §22 L-1/L-2/L-3/L-4 (MeetingPrepWorkflow, UI, e2e, v1RouteSet allowlist) and §5.2 "keep watching this" UI wiring.

---

## SESSION — 2026-04-24 — Claude Sonnet 4.6 (Claude Code) — Launch day: OAuth fix, credential isolation, deploy

### 2026-04-24 — Credential isolation + cleanup — committed `4311c49`
- **Files touched:** `functions/src/functions/swarmspaceRouter.ts`, `workers/plugins/github-public/src/index.ts`, `workers/plugins/jina-reader/src/index.ts`, `workers/plugins/pubmed/src/index.ts`, `workers/plugin-registry/` (deleted), `Docs/context.md`, `planner.md`
- **Decisions:** Router now injects GITHUB_TOKEN, JINA_API_KEY, NCBI_API_KEY per-request. Workers removed env declarations. social-publisher removed from plugin registry (stateful OAuth, doesn't fit plugin model). plugin-registry worker deleted (stub with 3/22 plugins, orphaned). context.md improved with Current State block + stale entry conventions.
- **Outcome:** Committed and deployed. All 23 functions live.

### 2026-04-24 — OAuth login fix
- **Root cause:** Firebase web API key had HTTP referrer restrictions that blocked `arc-epi.firebaseapp.com` (Firebase's own auth handler domain). Removed all referrer restrictions from the API key in Google Cloud Console → APIs & Services → Credentials.
- **Outcome:** OAuth login working on swarmspace.app.

### 2026-04-24 — Firebase secrets set and deployed
- **Secrets set:** GITHUB_TOKEN, JINA_API_KEY, NCBI_API_KEY via `firebase functions:secrets:set`
- **Deleted:** getAssemblyAIToken, getWisprApiKey, proxyOllama (unused, removed in prior session)
- **Outcome:** Full deploy complete. SwarmSpace launched. LinkedIn announcement posted.
- **Open items / handoff:** Next priorities from backlog: §3.3 Stripe Connect wiring, §5.2 Durable Objects Phase 0, §4.4 Catalogue Updates endpoint. LUMARA: useOrchestrator flag flipped by user on 2026-04-24.

---

## SESSION — 2026-04-19 (continued) — Claude Sonnet 4.6 (Claude Code) — Firebase deployment timeout investigation + §16 Roles browsing page

### 2026-04-19 — §16 Roles browsing page — DONE
- **Files touched:** `roles.html` (new), `index.html` (nav link added), `backlog.md` (§16 marked done)
- **Decisions:** Created `roles.html` with 6 Role cards (5 Free, 1 Standard). Each card has: role name + tagline, description, expandable plugin chain detail, tier badge, deploy CTA. Firebase auth check: signed-in users see "Open Dashboard →", guests see "Sign up free →". "Coming soon" section for Lead Gen and Data Entry Specialists (awaiting write plugins). Linked from index.html nav.
- **Outcome:** §16 complete. `roles.html` is live in working tree. → committed `cd71c9c`
- **Open items:** ~~Commit this with deployment timeout investigation note.~~ Done.

### 2026-04-19 — Firebase deployment timeout investigation — CLEARED (no code fix needed)
- **Files touched:** none (read-only investigation)
- **Decisions:** Reviewed all new LUMARA function files added to `functions/src/index.ts`: `proxyGemini`, `proxyGroq`, `proxyOllama`, `getAssemblyAIToken`, `getWisprApiKey`, `generateJournalReflection`, `groqClient.ts`, `authGuard.ts`, `rateLimiter.ts`, `config.ts`, `crypto.ts`, `saveUserModelConfig.ts`, `crisisIntervention.ts`, `analyzeJournalEntry.ts`, `config/providers.ts`. None have eager top-level initialization. The lazy-load pattern (`getDb()`) is consistently applied. The timeout was likely transient. Working tree is already clean (all prior changes committed through ca18197).
- **Outcome:** No code change needed. Current codebase should deploy without timeout.
- **Open items / handoff:** User must set secrets for new LUMARA functions before deploying: `firebase functions:secrets:set GROQ_API_KEY`, `OLLAMA_API_KEY`, `ASSEMBLYAI_API_KEY`, `WISPR_FLOW_API_KEY`. Also set new Gemini key: `firebase functions:secrets:set GEMINI_API_KEY`. Then: `cd functions && npm run build && cd .. && firebase deploy --only functions --project arc-epi`. Verify 3 workflows pass.

---

## SESSION — 2026-04-19 — Claude Sonnet 4.6 (Claude Code) — Backlog review, launch gate verification, SOP-DOC run

### 2026-04-19 — Security: Gemini API key removed from repo + history (FORCE PUSH)
- **Files touched:** `functions/SETUP_API_KEYS.md`, `.gitignore`, `scripts/get-test-token.js` (deleted from tracking)
- **Commands run:** `git filter-repo` (rewrote all 137 commits), `git push --force origin main`
- **Decisions:** Firebase web API key (`AIzaSyDL9V3...`) is intentionally public — left in HTML files, no action needed. Gemini API key (`AIzaSyD0EqMv...`) is a server-side secret — removed from `SETUP_API_KEYS.md`, replaced in all history with `REDACTED_GEMINI_KEY`. `scripts/get-test-token.js` removed from git tracking and added to `.gitignore`. Force push rewrote origin/main history — any other clones (including LUMARA Claude's worktrees) must do `git fetch --force && git reset --hard origin/main` to re-sync.
- **Outstanding action for user:** Revoke the Gemini key immediately in Google AI Studio (https://aistudio.google.com/app/apikey) — history rewrite removes it from future clones but the key may have been cached by GitHub or seen by others. Rotating the key is the only guarantee. → **Rotated 2026-05-01 (confirmed by user).**
- **Firebase web API key:** Restrict to authorized domains in Firebase Console → Project Settings → API restrictions to prevent quota abuse.

### 2026-04-19 — §12 Phase 2 Discovery Agent JS — COMPLETED
- **Files touched:** `index.html`, `backlog.md`
- **What was already done (found on inspection):** Event handlers wired, fetch to `swarmspaceDiscoveryAgent`, chain card rendering, free tier note, CTA with base64 chain param, ready-made workflow variant, multi-turn, 3-turn limit, loading indicator, 429 handling. All in working tree from a prior session.
- **What was missing and is now fixed:**
  1. `requires_paid` case — added "⚡ Requires SwarmSpace Standard or Pro for: [paid_plugins]" using `paid_plugins[]` array from API response
  2. Mobile 375px — added `@media(max-width:480px)` rule: `flex-direction:column` on `.chain-card-row`, cards full-width, arrows rotated 90°
  3. 3-turn gate message — upgraded from plain text to inline HTML with signup link; input + button disabled after gate fires
  4. 429 rate-limit message — upgraded to signup link; input + button disabled
  5. Added `.chain-paid` CSS class (orange/accent2 color)
- **Decisions:** `recurringVariant` not in API response schema — skipping until backend adds the field. Breakpoint set at 480px not 375px to catch slightly larger phones too.
- **Outcome:** §12 Phase 2 fully complete. `backlog.md` updated. → committed `0e2e85c`

### 2026-04-19 — Committed, merged, and pushed to origin main (commit 1f6a7a3)
- **Files touched:** `backlog.md` (conflict resolved), `planner.md`
- **Commands run:** `git add`, `git commit`, `git push origin main`
- **Decisions:** Remote had added §17 Research Writing Assistant and §18 Safe Room (see below) while we were working. Merge conflict in `backlog.md` was just the footer line. Kept all remote new sections, updated footer date to April 19, 2026. Also deleted `Docs/claude copy.md` — it was a duplicate of `Docs/Agents.md` (LUMARA repo content, 85KB, copied here accidentally).
- **Outcome:** `main` is clean and up to date. Both commits pushed: `a9d2ae2` (v1.5.0 launch gate) and `1f6a7a3` (merge + cleanup).
- **New backlog sections from remote (added by another session):** §17 Research Writing Assistant (6-step chain, premium workflow, Semantic Scholar/arXiv/PubMed foundation) and §18 Safe Room (structural prompt injection defense primitive for plugins with `fetches_external_content: true`). Both need to be reviewed and understood before work starts on them.

### 2026-04-19 — Reviewed backlog.md and identified next priorities
- **Files touched:** none (read-only)
- **Decisions:** Produced a prioritised status summary. One community launch prerequisite remained: LUMARA iOS not wired to orchestrator.
- **Outcome:** Clear picture of what is done vs. open across all 16 backlog sections.

### 2026-04-19 — Coordinated with LUMARA Claude on orchestrator wiring
- **Files touched:** `backlog.md` (§7.1 and §8)
- **Decisions:** LUMARA Claude confirmed `useOrchestrator` is hardcoded `false` in `_LUMARA/lib/shared/state/feature_flags.dart:22`. Updated backlog to reflect this is now an active open task, not a blocked one. The 404/405 blocker is cleared; the only remaining step is flipping the flag and verifying end-to-end.
- **Outcome:** `backlog.md` §7.1 and §8 updated with specific file/line.

### 2026-04-19 — Ran SOP-DOC (docs updated, NOT yet committed)
- **Files touched:** `Docs/CHANGELOG.md`, `Docs/CONFIGURATION_MANAGEMENT.md`, `planner.md`
- **Decisions:** Ran full Documentation, Configuration Management and Git Backup procedure per `Docs/claude.md`. Bumped CHANGELOG 1.4.1 → **1.5.0**. Updated CONFIGURATION_MANAGEMENT inventory (removed `Docs/RULE.md`, added `Docs/Agents.md`, `Docs/CHRONICLE.md`, `scripts/test-workflows.sh`, `scripts/get-test-token.js`, refreshed dates). Wiped `planner.md` clean (all tasks complete).
- **Outcome:** All doc artifacts are updated in the working tree. → committed `3147bfa`
- **Open items / handoff:** ~~See next action below.~~ Resolved.

### 2026-04-19 — ~~COMMIT PENDING~~ → RESOLVED: committed `3147bfa` (feat: clear community launch gate + doc sync v1.5.0)

~~**This is the open task for the next agent.**~~

The following files need to be staged, committed, and pushed to `origin main`:

**Modified (working tree):**
`Docs/CHANGELOG.md`, `Docs/CONFIGURATION_MANAGEMENT.md`, `planner.md`, `Docs/claude.md`, `SWARMSPACE_API_CONTEXT.md`, `backlog.md`, `functions/package.json`, `functions/package-lock.json`, `functions/src/functions/swarmspaceRouter.ts`, `functions/src/functions/stripeWebhook.ts`, `functions/src/functions/analyzeJournalEntry.ts`, `functions/src/functions/createCheckoutSession.ts`, `functions/src/functions/generateJournalPrompts.ts`, `functions/src/functions/getUserSubscription.ts`, `functions/src/functions/sendChatMessage.ts`, `functions/src/functions/unlockThrottle.ts`, `functions/src/authGuard.ts`, `functions/src/quotaGuards.ts`, `functions/src/rateLimiter.ts`, `functions/src/saveUserModelConfig.ts`, `functions/src/services/crisisIntervention.ts`, `functions/src/prism/rivet/resolve.ts`, `workers/orchestrator/src/index.js`

**Staged (already):**
`Docs/RULE.md` (deletion)

**Untracked (need `git add`):**
`Docs/Agents.md`, `Docs/CHRONICLE.md`, `Docs/context.md`, `scripts/get-test-token.js`, `scripts/test-workflows.sh`

**Suggested commit message:**
```
feat: clear community launch gate + doc sync v1.5.0

- Orchestrator: _prism_consent: true on all callPlugin() calls
- swarmspaceRouter: added "prompt" to gemini-flash PRISM fields
- All functions: lazy-load admin.firestore() via getDb() (Firebase timeout fix)
- firebase-functions bumped ^7.2.3 → ^7.2.5
- SWARMSPACE_API_CONTEXT: full Workflow/Work Chain API section added
- backlog: Stripe Connect partial build, agent-worker prototype, plugin-registry orphan documented
- Docs/RULE.md deleted (consolidated into claude.md SOPs)
- CHANGELOG v1.5.0, CONFIGURATION_MANAGEMENT updated
- Launch gate: 3/3 workflows verified live (research, competitor, news-brief)

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

### 2026-04-19 — Key discoveries recorded in backlog.md
- **§3.3 Stripe Connect:** `api/create-connect-account.js` and `api/get-connect-balance.js` exist in the Vercel API layer — partially built but not wired to any UI or Firebase functions.
- **§5.3 Orchestrator Execution Modes:** `workers/agent-worker/` has live `POST /agent/plan` and `POST /agent/execute` routes with tier-aware execution. Do not rebuild from scratch.
- **§5.5 Plugin Registry Worker:** `workers/plugin-registry/` is orphaned — not wired to any frontend or Firebase function. Decision needed: integrate or delete.

### 2026-04-19 — What cleared the community launch gate (context for next agent)
These fixes were already in the working tree when this session started (done by a prior session on 2026-04-18):
1. `workers/orchestrator/src/index.js`: `_prism_consent: true` injected into all `callPlugin()` calls — PRISM consent gating was blocking orchestrator workflows.
2. `functions/src/functions/swarmspaceRouter.ts`: `"prompt"` added to gemini-flash `privacy_data_required` + `dataTypes` — PRISM was stripping the prompt field before gemini-flash received it.
3. 13 LUMARA-owned functions: lazy-load `admin.firestore()` pattern applied — fixed Firebase 10s deployment timeout across all shared functions.
4. `firebase-functions` bumped to ^7.2.5.
Verified by `scripts/test-workflows.sh` — 3/3 workflows pass.

---

## SESSION — 2026-04-19 13:42 PDT — Claude (Cowork mode) — Stand up Agents.md SOP and context.md handoff log

### 2026-04-19 13:44 — Added Section 0 (Session Handoff: context.md) to Agents.md
- **Files touched:** `Agents.md`
- **Decisions:** Placed the handoff protocol as Section 0 so it is the first thing a new agent sees, ahead of the Universal Prompt Rule. Sub-sections cover start-of-session read, during-work append cadence, end-of-session handoff line, entry format (fenced with backticks so the inner code block renders cleanly), and conventions (repo-relative paths, no rewriting history).
- **Outcome:** Agents.md and context.md are now cross-referenced. Any agent following Agents.md will read and maintain context.md automatically.
- **Open items / handoff:** Nothing open. Both files are in place at the repo root.

### 2026-04-19 13:42 — Created context.md
- **Files touched:** `context.md` (new)
- **Decisions:** Newest-on-top ordering chosen for agent handoff speed. Granularity set to one entry per meaningful action per user direction.
- **Outcome:** Handoff log scaffolded with usage instructions and entry format.
- **Open items / handoff:** Add the matching "How to use context.md" section to `Agents.md` so the SOP references this file.

### 2026-04-19 13:30 — Rewrote Agents.md as a universal SOP
- **Files touched:** `Agents.md`
- **Decisions:** Stripped LUMARA/Flutter-root paragraph and `.CURSORRULES` header. Kept Flutter, Node, and native iOS as labeled examples in section 3.5 per user choice. Replaced em dashes and en dashes with periods, colons, or "to" per user writing preferences. Fixed `promp` and `pubsdk` typos and the duplicated "Identify the risks and the dependencies" line. Re-pointed the one-shot intake message from `DOCS/claude.md` to `Agents.md`.
- **Outcome:** `Agents.md` is now repo-agnostic and structured 1 / 2 / 3 with sub-sections so other docs can cite "SOP 3.4 Triage" directly.
- **Open items / handoff:** None for the Agents.md rewrite itself. Pending follow-up is the context.md cross-reference in Agents.md (next entry above).
