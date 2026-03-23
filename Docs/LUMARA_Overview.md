# EPI & LUMARA — Overview

**Purpose:** Quick orientation for users and agents reading this repo. What the app is, what LUMARA is, and where to go next.

---

## What is EPI?

**EPI** = **Evolving Personal Intelligence**. It is the app: a journaling and narrative-capture platform with an AI assistant that has long-term memory and developmental awareness. The codebase lives under `ARC_MVP/EPI/` (Flutter app, `lib/`, `DOCS/`).

---

## What is LUMARA?

**LUMARA** = **Lifelong Unified Memory and Adaptive Response Architecture**.

LUMARA is **not** the journal. It is the **orchestrator** that:

1. **Coordinates four subsystems** — ARC (recent journal + capture), ATLAS (developmental phase), CHRONICLE (longitudinal memory/synthesis), AURORA (rhythm/regulation).
2. **Routes user intents** — Parses what the user is asking (quick answer, pattern exploration, “how have I changed?”, etc.) and decides which subsystems to query.
3. **Builds the prompt** — Aggregates recent entries (ARC), current phase (ATLAS), synthesized narrative across time (CHRONICLE), and optional rhythm context (AURORA) into one context map for the LLM.
4. **Produces the assistant** — One unified chat/reflection experience: it can answer like ChatGPT/Claude by default, or act as a phase-aware, memory-backed partner when the user wants depth.

So: **ARC** = where you write and what’s recent. **LUMARA** = the layer that uses that (plus CHRONICLE, ATLAS, AURORA) to power the assistant.

---

## Pipeline (simplified)

```
User journals (ARC) → Raw entries → CHRONICLE synthesis (VEIL cycle)
                                        ↓
LUMARA Orchestrator ← ARC, ATLAS, CHRONICLE, AURORA
        ↓
Master Prompt (phase-aware, CHRONICLE-backed or raw-backed)
        ↓
LLM (Groq primary, Gemini fallback) → Response to user
```

---

## Subsystems (at a glance)

| Subsystem   | Role                               | Main output for LUMARA                    |
|------------|-------------------------------------|-------------------------------------------|
| **ARC**    | Capture + recent journal context   | Recent entries, entry contents, base context |
| **ATLAS**  | Current developmental phase        | Phase name, rationale, description        |
| **CHRONICLE** | Longitudinal memory & synthesis | Aggregated narrative (monthly/yearly/multi-year) |
| **AURORA** | Rhythm / regulation                | Usage patterns, optimal timing (stub)     |

All four implement the same subsystem interface; the **LUMARA Orchestrator** queries them in parallel and aggregates results into the prompt.

---

## Key concepts

- **Narrative intelligence** — Understanding and synthesizing a person’s story over time (themes, phases, “how have I changed?”) while treating the user as the authority on their own story.
- **VEIL cycle** — Verbalize → Examine → Integrate → Link: capture (ARC), then CHRONICLE examines, integrates, and links across time.
- **Two-stage memory** — (1) Context selection: which recent/similar entries to pull in. (2) CHRONICLE: pre-synthesized temporal layers. LUMARA uses both.
- **Phase-aware response** — Tone and depth adapt to the user’s current phase (e.g. Recovery, Discovery, Breakthrough) via ATLAS.

---

## Integration with Swarmspace

**Swarmspace** is the plugin layer LUMARA calls when the assistant needs external capabilities: web search, URL fetching, weather, news, currency, etc.

**Flow:** User asks the assistant → LUMARA orchestrates (ARC, ATLAS, CHRONICLE, AURORA) and builds the prompt. When the response requires live or external data, LUMARA calls Swarmspace (`swarmspaceRouter`) with a Firebase ID token; Swarmspace runs the appropriate plugin and returns results. LUMARA wraps plugin output in explicit context for the LLM, then the LLM produces the final response.

**In short:** LUMARA = orchestration and memory; Swarmspace = external API layer (search, fetch, etc.). Both live in this repo; the EPI app uses LUMARA, which in turn uses Swarmspace.

| Topic | Document |
|-------|----------|
| **Swarmspace overview** (what it is, tiers, dashboard) | [Swarmspace_Overview.md](../Swarmspace_Overview.md) |
| **API integration** (endpoints, auth, request schemas) | [SWARMSPACE_API_CONTEXT.md](../SWARMSPACE_API_CONTEXT.md) |

---

## Where to read more

| Topic              | Document |
|--------------------|----------|
| **LUMARA in depth** (orchestrator, subsystems, prompts, LLM) | [LUMARA_COMPLETE.md](LUMARA_COMPLETE.md) |
| **System architecture** (5 modules, data flow)               | [ARCHITECTURE.md](ARCHITECTURE.md)       |
| **Docs index and when to read what**                         | [README.md](README.md)                    |
| **Context for agents / onboarding**                          | [claude.md](claude.md)                    |

---

*This overview is part of `DOCS/`. For version and change history, see [CHANGELOG.md](CHANGELOG.md) and [CONFIGURATION_MANAGEMENT.md](CONFIGURATION_MANAGEMENT.md).*
