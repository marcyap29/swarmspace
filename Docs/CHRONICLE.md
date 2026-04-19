# CHRONICLE — Summary Generation & Layered Compression

**CHRONICLE** = **C**hronological **R**ecall **O**ptimization via **N**ative **I**mitation of **C**onsolidated **L**ongitudinal **E**xperience

This document explains how CHRONICLE generates summaries across its four-layer architecture, including when and how LLM inference is used, how PRISM privacy protections apply, and how data flows between layers.

For full architecture details (query routing, scheduling, integration points, tier configs), see `CHRONICLE_COMPLETE.md`. For the dual-CHRONICLE system (user vs LUMARA), see `LUMARA_DUAL_CHRONICLE_GUIDE.md`.

---

## Layer Overview

| Layer | Scope | Storage | VEIL Stage | Compression | Inference? |
|-------|-------|---------|------------|-------------|------------|
| **0** | Raw entries | Hive (on-device) | VERBALIZE | 1.0 (none) | No |
| **1** | Monthly | Markdown files | EXAMINE | 10–20% of raw | Yes |
| **2** | Yearly | Markdown files | INTEGRATE | 5–10% of monthly | Yes |
| **3** | Multi-year | Markdown files | LINK | 1–2% of yearly | Yes |

Each layer compresses the one below it, forming a pyramid of increasingly abstract representations. By Layer 3, content is reduced to 1–2% of the original tokens while preserving biographical throughlines.

---

## Layer 0 — Raw Entries

**Source:** `lib/shared/chronicle/storage/layer0_repository.dart`, `layer0_populator.dart`

**No inference.** Layer 0 is purely algorithmic enrichment of journal entries.

When a user creates a journal entry, `Layer0Populator.populateFromJournalEntry()` enriches it with:

- Phase history (from `PhaseHistoryRepository`)
- SENTINEL/RIVET scores (emotional density)
- Extracted themes and keywords
- Media attachments (images, PDFs, documents with OCR/analysis)
- Word count and metadata

The enriched entry is stored in a Hive box (`chronicle_raw_entries`) on device. Retention depends on user tier (30–365 days).

---

## Layer 1 — Monthly Aggregations

**Source:** `lib/shared/chronicle/synthesis/monthly_synthesizer.dart`

**VEIL stage:** EXAMINE (pattern recognition across recent events)

### Generation Process

Layer 1 synthesis uses a **hybrid approach** — algorithmic pattern detection followed by LLM enrichment:

#### Step 1: Algorithmic Analysis (no inference)

`PatternDetector` (`lib/shared/chronicle/synthesis/pattern_detector.dart`) processes all Layer 0 entries for the month:

- **Theme extraction** — frequency-based identification of recurring topics
- **Phase distribution** — distribution of ATLAS phases across entries
- **SENTINEL trend** — emotional density trajectory over the month
- **Significant events** — phase transitions, high SENTINEL outliers
- **Decision captures** — inflection point markers

#### Step 2: LLM Enrichment (inference)

Two LLM calls via `lumaraSend()`:

1. **`_extractThemesWithLLM()`** — Sends entry schemas to the LLM requesting structured JSON output. Produces richer theme descriptions with pattern narratives, including specific details (names, places, projects, events).

2. **`_generateMonthNarrative()`** — Generates a 1–2 paragraph readable narrative of "what happened this month" at Flesch-Kincaid grade level 8 readability.

#### Fallback

If the LLM call fails, synthesis falls back to `PatternDetector`-only output. The system produces a valid monthly aggregation without inference — it is less narratively rich but structurally complete.

#### Output

Markdown file with YAML frontmatter (e.g. `2025-01.md`), containing:

- Month narrative (LLM-generated)
- Linked entry IDs (for drill-down)
- Dominant themes
- Phase analysis
- Emotional density trend
- Significant events and decision captures
- Compression ratio (markdown tokens / original tokens)

---

## Layer 2 — Yearly Aggregations

**Source:** `lib/shared/chronicle/synthesis/yearly_synthesizer.dart`

**VEIL stage:** INTEGRATE (synthesis into coherent developmental narrative)

### Generation Process

#### Step 1: Algorithmic Analysis (no inference)

Processes all 12 Layer 1 monthly aggregations for the year:

- **Chapter detection** — identifies chapters via phase transitions and theme shifts (regex-based extraction from monthly markdown)
- **Sustained patterns** — themes appearing in 6+ months
- **Inflection points** — months where SENTINEL changes exceed 0.3
- **Phase progression** — how ATLAS phases evolved across the year

#### Step 2: LLM Enrichment (inference)

One LLM call via `lumaraSend()`:

- **`_generateYearNarrative()`** — Synthesizes the "what happened this month" sections from all monthly aggregations into a 3–5 paragraph year-in-review. Preserves specifics: names, places, projects, events.

#### Output

Markdown file (e.g. `2025.md`) containing:

- Year narrative (LLM-generated)
- Chapters (algorithmically detected)
- Sustained patterns
- Inflection points
- Year-over-year comparison data

---

## Layer 3 — Multi-Year Aggregations

**Source:** `lib/shared/chronicle/synthesis/multiyear_synthesizer.dart`

**VEIL stage:** LINK (cross-temporal biographical connections)

### Generation Process

#### Step 1: Algorithmic Analysis (no inference)

Processes multiple Layer 2 yearly aggregations:

- **Life chapter detection** — identifies life chapters via chapter count changes and pattern overlap analysis
- **Meta-patterns** — themes appearing in 80%+ of years
- **Developmental arcs** — phase evolution and emotional intensity trends across years

#### Step 2: LLM Enrichment (inference)

One LLM call via `lumaraSend()`:

- **`_generateMultiYearNarrative()`** — Integrates yearly narratives into a coherent multi-year biographical narrative with throughlines and turning points.

#### Output

Markdown file (e.g. `2020-2024.md`) containing:

- Multi-year biographical narrative (LLM-generated)
- Life chapters
- Meta-patterns
- Developmental arcs

---

## Intelligence Summary (Alternative Layer 3)

**Source:** `lib/shared/chronicle/dual/services/intelligence_summary_generator.dart`

A separate synthesis path that pulls from all layers (0–3) plus LUMARA insights to produce a readable biographical intelligence summary. Uses Groq as primary LLM with Gemini fallback. Applies full PRISM scrubbing with PII restoration.

---

## PRISM Privacy During Synthesis

All Layer 1–3 LLM calls route through `lumaraSend()` in `lib/shared/services/gemini_send.dart`. Every call uses `skipTransformation: true`.

### What this means

The `lumaraSend()` pipeline has two privacy layers:

1. **PRISM PII scrubbing** — Replaces personally identifiable information (names, emails, phone numbers, addresses, etc.) with tokens like `[NAME_1]`, `[EMAIL_2]`
2. **Correlation-resistant transformation** — Rewrites the scrubbed text into an abstract semantic form to prevent cross-request correlation

During Chronicle synthesis, the pipeline executes as follows:

| Protection | Applied? | Why |
|---|---|---|
| PRISM PII scrubbing (tokenization) | **Yes** | PII must not reach the LLM |
| `isSafeToSend` security gate | **Yes** | Throws `SecurityException` if PII leaks through |
| Correlation-resistant transformation | **No** (skipped) | Would destroy specific details needed for useful summaries |
| PII restore in response | **Yes** | Maps tokens back to original values in the LLM response |

### Why transformation is skipped

Chronicle summaries need to preserve specific details — names, places, projects, events — to be biographically useful. The correlation-resistant transformation rewrites text into an abstract form (e.g. "a person discussed a project at a location") which would make summaries generic and useless for longitudinal memory.

Instead, synthesis uses the lighter PRISM path: the LLM sees `[NAME_1] met with [NAME_2] about the project` rather than a fully rewritten abstract version. After the LLM responds, `PiiScrubber.restore()` maps the tokens back to real values. The final stored summary on device contains the original specific details.

### Privacy summary

- **What the LLM sees:** PII-scrubbed text with placeholder tokens; no real names, emails, or identifying information
- **What is stored on device:** Full summaries with real details restored
- **What is never sent to cloud:** Raw Layer 0 entries (Hive, on-device only); reversible PII maps

---

## Data Flow

```
JOURNAL ENTRY
  │
  ▼
Layer0Populator.populateFromJournalEntry()
  │  Enriches with: phase history, SENTINEL scores, keywords, media
  │  No inference
  ▼
LAYER 0 (Hive, on-device)
  │  Raw entries with metadata
  │
  ▼  PatternDetector (algorithmic) + LLM (theme extraction + narrative)
LAYER 1 (Markdown: monthly/2025-01.md)
  │  ~28 entries → 10-20% compression
  │  PRISM scrub → LLM → PII restore
  │
  ▼  Chapter detection (algorithmic) + LLM (year narrative)
LAYER 2 (Markdown: yearly/2025.md)
  │  12 monthly aggregations → 5-10% compression
  │  PRISM scrub → LLM → PII restore
  │
  ▼  Life chapter detection (algorithmic) + LLM (biographical narrative)
LAYER 3 (Markdown: multiyear/2020-2024.md)
     Multiple yearly aggregations → 1-2% compression
     PRISM scrub → LLM → PII restore
```

### LLM Routing

All synthesis calls use `lumaraSend()` which routes:

- **Primary:** Groq
- **Fallback:** Gemini

---

## Scheduling

Synthesis runs as part of the **VEIL nightly cycle** via `VeilChronicleScheduler`:

1. **System maintenance** runs first (archive rotation, cache cleanup, RIVET snapshots)
2. **Narrative integration** runs second:
   - EXAMINE stage → monthly synthesis
   - INTEGRATE stage → yearly synthesis
   - LINK stage → multi-year synthesis

Which layers are synthesized depends on user tier:

| Tier | Monthly | Yearly | Multi-Year | Layer 0 Retention |
|------|---------|--------|------------|-------------------|
| Free | No | No | No | 0 days |
| Basic | Daily | No | No | 30 days |
| Premium | Daily | Weekly | No | 90 days |
| Enterprise | Daily | Weekly | Monthly | 365 days |

---

## Key Files

| Component | Path |
|-----------|------|
| Layer 0 storage | `lib/shared/chronicle/storage/layer0_repository.dart` |
| Layer 0 population | `lib/shared/chronicle/storage/layer0_populator.dart` |
| Monthly synthesis | `lib/shared/chronicle/synthesis/monthly_synthesizer.dart` |
| Yearly synthesis | `lib/shared/chronicle/synthesis/yearly_synthesizer.dart` |
| Multi-year synthesis | `lib/shared/chronicle/synthesis/multiyear_synthesizer.dart` |
| Pattern detection (algorithmic) | `lib/shared/chronicle/synthesis/pattern_detector.dart` |
| Synthesis orchestrator | `lib/shared/chronicle/synthesis/synthesis_engine.dart` |
| Aggregation storage (Layers 1–3) | `lib/shared/chronicle/storage/aggregation_repository.dart` |
| LLM routing + PRISM pipeline | `lib/shared/services/gemini_send.dart` |
| PRISM adapter | `lib/shared/arc/internal/echo/prism_adapter.dart` |
| PII scrubber/restorer | `lib/shared/services/lumara/pii_scrub.dart` |
| Intelligence summary (alt Layer 3) | `lib/shared/chronicle/dual/services/intelligence_summary_generator.dart` |
| VEIL scheduler | `lib/shared/echo/rhythms/veil_chronicle_scheduler.dart` |
| Narrative integration | `lib/shared/chronicle/integration/chronicle_narrative_integration.dart` |
| Layer viewer UI | `lib/shared/ui/chronicle/chronicle_layers_viewer.dart` |

---

*Last updated: April 9, 2026*
