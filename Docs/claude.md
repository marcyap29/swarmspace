# SwarmSpace Documentation Context Guide

**Version:** 1.3.0
**Last Updated:** April 11, 2026
**Current Branch:** `main`

*This file was reset for SwarmSpace. All prior versioning and EPI-specific content has been cleared.*

---

## Standard Operating Procedures (SOPs)

SOPs are the **repeatable procedures** for consistent, high-quality work. Refer to these before starting any task.

---

### SOP-TASK — Implementation task (default)

| Step | Action |
|------|--------|
| 1 | **Understand** — Restate the goal, constraints, and definition of done. |
| 2 | **Analyze** — Map components, dependencies, risks, and affected areas (code, docs, backend). |
| 3 | **Plan** — Outline steps; flag unknowns and verification (tests, manual checks). |
| 4 | **Align** — If the user asked to approve before execution, **present the plan and wait**. If they want you to proceed, continue. |
| 5 | **Execute** — Implement the smallest change that satisfies the request; match repo conventions. |
| 6 | **Verify** — Run linters/tests or static analysis when available; fix new issues you introduced. |
| 7 | **Summarize** — Short recap: what changed, where, and how to validate. |

---

### SOP-ORCH — Complex or multi-area work (orchestrator pattern)

Use when the task spans many files, needs parallel concerns (e.g. UI + API + docs), or the user explicitly wants agent-style breakdown.

| Step | Action |
|------|--------|
| 1 | **Lead agent** — Analyze the prompt, produce a **definition of done**, and decompose into sub-tasks. |
| 2 | **Sub-agents** — Assign coherent slices (e.g. one area per sub-task); avoid overlapping ownership. |
| 3 | **Review agent** — After sub-tasks complete, check against the definition of done; list gaps or approve. |
| 4 | **Close out** — Integrate results, one coherent commit or PR description, and a final **implementation review** for the user. |

*Note: In single-threaded chat, simulate this sequence explicitly in your reasoning and output.*

---

### SOP-BUG — Before coding in risky areas

1. Open `bugtracker/bug_tracker.md` (or project index).
2. Skim entries for the subsystem you touch.
3. Read `records/…` when an entry matches.
4. Do not contradict documented fixes without explicit user approval.

---

### SOP-DEBUG — Error diagnosis and fixing

Use for **build failures, test/CI failures, missing files, environment skew, flaky behavior**.

| Step | Action |
|------|--------|
| 1 | **Ground** — Confirm the **project root** for this stack (monorepos: app vs `packages/`). Run commands from that directory. |
| 2 | **Evidence** — Collect the **exact command**, **cwd**, and **verbatim** output from the **first** `error`/`Error`/`fatal` through **~30–50 lines** after (not a summary). |
| 3 | **Triage** — Fix the **first** genuine failure; later lines are often cascades. Use the triage table below. |
| 4 | **Environment** — If relevant, capture toolchain versions. Run stack-appropriate **clean + reinstall** from the correct root. |
| 5 | **Workspace** — Put needed files **in the workspace** or attach/paste. **Quote paths** that contain spaces. |
| 6 | **Secrets** — Files that are gitignored (`.env`, keystores, etc.) must be restored from a **secure** channel; do not invent production credentials. |
| 7 | **Verify** — Re-run the **same** failing command before declaring the issue fixed. |

#### Triage: map symptoms to where to look

| Symptom class | Likely layers | First checks |
|---------------|---------------|--------------|
| **Cannot find module / import / URI** | Source layout, wrong root, deleted files, codegen not run | Resolve path from repo root; search for symbol; run code generation |
| **Build input file not found** | IDE project file vs disk path | Compare project reference to actual path |
| **Package / dependency resolution** | Registry, lockfile, private feed auth | Clean + reinstall; compare lockfile to CI |
| **Compiler / type errors after merge** | API drift, duplicate types, feature flags | Fix **first** error line — rest often clears |
| **Tests pass locally, fail in CI** | Version drift, env vars, OS paths | Match images/versions; dump env; reduce flake |
| **Runtime only** (crash, 401, wrong config) | Config files, secrets, feature flags, wrong bundle ID | Trace config loading; compare identifiers |
| **Intermittent / flaky** | Timing, race, network, shared state | Stabilize with minimal repro; logging; shrink surface |
| **Mass git deletions or dirty tree** | Intentional cleanup vs broken checkout | Ask: "Is this expected?" before restoring paths |

#### One-shot debug message (paste into chat)

```text
Debug using SOP-DEBUG in claude.md.
- Project root: [...]
- Command: [...]
- Cwd: [...]
- Verbatim output (from first error, ~40 lines): [...]
- What changed before this broke: [...]
- Versions if relevant: [...]
Fix the first real error; quote paths with spaces; re-run the same command to verify.
```

---

### SOP-DOC — Documentation, configuration management, and git backup

**Role ID:** `doc-config-git-backup` — keep docs accurate, single source of truth, commits backed by documentation.

#### When to run

- After a release or large merge
- On request ("doc sync", "git backup sync", "drift check")
- Whenever prompts, architecture, or features change materially

#### Orchestrator order (do not skip)

| Order | Phase | Purpose |
|-------|-------|---------|
| 1 | **Prompt References** | Audit LLM prompts vs `PROMPT_REFERENCES.md`; update `PROMPT_TRACKER.md` if needed. Skip only if the repo has no LLM prompts. |
| 2 | **Doc inventory & drift** | Compare repo vs docs; short drift report (what docs lag). |
| 3 | **Core artifacts** | Update README, CHANGELOG, ARCHITECTURE, FEATURES, backend, bugtracker index as applicable. |
| 4 | **Configuration & consolidation** *(optional)* | Deduplicate, archive obsolete docs, fix links — only when explicitly requested. |
| 5 | **Git backup sync** | `git log` / `git diff` vs last documented version; bump versions; **commit + push** doc (and code if in scope). |
| 6 | **Reviewer** | Run reviewer checklist below; output pass/fail. |

#### Reviewer checklist

- [ ] Prompt catalog in sync (if project uses prompts).
- [ ] Drift report addressed or "no drift" justified.
- [ ] Core docs versioned; no invented facts.
- [ ] Bug tracker / recent-changes table updated if required.
- [ ] Commit message clear; push done if sync requested.

---

### SOP-PROMPT — Prompt catalog maintenance

When adding or changing model prompts, system strings, or JSON "gate" prompts:

1. Search codebase for prompt definitions (`systemPrompt`, `system =`, template files, etc.).
2. Reconcile with `PROMPT_REFERENCES.md`.
3. Append `PROMPT_TRACKER.md` and bump catalog version when entries change.
4. Log in `CONFIGURATION_MANAGEMENT.md` if used.

---

### SOP-PLAN — Working with planner.md and backlog.md

These two files keep work organized across sessions and prevent losing track of tasks or long-term direction.

#### planner.md — Active scratchpad

- **Purpose:** Short-term task tracking. Any and all plans, sub-tasks, and in-progress work for features you are actively working on (or about to start) go here.
- **Write to it** as soon as you begin planning a feature. Break the feature into concrete tasks/sub-tasks.
- **Cross off** completed tasks (use `~~strikethrough~~` or `- [x]`).
- **Wipe clean** when all tasks for a feature are done — the planner is for active work only, not a history log.
- **Never skip** checking Planner.md at the start of a session — if it has content, resume from where you left off.

#### backlog.md — Long-term feature backlog

- **Purpose:** Long-term, ordered backlog of future ideas and features agreed upon with the user.
- **Add to it** whenever you and the user agree on a feature for future development.
- **Pull from it** when choosing the next thing to work on — it keeps you oriented toward the project's long-term goals.
- **Format:** One feature per line or section, with a brief description and optionally a priority or status tag.
- **Do not remove** items without user approval; mark them as deferred or move to an archive section instead.

#### Workflow

1. At session start, read `Planner.md` — if it has active tasks, resume them.
2. When starting a new feature, write the plan into `Planner.md` before coding.
3. As you complete tasks, cross them off in `Planner.md`.
4. When a feature is fully done, cross it off and wipe `Planner.md` clean.
5. When discussing future work with the user, add agreed features to `backlog.md`.
6. When picking up new work, check `backlog.md` for the next priority item.

---

## Gemini Model Reference

**The latest Gemini model family is 3.x (not 2.0 or 2.5).** Gemini 2.0 and 2.5 models are deprecated and return 404.

- **Use:** `gemini-3-flash-preview` for all SwarmSpace functions (proxyGemini, visionOcrInvoke, swarmspaceDiscoveryAgent)
- **Do not use:** `gemini-2.0-flash`, `gemini-2.5-flash`, or any 2.x model — they are no longer available

When adding new functions that call Gemini, always check `proxyGemini.ts` for the current model string.

---

## Cross-Repo Integration: LUMARA ↔ SwarmSpace

Both repos deploy Cloud Functions to the **same Firebase project (`arc-epi`)** using different codebase labels (`default` for LUMARA, `swarmspace` for SwarmSpace).

**Before adding/modifying a Cloud Function**, check `LUMARA_SWARMSPACE_FUNCTIONS_INTEGRATION.md` for ownership. SwarmSpace owns plugin routing. LUMARA owns core app functions. Duplicates must be synced or consolidated.

### Ownership Rules

- **SwarmSpace owns:** `swarmspaceRouter`, `swarmspacePluginStatus`, `swarmspacePluginCatalog`, `newsDataInvoke`, `visionOcrInvoke`, `updateUserModelConfig`, `swarmspaceWriteCapabilities`, `validatePluginSubmission`, `swarmspaceDiscoveryAgent`, `swarmspaceClaimFoundingSpot`, and any future plugin/agent functions.
- **LUMARA owns:** Core app functions (journal, chat, LLM proxies, Stripe, throttle, subscription, API tokens).
- **SwarmSpace will add functions over time** as developers submit plugins and new agent capabilities ship. Any new SwarmSpace function must be registered in `LUMARA_SWARMSPACE_FUNCTIONS_INTEGRATION.md`.

### Sync Mechanism

`swarmspacePluginCatalog` is the live discovery channel. LUMARA calls it to get the current list of available plugins, tiers, and capabilities. When SwarmSpace adds/removes/updates plugins or chains:
1. Update the `PLUGIN_REGISTRY` in `swarmspaceRouter.ts`
2. The catalog function automatically reflects changes
3. LUMARA discovers updates via its next `swarmspacePluginCatalog` call

For structural changes (new functions, ownership changes), update `LUMARA_SWARMSPACE_FUNCTIONS_INTEGRATION.md` so both repos stay aligned.

---

## Quick Reference

| Document | Purpose | Path |
|----------|---------|------|
| **planner.md** | Active planning scratch pad — current tasking | `planner.md` |
| **backlog.md** | Backlog items and future features | `backlog.md` |
| **overview.md** | SwarmSpace purpose, flow, and orientation for users/agents | `overview.md` |
| **README.md** | Setup guide (Firebase, Stripe, Vercel) | `README.md` |
| **SWARMSPACE_API_CONTEXT.md** | API reference for LUMARA integration | `SWARMSPACE_API_CONTEXT.md` |
| **architecture.md** | SwarmStore architecture & hosting | `architecture.md` |
| **Docs/RULE.md** | Cursor/agent rules (API, security, workflows) | `Docs/RULE.md` |
| **Docs/CONFIGURATION_MANAGEMENT.md** | Docs inventory and change tracking | `Docs/CONFIGURATION_MANAGEMENT.md` |
| **Docs/CHANGELOG.md** | Version history | `Docs/CHANGELOG.md` |
| **Docs/FEATURES.md** | Feature list | `Docs/FEATURES.md` |
| **Docs/backend.md** | Backend (API, Vercel, Firebase) | `Docs/backend.md` |
| **DEVELOPER_GUIDE.md** | Plugin manifest & submission reference | `DEVELOPER_GUIDE.md` |
| **Docs/PRISM.md** | PRISM / privacy logging reference | `Docs/PRISM.md` |
| **Docs/PRIVACY.md** | Privacy policy (Markdown) | `Docs/PRIVACY.md` |
| **prism.html** / **privacy.html** | Public PRISM and privacy pages | site root |
| **ast10.html** | OWASP AST10 compliance page (public) | `ast10.html` |
| **Docs/OWASP_AST10_COMPLIANCE.md** | Internal AST10 compliance doc | `Docs/OWASP_AST10_COMPLIANCE.md` |
| **Docs/bugtracker/** | Bug tracker | `Docs/bugtracker/` |
| **PROMPT_TRACKER.md** | Prompt change log | `PROMPT_TRACKER.md` |
| **PROMPT_REFERENCES.md** | Prompt catalog | `PROMPT_REFERENCES.md` |
| **Planner.md** | Active task scratchpad (short-term) | `Planner.md` |
| **backlog.md** | Long-term feature backlog | `backlog.md` |
| **LUMARA_SWARMSPACE_FUNCTIONS_INTEGRATION.md** | Cross-repo function ownership & sync | `LUMARA_SWARMSPACE_FUNCTIONS_INTEGRATION.md` |
| **founding-developers.html** | Founding Developer Programme landing page | `founding-developers.html` |
| **developer-guide.html** | HTML developer guide (styled) | `developer-guide.html` |

---

## Task Management SOP

### `planner.md` (root)

Used for planning out tasking in pursuit of developing functions taken from prompts from the user. This is a scratch pad to create a list of items that need to be achieved to meet the queries and tasks assigned by the user. You can clean this and add to this at will to help you plan out and keep track of your tasking. **At startup, always look at this file first to identify where you left off in terms of work.**

### `backlog.md` (root)

This is where any and all backlog items and future features are stored that you are not working on at the moment. Future items and large items are stored here, and as time goes on they may get refined further or taken off, but that will be with feedback and review of the user. **When there is no tasking in `planner.md`, pull tasking from this file.**

### Workflow

1. On startup: read `planner.md` to pick up where you left off.
2. If `planner.md` is empty or all items are done: pull the next priority items from `backlog.md` into `planner.md`.
3. As you work: update `planner.md` to reflect progress, add notes, check off completed items.
4. When a planner item is fully done: remove it from `planner.md`. Do not move it back to `backlog.md`.
5. New future work or large items raised during a session go into `backlog.md`, not `planner.md`.

---

## Core Documentation

### SwarmSpace Overview
- **overview.md** — Purpose, user flow, account model, orientation for users and AI agents.
- **README.md** — Setup, deploy, test flow. Firebase, Stripe, Vercel env vars.
- **SWARMSPACE_API_CONTEXT.md** — Endpoints (swarmspaceRouter, swarmspacePluginStatus), tiers (Free/Standard/Premium), request schemas. Auth: Firebase ID token. Never commit API keys.

### Architecture
- **architecture.md** — SwarmStore plugin format, hosting (Cloudflare Workers/R2/D1), security protocols. Broader vision; current app is Vercel + Firebase + Stripe.

### File Structure
```
swarmspace/
├── planner.md          ← Active planning scratch pad (read on startup)
├── backlog.md          ← Backlog items and future features
├── overview.md         ← Orientation for users and agents
├── index.html, signup.html, dashboard.html, upgrade.html, marketplace.html, thankyou.html, faq.html, submit-plugin.html, security.html, prism.html, privacy.html, ast10.html, founding-developers.html, developer-guide.html
├── DEVELOPER_GUIDE.md
├── api/create-checkout.js, api/stripe-webhook.js
├── vercel.json
├── SWARMSPACE_API_CONTEXT.md, architecture.md
└── Docs/
    ├── claude.md, RULE.md, CONFIGURATION_MANAGEMENT.md, CHANGELOG.md, FEATURES.md
    ├── backend.md, PRISM.md, PRIVACY.md, git.md, SECURITY_CHECKLIST.md, UI_UX.md
    └── bugtracker/
```

---

## Documentation Update Rules

When updating documentation:

1. Update all documents listed in the Quick Reference that are affected.
2. Version documents as necessary.
3. Replace outdated context.
4. Archive deprecated content to `docs/archive/` or equivalent.
5. Update `CONFIGURATION_MANAGEMENT.md` with any significant doc changes.
6. For releases: follow **SOP-DOC** (orchestrator order + reviewer checklist).

---

## Role prompt block (doc-config-git-backup)

Paste or attach for AI tools that use structured role metadata:

```
name: doc-config-git-backup
description: Documentation & Configuration Manager — keeps docs accurate and consolidated, maintains single source of truth, ensures every git push is backed by up-to-date documentation; runs prompt-reference audit when applicable; uses SOP-DOC in claude.md.
```

---

## Documentation, Configuration Management and Git Backup

### Role

You act as **Documentation & Configuration Manager** for this repository. You:

1. Keep documentation accurate, reduce redundancy, and help future users and AI assistants get up to speed quickly.
2. Ensure every git push is backed by up-to-date documentation: update docs to reflect repo changes, then commit and push.

---

### Orchestrator Agent (run first)

**Purpose:** Assign work to sub-agents, monitor completion, and validate that all tasks are done before handing off to the Reviewer Agent.

**Inputs:** Trigger (e.g. "doc sync after release", "full consolidation pass", "git backup sync", or on-demand request).

**Workflow:**

1. **Assign** — Decide which sub-agents run and in what order:
   - **For git backup sync:** Doc Inventory & Drift Agent → Core Artifacts Agent → Git Backup Sync Agent (or run Git Backup Sync Agent alone if only sync is requested).
   - **For consolidation/optimization:** Doc Inventory & Drift Agent → Configuration & Consolidation Agent; optionally Core Artifacts Agent if core docs need updates.
   - **For drift check only:** Doc Inventory & Drift Agent and Core Artifacts Agent (no Git Backup Sync Agent unless commit/push is requested).

2. **Monitor** — For each assigned agent, confirm completion using that agent's **Done when** criteria.

3. **Validate** — Before invoking the Reviewer Agent, verify all assigned agents have completed and their outputs are present.

4. **Hand off** — Pass the list of changed files, run type, and any agent summaries to the **Reviewer Agent**.

**Done when:** All assigned sub-agents have completed, validation checks pass, and handoff to Reviewer Agent has been made.

---

### Sub-Agent Prompts

#### 1. Doc Inventory & Drift Agent

**Scope:** Track documentation and identify what must be updated.

**Tasks:**

1. Maintain/update an inventory of key docs (README, SWARMSPACE_API_CONTEXT, architecture.md, Docs/*) and their sync status with the codebase.
2. Compare current documentation to the repository: identify repo changes not yet reflected in docs.
3. Produce a short **drift report**: list of documents that need updates and what changed.

**Done when:** Inventory is current and drift report is produced (or "no drift" stated with evidence).

---

#### 2. Core Artifacts Agent

**Scope:** Keep core artifacts up to date. Use drift report from Doc Inventory & Drift Agent when available.

**Tasks:**

1. **README:** Reflect current setup, build/run instructions, and high-level project purpose.
2. **SWARMSPACE_API_CONTEXT.md:** API changes when relevant.
3. **architecture.md:** Structural or hosting changes when relevant.
4. **Docs/FEATURES.md, Docs/backend.md:** Feature and backend changes when relevant.
5. **Docs/CONFIGURATION_MANAGEMENT.md:** Inventory and change log.
6. **Key documents list:** Keep entry points and purpose of each doc current.

**Rules:** Only update where repo changes are relevant; preserve existing formatting; be concise and factual.

**Done when:** All core artifacts that required updates have been updated and are consistent with the codebase.

---

#### 3. Configuration & Consolidation Agent

**Scope:** Single source of truth, redundancy reduction, archive/obsolete content.

**Tasks:**

1. Prefer one canonical location per topic; consolidate or cross-reference duplicate content.
2. Archive superseded or deprecated docs with a brief note; when in doubt, archive.
3. Eliminate redundant content; fix broken links. Preserve ALL critical knowledge.

**Done when:** Redundancy is reduced per run scope; archive/delete actions are documented.

---

#### 4. Git Backup Sync Agent

**Scope:** Ensure every git push is backed by up-to-date documentation. Run after doc updates are done.

**Step 1 — Identify what changed**

- Run `git log` on the target branch for commits since the last documented update.
- Run `git diff` between last documented state and HEAD. Summarize what was added, modified, or removed.

**Step 2 — Update documentation**

For each change, update the appropriate documents (only where relevant):

| Document | What to update |
|----------|----------------|
| `README.md` | Setup, file structure, project overview |
| `SWARMSPACE_API_CONTEXT.md` | API endpoints, tiers, schemas |
| `architecture.md` | Structural or hosting changes |
| `Docs/CHANGELOG.md` | Version entries |
| `Docs/CONFIGURATION_MANAGEMENT.md` | Inventory, change log |
| `Docs/FEATURES.md` | Feature changes |
| `Docs/backend.md` | Backend changes |
| `Docs/claude.md` | Context guide updates |

**Step 3 — Commit and push**

- Stage all updated documentation files.
- Commit with a clear message (e.g. `docs: update README and API context for recent changes`).
- Push to the current branch.

**Done when:** Docs reflect repo changes and a single commit has been pushed with the doc updates.

---

### Reference files (SwarmSpace)

- `planner.md` — active planning scratch pad (read on startup)
- `backlog.md` — backlog items and future features
- `README.md` — project overview and setup
- `SWARMSPACE_API_CONTEXT.md` — API reference for LUMARA integration
- `architecture.md` — SwarmStore architecture and hosting
- `Docs/claude.md` — context guide and role definitions
- `Docs/RULE.md` — Cursor/agent rules for SwarmSpace
- `Docs/CONFIGURATION_MANAGEMENT.md` — docs inventory and change log
- `Docs/CHANGELOG.md` — version history
- `Docs/FEATURES.md` — feature catalog
- `Docs/backend.md` — backend services
- `DEVELOPER_GUIDE.md` — plugin manifest and submission reference
- `Docs/PRISM.md` — PRISM reference
- `Docs/PRIVACY.md` — privacy policy (Markdown)
- `security.html` — security & trust architecture (public page)
- `prism.html` — PRISM public reference page
- `privacy.html` — privacy policy (public page)
- `Docs/git.md` — git workflow
- `Docs/SECURITY_CHECKLIST.md` — security checklist
- `Docs/UI_UX.md` — UI/UX patterns
- `Docs/bugtracker/` — bug records

---

### Principles (all agents)

- **Preserve knowledge:** Do not remove the only record of a decision or design; archive or consolidate instead.
- **Single source of truth:** One canonical location per topic; link from elsewhere rather than duplicate.
- **Traceability:** Changes traceable so "what changed and when" is clear.
- **Accuracy over volume:** Document only what actually changed; do not invent or speculate.
- **Match existing style:** Follow each document's conventions.
- **Be thorough:** Account for all relevant changed files in the docs.
- **Be fast:** Sync/backup is a sync task, not a creative writing exercise.
- **Fix first, verify after:** When debugging, always fix the first real error and re-run the same command to confirm.
- **Smallest change wins:** Implement the minimum that satisfies the request; do not refactor unrelated code.

---

### Reviewer Agent (run last)

**Purpose:** Check the work of all agents to ensure it is correct before considering the run complete.

**Checklist:**

1. **Drift & inventory** — Drift report exists and matches repo state.
2. **Core artifacts** — README, SWARMSPACE_API_CONTEXT, architecture, Docs/*: only updated where relevant; no invented content.
3. **Git backup sync** — If Git Backup Sync Agent ran: docs updated; commit message is clear; push completed.
4. **Principles** — Preserve knowledge; single source of truth; traceability; accuracy over volume.

**Output:** Pass / fail with a short note. On fail, list which checklist item(s) failed and what to fix.

**Done when:** Checklist is executed and output (pass/fail + note) is recorded.

---

## Autonomous Technical Issue Investigation Template

"I need you to run a complete, continuous investigation of [ISSUE DESCRIPTION]. Please work autonomously through all analysis paths and provide your top 5 conclusions.

### Investigation Authority

You have full autonomy to:
- Read any files in the repository/codebase
- Search the web for related issues and solutions
- Analyze all documentation, logs, and archives
- Test different scenarios and code paths
- Make reasonable assumptions and follow investigation threads
- Use any analysis tools needed for comprehensive evaluation

### NO ACTION RESTRICTION

CRITICAL: You are authorized to ANALYZE and INVESTIGATE only. Do NOT:
- Modify any code files or configurations
- Deploy any changes or run builds
- Execute any fixes or solutions
- Make any edits to the system
- Take any corrective actions

You may only READ, SEARCH, and ANALYZE. All implementations must be approved first.

### Investigation Framework

1. **Root Cause Analysis**
   - Trace complete execution/failure paths
   - Identify all potential failure points
   - Check for [RELEVANT PATTERNS: race conditions, timeouts, resource issues, etc.]
   - Verify recent changes and their impact

2. **Historical Analysis**
   - Search documentation/bug trackers for similar issues
   - Look for resolved problems that might have regressed
   - Review [RELEVANT ARCHIVES: logs, tickets, changelogs]
   - Identify patterns in past failures

3. **External Research**
   - Search for "[TECHNOLOGY STACK]" + "[ISSUE SYMPTOMS]" solutions
   - Research known issues with [RELEVANT APIS/SERVICES]
   - Look up [FRAMEWORK/PLATFORM] integration problems
   - Check community discussions and bug reports

4. **System Integration Analysis**
   - Check [RELEVANT CONFIGS: security, permissions, networking]
   - Analyze [RELEVANT CHAINS: data flow, API calls, dependencies]
   - Look for [RELEVANT BOTTLENECKS: performance, memory, connections]
   - Examine [RELEVANT COMPONENTS] for conflicts

5. **Alternative Failure Scenarios**
   - Consider [ENVIRONMENTAL FACTORS: network, platform, resources]
   - Check for [PLATFORM-SPECIFIC ISSUES]
   - Look for [RESOURCE CONSTRAINTS: memory, CPU, storage]
   - Examine recent [ARCHITECTURAL/DEPENDENCY CHANGES]

### Customization Variables

Replace these placeholders with your specific context:
- [ISSUE DESCRIPTION]: Brief description of the problem
- [TECHNOLOGY STACK]: Main technologies involved
- [ISSUE SYMPTOMS]: Observable behaviors
- [RELEVANT PATTERNS]: Common failure patterns for your domain
- [RELEVANT ARCHIVES]: Specific logs/documentation to check
- [RELEVANT APIS/SERVICES]: External dependencies
- [FRAMEWORK/PLATFORM]: Development platform
- [RELEVANT CONFIGS]: Configuration areas to examine
- [RELEVANT CHAINS]: Process flows to analyze
- [RELEVANT BOTTLENECKS]: Performance areas to check
- [RELEVANT COMPONENTS]: System components to examine
- [ENVIRONMENTAL FACTORS]: Context-specific factors
- [PLATFORM-SPECIFIC ISSUES]: Platform constraints
- [RESOURCE CONSTRAINTS]: System resource limitations
- [ARCHITECTURAL/DEPENDENCY CHANGES]: Recent modifications

### Required Deliverable

Provide your TOP 5 MOST LIKELY CONCLUSIONS with:
- Root cause explanation
- Evidence supporting the conclusion
- Specific fix recommendations (for approval only)
- Implementation risk/confidence level
- Priority ranking

Work continuously and comprehensively. Provide complete technical analysis. NO ACTIONS WITHOUT APPROVAL."

---

*SwarmSpace — Developer dashboard and plugin marketplace. API layer for LUMARA.*
*Version 1.3.0 — SOPs adapted from LUMARA/ARC doc-config workflow.*
