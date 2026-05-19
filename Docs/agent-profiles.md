# Agent Profiles — Orbital AI / SwarmSpace

Tracks observed characteristics, failure modes, and onboarding rules for external AI agents used in implementation handoffs. Update after each benchmark or notable session.

**How to use:** When drafting a handoff prompt for a model, read its profile first. Apply the prompt rules. Route the output back to Claude for independent review on anything marked "unreliable self-review."

---

## Gemma 4

**Last benchmarked:** 2026-05-19 (round 1: submission gap task; round 2: mcp-docs benchmark)

**Scores:** Round 1: 8/12 — Round 2: 10/10

### Strengths
- Reliable spec-driven file creation
- Follows numbered instructions precisely
- Content accuracy (sections, tool lists, row counts) is consistently correct

### Failure modes
| Symptom | Condition | Fix |
|---|---|---|
| CSS variable drift | Given CSS values to re-derive rather than a file to copy | Give a reference file block to paste verbatim |
| `<p><ul>` nesting | Unconstrained HTML generation | Explicitly state: "Do not nest block elements inside `<p>` tags" |
| Unreliable self-review | Asked to verify its own output | Route output to independent reviewer — do not trust Gemma's ✅ |
| Writes to disk instead of outputting | Has write tool access | Expected behavior — Gemma acts agentically. Verify the file, don't wait for text output |

### Prompt rules
1. **CSS:** "Copy the `<style>` block from `[file].html` verbatim — do not rewrite it." Include the actual block inline.
2. **HTML:** "Do not nest block elements (`<ul>`, `<ol>`, `<table>`, `<pre>`, `<div>`) inside `<p>` tags."
3. **Review:** Always route Gemma output to Claude for independent verification before declaring done.

### Best for
Spec-driven file creation, content writing, following structured checklists

### Not for
Code audits, self-verification, tasks requiring judgment beyond the spec

---

## Kimi K2.6

**Last benchmarked:** 2026-05-19 (mcp-docs benchmark) + 2026-05-18 (cross-repo analysis)

**Scores:** mcp-docs: 10/10 (top semantic quality) — cross-repo analysis: 6/10

### Strengths
- Best semantic HTML of all models tested: uses `<thead>`/`<tbody>`, `<strong>` on keywords, `<code>` on identifiers including URLs
- Reads markdown formatting cues (backticks → `<code>`, bold → `<strong>`) more faithfully than other models
- Careful, deliberate output — rarely adds unrequested content

### Failure modes
| Symptom | Condition | Fix |
|---|---|---|
| Path case confusion | Analysis tasks involving case-sensitive file paths (macOS vs Linux) | Explicitly state canonical casing in the brief |
| Misreads symlinks | Repo analysis with symlinked directories | Call out symlink structure explicitly; tell Kimi which paths are symlinks |
| Vague ordering | Claude Code setup section: combines intro + follow-up paragraph rather than strict before/after pre block | Minor; not worth constraining unless order is critical |

### Prompt rules
1. **File paths:** Always state canonical casing explicitly (e.g. "`DOCS/` not `Docs/`").
2. **Symlinks:** Call out any symlinked directories before asking Kimi to traverse the repo.
3. **No special CSS constraint needed** — Kimi copies reference blocks faithfully.

### Best for
Spec-driven HTML, semantic markup, tasks where typographic precision matters

### Not for
Cross-repo analysis without explicit path + symlink guidance

---

## GLM 5.1

**Last benchmarked:** 2026-05-19 (mcp-docs benchmark — first runner, pre-benchmark-folder)

**Scores:** 10/10 (11/12 on original 6-dimension rubric — 1 point for writing to disk vs outputting text)

### Strengths
- Exact spec following — CSS copied verbatim, nav/footer exact, all content complete
- Accurate self-description — no false ✅ claims
- Takes agentic initiative appropriately

### Failure modes
| Symptom | Condition | Fix |
|---|---|---|
| Writes to disk rather than outputting text | Has write tool access | Expected behavior — GLM acts agentically. Specify output path in the brief |
| No `<thead>`/`<tbody>` | Table generation without semantic hint | Add "Use `<thead>` and `<tbody>` in all tables" to the brief if semantic HTML matters |

### Prompt rules
1. **Output path:** Always specify the exact file path in the brief when you want GLM to write to disk.
2. **Semantic tables:** Add explicit instruction if `<thead>`/`<tbody>` is required.

### Best for
Spec-driven implementation, file creation, accurate execution

### Not for
Tasks requiring text output rather than file writes (GLM will write to disk if it can)

---

## DeepSeek V4 Pro

**Last benchmarked:** 2026-05-19 (mcp-docs benchmark)

**Score:** 10/10

### Strengths
- High spec fidelity on content, structure, and CSS values
- Correct `<code>` usage on technical identifiers
- Clean, readable output

### Failure modes
| Symptom | Condition | Fix |
|---|---|---|
| CSS whitespace normalization | Copies CSS values correctly but reformats multi-line rules to single lines | Acceptable — values are identical; only matters if exact whitespace is required |
| No `<thead>`/`<tbody>` | Table generation | Add explicit instruction if semantic table structure matters |

### Prompt rules
1. No special constraints needed for CSS values — Pro copies them accurately.
2. Add "Use `<thead>` and `<tbody>` in all tables" if semantic HTML is required.

### Best for
Spec-driven implementation, complex structured documents

### Cost note
**See DeepSeek V4 Flash** — Flash produces identical output on doc generation tasks at lower cost. Default to Flash unless the task is reasoning-heavy.

---

## DeepSeek V4 Flash

**Last benchmarked:** 2026-05-19 (mcp-docs benchmark)

**Score:** 10/10 — **identical output to V4 Pro**

### Strengths
- Same output quality as V4 Pro on structured doc generation
- Significantly lower cost than Pro

### Failure modes
Same as V4 Pro (CSS whitespace normalization, no thead/tbody by default).

### Prompt rules
Same as V4 Pro.

### Best for
All doc generation tasks where V4 Pro would be used. Default to Flash for HTML, documentation, content tasks. Upgrade to Pro only for complex multi-step reasoning.

### Cost guidance
Use Flash as the default. Only escalate to Pro when the task requires multi-step reasoning, code logic, or architectural judgment.

---

## GPT OSS 120B

**Last benchmarked:** 2026-05-19 (mcp-docs benchmark)

**Score:** 9/10

### Strengths
- Strong structural compliance (CSS, nav, footer, section order)
- Content completeness is correct (all tools, all rows, callout)
- Clean, well-indented output

### Failure modes
| Symptom | Condition | Fix |
|---|---|---|
| Missing `<code>` on technical identifiers | Tool names, URLs, config keys in tables | Explicitly state: "Wrap all tool names, file paths, and URLs in `<code>` tags" |
| Missing `<viewport>` meta | Generating new HTML pages | Add to brief or include in the required `<head>` block |
| No `<thead>`/`<tbody>` | Table generation | Add explicit instruction |

### Prompt rules
1. **Code tags:** "Wrap all tool names, command names, file paths, and URLs in `<code>` tags."
2. **Viewport:** Include `<meta name="viewport" content="width=device-width, initial-scale=1.0">` in any required `<head>` block you provide.
3. **Semantic tables:** Add `<thead>`/`<tbody>` instruction if needed.

### Best for
Structured HTML generation with explicit constraints

### Not for
Tasks relying on implicit markdown-to-HTML inference (backtick → `<code>`)

---

## Benchmark History

| Task | Date | Gemma4 | Kimi K2.6 | GLM 5.1 | DS Pro | DS Flash | GPT OSS 120B |
|---|---|---|---|---|---|---|---|
| Submission gap (terms/docs/footer) | 2026-05-19 | 8/12 | — | — | — | — | — |
| `mcp-docs.html` generation | 2026-05-19 | 10/10 | 10/10 | 10/10 | 10/10 | 10/10 | 9/10 |

---

## Quick Onboarding Reference

When starting a new handoff, apply these rules unconditionally:

**All models:**
- Include the actual CSS/HTML block to copy, not a description of it
- Specify the exact output file path
- Include a "Definition of done" checklist

**Add for Gemma4:** HTML nesting constraint + route to Claude for review
**Add for Kimi K2.6:** Explicit file path casing + symlink callouts
**Add for GPT OSS 120B:** Code tag instruction + viewport in head block
**Add for any model:** `<thead>`/`<tbody>` instruction when semantic tables matter

---

*Last updated: 2026-05-19 — initial profiles from mcp-docs.html benchmark*
