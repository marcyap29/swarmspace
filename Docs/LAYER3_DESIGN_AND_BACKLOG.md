# SwarmSpace — Layer 3 Design Spec & Updated Backlog
*Orbital AI · April 2026*

---

## Layer 3: Agents & Roles — Architecture Design

> **Terminology update (April 2026):** "Dream Teams" is retired. Infrastructure uses **Work Chains** (what developers build and list). End users see **Roles** (the marketing skin for a Work Chain). Pre-configured agent bundles are now **Roles**, not "Dream Team Packs."

### Overview

Layer 3 extends SwarmSpace from a plugin marketplace (Layer 1) and Work Chain orchestration platform into a **persistent agent runtime**. Agents are long-lived processes that can be scheduled, event-triggered, and composed into pre-configured Roles.

Layer 3 is architecturally dependent on LUMARA desktop as the persistent runtime environment.

---

### Core Concepts

#### 1. Roles (end-user skin for Work Chains)

Pre-configured agent bundles installable as a single unit. Shifts UX from "assemble your team" to "install the Role." Each Role sits on top of one or more Work Chains.

```json
{
  "pack_id": "social-media-manager",
  "name": "Social Media Manager",
  "description": "Automated social media content creation and publishing",
  "agents": [
    {
      "agent_id": "content-strategist",
      "role": "Plans content calendar and identifies trending topics",
      "plugins": ["brave-search", "hackernews", "newsapi", "gemini-flash"],
      "schedule": "daily",
      "autonomy_level": 1
    },
    {
      "agent_id": "social-publisher",
      "role": "Drafts and publishes posts to connected accounts",
      "plugins": ["gemini-flash", "social-publisher", "media-upload"],
      "trigger": "on_content_strategist_output",
      "autonomy_level": 2
    }
  ],
  "required_connections": ["social-publisher"],
  "tier": "standard"
}
```

#### 2. Agent Autonomy Ladder

| Level | Name | Behavior | Approval |
|---|---|---|---|
| 0 | Drafts only | Agent creates drafts, never executes | User must manually execute |
| 1 | Queued approval | Agent queues actions for batch review | User approves/rejects queue |
| 2 | Per-item with veto | Agent executes after veto window (e.g. 15min) | User can cancel during window |
| 3 | Fully autonomous | Agent executes immediately | No approval needed |

Stored per-agent in the pack manifest as `autonomy_level`. Users can override downward (never upward without explicit consent).

#### 3. Goal-Aware Execution via CHRONICLE

Each plugin call carries full goal ancestry traced through CHRONICLE context:

```
Goal: "Grow Twitter following to 10K"
  └─ Sub-goal: "Post 3x/week on trending AI topics"
      └─ Task: "Research trending AI topics this week"
          └─ Plugin call: brave-search { query: "AI trends this week" }
```

This changes agent outputs from task-executing to goal-pursuing. The CHRONICLE ancestry chain is passed as metadata in the plugin request so agents can make context-aware decisions.

#### 4. Schedulable Manifest Field

Add to the plugin manifest spec:

```json
{
  "schedulable": {
    "supported": true,
    "min_interval_seconds": 3600,
    "max_frequency": "hourly",
    "requires_persistent_runtime": true,
    "cron_compatible": true
  }
}
```

This enables the desktop scheduler to know which plugins support scheduled invocation.

#### 5. Desktop Scheduler Infrastructure

```
LUMARA Desktop (Flutter/Dart)
  └─ Scheduler Service (Dart background isolate)
      └─ Cron Dispatcher
          └─ swarmspaceRouter (Firebase Cloud Function)
              └─ Plugin Workers (Cloudflare)

Job persistence: SQLite (local) + Firestore (sync)
Job history: Stored locally, synced to Firestore for iOS read
```

**Native Dart Implementation:**
- Background isolate for non-blocking scheduled execution
- Cron expression parser for flexible scheduling
- Job queue with retry logic (exponential backoff)
- Local SQLite for offline job storage
- Firestore sync for cross-device job history

#### 6. Desktop Job History UI

| Column | Source |
|---|---|
| Timestamp | Local SQLite + Firestore sync |
| Agent | Pack manifest |
| Action | Plugin call chain |
| Status | success / error / pending / vetoed |
| Result summary | Gemini-flash synthesis of output |
| Duration | Start-to-finish time |

#### 7. iOS + Desktop CHRONICLE Sync

```
Desktop scheduled run completes
  → Writes result to Firestore: chronicle/{uid}/runs/{runId}
  → iOS LUMARA reads same Firestore path
  → CHRONICLE integrates run results into longitudinal memory
  → Next scheduled run has access to previous run context
```

Both platforms read/write the same Firestore layer. No separate sync mechanism needed — Firestore real-time listeners handle propagation.

---

## Updated Backlog — Layer 3 Items

### Phase 3A: Foundation (Before Any Agent Code)

| # | Item | Status | Dependencies | Notes |
|---|---|---|---|---|
| L3-01 | Add `schedulable` field to manifest spec | Not built | architecture.md | Spec defined above, needs formal addition |
| L3-02 | Define Role pack manifest format | Defined | None | JSON schema for Role bundles (spec above) |
| L3-03 | Design CHRONICLE goal ancestry data model | Defined | LUMARA CHRONICLE subsystem | Firestore schema for goal chains |
| L3-04 | Resolve autonomy ladder UX patterns | Defined | None | Approval queue UI, veto window mechanism |

### Phase 3B: Desktop App (LUMARA Desktop)

| # | Item | Status | Dependencies | Notes |
|---|---|---|---|---|
| L3-05 | LUMARA desktop app — Flutter/Dart scaffold | Not built | Flutter SDK, macOS toolchain | macOS primary platform |
| L3-06 | Desktop scheduler — Dart background isolate | Not built | L3-05 | Cron dispatcher to swarmspaceRouter |
| L3-07 | Local SQLite job persistence | Not built | L3-05, L3-06 | Offline-first job storage |
| L3-08 | Desktop job history UI | Not built | L3-05, L3-06, L3-07 | Table view with status, duration, results |
| L3-09 | Firestore sync for job history | Not built | L3-07 | Bidirectional sync with iOS CHRONICLE |

### Phase 3C: First Role

| # | Item | Status | Dependencies | Notes |
|---|---|---|---|---|
| L3-10 | Social Media Manager agent: Content Strategist | Not built | L3-06, orchestrator Worker | Uses /news-brief + /content-brief workflows |
| L3-11 | Social Media Manager agent: Social Publisher | Not built | L3-10, social-publisher Worker | Drafts → approval queue → publish |
| L3-12 | Role pack install UX | Not built | L3-05, L3-02 | "Install the Role" one-click flow |
| L3-13 | Autonomy level selector per agent | Not built | L3-04, L3-12 | User override controls |

### Phase 3D: Agent Marketplace

| # | Item | Status | Dependencies | Notes |
|---|---|---|---|---|
| L3-14 | Agent manifest spec (extends plugin manifest) | Not built | L3-01, L3-02 | Adds schedule, autonomy, goal fields |
| L3-15 | Agent submission portal | Not built | L3-14, submit.html pattern | Reuse plugin submission UX |
| L3-16 | Agent marketplace UI | Not built | marketplace.html pattern | Filter by pack, schedule type, autonomy |
| L3-17 | Agent merit scoring | Not built | Monthly merit review tooling | Extends plugin merit to agent-level |

### Phase 3E: CHRONICLE Integration

| # | Item | Status | Dependencies | Notes |
|---|---|---|---|---|
| L3-18 | Goal ancestry chain in plugin requests | Not built | L3-03, swarmspaceRouter | Pass CHRONICLE context as request metadata |
| L3-19 | iOS + desktop CHRONICLE sync | Not built | L3-09, LUMARA iOS | Same Firestore layer, real-time listeners |
| L3-20 | CHRONICLE-driven progressive discovery | Not built | L3-18, L3-19 | Surface workflows based on goal history |

---

## Remaining Non-Layer-3 Backlog Items

These items from the original backlog are not Layer 3 but remain open:

### Community Launch

| # | Item | Status | Notes |
|---|---|---|---|
| C-01 | Identify 20-30 target developers | Not built | Personal outreach from LinkedIn/Substack |
| C-02 | Write personal outreach messages | Not built | Founding Developer pitch |
| C-03 | Seed posts in every Swarm | Not built | Genuine questions, not housekeeping |
| C-04 | Open Founding Developer programme | Not built | 100 spots, 85% share, badge |
| C-05 | DEVELOPER_GUIDE.md | Not built | Needed to attract plugin supply side |
| C-06 | Developer Agreement (legal) | Not built | Prinz Law Office, La Jolla |
| C-07 | Publish AST10 compliance page | Defined | swarmspace.vercel.app |

### Platform Mechanics (Deferred)

| # | Item | Status | Notes |
|---|---|---|---|
| P-01 | Swarms UI (community spaces) | Defined | Per-plugin, per-workflow spaces |
| P-02 | Upvote infrastructure | Defined | One vote per user, weighted by usage |
| P-03 | Monthly merit review tooling | Not built | Manual at launch, dashboard at scale |
| P-04 | Credit rollover policy | Defined | No rollover at launch, 20% cap post-launch |
| P-05 | Tighten Developer Pro thresholds | Defined | Merit-based active publisher definition |
| P-06 | Progressive workflow discovery | Defined | CHRONICLE-driven surfacing |
| P-07 | Custom chain builder UI | Defined | Entry point in LUMARA Agents screen |

### Infrastructure

| # | Item | Status | Notes |
|---|---|---|---|
| I-01 | Firestore composite index on stripe_customer_id | Not built | Needed for Stripe webhook queries |
| I-02 | API key uniqueness enforcement in Firestore | Not built | Separate /api_keys/{key} collection or app-level check |
| I-03 | Deploy 8 new plugin Workers to Cloudflare | Not built | Source code ready in workers/plugins/ |
| I-04 | Apply credit enforcement patch to swarmspaceRouter.ts | Not built | Patch ready in workers/SWARMSPACE_ROUTER_PATCH.ts |
| I-05 | Add 8 PLUGIN_REGISTRY entries to swarmspaceRouter.ts | Not built | Entries ready in workers/plugins/REGISTRY_ENTRIES.ts |
| I-06 | Behavioral scanning pipeline for submissions | Not built | AST08 gap — currently manual review only |

---

*SwarmSpace Product Backlog · Orbital AI · April 2026 · Living Document*
