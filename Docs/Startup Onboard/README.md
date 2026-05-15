# Startup Onboard

Cross-repo coordination + fast-orientation surface for the LUMARA + SwarmSpace system.

**For a fresh agent or third party arriving cold:** read this README, then `LUMARA_Claude.md` + `SWARMSPACE_Claude.md`, then `LUMARA_Context.md` + `SWARMSPACE_Context.md`. You'll be oriented on both halves of the system in under five minutes without traversing either repo.

---

## Purpose

LUMARA Claude (lives in `/Volumes/Marc Working Drive/Development/LUMARA-Desktop/LUMARA/`) and SwarmSpace Claude (lives in `/Volumes/Marc Working Drive/Development/swarmspace/`) work in separate repos with separate session logs. This directory is a shared mailbox where each side mirrors its in-flight state so:

- The other Claude can orient on cross-repo work without leaving its own repo
- The user can see what's happening on both sides at a glance
- Any third-party agent can get fully oriented from this directory alone
- The user can drop coordination prompts that require both sides to act in concert

This is a **shared mailbox**, not a build artifact. This directory is **git-tracked inside the SwarmSpace repo** (`DOCS/Startup Onboard/`) as of 2026-05-03. The in-repo canonical files remain the source of truth — these are mirrors, refreshed by each Claude on its session-close. LUMARA mirrors its files here by writing to this path directly; SwarmSpace mirrors are updated by SwarmSpace Claude on session-close.

---

## File set

Two classes of files live here:

1. **One-way mirrors** — each Claude writes only its own. `<REPO>_<Topic>.md` Title Case. Refresh on STEP 6 close-session when the canonical in-repo source changed. The other side reads them on STEP 1 orient.
2. **`Coordinate.md`** — single bidirectional file at the directory root. **Both Claudes edit it.** Where the two Claudes talk *to each other*: in-flight cross-repo features, open requests, blockers, joint decisions, questions. Sign every entry `[LUMARA <date>]` or `[SWARMSPACE <date>]`. Never delete the other side's entries — archive instead.

The mirror files give each side a snapshot of the other's *internal* state. `Coordinate.md` is the *dialog between* them. Reading the mirrors tells you what each side is doing in isolation; reading `Coordinate.md` tells you what they need from each other.

Naming convention for mirrors: `<REPO>_<Topic>.md` in Title Case. One file per repo per topic, never combined.

| File | Owner (writes) | Source of truth (canonical) | Purpose |
|---|---|---|---|
| `Coordinate.md` | **Both** LUMARA + SwarmSpace | this directory (no canonical source — it lives here) | Bidirectional dialog: in-flight cross-repo features, open asks, blockers, joint decisions, questions |
| `LUMARA_Backlog.md` | LUMARA Claude | `LUMARA-Desktop/LUMARA/DOCS/tracking md files/backlog.md` | Long-term feature pool |
| `SWARMSPACE_Backlog.md` | SwarmSpace Claude | `swarmspace/Docs/backlog.md` (or equivalent) | Long-term feature pool |
| `LUMARA_Context.md` | LUMARA Claude | `LUMARA-Desktop/LUMARA/DOCS/tracking md files/context.md` | Session log — what shipped, what's next, warnings |
| `SWARMSPACE_Context.md` | SwarmSpace Claude | `swarmspace/Docs/context.md` (or equivalent) | Session log |
| `LUMARA_Planner.md` | LUMARA Claude | `LUMARA-Desktop/LUMARA/DOCS/tracking md files/planner.md` | Active sprint |
| `SWARMSPACE_Planner.md` | SwarmSpace Claude | `swarmspace/Docs/planner.md` (or equivalent) | Active sprint |
| `LUMARA_Claude.md` | LUMARA Claude | `LUMARA-Desktop/LUMARA/DOCS/CLAUDE.md` | LUMARA's SOPs, key invariants, file map |
| `SWARMSPACE_Claude.md` | SwarmSpace Claude | `swarmspace/CLAUDE.md` (or equivalent) | SwarmSpace's SOPs |
| `LUMARA_Spec_*.md` / `SWARMSPACE_Spec_*.md` | Whoever owns the spec | `<repo>/DOCS/spec_*.md` | Active cross-repo specs (e.g. `LUMARA_Spec_Meeting_Prep.md`). Archive after merge. |
| `prompts/*.md` *(when present)* | User | n/a | Coordination prompts requiring both sides — overrides in-repo planner |
| `README.md` | Either side | this file | Convention notes |

---

## Concurrent-edit safety

Both Claudes may write to this directory at the same time — especially `Coordinate.md`. **On any Read/Write/Edit failure on a file here, wait `sleep 35` (30–40 seconds) and retry once.** If the second attempt still fails, surface to the user; do not loop further. Same rule for the other side's mirror files (they may be mid-refresh during the other Claude's close-session).

This is codified in each repo's `*_Claude.md` (Cross-Repo Coordination section), `agents_sop.md` (SOP-REVIEW), and `agents_handoff.md` (outgoing checklist).

---

## Sync rules

**Each Claude is responsible for keeping its own mirrors current.** No one updates the other side's mirrors.

LUMARA's rule (codified in its `DOCS/CLAUDE.md` STEP 6 + `agents_sop.md` SOP-REVIEW + `agents_handoff.md` outgoing checklist):

> On STEP 6 close-session, for each of the canonical files listed above that *changed this session*, copy it to the corresponding mirror in this directory. Then commit the in-repo source.

Concrete commands LUMARA uses:

```bash
ONBOARD="/Volumes/Marc Working Drive/Development/swarmspace/DOCS/Startup Onboard"
SRC="/Volumes/Marc Working Drive/Development/LUMARA-Desktop/LUMARA"

# only the files that changed this session
cp "$SRC/DOCS/tracking md files/backlog.md"  "$ONBOARD/LUMARA_Backlog.md"
cp "$SRC/DOCS/tracking md files/context.md"  "$ONBOARD/LUMARA_Context.md"
cp "$SRC/DOCS/tracking md files/planner.md"  "$ONBOARD/LUMARA_Planner.md"
cp "$SRC/DOCS/CLAUDE.md"                     "$ONBOARD/LUMARA_Claude.md"
# active spec(s):
cp "$SRC/DOCS/spec_meeting_prep.md"          "$ONBOARD/LUMARA_Spec_Meeting_Prep.md"
```

SwarmSpace adopts the symmetric rule for its own mirrors.

**Coordinate.md is bidirectional** — both sides edit it. Add entries on STEP 6 close-session whenever cross-repo state changed: status of in-flight features, new blockers, requests for the other side, answers to their open questions, joint decisions. Sign `[LUMARA <date>]` or `[SWARMSPACE <date>]`. Move resolved items to the Archive section rather than deleting.

**On session start, for any work that touches cross-repo integration** (orchestrator routes, plugin registry, PRISM gate, OAuth tokens, anything where one side calls the other), each Claude reads in this order: (1) `Coordinate.md` for current dialog + open asks, (2) the other side's `*_Context.md` for their latest internal state, (3) relevant `*_Backlog.md` for long-term plans.

---

## Coordination prompts

If the user drops a prompt at `prompts/<name>.md` that requires both repos to act:

1. The prompt is the source of truth — it overrides whatever's in either side's in-repo planner
2. Each Claude executes only its half — never edits the other repo's files
3. After the work ships, the prompt is archived (move to `prompts/archive/`) and any resulting backlog item is added to the appropriate `*_Backlog.md` mirror

---

## Cross-repo ownership rules (recap)

From SwarmSpace's CLAUDE.md and the LUMARA backlog history:

**SwarmSpace owns:**
- `swarmspaceRouter` Firebase function and its `PLUGIN_REGISTRY`
- `swarmspacePluginCatalog` Firebase function
- All plugin Workers (`workers/plugins/*`)
- Orchestrator routes (`workers/orchestrator/`)
- Quota enforcement and PRISM telemetry

**LUMARA owns:**
- Core chat / journal flows
- LLM proxies (Gemini, Groq, Ollama)
- CHRONICLE, PRISM scrubber, on-device privacy gates
- Subscription / Stripe billing
- Mobile + desktop UI

When in doubt, the rule is **whichever repo physically contains the file is the owner**. Neither side edits the other's files.

---

## For a third party getting up to speed

Read in this order to orient on either side without going into the source repos:

1. **`README.md`** (this file) — what this directory is and how it's used
2. **`Coordinate.md`** — the live dialog between the two sides; tells you what's in flight, what's blocked, and what each side is asking of the other
3. **`LUMARA_Claude.md` + `SWARMSPACE_Claude.md`** — each repo's SOPs, key invariants, file map
4. **`LUMARA_Context.md` + `SWARMSPACE_Context.md`** — what each side shipped most recently and what's next
5. **`LUMARA_Planner.md` + `SWARMSPACE_Planner.md`** — active sprints
6. **`LUMARA_Backlog.md` + `SWARMSPACE_Backlog.md`** — long-term roadmap
7. **`LUMARA_Spec_*.md` + `SWARMSPACE_Spec_*.md`** — currently in-flight cross-repo specs
8. **`prompts/*.md`** — any pending coordination prompts from the user

---

## Convention name (for reuse in other multi-repo projects)

This directory pattern is called a **Startup Onboard** in the LUMARA agent system convention. Any multi-repo project can adopt it — the universal `Starter Repo` templates at `/Volumes/Marc Working Drive/Development/Starter Repo/` document the pattern generically. New projects should create their own `Startup Onboard` directory at a sibling location to the repos it spans.

---

*Renamed from "Unified LUMARA + Swarmspace Backlog" to "Startup Onboard" 2026-05-03 to reflect that this directory is the orientation entry point for any new agent (Claude or otherwise), not just a backlog mirror.*
