# SwarmSpace — Claude Code Instructions

**Version:** 1.7.0 *(2026-05-19 — Added STEP 2.5 decisive planning gate; added Code Quality Principles (Karpathy); fixed SOP-TASK default; fixed SOP-ORCH simulation; defined risky areas in SOP-BUG; added SOP-DEBUG escalation; added SOP-SECURITY; fixed SOP-PLAN mid-session close; fixed SOP-WORKTREE dirty teardown; merged duplicate reviewer sections)*
**Repo root:** `/Volumes/Marc Working Drive/Development/swarmspace/`
**Stack:** Firebase Cloud Functions (TypeScript) + Cloudflare Workers (TS/JS) + static HTML on Vercel.
**Linter:** `cd functions && npm run build` (functions side); `npx tsc --noEmit` from individual worker dirs (Workers side).

---

## Standard Procedure — Follow This Every Time a Prompt Is Given

```
PROMPT RECEIVED
      │
      ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 1 — ORIENT (always, before anything else)                  │
│                                                                 │
│  Read: DOCS/claude.md (this file)        ← entry point          │
│  Read: DOCS/Agents.md                    ← codebase reference   │
│        + cross-repo dependency rules                            │
│  Read: DOCS/context.md                   ← last session, next,  │
│                                            warnings             │
│                                                                 │
│  If the task touches LUMARA integration (orchestrator, plugin   │
│  registry, PRISM, OAuth, anything cross-repo) ALSO read in this │
│  order from DOCS/Startup Onboard/ (git-tracked, SwarmSpace      │
│  repo) :                                                        │
│    • Coordinate_SS.md    ← our dialog (SwarmSpace writes here)  │
│    • Coordinate_LUMARA.md ← LUMARA dialog (read-only)          │
│    • LUMARA_Context.md   ← LUMARA's last session                │
│    • LUMARA_Backlog.md   ← relevant cross-repo items            │
└─────────────────────────────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 2 — UNDERSTAND THE TASK                                    │
│                                                                 │
│  Read: planner.md (root)                 ← active sprint        │
│  Read: backlog.md (root)                 ← priority pool        │
│                                                                 │
│  Task type?                                                     │
│    • New feature / multi-file   → STEP 3A                       │
│    • Bug fix                    → STEP 3B                       │
│    • Multi-area orchestration   → STEP 3C                       │
│    • Documentation update       → STEP 3D                       │
│    • Security review            → STEP 3E                       │
└─────────────────────────────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 2.5 — DECIDE: SCOPE · AGENTS · DEFINITION OF DONE          │
│  (mandatory — output this block in chat before touching files)  │
│                                                                 │
│  1. SCOPE — Classify the task:                                  │
│     ≤ 2 files, self-contained  → 1 agent, stay on main          │
│     3+ files, one subsystem    → 1 agent, worktree              │
│     3+ subsystems              → multi-agent → STEP 3C          │
│     Parallel independent tracks→ multi-agent → STEP 3C          │
│                                                                 │
│  2. AGENTS (if multi-agent) — declare before acting:            │
│     • Count: 1 lead + N workers                                 │
│     • Types: coder / reviewer / doc / security / test           │
│     • Ownership: one file set per agent, no overlaps            │
│                                                                 │
│  3. DONE — Write the definition of done (one sentence):         │
│     "Complete when [observable outcome]."                       │
│     Transform abstract asks into verifiable goals:             │
│       "Fix the bug" → "test reproduces it; test passes after"  │
│       "Add feature" → "UI shows X; API returns Y; tests pass"  │
│                                                                 │
│  Do not proceed until all three are stated in chat.            │
└─────────────────────────────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 3A — PLAN (feature / multi-file change)                    │
│  Apply: SOP-TASK below                                          │
│  Apply: SOP-PLAN below (write definition of done into planner)  │
│  Decide: worktree needed? → SOP-WORKTREE below (criteria)       │
│  If task spans 3+ subsystems → split via SOP-ORCH               │
├─────────────────────────────────────────────────────────────────┤
│ STEP 3B — DIAGNOSE (bug fix)                                    │
│  Apply: SOP-DEBUG below                                         │
│  Read:  DOCS/bugtracker/bug_tracker.md (or project index)       │
│  Apply: SOP-BUG before coding in risky areas                    │
├─────────────────────────────────────────────────────────────────┤
│ STEP 3C — ORCHESTRATE (multi-area work)                         │
│  Apply: SOP-ORCH below (lead → sub-agents → reviewer)           │
│  Worktree per sub-agent if files overlap (SOP-WORKTREE)         │
├─────────────────────────────────────────────────────────────────┤
│ STEP 3D — DOCUMENT                                              │
│  Apply: SOP-DOC below                                           │
│  Update: DOCS/CONFIGURATION_MANAGEMENT.md inventory + change-log│
├─────────────────────────────────────────────────────────────────┤
│ STEP 3E — AUDIT (security)                                      │
│  Read:  DOCS/SECURITY_CHECKLIST.md                              │
│  Read:  DOCS/OWASP_AST10_COMPLIANCE.md                          │
│  Read:  DOCS/PRISM.md (privacy enforcement)                     │
└─────────────────────────────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 4 — IMPLEMENT                                              │
│  Read every file before modifying it. Never edit blind.         │
│  Resolve spec ambiguities before writing code, not after.       │
│  Check Key Invariants below while coding.                       │
└─────────────────────────────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 5 — REVIEW (do not skip any item)                          │
│  Linter:  cd functions && npm run build    (zero new TS errors) │
│           npx tsc --noEmit                 (per worker dir)     │
│  Tests:   run existing test suite; fix any failures you caused  │
│  Verify:  check each item in the STEP 2.5 definition of done    │
│  Done?    confirm every user-requested function actually works  │
│  External agent output:                                         │
│    Output ### Lead Agent / ### Sub-task [N] / ### Review blocks │
│    Score against definition of done; list gaps or approve       │
└─────────────────────────────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 6 — CLOSE SESSION (always, before stopping)                │
│  Write:  DOCS/context.md → prepend session block (newest first) │
│  Update: planner.md → cross off completed; wipe if feature done │
│  Update: backlog.md → mark shipped items ✅                     │
│  Update: DOCS/CONFIGURATION_MANAGEMENT.md → if any docs changed │
│  Update: DOCS/CHANGELOG.md → if a release-worthy change shipped │
│  Mirror: any of {backlog.md, context.md, planner.md, CLAUDE.md} │
│           that changed this session → Startup Onboard/ as       │
│           SWARMSPACE_<Title>.md (see Cross-Repo Coordination    │
│           below for cp commands)                                │
│  Edit:   DOCS/Startup Onboard/Coordinate_SS.md IF cross-repo    │
│           state changed: in-flight status, new blocker,         │
│           request for LUMARA, answer to open question, decision.│
│           Sign every entry [SWARMSPACE YYYY-MM-DD]. Move        │
│           resolved items to Archive section.                    │
│  Read:   DOCS/Startup Onboard/Coordinate_LUMARA.md for LUMARA's │
│           entries — never edit that file.                       │
│  Write: DOCS/Coding Lessons/FOR_MARC_[topic].md                 │
│         → after any significant task (investigation, bug,       │
│           feature, migration). 9-step teaching format.          │
│         → coffee-chat tone, not textbook voice.                 │
│         → README at DOCS/Coding Lessons/README.md               │
└─────────────────────────────────────────────────────────────────┘
```

---

## Key Invariants — Never Violate

These are SwarmSpace-specific non-negotiables. Code that breaks any of these is a regression.

- **Gemini model = `gemini-3-flash-preview` only.** 2.0 / 2.5 family return 404. Verify against `proxyGemini.ts` before adding a new Gemini caller.
- **LUMARA dependency declaration is mandatory.** Every feature must explicitly state `LUMARA dependency: <what LUMARA needs to do>` or `No LUMARA dependency — self-contained.` See `DOCS/Agents.md` §0.
- **Admin emails auto-promoted to Pro.** `ADMIN_EMAILS` in `functions/src/authGuard.ts` (currently `marcyap@orbitalai.net`, `marcyap@fastmail.com`) — `enforceAuth` writes `plan: "pro"` automatically. Any new tier-gating code must respect this; never block the founder behind a quota wall.
- **Never commit secrets.** Cloud Function secrets via `defineSecret`. Worker secrets via `wrangler secret put`. `.gitignore` covers `node_modules/`, `.env`, `.wrangler/`, `scripts/get-test-token.js`.
- **Lowercase `planner.md` only.** Uppercase `Planner.md` was deleted 2026-05-01 because of macOS-vs-Linux case collision.
- **`swarmspaceRouter.ts` ownership: SwarmSpace repo.** It does NOT exist in the LUMARA repo (verified 2026-05-02 by LUMARA Claude pre-flight). Any registry edits happen here, not there.
- **Service-token bypass is internal-only.** `_service_token` + `_run_as_uid` in `request.data` is for DO-initiated calls (e.g. News Briefing DO firing on alarm). Never expose to LUMARA-app callers.

---

## Code Quality Principles

These four rules override any instinct to be clever, thorough, or anticipatory.

**1. Think before coding.** State your assumptions explicitly before implementing. If multiple interpretations exist, present them — do not pick silently. If something is unclear, name what is confusing and ask. Surface tradeoffs before writing, not after.

**2. Simplicity first.** Minimum code that solves the problem. No features beyond what was asked. No abstractions for single-use code. No "flexibility" or "configurability" that wasn't requested. If you write 200 lines and it could be 50, rewrite it. Ask: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

**3. Surgical changes.** Touch only what you must. Do not "improve" adjacent code, comments, or formatting that is not broken. Match existing style even if you'd do it differently. When your changes create orphans (unused imports, dead variables), remove them. Do not remove pre-existing dead code unless asked. Every changed line must trace directly to the user's request.

**4. Goal-driven execution.** Transform every task into a verifiable goal before implementing. For multi-step tasks, state a brief plan: `1. [Step] → verify: [check]`. Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

## Cross-Repo Coordination

Shared mailbox at `DOCS/Startup Onboard/` (git-tracked inside SwarmSpace repo, absolute: `/Volumes/Marc Working Drive/Development/swarmspace/DOCS/Startup Onboard/`) — mirror-on-update from each repo's canonical files. Naming: `<REPO>_<Topic>.md` in Title Case.

**Workflow rule (codified 2026-05-03):** I am free to edit any `.md` in this repo as the canonical source. After editing, I MUST mirror the changed files to the unified dir at STEP 6 close-session. The unified dir is read-only — never edit a mirror directly. Both sides do this; that's how a third-party agent or LUMARA Claude knows what's current without traversing this repo.

| File | Direction | Owner | Source of truth | Touch when |
|---|---|---|---|---|
| `SWARMSPACE_Backlog.md` | mirror (one-way) | SwarmSpace Claude | `backlog.md` | backlog edited |
| `SWARMSPACE_Context.md` | mirror (one-way) | SwarmSpace Claude | `DOCS/context.md` | session block prepended |
| `SWARMSPACE_Planner.md` | mirror (one-way) | SwarmSpace Claude | `planner.md` | tasks edited |
| `SWARMSPACE_Claude.md` | mirror (one-way) | SwarmSpace Claude | `DOCS/claude.md` | SOPs / convention edited |
| `SWARMSPACE_Spec_*.md` | mirror (one-way) | SwarmSpace Claude | (none currently — Meeting Prep lives inline in §22) | active cross-repo spec edited; archive after merge |
| `LUMARA_*.md` | mirror (one-way) | LUMARA Claude | LUMARA repo's canonical files | their session-close — read-only for me |
| **`Coordinate_SS.md`** | **write** | SwarmSpace Claude | n/a (canonical) | cross-repo state changed — sign `[SWARMSPACE YYYY-MM-DD]` |
| **`Coordinate_LUMARA.md`** | **read-only** | LUMARA Claude | n/a (canonical) | read at STEP 1 for cross-repo work — never edit |
| `prompts/*.md` | one-way (user → both) | User | n/a | overrides in-repo planner when present |
| `README.md` | one-way | LUMARA Claude (currently) | unified dir | convention edited |

**`Coordinate_SS.md` rules of the road:**
- Sign every contribution `[SWARMSPACE YYYY-MM-DD]` so LUMARA knows what came from me and when
- `Coordinate_SS.md` is SwarmSpace's dialog — write and own it freely
- `Coordinate_LUMARA.md` is LUMARA's dialog — read-only; never edit it
- Be specific: cite commit hashes, file paths, exact next actions. Vague status wastes LUMARA's session.
- Use Edit (not Write) — preserves file structure

**Concrete commands for STEP 6 mirror (run only for files that changed this session):**

```bash
UNIFIED="/Volumes/Marc Working Drive/Development/swarmspace/DOCS/Startup Onboard"
SRC="/Volumes/Marc Working Drive/Development/swarmspace"

cp "$SRC/backlog.md"        "$UNIFIED/SWARMSPACE_Backlog.md"
cp "$SRC/DOCS/context.md"   "$UNIFIED/SWARMSPACE_Context.md"
cp "$SRC/planner.md"        "$UNIFIED/SWARMSPACE_Planner.md"
cp "$SRC/DOCS/claude.md"    "$UNIFIED/SWARMSPACE_Claude.md"
chmod 644 "$UNIFIED/SWARMSPACE_Context.md"   # source is 600; mirror should be readable
```

**STEP 1 ORIENT addition (when work touches cross-repo):** read `Coordinate_SS.md` (our dialog) and `Coordinate_LUMARA.md` (LUMARA's dialog) in `DOCS/Startup Onboard/`. Then read `LUMARA_Context.md` (LUMARA's last session) and relevant entries from `LUMARA_Backlog.md`. Convention notes live in `DOCS/Startup Onboard/README.md`.

---

## Standard Operating Procedures (SOPs)

The procedures below are SwarmSpace-specific implementations of the Starter Repo SOPs. Steps 3A-3E above point to these.

---

### SOP-TASK — Implementation task (default)

| Step | Action |
|------|--------|
| 1 | **Understand** — Restate the goal, constraints, and definition of done. |
| 2 | **Analyze** — Map components, dependencies, risks, and affected areas (code, docs, backend). |
| 3 | **Plan** — Outline steps; flag unknowns and verification (tests, manual checks). |
| 4 | **Align** — Default: proceed autonomously for single-area changes. Pause and present the plan for explicit approval when the task touches 3+ files in shared/critical paths (`swarmspaceRouter.ts`, `authGuard.ts`, `orchestrator/src/index.js`, any auth/billing/quota path). If the user has already said "go ahead," proceed. |
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

*Note: In single-threaded chat, make the structure visible. Output a `### Lead Agent` summary block first (definition of done + sub-task decomposition), then `### Sub-task [N]` blocks for each work unit, then a `### Review` block that checks each item in the definition of done. This makes the orchestration auditable and skippable by the user.*

---

### SOP-BUG — Before coding in risky areas

**Risky areas requiring SOP-BUG:** `swarmspaceRouter.ts`, `authGuard.ts`, `workers/orchestrator/src/index.js`, any file with `auth`, `quota`, `billing`, `secret`, or `token` in its path, and any shared Worker that other Workers depend on.

1. Open `DOCS/bugtracker/bug_tracker.md` (or project index).
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

#### Escalation rule

If two hypotheses are ruled out and the cause is still unknown: stop. Document the investigation state in `planner.md` under `## Pending Review`. Do not apply speculative fixes. Do not retry the same fix more than once. Surface to the user with: what was tried, what was ruled out, and what information is needed to proceed.

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
- **Never skip** checking planner.md at the start of a session — if it has content, resume from where you left off.

#### backlog.md — Long-term feature backlog

- **Purpose:** Long-term, ordered backlog of future ideas and features agreed upon with the user.
- **Add to it** whenever you and the user agree on a feature for future development.
- **Pull from it** when choosing the next thing to work on — it keeps you oriented toward the project's long-term goals.
- **Format:** One feature per line or section, with a brief description and optionally a priority or status tag.
- **Do not remove** items without user approval; mark them as deferred or move to an archive section instead.

#### Workflow

1. At session start, read `planner.md` — if it has active tasks, resume them.
2. When starting a new feature, write the plan into `planner.md` before coding.
3. As you complete tasks, cross them off in `planner.md`.
4. When a feature is fully done, cross it off and wipe `planner.md` clean.
5. When discussing future work with the user, add agreed features to `backlog.md`.
6. When picking up new work, check `backlog.md` for the next priority item.
7. **At session close with incomplete tasks:** preserve all remaining tasks in `planner.md` exactly as-is. The wipe-clean rule applies only when a feature is fully done — never wipe partial work.

---

### SOP-SECURITY — Security audit (Step 3E)

| Step | Action |
|------|--------|
| 1 | **Read** — `DOCS/SECURITY_CHECKLIST.md` and `DOCS/OWASP_AST10_COMPLIANCE.md` |
| 2 | **Secrets scan** — check all changed files for hardcoded keys, tokens, credentials, or connection strings |
| 3 | **Auth/authz** — every new endpoint or function must check authentication and enforce correct tier; admin emails must never be blocked (`authGuard.ts` invariant) |
| 4 | **Input validation** — all user-controlled inputs validated at system boundaries; no SQL/command/template injection vectors |
| 5 | **OWASP top 10** — cross-check changes against `DOCS/OWASP_AST10_COMPLIANCE.md` for relevant categories |
| 6 | **Document** — record findings (pass or specific issues) in `DOCS/SECURITY_CHECKLIST.md` with date and commit ref |

---

### SOP-WORKTREE — Branch isolation for risky / parallel / external-agent work

Use a git worktree to keep `main` clean while non-trivial changes are in flight. The worktree is the working copy; the branch (`wt/<id>`) is the change set; `main` only receives reviewed merges.

**Use a worktree when:**
- Work spans multiple sessions and the unmerged state needs to survive
- Changes touch shared/critical paths (`swarmspaceRouter.ts`, `workers/orchestrator/src/index.js`, anything other Workers depend on)
- Two competing approaches need to be tried in parallel
- A sub-agent (Track 1/2/3 in SOP-ORCH) is doing the work — keeps their commits isolated until reviewed
- The change is experimental and may not merge

**Stay on `main` for:** single-file fixes, doc-only edits, refactors confidently merging with no review, work under ~30 minutes, trivially reversible edits.

**Naming + layout:**
- Branch: `wt/<feature-or-bug-id>` — e.g. `wt/news-briefing-do`, `wt/bug-auth-002`
- Worktree path: `../<repo-name>-<id>` — sibling to main checkout, never nested. Cloudflare/Firebase per-tree caches (`node_modules`, `.wrangler/`, `functions/lib/`) re-bootstrap per worktree.

**Lifecycle:**
1. Plan via SOP-TASK / SOP-PLAN; check Key Invariants
2. Decide isolation per criteria above
3. `git worktree add ../<repo-name>-<id> -b wt/<id>` from `main`
4. Bootstrap deps in the new tree (e.g. `cd functions && npm install`)
5. Implement in worktree, commit only to `wt/<id>`, never touch `main` directly
6. Run STEP 5 review (linter clean) before each commit
7. User reviews diff: `git -C ../<repo-name>-<id> log main..HEAD` and `git -C ../<repo-name>-<id> diff main..HEAD`
8. Merge with `--no-ff` from main checkout: `git checkout main && git pull --ff-only && git merge --no-ff wt/<id> -m "merge: <summary> (wt/<id>)" && git push origin main`
9. Verify clean: `git -C ../<repo-name>-<id> status --short` — must be empty. If NOT empty, surface to the user; do NOT force-remove. Uncommitted work in a worktree is real work.
10. Teardown (only after Step 9 passes): `git worktree remove ../<repo-name>-<id> && git branch -d wt/<id>`

**Safety guards:**
- Never `git worktree remove --force` unless the user has explicitly confirmed the dirty state is disposable.
- Never `git branch -D` to skip the merged-check; investigate before discarding.
- Resolve conflicts in the worktree (rebase against `origin/main`), not on `main`.
- Per-tree caches and gitignored config (`.env`, secrets) must be bootstrapped manually in each worktree.

This was the pattern used in v1.5.2 sprint (2026-05-02) — three sub-agents in `.claude/worktrees/agent-*`, each on its own `wt/<id>` branch, integrated by lead via cherry-pick into main.

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
| **Swarmspace_Overview.md** | SwarmSpace purpose, flow, and orientation for users/agents | `Swarmspace_Overview.md` |
| **README.md** | Setup guide (Firebase, Stripe, Vercel) | `README.md` |
| **SWARMSPACE_API_CONTEXT.md** | API reference for LUMARA integration | `SWARMSPACE_API_CONTEXT.md` |
| **architecture.md** | SwarmStore architecture & hosting | `architecture.md` |
| **DOCS/CONFIGURATION_MANAGEMENT.md** | Docs inventory and change tracking | `DOCS/CONFIGURATION_MANAGEMENT.md` |
| **DOCS/CHANGELOG.md** | Version history | `DOCS/CHANGELOG.md` |
| **DOCS/FEATURES.md** | Feature list | `DOCS/FEATURES.md` |
| **DOCS/backend.md** | Backend (API, Vercel, Firebase) | `DOCS/backend.md` |
| **DEVELOPER_GUIDE.md** | Plugin manifest & submission reference | `DEVELOPER_GUIDE.md` |
| **DOCS/PRISM.md** | PRISM / privacy logging reference | `DOCS/PRISM.md` |
| **DOCS/PRIVACY.md** | Privacy policy (Markdown) | `DOCS/PRIVACY.md` |
| **prism.html** / **privacy.html** | Public PRISM and privacy pages | site root |
| **ast10.html** | OWASP AST10 compliance page (public) | `ast10.html` |
| **DOCS/OWASP_AST10_COMPLIANCE.md** | Internal AST10 compliance doc | `DOCS/OWASP_AST10_COMPLIANCE.md` |
| **DOCS/bugtracker/** | Bug tracker | `DOCS/bugtracker/` |
| **PROMPT_TRACKER.md** | Prompt change log | `PROMPT_TRACKER.md` |
| **PROMPT_REFERENCES.md** | Prompt catalog | `PROMPT_REFERENCES.md` |
| **LUMARA_SWARMSPACE_FUNCTIONS_INTEGRATION.md** | Cross-repo function ownership & sync | `LUMARA_SWARMSPACE_FUNCTIONS_INTEGRATION.md` |
| **founding-developers.html** | Founding Developer Programme landing page | `founding-developers.html` |
| **developer-guide.html** | HTML developer guide (styled) | `developer-guide.html` |
| **earnings.html** | Developer earnings page shell (backend not built) | `earnings.html` |

### Backlog Sections Reference

Key backlog sections for orientation when picking up work:

| Section | Topic | Status |
|---|---|---|
| §2.3 | Credential Isolation — boundary injection for plugin Workers | Open |
| §3.3 | Stripe Connect — developer payouts (80/20 split) | Open |
| §3.4 | Developer Earnings Dashboard | Page shell only — backend open |
| §4.4 | Catalogue Updates Endpoint (`/catalogue/updates`) | Open |
| §4.5 | Credit visibility in UI | HTML exists — JS binding unverified |
| §5.1 | Dynamic Worker Loader (V8 isolate sandbox) | Open |
| §5.2 | Durable Objects — Recurring Agent Runtime | Open (blocked on §5.3) |
| §5.3 | Orchestrator Execution Modes (plan/auto/bubble/interactive) | Open — blocks §5.2 and Work Chain chaining |
| §10 | Agent Wallet System — per-agent credit delegation + policy engine | Open (Phase 0–4 designed) |
| §11 | Session Broker — A2A gateway between external agents and plugins | Open (future, after orchestrator modes) |
| §12 | Front-Page Discovery Agent | Phase 1 ✅ done; Phase 2 ✅ done (committed `0e2e85c`); Phase 3 open |
| §15 | Work Chains Catalogue — 6 live, 2 near-complete (need CRM/email plugin) | Partial |
| §16 | Roles Browsing Page — end-user surface for Work Chains | ✅ done (committed `cd71c9c`) |

---

## Documentation — Principles and Reviewer

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

Use the SOP-DOC reviewer checklist above. Additionally check:

1. **Definition of done met** — every item from STEP 2.5 passes.
2. **No scope creep** — no files changed outside the plan.
3. **Tests pass** — no new test failures introduced.
4. **Principles upheld** — preserve knowledge; single source of truth; accuracy over volume.

**Output:** Pass / fail with a short note. On fail, list which item(s) failed and what to fix.

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
*Version 1.7.0 — SOPs adapted from LUMARA/ARC doc-config workflow. Code Quality Principles adapted from Karpathy CLAUDE.md guidelines.*
