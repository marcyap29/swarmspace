# Prompt References

**Version:** 1.0.0
**Last Updated:** 2026-04-13
**Maintainer:** doc-config-git-backup
**Purpose:** Catalog of all LLM prompts in the codebase (system prompts, templates, API prompts).

---

## Document scope

- **Source:** Search codebase for prompt definitions (e.g. `systemPrompt`, `prompt =`, `system =`).
- **Categories:** System prompts, user prompts, API-specific prompts, etc.
- **Version history:** At end of this file.

---

## Prompt Catalog

### Category 1: Chat & Core System

| ID | Name | Source File | Lines | Purpose |
|----|------|-------------|-------|---------|
| P-01 | LUMARA Chat System Prompt | `functions/src/prompts.ts` | 6-184 | Core chat assistant persona; web access, trigger-safety, multi-turn |
| P-02 | SwarmSpace Discovery Agent | `functions/src/functions/swarmspaceDiscoveryAgent.ts` | 69-98 | NLP plugin/chain discovery; maps intent to plugins and workflows |

### Category 2: Journal Analysis

| ID | Name | Source File | Lines | Purpose |
|----|------|-------------|-------|---------|
| P-03 | Journal Prompt Generator | `functions/src/functions/generateJournalPrompts.ts` | 96-170 | Generates 4 initial or 12-18 expanded journaling prompts |
| P-04 | Journal Reflection | `functions/src/functions/generateJournalReflection.ts` | 105-128 | In-journal ECHO reflection (Empathize, Clarify, Highlight, Open) |
| P-05 | Journal Entry Analysis | `functions/src/functions/analyzeJournalEntry.ts` | 293-301 | Internal analysis for summary/themes/suggestions |

### Category 3: Agent Worker

| ID | Name | Source File | Lines | Purpose |
|----|------|-------------|-------|---------|
| P-06 | Plan Generation | `workers/agent-worker/src/plan.ts` | 26-58 | Structured JSON plan from task; tier-aware tools |
| P-07 | Execution System | `workers/agent-worker/src/execute.ts` | 26-32 | Sequential tool execution of approved plan |

### Category 4: Orchestrator Synthesis (12 workflows)

| ID | Name | Source File | Lines | Purpose |
|----|------|-------------|-------|---------|
| P-08 | /research | `workers/orchestrator/src/index.js` | 137-318 | Research synthesis workflow |
| P-09 | /competitor | `workers/orchestrator/src/index.js` | 137-318 | Competitor analysis workflow |
| P-10 | /marketing | `workers/orchestrator/src/index.js` | 137-318 | Marketing strategy workflow |
| P-11 | /plugins | `workers/orchestrator/src/index.js` | 137-318 | Plugin recommendation workflow |
| P-12 | /academic | `workers/orchestrator/src/index.js` | 137-318 | Academic research workflow |
| P-13 | /news-brief | `workers/orchestrator/src/index.js` | 137-318 | News briefing workflow |
| P-14 | /market-scan | `workers/orchestrator/src/index.js` | 137-318 | Market scanning workflow |
| P-15 | /location-brief | `workers/orchestrator/src/index.js` | 137-318 | Location briefing workflow |
| P-16 | /health-research | `workers/orchestrator/src/index.js` | 137-318 | Health research workflow |
| P-17 | /tech-scout | `workers/orchestrator/src/index.js` | 137-318 | Technology scouting workflow |
| P-18 | /fact-check | `workers/orchestrator/src/index.js` | 137-318 | Fact-checking workflow |
| P-19 | /content-brief | `workers/orchestrator/src/index.js` | 137-318 | Content brief workflow |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-04-13 | Initial catalog — 19 prompts across 4 categories |
