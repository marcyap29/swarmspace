# SwarmSpace Documentation Context Guide

**Version:** 1.0.0
**Last Updated:** March 1, 2026
**Current Branch:** `main`

*This file was reset for SwarmSpace. All prior versioning and EPI-specific content has been cleared.*

---

## Quick Reference

| Document | Purpose | Path |
|----------|---------|------|
| **README.md** | Setup guide (Supabase, Stripe, Vercel) | `README.md` |
| **SWARMSPACE_API_CONTEXT.md** | API reference for LUMARA integration | `SWARMSPACE_API_CONTEXT.md` |
| **architecture.md** | SwarmStore architecture & hosting | `architecture.md` |
| **Docs/CONFIGURATION_MANAGEMENT.md** | Docs inventory and change tracking | `Docs/CONFIGURATION_MANAGEMENT.md` |
| **Docs/CHANGELOG.md** | Version history | `Docs/CHANGELOG.md` |
| **Docs/FEATURES.md** | Feature list | `Docs/FEATURES.md` |
| **Docs/backend.md** | Backend (API, Vercel, Supabase) | `Docs/backend.md` |
| **Docs/bugtracker/** | Bug tracker | `Docs/bugtracker/` |
| **Documentation, Config & Git Backup** | Universal prompt for docs, config, and backup sync | This file: section below |

---

## Core Documentation

### 📖 SwarmSpace Overview
- **README.md** — Setup, deploy, test flow. Supabase, Stripe, Vercel env vars.
- **SWARMSPACE_API_CONTEXT.md** — Endpoints (swarmspaceRouter, swarmspacePluginStatus), tiers (Free/Standard/Premium), request schemas. Auth: Firebase ID token. Never commit API keys.

### 🏗️ Architecture
- **architecture.md** — SwarmStore plugin format, hosting (Cloudflare Workers/R2/D1), security protocols. Broader vision; current app is Vercel + Supabase + Stripe.

### 📁 File Structure
```
swarmspace/
├── index.html, signup.html, dashboard.html, upgrade.html, marketplace.html, thankyou.html, faq.html
├── api/create-checkout.js, api/stripe-webhook.js
├── supabase-setup.sql, vercel.json
├── SWARMSPACE_API_CONTEXT.md, architecture.md
└── Docs/
    ├── claude.md, CONFIGURATION_MANAGEMENT.md, CHANGELOG.md, FEATURES.md
    ├── backend.md, git.md, SECURITY_CHECKLIST.md, UI_UX.md
    └── bugtracker/
```

---

## Documentation Update Rules

When asked to update documentation:
1. Update documents listed in this file
2. Version documents as necessary
3. Replace outdated context
4. Keep changelog if present
5. **Role:** For the full Documentation, Configuration Management, and Git Backup role, see the section below.

---

## Documentation, Configuration Management and Git Backup

```
name: doc-config-git-backup
description: Documentation & Configuration Manager — keeps docs accurate and consolidated, maintains single source of truth, and ensures every git push is backed by up-to-date documentation.
model: opus
```

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

- `README.md` — project overview and setup
- `SWARMSPACE_API_CONTEXT.md` — API reference for LUMARA integration
- `architecture.md` — SwarmStore architecture and hosting
- `Docs/claude.md` — context guide and role definitions
- `Docs/CONFIGURATION_MANAGEMENT.md` — docs inventory and change log
- `Docs/CHANGELOG.md` — version history
- `Docs/FEATURES.md` — feature catalog
- `Docs/backend.md` — backend services
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

*SwarmSpace — Developer dashboard and plugin marketplace. API layer for LUMARA.*
