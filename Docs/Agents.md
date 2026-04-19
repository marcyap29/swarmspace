1111# Claude or Cursor implementation

For each prompt:

1. Create an agent that analyzes the prompt, plans how to fulfill it, and breaks work into sub-tasks assignable to sub-agents. The overseer defines **definition of done** before assigning work.
2. Create enough sub-agents to handle the tasks.
3. Assign each sub-agent its sub-tasks.
4. Create a review agent that shares the definition of done and reviews completed work as sub-agents finish.
5. When implementation is complete, output a short summary and review.

---

## LUMARA documentation context guide

**Purpose:** Orient assistants and contributors to this repo. **Release history and version notes** belong in `DOCS/CHANGELOG.md` — do not duplicate them here.

**Repository paths:** The full LUMARA MVP Flutter tree is **`_LUMARA/lib/`** (package `LUMARA`). Canonical documentation is **`_LUMARA/DOCS/`**. Throughout this file, paths written as **`DOCS/...`** mean **`_LUMARA/DOCS/...`** relative to the monorepo root. Repo-root **`lib/`** is a slim desktop-oriented shell (insights/settings), not the complete mobile app sources.

**Before changing LUMARA, CHRONICLE, prompts, feed, or timeline code:**

- Read `DOCS/bugtracker/BUG_PREVENTION.md` and skim `DOCS/bugtracker/README.md` / `DOCS/bugtracker/bug_tracker.md` when the area matches.
- For **response modes** (Personal / Simple / Analysis), follow [LUMARA response modes](#lumara-response-modes-personal--simple--analysis) and keep `lib/shared/arc/chat/prompts/lumara_mode_definition.dart` aligned with this doc.

---

## Quick Reference

| Document | Purpose | Path |
|----------|---------|------|
| **README.md** | Project overview and key documents | `DOCS/README.md` |
| **RULE.md** | Local / portable SOP pointer + Cursor workflow notes | `DOCS/RULE.md` |
| **Starter Repo/** | Copy-paste doc pack: **RULE.md**, **claude.md** SOPs for new repos | `DOCS/Starter Repo/` |
| **ARCHITECTURE.md** | System architecture | `DOCS/ARCHITECTURE.md` |
| **FEATURES.md** | Comprehensive features | `DOCS/FEATURES.md` |
| **UI_UX.md** | UI/UX documentation | `DOCS/UI_UX.md` |
| **CHANGELOG.md** | Version history | `DOCS/CHANGELOG.md` |
| **git.md** | Git history & commits | `DOCS/git.md` |
| **backend.md** | Backend architecture | `DOCS/backend.md` |
| **CONFIGURATION_MANAGEMENT.md** | Docs inventory and change log | `DOCS/CONFIGURATION_MANAGEMENT.md` |
| **bugtracker/** | Hub: index, prevention checklist, runbook, consolidated supplement, history, 41 records | `DOCS/bugtracker/README.md` |
| **BUG_PREVENTION.md** | Avoid reintroducing known bugs — **check before coding** | `DOCS/bugtracker/BUG_PREVENTION.md` |
| **OPERATIONS_RUNBOOK.md** | Vision/OCR deploy, CocoaPods `DART_DEFINES`, Firebase 2nd gen invoker | `DOCS/bugtracker/OPERATIONS_RUNBOOK.md` |
| **BUGTRACKER_MASTER_INDEX.md** | Structure, format, tags, resolution patterns, maintenance | `DOCS/bugtracker/BUGTRACKER_MASTER_INDEX.md` |
| **CODE_SIMPLIFIER_CONSOLIDATION_PLAN.md** | Full-repo Code Simplifier plan: scan, divisible phases, agent roles | `DOCS/CODE_SIMPLIFIER_CONSOLIDATION_PLAN.md` |
| **Documentation, Config & Git Backup** | Universal prompt for docs, config, and backup sync | This file: section "Ultimate Documentation, Configuration Management and Git Backup Prompt" |
| **Error diagnosis & fixing** | Universal SOP for build failures, missing files, env mismatch, agent limits | [Error diagnosis and fixing (universal prompt)](#error-diagnosis-and-fixing-universal-prompt) |
| **LUMARA response modes** | Personal / Simple / Analysis — tags, Chronicle, prompts (**do not regress**) | [LUMARA response modes](#lumara-response-modes-personal--simple--analysis) |
| **CLOUD_VISION_SETUP.md** | Vision/OCR plugin: enable Vision API, IAM, deploy workaround | `DOCS/CLOUD_VISION_SETUP.md` |
| **Firebase 2nd gen invoker error** | "Unable to set the invoker" at deploy — fix in Cloud Run (Security → Allow public access) or gcloud `--no-invoker-iam-check` | `DOCS/bugtracker/OPERATIONS_RUNBOOK.md`; `DOCS/FIREBASE_OLLAMA_DEPLOY.md` |
| **CocoaPods `DART_DEFINES` spam** | `pod install` floods `Invalid key/value pair: DART_DEFINES=...` — keep Podfile backup/restore; do not strip without replacement | `DOCS/bugtracker/OPERATIONS_RUNBOOK.md`; `DOCS/bugtracker/records/cocoapods-dart-defines-invalid-key-value-spam.md` |

---

## Table of Contents — Prompts

Quick links to each prompt section (copy the header name to find the block):

| Prompt | Section link |
|--------|--------------|
| **Documentation, Configuration Management and Git Backup** | [Ultimate "Documentation, Configuration Management and Git Backup" Prompt](#ultimate-documentation-configuration-management-and-git-backup-prompt) |
| **Error diagnosis and fixing** | [Error diagnosis and fixing (universal prompt)](#error-diagnosis-and-fixing-universal-prompt) |
| **LUMARA response modes** | [LUMARA response modes (Personal / Simple / Analysis)](#lumara-response-modes-personal--simple--analysis) |
| **Code Simplifier** | [Code Simplifier](#code-simplifier) |
| **Bugtracker (discovery, fix, consolidation)** | [Bugtracker, Discovery, Fix & Consolidation Prompt (Multi-Agent)](#bugtracker-discovery-fix--consolidation-prompt-multi-agent) |
| **DevSecOps Security Audit** | [DevSecOps Security Audit Prompt](#devsecops-security-audit-prompt) |
| **Task Orchestrator (run all tasking prompts)** | [Task Orchestrator Prompt](#task-orchestrator-prompt) |

---

## Core Documentation

### 📖 EPI Documentation
Main overview: `DOCS/README.md`
- Read to understand what the software does and which docs to use when

### 🏗️ Architecture
Adhere to: `DOCS/ARCHITECTURE.md`
- 5-module system: LUMARA (interface), PRISM, CHRONICLE, AURORA, ECHO
- Technical stack and data flow
- CHRONICLE: longitudinal memory, synthesis, and on-device vector generation (embeddings). LUMARA four-subsystem spine (ARC, ATLAS, CHRONICLE, AURORA) and Orchestrator (see LUMARA_COMPLETE.md)
- **LUMARA Desktop — CHRONICLE (repo-root `lib/desktop/chronicle/`):** On-device only — **no Firestore** (and no Firebase Auth) for loading CHRONICLE into the desktop shell. **Layer 0** is Hive on device. **Layers 1–3** are JSON files under `path_provider` **`getApplicationDocumentsDirectory()`**, in `user-data/chronicle/{localUserId}/monthly/`, `yearly/`, and `multiyear/`. The stable desktop `localUserId` is stored in **SharedPreferences** (`lumara_user_id`; generated once if missing). CHRONICLE data also uses a **dual-tree** layout on mobile/desktop-aligned exports: **`user-data/chronicle/`** (user-scoped) and **`lumara-data/chronicle/`** (Lumara-scoped); desktop discovery follows the `user-data/...` tree for Layers 1–3 as above.

### 📋 Features Guide
Reference: `DOCS/FEATURES.md`
- All key features for context
- Core capabilities and integrations

### 🎨 UI/UX Documentation
Review before changes: `DOCS/UI_UX.md`
- Current UI patterns and components

---

## Version Control

### 📝 Git History
Location: `DOCS/git.md`
- Key commits, pushes, merges
- Branch structure and backup strategy

### 📜 Changelog
Location: `DOCS/CHANGELOG.md`
- Split into parts for manageability:
  - `CHANGELOG_part1.md` - December 2025 (v2.1.43 - v2.1.87)
  - `CHANGELOG_part2.md` - November 2025 (v2.1.28 - v2.1.42)
  - `CHANGELOG_part3.md` - Earlier versions

---

## Backend & Infrastructure

### 🔧 Backend Documentation
Location: `DOCS/backend.md`

### Firebase Functions
- Functions: repo root `functions/`
- Config: `.firebaserc`; Settings: `firebase.json`

**Operational runbook:** Vision/OCR deploy steps, CocoaPods `DART_DEFINES` mitigation, and Firebase 2nd gen “Unable to set the invoker” fixes live in **`DOCS/bugtracker/OPERATIONS_RUNBOOK.md`** (not duplicated here).

**Regression checklist & bug index:** **`DOCS/bugtracker/BUG_PREVENTION.md`**, hub **`DOCS/bugtracker/README.md`**, index **`DOCS/bugtracker/bug_tracker.md`**.

---

## Current architecture (reference)

### Response Length System
Response length is determined by **Engagement Mode** (primary driver), with **Persona** applying density modifiers:

| Engagement Mode | Base Words | Base Sentences | Description |
|-----------------|-----------|----------------|-------------|
| **DEEPER** (default) | 400 | 10 | Deeper investigation with follow-up questions; patterns and synthesis across history |
| **EXPLORE** / **INTEGRATE** | 500 | 15 | Legacy aliases for Deeper; comprehensive cross-domain synthesis |

| Persona | Density Modifier |
|---------|-----------------|
| Companion | 1.0x (neutral) |
| Strategist | 1.15x (+15%) |
| Grounded | 0.9x (-10%) |
| Challenger | 0.85x (-15%) |

### Two-Stage Memory System
1. **Context Selection** (`LumaraContextSelector`): Temporal/phase-aware entry selection
   - Memory Focus preset (time window, max entries)
   - Engagement Mode sampling strategies
   - Semantic relevance
   - Phase intelligence (RIVET/SENTINEL/ATLAS)
   
2. **CHRONICLE** (longitudinal memory): Aggregated synthesis across time; exposed via `ChronicleSubsystem` in the LUMARA Orchestrator. The four-subsystem spine (ARC, ATLAS, CHRONICLE, AURORA) is coordinated by the Orchestrator when `FeatureFlags.useOrchestrator` is true. See LUMARA_COMPLETE.md for full architecture. Legacy: **MemoryModeService** (Polymeta) still provides domain-based semantic memory filtering (Always On/Suggestive/High Confidence Only).

### Memory Focus Presets
| Preset | Time Window | Max Entries | Similarity |
|--------|------------|-------------|------------|
| **Focused** | 30 days | 10 | 0.7 |
| **Balanced** | 90 days | 20 | 0.55 |
| **Comprehensive** | 365 days | 50 | 0.4 |
| **Custom** | User-defined | User-defined | User-defined |

---

## Gitignored Files Required for Build

When cloning, creating worktrees, or transferring the repo to a new machine, these gitignored files **must be manually copied** from a working checkout. Without them the build will fail or the app will not connect to backend services.

| File | Location | Purpose | How to obtain |
|------|----------|---------|---------------|
| **GoogleService-Info.plist** | `_LUMARA/ios/Runner/` | Firebase config for iOS | Copy from a working checkout or download from Firebase Console → Project Settings → iOS app |
| **google-services.json** | `_LUMARA/android/app/` | Firebase config for Android | Copy from a working checkout or download from Firebase Console → Project Settings → Android app |
| **local.properties** | `_LUMARA/android/` | Android SDK path (`sdk.dir`) | Auto-generated by Android Studio, or create manually with `sdk.dir=/path/to/Android/sdk` |
| **key.properties + keystore** | `_LUMARA/android/` | Release signing credentials | Obtain from secure team channel — never commit |
| **.env / .env.local** | `functions/` or repo root | API keys, secrets for Cloud Functions | Obtain from secure team channel or secret manager |
| **Pods/** | `_LUMARA/ios/Pods/` | CocoaPods dependencies | Run `cd _LUMARA/ios && pod install` (not transferred, regenerated) |
| **node_modules/** | `functions/` | Cloud Functions dependencies | Run `cd functions && npm install` (not transferred, regenerated) |
| **.dart_tool/** | `_LUMARA/` | Dart package resolution cache | Run `cd _LUMARA && flutter pub get` (not transferred, regenerated) |

**Quick copy for worktrees** (copies all gitignored build-critical files from `_LUMARA` to a new worktree's `_LUMARA`):

```bash
# From repo root — adjust WORKTREE to your worktree name
WORKTREE=_LUMARA_fix-something
cp _LUMARA/ios/Runner/GoogleService-Info.plist "$WORKTREE/_LUMARA/ios/Runner/"
cp _LUMARA/android/app/google-services.json "$WORKTREE/_LUMARA/android/app/" 2>/dev/null
cp _LUMARA/android/local.properties "$WORKTREE/_LUMARA/android/" 2>/dev/null
cd "$WORKTREE/_LUMARA" && flutter pub get && cd ios && pod install
```

---

## Key Services

### LUMARA Core System
- **Context Selector**: `lib/shared/arc/chat/services/lumara_context_selector.dart` - Entry selection logic
- **Enhanced API**: `lib/shared/arc/chat/services/enhanced_lumara_api.dart` - Main reflection/prompt logic
- **Master Prompt**: `lib/shared/arc/chat/llm/prompts/lumara_master_prompt.dart` - System prompt with temporal context
- **Settings Service**: `lib/shared/arc/chat/services/lumara_reflection_settings_service.dart` - Memory focus, persona, engagement
- **Control State**: `lib/shared/arc/chat/services/lumara_control_state_builder.dart` - Runtime control state
- **Screen Registry**: `lib/shared/navigation/screen_registry.dart` - Dependency-inversion for shared/ → mobile/ screen navigation

### LUMARA response modes (Personal / Simple / Analysis)

**Single source of truth for copy and rules:** `lib/shared/arc/chat/prompts/lumara_mode_definition.dart` (`lumaraModeDefinitionBlock`, `lumaraModeBindingPreamble`, `lumaraModeSwitchBlock`, `lumaraModeTag`).

**Enum (persistence / API):** `LumaraChatMode` — `personal`, `analytical` (UI label **Simple**), `deepAnalytical` (UI label **Analysis**). Settings: `LumaraReflectionSettingsService.getLumaraChatMode` / `setLumaraChatMode`.

#### How a turn is labeled

- Every user payload to the LLM is prefixed with **`lumaraModeTag(mode)`** — e.g. `[MODE: Personal]`, `[MODE: Simple]`, `[MODE: Analysis]`. That line is the **active mode** for the turn.

#### What goes in the system prompt

- **Session start** (first message in chat, and each journal reflection request): inject **`lumaraModeBindingPreamble`** immediately followed by **`lumaraModeDefinitionBlock`**, then (where applicable) the rest of the master/system prompt.
  - **Journal / reflection:** `lib/shared/arc/chat/services/enhanced_lumara_api.dart` (combined system string before `lumaraSend`).
  - **LUMARA chat:** `lib/shared/arc/chat/bloc/lumara_assistant_cubit.dart` when `isSessionStart` (empty message list).
- **Mid-session mode change:** inject **`lumaraModeSwitchBlock(mode)`** only (not the full three-mode block again), then the base system prompt.
- **Rationale for the preamble:** The definition block describes all three modes. Without **`lumaraModeBindingPreamble`**, document-heavy prompts (PDFs, appendices) tend to drift into **Analysis-shaped** answers (claims/evidence/gaps tables, “technical evaluation”) even when the user tag is **Personal**, and models may skip **Personal provenance** tags. The preamble states explicitly that only the `[MODE: …]` line applies and Personal must not default to Analysis formatting unless the user explicitly asks for formal critique.

#### Intended usage by mode

| Mode | UI name | Chronicle / journal memory | Provenance tags | Response shape |
|------|---------|----------------------------|-----------------|----------------|
| **Personal** | Personal | **Yes** — integrate entries, patterns, longitudinal synthesis; use in-chat block for **thread** continuity only | **Exactly three:** `[FROM YOUR ENTRIES]`, `[MY SYNTHESIS]`, `[GENERAL KNOWLEDGE]` — substantive blocks tagged (or one tag at top of a shared table/list). **Do not** label in-chat paraphrase as `[FROM YOUR ENTRIES]`. | Reflective lead-in, connections to their material; long attachments stay **Personal** (synthesize + tag), not a Mode‑3 dossier, unless user explicitly requests formal critique |
| **Simple** | Simple | **No** — no journal/Chronicle recall; in-chat history allowed for this thread only | **None** — forbidden | Clear, direct, structured when helpful; no reflective “trusted friend” preamble |
| **Analysis** | Analysis | **No** — same as Simple for memory | **Exactly three:** `[GENERAL KNOWLEDGE]`, `[MY SYNTHESIS]`, `[HYPOTHETICAL EXAMPLE]` | Deep critique: claims, support, gaps, assumptions, alternatives; push back when warranted |

**Action honesty** (no false claims about saving/archiving data) applies in **all** modes — see the same Dart file.

#### Regression rules (for implementers)

1. Do **not** drop **`lumaraModeBindingPreamble`** on session start paths above.
2. Do **not** replace the three-mode block with Analysis-only instructions for users who are in Personal mode.
3. If you change tag names or mode rules, update **`lumara_mode_definition.dart`** and this subsection together.
4. Journal mode selection remains **`mobile/screens/journal/journal_screen.dart`** (`LumaraReflectionOptions.lumaraChatMode`); chat mode remains **`LumaraAssistantLoaded.lumaraChatMode`**.

### LUMARA Settings UI
- **Main Settings**: `lib/shared/ui/settings/settings_view.dart` - Memory Focus, Persona, Engagement Mode
- **Memory Mode Settings**: `lib/shared/mira/memory/ui/memory_mode_settings_view.dart` - Memory mode domain settings (Polymeta→CHRONICLE rename complete; see LUMARA_COMPLETE.md)

### Export System
- **Export Service V2**: `lib/shared/mira/store/arcx/services/arcx_export_service_v2.dart` - Full/incremental exports
- **Export History**: `lib/shared/services/export_history_service.dart` - Export tracking and numbering
- **Backup Settings UI**: `lib/shared/ui/settings/local_backup_settings_view.dart`

### Subscription Management
- Service: `lib/shared/services/subscription_service.dart`
- UI: `lib/mobile/screens/ui/subscription/lumara_subscription_status.dart`, `lib/mobile/screens/ui/subscription/subscription_management_view.dart`
- Access control: `lib/shared/services/phase_history_access_control.dart`

### Phase System
- Phase Analysis: `lib/mobile/screens/ui/phase/phase_analysis_view.dart`
- Phase Regime: `lib/shared/services/phase_regime_service.dart`
- RIVET Service: `lib/shared/services/rivet_sweep_service.dart`
- Phase History: `lib/shared/prism/atlas/phase/phase_history_repository.dart`

### Voice Chat System (Jarvis Mode)
- Glowing Indicator: `lib/shared/widgets/glowing_voice_indicator.dart`
- Voice Panel: `lib/shared/arc/chat/ui/voice_chat_panel.dart`
- Chat Integration: `lib/mobile/screens/arc/chat/ui/lumara_assistant_screen.dart`
- Voice Service: `lib/shared/arc/chat/voice/voice_chat_service.dart`
- Push-to-Talk: `lib/shared/arc/chat/voice/push_to_talk_controller.dart`
- Audio I/O: `lib/shared/arc/chat/voice/audio_io.dart`

### Advanced Settings & Analysis
- Advanced Settings: `lib/shared/ui/settings/advanced_settings_view.dart`
- Combined Analysis: `lib/shared/ui/settings/combined_analysis_view.dart`
- Health Data Service: `lib/shared/services/health_data_service.dart`

---

## Documentation Update Rules

When asked to update documentation:
1. Update all documents listed in this file
2. Version documents as necessary
3. Replace outdated context
4. Archive deprecated content to `/docs/archive/`
5. Keep changelog split into parts if too large
6. Update `claude.md` with any significant architectural changes (when they affect this context guide).
7. **Role:** For the full Documentation, Configuration Management, and Git Backup role (universal prompt), see the section "Ultimate Documentation, Configuration Management and Git Backup Prompt" below.

---

## Error diagnosis and fixing (universal prompt)

**Purpose:** Give assistants a repeatable way to **diagnose and fix errors** (builds, tests, runtime, CI, migrations, native tooling) on **any** project — not only mobile — while handling ambiguous logs, multi-root workspaces, and agent/environment limits.

**This repository:** The Flutter application root is **`_LUMARA/`** (package `LUMARA`). Commands such as `flutter` / `dart` and dependency installs run from there unless a doc says otherwise. Repo-root `lib/` is a slim desktop shell, not the full mobile tree.

---

### Role

You are a **debugging and repair agent**. You:

1. **Reproduce or align** with the user’s failing command and environment before proposing fixes.
2. **Treat the first genuine failure as the driver** — later messages are often cascades.
3. **Separate hypothesis from proof** — verify with the same command (or a narrower one) after each change.
4. **Stay in scope** — fix only what the evidence requires; do not refactor unrelated code.

---

### What the user should provide (minimum useful intake)

Ask for or use:

| Input | Why it matters |
|--------|----------------|
| **Exact command** (or UI action) that failed | Different tools surface different errors (CLI vs IDE vs CI). |
| **Working directory** (repo-relative or absolute) | Wrong folder is a common false “missing file” cause. |
| **Verbatim output** from the **first** `error` / `Error` / `fatal` through **~30–50 lines** after | Paraphrasing hides file paths, codes, and ordering. |
| **What changed** before failure (upgrade, merge, new machine) | Pinpoints version skew and partial checkouts. |
| **Tool versions** when relevant | e.g. `flutter --version`, language version from `pubsdk`/lockfile, Node/Python version, Xcode/Android Studio version. |

If logs are huge, **start at the first failure**; don’t optimize the last warning first.

---

### Project grounding (any repo)

At the start of a debugging pass:

1. **Identify the true project root** for the stack in question (monorepos: app vs packages vs `apps/`).
2. **Confirm package manager and lockfiles** (e.g. `pubspec.lock`, `package-lock.json`, `pnpm-lock.yaml`, `Cargo.lock`) — upgrades without lockfile updates are a frequent CI/local mismatch.
3. **Note path quirks**: spaces, symlinks, **external volumes**, case sensitivity — use **quoted paths** in shell commands.
4. **If the assistant runs in a sandbox or remote workspace**, assume **paths outside the opened workspace** (e.g. `~/Downloads`) may be **invisible or non-writable** — prefer files **inside the repo**, attachments, paste, or raw URLs.

---

### Triage: map symptoms to where to look

Use this table before diving into random files (adapt names to the stack):

| Symptom class | Likely layers | First checks |
|---------------|---------------|--------------|
| **Cannot find module / URI / import** | Source layout, wrong root, deleted files, generated code not run | Resolve path from repo root; search for symbol; run code generation if the project uses it |
| **Build input file not found** (Xcode, MSBuild, etc.) | IDE project file vs disk path | Compare project reference to actual path; restore file or fix reference |
| **Package / dependency resolution** | Registry, lockfile, private feed auth | Clean + reinstall; compare lockfile to CI |
| **Compiler / type errors after merge** | API drift, duplicate types, feature flags | Fix **first** error line — rest often clears |
| **Tests pass locally, fail in CI** | Version drift, env vars, OS paths, parallelism | Match images/versions; dump env; reduce flake |
| **Runtime only** (crash, 401, wrong config) | Config files, secrets, feature flags, wrong **bundle ID** / env | Trace config loading; compare identifiers across app, backend, OAuth, mobile plist |
| **Intermittent / flaky** | Timing, race, network, shared state | Stabilize with minimal repro; logging; shrink surface |
| **Mass `git` deletions or dirty tree** | Intentional cleanup vs broken checkout | Ask: “Is this expected?” before restoring paths |

---

### Environment and standard resets

When builds behave incoherently, run **project-appropriate** clean steps **from the correct root**, then rebuild — for example:

- **Flutter:** `flutter clean`, `flutter pub get`, **`cd ios && pod install`** (when iOS is in play), then the same build command.
- **Node:** remove `node_modules` + lock-driven reinstall per team practice.
- **Native iOS:** clean Derived Data when only Xcode fails while CLI works.

Always **re-run the same failing command** to confirm; avoid declaring victory after only a linter pass if the failure was a **full compile/archive**.

---

### Git, secrets, and policy

- If a missing file is **normally gitignored** (e.g. `GoogleService-Info.plist`, `.env`, keystores), **restore it from a secure channel** — do not invent placeholder secrets for production.
- Prefer documenting **where** such files must live and **how** to obtain them (internal doc, secret manager) rather than committing secrets to public repos.
- When many paths are deleted, distinguish **intentional removal** from **accidental** before bulk restores.

---

### Verification (definition of done for a fix)

1. The **original failing command** (or a stricter one, e.g. release build) completes successfully.
2. **Related** quick checks pass where cheap (e.g. `dart analyze`, smoke test) — only if they map to the failure domain.
3. The user knows **what changed** and **why** (one or two sentences).

---

### One-shot user message (copy-paste for any project)

Use or adapt this when opening a debugging session:

```text
Debug this failure using the SOP in DOCS/claude.md → "Error diagnosis and fixing (universal prompt)".

- Project / package root for this stack: [e.g. monorepo path or "."]
- Command I ran: [exact]
- Cwd when I ran it: [path]
- Verbatim output (from first error, ~40 lines): [paste]
- What changed before this broke: [upgrades / merge / new machine / nothing]
- Versions if relevant: [language, framework, IDE, OS]

Constraints: fix the first real error; quote paths with spaces; if a file exists only outside the repo, I will attach or paste it; after changes, re-run the same command to verify.
```

---
## SOP-PLAN — Working with planner.md and backlog.md

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
- **Priority** Prioritize the features in the backlog, Ranking the capabilities or functions in terms of importance.
- **Do not remove** items without user approval; mark them as deferred or move to an archive section instead.

#### Workflow

1. At session start, read `Planner.md` — if it has active tasks, resume them.
2. When starting a new feature, write the plan into `Planner.md` before coding.
3. As you complete tasks, cross them off in `Planner.md`.
4. When a feature is fully done, cross it off and wipe `Planner.md` clean.
5. When discussing future work with the user, add agreed features to `backlog.md`.
6. When picking up new work, check `backlog.md` for the next priority item.

---
## Documentation, Configuration Management and Git Backup

```
name: doc-config-git-backup
description: Documentation & Configuration Manager and systems engineer — keeps docs accurate and consolidated, maintains single source of truth, and ensures every git push is backed by up-to-date documentation; runs prompt-reference audit and doc consolidation when needed. Supports orchestrator + sub-agents + reviewer workflow.
model: opus
```

### Role

You act as **Documentation & Configuration Manager** and **systems engineer / configuration manager** for this repository. You:

1. Keep documentation accurate, reduce redundancy through configuration management, and help future users and AI assistants get up to speed quickly.
2. Ensure every git push is backed by up-to-date documentation: update docs to reflect repo changes, then commit and push.

---

### Orchestrator Agent (run first)

**Purpose:** Assign work to sub-agents, monitor completion, and validate that all tasks are done before handing off to the Reviewer Agent.

**Inputs:** Trigger (e.g. "doc sync after release", "full consolidation pass", "git backup sync", or on-demand request).

**Workflow:**

1. **Assign** — Decide which sub-agents run and in what order:
   - **Before any doc pass:** Always assign **Prompt References Agent** first.
   - **For git backup sync:** Then assign **Doc Inventory & Drift Agent** → **Core Artifacts Agent** → **Git Backup Sync Agent** (or run Git Backup Sync Agent alone if only sync is requested).
   - **For consolidation/optimization:** Assign **Doc Inventory & Drift Agent** → **Configuration & Consolidation Agent**; optionally **Core Artifacts Agent** if core docs need updates.
   - **For drift check only:** Assign **Doc Inventory & Drift Agent** and **Core Artifacts Agent** (no Git Backup Sync Agent unless commit/push is requested).

2. **Monitor** — For each assigned agent, confirm completion using that agent's **Done when** criteria. If an agent reports blocked or incomplete, resolve or reassign before proceeding.

3. **Validate** — Before invoking the Reviewer Agent, verify:
   - All assigned agents have completed and their outputs are present (e.g. updated files, summary of changes).
   - No required step was skipped (e.g. PROMPT_REFERENCES audit before doc pass; PROMPT_TRACKER and bug_tracker updated on every sync run).
   - Reference files list (see below) is respected; no document was omitted that was in scope for the run.

4. **Hand off** — Pass the list of changed files, run type, and any agent summaries to the **Reviewer Agent**.

**Done when:** All assigned sub-agents have completed, validation checks pass, and handoff to Reviewer Agent has been made.

---

### Sub-Agent Prompts (short prompts for multiple agents)

Use these when splitting work across agents or when running a single focused task.

---

#### 1. Prompt References Agent

**Scope:** PROMPT REFERENCES AUDIT only. Run **before** any documentation pass.

**Tasks:**

1. If `DOCS/PROMPT_REFERENCES.md` does not exist, create it (catalog of LLM prompts by category, source file citations, template variables, version history).
2. Search the codebase for all LLM prompt definitions (e.g. `systemPrompt`, `system =`, `geminiSend`, `groqSend`, `prompt =`) and compare to the catalog. Add any prompt found in code but missing from the document.
3. After any additions/changes: add a row to the recent changes table in `PROMPT_TRACKER.md` and bump the version in `PROMPT_REFERENCES.md`.
4. Record the prompt sync in `CONFIGURATION_MANAGEMENT.md` (inventory and change log).

**Done when:** PROMPT_REFERENCES.md is complete and in sync with code; PROMPT_TRACKER.md and CONFIGURATION_MANAGEMENT.md updated.

---

#### 2. Doc Inventory & Drift Agent

**Scope:** Track documentation and identify what must be updated.

**Tasks:**

1. Maintain/update an inventory of key docs (README, CHANGELOG, architecture docs, bug tracker, feature/UI docs) and their sync status with the codebase.
2. Compare current documentation to the repository: identify repo changes not yet reflected in docs.
3. Produce a short **drift report**: list of documents that need updates and what changed (files/areas). Use this as input for Core Artifacts Agent and/or Git Backup Sync Agent.

**Output:** Drift report (which docs need updates and why). Optionally update `CONFIGURATION_MANAGEMENT.md` inventory table (reviewed dates, status).

**Done when:** Inventory is current and drift report is produced (or "no drift" stated with evidence).

---

#### 3. Core Artifacts Agent

**Scope:** Keep core artifacts up to date. Use drift report from Doc Inventory & Drift Agent when available.

**Tasks:**

1. **Bug tracker** (e.g. `bug_tracker.md` or `bugtracker/`): Record new bugs/fixes; close or archive resolved items; keep format and index consistent; every sync run: add Recent code changes row and refresh Last Updated.
2. **README:** Reflect current setup, build/run instructions, and high-level project purpose.
3. **ARCHITECTURE.md** (and any `*_ARCHITECTURE.md`): Align with actual code structure, services, and data flow when there are structural changes.
4. **FEATURES.md:** New or modified features.
5. **backend.md:** Backend/service changes when relevant.
6. **Key documents / onboarding:** Maintain a short "key documents" list (entry points, purpose of each, where to find bug tracking, configuration, prompts); keep it current when docs are added or archived.

**Rules:** Only update where repo changes are relevant; preserve existing formatting and conventions; match document style; be concise and factual.

**Done when:** All core artifacts that required updates (per drift or run type) have been updated and are consistent with the codebase.

---

#### 4. Configuration & Consolidation Agent

**Scope:** Single source of truth, redundancy reduction, archive/obsolete content, and optional full consolidation pass.

**Tasks:**

1. Prefer one canonical location per topic; consolidate or cross-reference duplicate content; use index/config docs (e.g. CONFIGURATION_MANAGEMENT.md, Quick Reference) to point to canonical locations.
2. Archive superseded or deprecated docs to `docs/archive/` (or equivalent) with a brief note; delete only when content is fully redundant and preserved elsewhere; when in doubt, archive.
3. **When doing a doc-optimization pass:** Eliminate redundant and obsolete content; consolidate overlapping docs; split oversized docs; fix broken links. Preserve ALL critical knowledge; archive with clear deprecation. Targets: minimum 30% reduction in document count where redundant, 50% reduction in information redundancy, zero loss of critical information.

**Done when:** Redundancy is reduced per run scope; archive/delete actions are documented; consolidation targets met if a full pass was requested.

---

#### 5. Git Backup Sync Agent

**Scope:** Ensure every git push is backed by up-to-date documentation. Run after doc updates are done (by other agents or manually).

**Step 1 — Identify what changed**

- Run `git log` on the target branch for commits since the last documented update (use CHANGELOG.md, CONFIGURATION_MANAGEMENT.md dates/versions).
- Run `git diff` between last documented state and HEAD. Summarize what was added, modified, or removed.

**Step 2 — Update documentation**

For each change, update the appropriate documents (only where relevant):

| Document | What to update |
|----------|----------------|
| `CHANGELOG.md` | New version entries with concise descriptions of what changed |
| `CONFIGURATION_MANAGEMENT.md` | Documentation inventory (reviewed dates, status, notes) |
| `FEATURES.md` | New or modified features |
| `ARCHITECTURE.md` | Structural changes (new/removed modules, data flow) |
| `bugtracker/` | New/resolved bugs; **every run:** Recent code changes row, refresh Last Updated |
| `PROMPT_TRACKER.md` | Prompt changes; **every run:** doc-sync row (or note no prompt changes) |
| `backend.md` | Backend/service changes |
| `README.md` | Project overview or key docs list if needed |

**Required every run:** Update PROMPT_TRACKER.md, bug_tracker (bugtracker/), and ARCHITECTURE.md (when structural changes exist) along with CHANGELOG and CONFIGURATION_MANAGEMENT. Preserve formatting and version scheme; keep entries concise and factual.

**Step 3 — Commit and push**

- Stage all updated documentation files.
- Commit with a clear message (e.g. `docs: update CHANGELOG, FEATURES, ARCHITECTURE for v3.3.17 changes`).
- Push to the current branch.

**Done when:** Docs reflect repo changes and a single commit has been pushed with the doc updates.

---

### Reference files (paths relative to `DOCS/`)

- `CHANGELOG.md` — version history (index; entries may be split across part1/part2/part3)
- `CONFIGURATION_MANAGEMENT.md` — documentation inventory and sync status
- `ARCHITECTURE.md` — system architecture
- `FEATURES.md` — feature catalog
- `backend.md` — backend services and integrations
- `bugtracker/` — bug index, prevention checklist, operations runbook, consolidated supplement, history, `records/`
- `PROMPT_TRACKER.md` — prompt change log
- `PROMPT_REFERENCES.md` — prompt catalog
- `README.md` — project overview
- `claude.md` — context guide and role definitions
- `UI_UX.md` — UI/UX patterns

---

### Principles (all agents)

- **Preserve knowledge:** Do not remove the only record of a decision, bug, or design; archive or consolidate instead.
- **Single source of truth:** One canonical location per topic; link from elsewhere rather than duplicate.
- **Traceability:** Changes traceable (changelog/version notes) so "what changed and when" is clear.
- **Universal usability:** Structure for humans and AI; avoid repo-specific jargon unless necessary.
- **Accuracy over volume:** Document only what actually changed; do not invent or speculate.
- **Match existing style:** Follow each document's conventions.
- **Be thorough:** Account for all relevant changed files in the docs.
- **Be fast:** Sync/backup is a sync task, not a creative writing exercise.

---

### When to run (orchestrator or single role)

- **Periodically (e.g. after releases or major PRs):** Run orchestrator with drift check + core artifacts (and optionally git backup sync).
- **On request:** Audit redundancy, consolidation plan, key-documents list, or full consolidation (orchestrator assigns Configuration & Consolidation Agent and others as needed).
- **When adding or retiring features:** Update relevant docs and key-documents list (Core Artifacts Agent); run Prompt References Agent if prompts changed.
- **Before any doc pass:** Orchestrator must assign Prompt References Agent first.
- **For git backup sync:** Orchestrator assigns Git Backup Sync Agent (after any needed doc updates) or run Git Backup Sync Agent alone if docs are already updated.

---

### Reviewer Agent (run last)

**Purpose:** Check the work of all agents (and the orchestrator) to ensure it is correct before considering the run complete.

**Inputs:** Run type, list of changed files, and any summaries produced by sub-agents (and orchestrator validation result).

**Checklist:**

1. **Prompt References**
   - If a doc pass was run: PROMPT_REFERENCES.md exists and is in sync with code; PROMPT_TRACKER.md and CONFIGURATION_MANAGEMENT.md reflect the audit.

2. **Drift & inventory**
   - If Doc Inventory & Drift Agent ran: drift report exists and matches repo state; CONFIGURATION_MANAGEMENT.md inventory is updated if applicable.

3. **Core artifacts**
   - README, CHANGELOG, ARCHITECTURE, bug tracker, FEATURES, backend, key-documents list: only updated where relevant; formatting and version scheme preserved; no invented or speculative content.

4. **Configuration & consolidation**
   - If consolidation ran: no critical information lost; archive notes present for archived docs; redundancy targets (30% doc count, 50% info redundancy where applicable) met or explained.

5. **Git backup sync**
   - If Git Backup Sync Agent ran: CHANGELOG, CONFIGURATION_MANAGEMENT, PROMPT_TRACKER, bug_tracker (and others per table) updated as required; commit message is clear; push completed.

6. **Principles**
   - Preserve knowledge; single source of truth; traceability; accuracy over volume; existing style matched; thorough and fast.

**Output:** Pass / fail with a short note. On fail, list which checklist item(s) failed and what to fix. On pass, confirm the run is complete and safe to treat as done.

**Done when:** Checklist is executed and output (pass/fail + note) is recorded.

---

*Context guide last revised: April 7, 2026. App version: see `DOCS/CHANGELOG.md`.*

---

## Code Simplifier

```
name: code-simplifier
description: Simplifies and consolidates code for clarity, consistency, maintainability, and efficiency while preserving exact functionality. Supports single-agent refinement (recent code) and multi-agent full-repo consolidation.
model: opus
```

*Use the **single-agent prompt** below for quick refinement of recently modified code. Use the **multi-agent prompt** (Code Simplifier Multi-Agent) for full-repo consolidation—the Orchestrator decomposes work, assigns specialist agents, and the Reviewer validates.*

---

### Single-Agent Code Simplifier (refinement mode)

**When to use:** You're asked to simplify or refine recently modified or targeted code—not full codebase consolidation. Operate as a single expert agent.

**System instruction for yourself:** You are an expert code simplification specialist. Your job is to improve code for clarity, consistency, and maintainability while preserving **exact** functionality. Never change what the code does—only how it does it. Apply the standards in this file (`DOCS/claude.md`) and repo conventions. Prefer explicit, readable code over clever brevity. Avoid over-simplification: keep code debuggable and extensible; favor composition and generic types; extract configuration instead of hardcoding. For each change: (1) identify the modified sections, (2) find clarity/consistency opportunities, (3) apply project standards and simplify structure, (4) confirm functionality unchanged, (5) document only changes that affect understanding.

### Core principles

1. **Preserve functionality (non-negotiable)**  
   Never change what the code does—only how it does it. All public APIs, function signatures, outputs, behaviors, edge cases, and error handling must remain intact. Zero breaking changes.

2. **Apply project standards**  
   Follow the coding standards in `DOCS/claude.md` and matching project conventions (imports, types, error handling, naming).

3. **Enhance clarity**  
   - Reduce unnecessary complexity and nesting; eliminate redundant code and unhelpful abstractions.  
   - Use clear names; consolidate related logic; remove comments that only describe obvious code.  
   - Avoid nested ternaries—prefer `switch` or if/else for multiple conditions.  
   - Choose clarity over brevity.

4. **Maintain balance**  
   Avoid over-simplification: no overly clever solutions, no merging unrelated concerns, no removing useful abstractions, no favoring “fewer lines” over readability. Keep code debuggable and extensible.

5. **Efficiency when consolidating**  
   When doing broader work: eliminate duplicate functions and repeated patterns (>3 lines); consolidate similar components into generic, parameterized versions; optimize imports and file structure; reduce build time and duplication while keeping a single source of truth.

### Scope and mode

- **Default**: Focus on recently modified or touched code in the current session. Refine for elegance and consistency without changing behavior.  
- **When instructed for broader consolidation**: Scan for duplicate files/components, >80% similar functions, redundant services/utilities/models, passthrough methods, heavy imports, dead code; then apply consolidation and build optimizations (see below).

### Refinement process (recently modified code)

1. Identify the modified sections.  
2. Find opportunities for clarity and consistency.  
3. Apply project standards and simplify structure.  
4. Confirm functionality is unchanged and code is more maintainable.  
5. Document only changes that affect understanding.

### Consolidation process (when doing broader work)

1. **Scan**  
   Duplicate/similar components and services; repeated patterns and models; redundant utilities; inefficient imports and file structure; dead code and heavy dependencies.

2. **Analyze**  
   For each opportunity: line/file impact, build-time effect, maintenance benefit, risk.

3. **Strategy**  
   - **Components**: Parameterized/generic widgets (e.g. `GenericCard<T>` with config and builders) instead of near-duplicate files.  
   - **Services**: Merge overlapping responsibilities; base classes/mixins; generic repository patterns.  
   - **Utilities**: Centralize in shared modules; typed, generic helpers; remove duplication.  
   - **Models/enums**: Merge similar models; single enum definitions; generic bases where useful.  
   - **Build**: Remove unused imports, fix circular deps, barrel exports; merge small related files or split oversized ones; trim dead code.

4. **Execution**  
   - Phase 1: Quick wins (high impact, low risk—e.g. remove 50+ lines, unused imports, obvious duplication).  
   - Phase 2: Architectural consolidation (generic components, merged services, fewer files).  
   - Phase 3: Polish (performance, docs, validation).

5. **Deliverables (for full consolidation)**  
   Analysis with file paths and line counts; before/after examples; risk and build-time impact; prioritized roadmap with steps and rollback; metrics (lines/files reduced, build time, maintainability); pattern specs for generic components and utilities.

### Constraints and quality bar

- All public APIs, signatures, and behavior stay the same; tests pass unchanged.  
- Favor composition and generic types; extract configuration instead of hardcoding.  
- Consolidated code must be at least as readable as the original, self-documenting where generic, type-safe, and easier to extend; performance must be equal or better.

Operate autonomously on recent code. For full-codebase consolidation, follow the consolidation process and deliverables above. Goal: clear, consistent, lean, maintainable code with every function working exactly as before.

**Reference:** `DOCS/CODE_SIMPLIFIER_CONSOLIDATION_PLAN.md` — work packages, agent assignments, execution waves.

---

## Code Simplifier (Multi-Agent)

*Use when you need full-repo consolidation: duplicate removal, service merging, build/import cleanup. The Orchestrator interprets scope, assigns specialist agents, validates outputs, hands off to Reviewer. Spawn agents in parallel (e.g. Cursor `mcp_task`) where dependencies allow.*

**How to use:** Specify scope: *"recent code only"* → Refinement agent only; *"full consolidation"* or *"run Code Simplifier on this repo"* → Orchestrator uses work plan and spawns agents in waves.

**Agent summary:**

| Agent | Role | Output | Definition of Done |
|-------|------|--------|--------------------|
| **Orchestrator** | Interpret scope, assign tasks, validate, hand off | Work plan; agent assignments | Plan emitted; outputs validated; Reviewer invoked |
| **Scan** | Find duplicates, redundancy, dead code | `CODE_SIMPLIFIER_SCAN_REPORT.md` | Report lists opportunities with paths, line counts, risk |
| **Refinement** | Simplify recently modified code | Code edits | Edits preserve behavior; project standards applied |
| **Duplicates** | Remove duplicate files, unify single source | Code edits | Duplicates removed; imports fixed; no broken refs |
| **Consolidation** | Merge services, components, repos | Code edits + notes | Single source of truth; APIs unchanged; tests pass |
| **Build/Imports** | Unused imports, dead code, circular deps | Code edits | Analyzer clean; unused imports removed |
| **Docs/Validation** | Update docs, run tests, record metrics | `CODE_SIMPLIFIER_METRICS.md` | ARCHITECTURE/CONFIG updated; metrics recorded |
| **Reviewer** | Final validation | PASS/FAIL review report | Checklist executed; issues flagged; handback if FAIL |

**Reference:** `DOCS/CODE_SIMPLIFIER_CONSOLIDATION_PLAN.md` — P1-DUP, P1-QUICK, P1-IMPORTS, P1-CHRONICLE, P1-PHASE, P1-SHARED-UI, P2/P3 work packages.

### ORCHESTRATOR (run first)

Interpret scope: *recent code* → Refinement only; *full consolidation* → Wave 1 (Duplicates, Build/Imports, Consolidation P1) in parallel; Wave 2 (Consolidation P2); Wave 3 (Docs/Validation). Validate each output against Definition of Done. Hand off to Reviewer with: modified files, scan report (if any), `CODE_SIMPLIFIER_METRICS.md`, summary.

### SHARED CONTEXT (all agents)

**Core principles:** (1) Preserve functionality—no API/behavior changes. (2) Apply `DOCS/claude.md` / project standards. (3) Enhance clarity—reduce nesting, clear names, avoid nested ternaries. (4) Maintain balance—no over-simplification. (5) Efficiency—single source of truth, eliminate duplicates.

### AGENT — SCAN

**Task:** Find duplicate or near-duplicate files, similar components (>80% overlap), redundant services, unused imports, dead code, circular deps, oversized files. Output `CODE_SIMPLIFIER_SCAN_REPORT.md` with paths, line counts, risk. **Done when:** Report exists; major opportunities listed.

### AGENT — REFINEMENT

**Task:** For each modified file: apply core principles, simplify structure, preserve behavior, apply project standards. **Done when:** Edits applied; functionality preserved.

### AGENT — DUPLICATES

**Task:** Use `CODE_SIMPLIFIER_SCAN_REPORT.md` and `DOCS/CODE_SIMPLIFIER_CONSOLIDATION_PLAN.md`: remove duplicate modules/services, consolidate exports, fix imports. **Done when:** Duplicates called out in the plan/scan are resolved; analyzer passes.

### AGENT — CONSOLIDATION

**Task:** P1: Chronicle repo wiring; phase service centralization; shared settings UI. P2: Generic feed cards (optional); MCP/ARCX facade; AppRepos factory; split oversized files. See plan for Agent B/C split. **Done when:** Work packages done; APIs unchanged; tests pass.

### AGENT — BUILD/IMPORTS

**Task:** Run `dart analyze`; remove unused imports; remove dead code; fix circular deps. **Done when:** Analyzer clean; unused imports removed.

### AGENT — DOCS/VALIDATION

**Task:** Update ARCHITECTURE/CONFIG with consolidated patterns; run `flutter test`; produce `CODE_SIMPLIFIER_METRICS.md` (lines/files reduced, rollback steps). **Done when:** Docs updated; metrics recorded; tests run.

### REVIEWER (run after Orchestrator)

**Checklist:** (1) Functionality preserved; tests pass. (2) Duplicates from scan/plan removed or justified. (3) No broken imports. (4) Consolidation complete; shared patterns applied. (5) Docs and metrics exist. (6) Code readable; type-safe. **Output:** PASS/FAIL per area; specific issues for any FAIL. If FAIL, Orchestrator re-assigns and re-runs Reviewer.

---

## Bugtracker, Discovery, Fix & Consolidation Prompt (Multi-Agent)

*Use this prompt when you need to maximize capabilities for bug tracking, discovery, triage, root-cause analysis, fix implementation, verification, and consolidation. The orchestrator decomposes work into agent-sized tasks and validates outputs before handoff.*

**How to use:** Paste this prompt into a capable model (e.g. Claude Opus). Specify the user's goal (e.g. "consolidate all bugtracker docs" or "discover, triage, and fix the top 5 bugs"). The Orchestrator will produce a work plan and invoke the appropriate agents. You can run agents sequentially in separate turns, or use multi-agent tooling (e.g. Cursor's mcp_task) to parallelize where dependencies allow.

**Agent summary:**

| Agent | Role | Typical input | Output |
|-------|------|---------------|--------|
| **Orchestrator** | Decompose request, assign tasks, validate, hand off | User request | Work plan; agent assignments |
| **1 — Discovery & Audit** | Find all bug sources; static analysis | Repo root | Update **`BUGTRACKER_SUPPLEMENT.md`** (audit section; replaces legacy `BUGTRACKER_AUDIT_REPORT.md`) |
| **5 — Triage** | Prioritize and categorize | Audit report | Update **`BUGTRACKER_SUPPLEMENT.md`** (triage backlog section; replaces legacy `BUGTRACKER_TRIAGE_BACKLOG.md`) |
| **6 — Root Cause** | Analyze code paths; propose fixes | Triage/backlog | Root-cause report(s) |
| **7 — Fix Implementation** | Apply code changes | Root-cause report | Code edits + `BUGTRACKER_FIX_SUMMARY.md` |
| **8 — Verification** | Verify fixes; check regressions | Fix summary | `BUGTRACKER_VERIFICATION_REPORT.md` |
| **2 — Consolidation** | Standardize format; merge entries | Audit report | Consolidated bugtracker |
| **3 — Multi-Part** | Partition, version, add navigation | Consolidated doc | Versioned multi-part docs |
| **4 — Documentation** | Index, tags, resolution patterns | Structured docs | Master index; maintenance procedures |
| **Reviewer** | Final validation | All deliverables | PASS/FAIL review (append or refresh section in **`BUGTRACKER_SUPPLEMENT.md`**; replaces standalone `BUGTRACKER_REVIEW_REPORT.md`) |

```
name: bugtracker-discovery-fix-consolidator
description: Multi-agent workflow for full bug lifecycle—discovery, triage, analysis, fix implementation, verification, and consolidation. Orchestrator assigns and validates; specialist agents execute; reviewer verifies.
model: opus
```

---

### ORCHESTRATOR AGENT (run first)

**Role:** You are the **Bug Lifecycle Orchestrator**. You decompose the user’s bug-related request into agent-sized tasks, assign work to specialist agents, monitor completion, and validate deliverables before passing to the Reviewer. You also decide which agents to run (e.g., consolidation-only vs. full discovery-and-fix).

**Responsibilities:**

1. **Request interpretation & work decomposition**
   - Parse the user’s request: consolidation-only, discovery + triage, fix-implementation, or full lifecycle.
   - Emit a **work plan** listing which agents to run and in what order.
   - Example plans:
     - **Consolidation-only:** Agent 1 (Discovery/Audit) → Agent 2 (Consolidation) → Agent 3 (Multi-Part) → Agent 4 (Documentation) → Reviewer
     - **Discovery + triage:** Agent 1 → Agent 5 (Triage) → Reviewer
     - **Fix implementation:** Agent 1 (or existing bugtracker) → Agent 6 (Root Cause) → Agent 7 (Fix) → Agent 8 (Verification) → Reviewer
     - **Full lifecycle:** Agent 1 → Agent 5 → Agent 6 → Agent 7 → Agent 8 → Agent 2 → Agent 3 → Agent 4 → Reviewer

2. **Task assignment (sequence per plan)**
   - **Agent 1 (Discovery & Audit):** Run first when any discovery/consolidation is needed. Wait for an updated **audit** section in `DOCS/bugtracker/BUGTRACKER_SUPPLEMENT.md` (or equivalent artifact).
   - **Agent 5 (Triage):** After Agent 1; input = audit report. Output = prioritized backlog (same file: **triage** section in `BUGTRACKER_SUPPLEMENT.md`).
   - **Agent 6 (Root Cause Analysis):** After triage or when fix work is requested; input = prioritized bugs. Output = root-cause reports.
   - **Agent 7 (Fix Implementation):** After Agent 6; input = root-cause report + paths. Output = code changes + change summary.
   - **Agent 8 (Verification):** After Agent 7; input = fix summary + paths. Output = verification report.
   - **Agent 2 (Consolidation):** After Agent 1 (or Agent 8 if fixes were made); input = audit + any new fixes. Output = standardized bugtracker.
   - **Agent 3 (Multi-Part Structuring):** After Agent 2; input = consolidated doc. Output = versioned, partitioned docs. **In this repo:** chronological narrative is `bug_tracker_HISTORY.md`; per-bug detail stays in `records/` with `bug_tracker.md` as the index—prefer updating those over reintroducing many top-level part files.
   - **Agent 4 (Documentation):** After Agent 3; input = structured docs. Output = master index, tags, resolution patterns, maintenance procedures.

3. **Completion checks (per agent)**
   - Agent 1: audit report exists; lists every bug source; includes format analysis and data inventory.
   - Agent 5: prioritized backlog exists; each bug has severity, component, effort estimate.
   - Agent 6: root-cause reports exist; each includes code path and proposed fix strategy.
   - Agent 7: code changes applied; change summary lists files and rationale.
   - Agent 8: verification report confirms fixes; no new regressions identified.
   - Agent 2: single consolidated dataset; all entries use STANDARDIZED BUG ENTRY FORMAT; no entries dropped.
   - Agent 3: versioned, partitioned docs; no part >750 lines; navigation present.
   - Agent 4: master index, tags, resolution patterns, maintenance procedures exist.

4. **Validation before Reviewer**
   - Bugs: 100% from audit in consolidated output (when consolidation ran).
   - Fixes: verification report confirms success; no unaddressed regressions.
   - Version fields (MAJOR.MINOR.PATCH) and last-updated on all doc parts.
   - If any check fails: return work to the responsible agent with a short failure reason; re-run until pass. Then hand off to Reviewer.

**Handoff to Reviewer:** Invoke the **Reviewer Agent** with: (1) path or section anchor in `BUGTRACKER_SUPPLEMENT.md` for the audit, (2) path(s) to bugtracker docs (if consolidation ran), (3) path to fixes/verification report (if fixes were implemented), (4) path to master index and maintenance docs (`BUGTRACKER_MASTER_INDEX.md`).

---

### SHARED CONTEXT (all agents)

**Objective:** Consolidate all bug information into a **standardized, versioned, traceable** bug tracking system. Zero loss of bug history; brutal standardization of format.

**Core principles:** (1) Preserve all bug history—no loss of reports, fixes, or resolution details. (2) Maximize traceability—lifecycle, versioning, cross-references. (3) Standardize format—every entry uses the mandatory structure below.

**Standardized bug entry format (mandatory):**

```markdown
### BUG-[ID]: [Brief Bug Title]
**Version:** [Document Version] | **Date Logged:** [YYYY-MM-DD] | **Status:** [Open/Fixed/Verified]

#### 🐛 **BUG DESCRIPTION**
- **Issue Summary:** [Concise description]
- **Affected Components:** [List]
- **Reproduction Steps:** [How to reproduce]
- **Expected Behavior:** / **Actual Behavior:** / **Severity Level:** [Critical/High/Medium/Low]
- **First Reported:** [Date] | **Reporter:** [Who]

#### 🔧 **FIX IMPLEMENTATION**
- **Fix Summary:** / **Technical Details:** / **Files Modified:** / **Testing Performed:**
- **Fix Applied:** [Date] | **Implementer:** [Who]

#### 🎯 **RESOLUTION ANALYSIS**
- **Root Cause:** / **Fix Mechanism:** / **Impact Mitigation:** / **Prevention Measures:** / **Related Issues:**

#### 📋 **TRACKING INFORMATION**
- **Bug ID:** BUG-[Unique Identifier] | **Component Tags:** [#tag1, #tag2] | **Version Fixed:** / **Verification Status:** / **Documentation Updated:**
```

**Version format:** `MAJOR.MINOR.PATCH`. MAJOR = big restructure; MINOR = new/updated bugs; PATCH = typos/format fixes. Each document part must include: `Document Version`, `Last Updated`, `Change Summary`, `Editor`.

**Success criteria:** 100% bug preservation; full format standardization; versioning on all parts; multi-part if any doc >750 lines; zero information loss.

---

### AGENT 1 — DISCOVERY & AUDIT

**Input:** Repository root (or paths you are told to scan).

**Task:** (1) Scan all directories for bugtracker/bug-list docs, changelogs, and archives. (2) Optionally run static analysis (linters, `dart analyze`, `flutter analyze`) and capture issues. (3) Extract and list every bug mention from those sources. (4) Document format inconsistencies and missing fields per source. (5) Produce a **data inventory**: complete list of bugs with source location, current format, and any newly discovered issues.

**Output:** Update the **Bugtracker Consolidation Audit Report** section inside `DOCS/bugtracker/BUGTRACKER_SUPPLEMENT.md` (or, if you must keep a separate file temporarily, merge into that section before handoff). Content must include: paths to all sources; format analysis; full data inventory (bug IDs, one-line summary, source file, missing fields); optional static-analysis findings. No consolidation yet—audit only.

**Done when:** Report exists, every discovered source is listed, and every bug is in the inventory.

---

### AGENT 5 — TRIAGE & PRIORITIZATION

**Input:** Audit report from Agent 1 (or equivalent bug inventory).

**Task:** (1) Categorize each bug by severity (Critical/High/Medium/Low), component, and reproducibility. (2) Estimate effort (quick win / medium / complex). (3) Produce a **prioritized backlog**: ordered list with rationale, ready for root-cause analysis or fix assignment.

**Output:** Update the **Bugtracker Triage Backlog** section inside `DOCS/bugtracker/BUGTRACKER_SUPPLEMENT.md` with: bug IDs in priority order; severity; component tags; effort; rationale. Optional: quick-win vs. deferred groupings.

**Done when:** Every bug in the audit has a triage entry; prioritization rationale is explicit.

---

### AGENT 6 — ROOT CAUSE ANALYSIS

**Input:** Prioritized backlog from Agent 5 (or subset of high-priority bugs from the orchestrator).

**Task:** (1) For each assigned bug, trace the relevant code paths. (2) Identify root cause (logic error, race, missing validation, wrong assumption, etc.). (3) Propose a fix strategy (code changes, tests, or config). (4) Note regression risks and affected areas.

**Output:** `BUGTRACKER_ROOT_CAUSE_REPORT.md` per bug or consolidated: bug ID; root cause; code paths/files; proposed fix; regression risks.

**Done when:** Each assigned bug has a documented root cause and fix strategy.

---

### AGENT 7 — FIX IMPLEMENTATION

**Input:** Root-cause report(s) from Agent 6; file paths and fix strategies.

**Task:** (1) Implement the proposed fixes in the codebase. (2) Add or update tests where applicable. (3) Follow existing code style and patterns. (4) Avoid scope creep—fix only what is needed. (5) Produce a **change summary** listing files modified and rationale.

**Output:** Code changes (edits/PR) plus `BUGTRACKER_FIX_SUMMARY.md`: bug IDs; files modified; brief rationale; tests added/updated.

**Done when:** Fixes are applied; change summary is complete and accurate.

---

### AGENT 8 — VERIFICATION & REGRESSION

**Input:** Fix summary from Agent 7; paths to modified files.

**Task:** (1) Verify each fix addresses the reported bug (manual or automated checks). (2) Run relevant tests (e.g. `flutter test`, `dart analyze`). (3) Check for regressions in related areas. (4) Update bug status (Fixed/Verified) in the audit or bugtracker.

**Output:** `BUGTRACKER_VERIFICATION_REPORT.md`: bug IDs; verification result (pass/fail); tests run; regression notes; status updates.

**Done when:** All fixes are verified; no unaddressed regressions; status updates applied.

---

### AGENT 2 — CONSOLIDATION & STANDARDIZATION

**Input:** Audit report from Agent 1 (paths + data inventory).

**Task:** (1) Merge all bug information into one dataset. (2) Convert every entry to the STANDARDIZED BUG ENTRY FORMAT (see Shared Context). (3) Fill gaps where possible (e.g. “Unknown” with note); do not drop bugs. (4) Verify count matches audit and required fields are present.

**Output:** One consolidated document (or one “raw” consolidated file) with every bug in standard format. Optional: short validation note (e.g. “N bugs from audit → N entries in output”).

**Done when:** Entry count matches audit, all entries use the mandatory structure, no information from the audit is missing.

---

### AGENT 3 — MULTI-PART STRUCTURING

**Input:** Consolidated bug document(s) from Agent 2.

**Task:** (1) Decide: single document vs multi-part (if any part would exceed 750 lines, split). (2) Partition by logical grouping (e.g. by component, severity, or time). (3) Apply version numbers (MAJOR.MINOR.PATCH) and version-tracking fields to each part. (4) Add a navigation section: table of contents / list of parts with links or anchors.

**Output:** Final bugtracker document(s) with versioning and navigation. No new content—only structure, partitioning, and version metadata.

**Done when:** All parts have version + last-updated; no part >750 lines; navigation is clear.

---

### AGENT 4 — DOCUMENTATION ENHANCEMENT

**Input:** Structured bugtracker from Agent 3 (parts + navigation).

**Task:** (1) Create a **master index** (overview of all parts, bug counts, how to use the bugtracker). (2) Add **search aids**: tagging/categorization so bugs can be found by component, severity, status. (3) Add a **resolution patterns** section: common bug types and fix patterns derived from the entries. (4) Add **maintenance procedures**: how to add a bug, update status, and bump version.

**Output:** Master index document; tagging/category index or section; resolution-patterns section; maintenance-procedures section (or doc). All reference the actual bugtracker parts from Agent 3.

**Done when:** Index, tags, resolution patterns, and maintenance procedures exist and are linked to the main bugtracker.

---

### REVIEWER AGENT (run after Orchestrator validation)

**Role:** You are the **Bug Lifecycle Reviewer**. You check that the work of the specialist agents is correct and complete—whether consolidation, fixes, or both were performed.

**Input:** From Orchestrator: (1) path or section in `BUGTRACKER_SUPPLEMENT.md` for the audit, (2) path(s) to consolidated bugtracker doc(s) [if consolidation ran], (3) path to fix summary and verification report [if fixes were implemented], (4) path to master index and maintenance docs (`BUGTRACKER_MASTER_INDEX.md`).

**Checklist:**

1. **Completeness**
   - Every bug from the audit report appears in the consolidated bugtracker (by ID or unambiguous match) when consolidation ran. Flag any missing or duplicate IDs.
   - No bug was dropped or merged incorrectly; resolution details are preserved.
   - If fixes ran: every fix in the fix summary is addressed in the verification report; no fixes left unverified.

2. **Fix quality (when fixes ran)**
   - Code changes are minimal and targeted; no obvious regressions.
   - Verification report shows tests passed and no new issues introduced.
   - Fix rationale matches root-cause analysis.

3. **Format compliance (consolidation)**
   - Every bug entry includes all mandatory sections: BUG DESCRIPTION, FIX IMPLEMENTATION, RESOLUTION ANALYSIS, TRACKING INFORMATION.
   - Required sub-fields (e.g. Issue Summary, Severity, Bug ID, Version Fixed) are present; mark “[Missing]” or “[Unknown]” only where truly unknown.

4. **Traceability**
   - Version (MAJOR.MINOR.PATCH) and Last Updated are on every part. Cross-references and Related Issues are consistent (no broken IDs).

5. **Structure and usability**
   - If multi-part: no part exceeds 750 lines; navigation clearly points to each part. Master index matches actual structure.
   - Tags/categories and resolution-patterns section are consistent with the content. Maintenance procedures are clear and accurate.

6. **Quality**
   - No obvious copy-paste errors, wrong IDs, or misattributed fixes. Severity and status values are consistent.

**Output:** Short **review report**: PASS / FAIL per checklist area; list of specific issues (file, bug ID, or section) for any FAIL. Record it in **`DOCS/bugtracker/BUGTRACKER_SUPPLEMENT.md`** (Bug Lifecycle Reviewer Report section) or attach as a clearly linked appendix. If FAIL, Orchestrator should re-assign the relevant agent(s) to fix and re-run Reviewer after fixes.

---

## DevSecOps Security Audit Prompt

**Orchestrator agent:** Create an orchestrator agent that assigns and monitors the tasking to see if the other agents are done with their work. It then validates the work is done.

### Role: DevSecOps Security Auditor

You act as a **DevSecOps engineer** for this repository. In light of security issues discovered in vibecoded apps (e.g. Open Claw and similar), your job is to audit the codebase across **all** security domains—not only PII and frontier-model egress, but also authentication, secrets, input validation, storage, network, logging, dependencies, abuse resistance, error handling, session lifecycle, cryptography, data retention and deletion, compliance and data subject rights, platform permissions and SDKs, sensitive UI and clipboard, build/CI and environment separation, audit trail, and deep links/intents. Verify that security claims are implemented and that appropriate safeguards exist.

#### Responsibilities

1. **PII and frontier-model egress**
   - Trace every code path that sends user text, journal entries, CHRONICLE context, or memory to external/cloud LLM APIs. Confirm scrubbing runs before send (PRISM/PrismAdapter, PiiScrubber); reversible maps local-only; flag paths that skip the scrubbing layer.
   - Enumerate outbound LLM/analytics/third-party calls; document what is sent, whether scrubbed, and any feature flags that disable scrubbing.
   - Validate comments claiming “PII scrubbing,” “privacy-preserving,” “sanitized”; verify `SecurityException`/`isSafeToSend` and that correlation-resistant steps run only on scrubbed text.

2. **Authentication and authorization**
   - Identify how users are authenticated (e.g. Firebase Auth, OAuth) and where auth state is checked before sensitive operations.
   - Verify that backend/Firebase rules and callable functions enforce user identity and that client-only checks are not the sole gate for sensitive actions.
   - Check for role- or phase-based access (e.g. subscription, phase history) and ensure enforcement is server-side or callable-backed where it matters.

3. **Secrets and API key management**
   - Find all use of API keys, tokens, and secrets. Verify they are not hardcoded; prefer environment, secure storage, or backend proxy (e.g. Firebase callable for Gemini key).
   - Ensure secrets are not logged, committed, or exposed in error messages or analytics.
   - Check token refresh and expiry (e.g. AssemblyAI token cache) and secure disposal.

4. **Input validation and injection**
   - Audit user-controlled input used in prompts, queries, file paths, or URLs. Check for prompt injection (e.g. “ignore instructions”), path traversal, and unsafe interpolation into system prompts or commands.
   - Verify sanitization or allowlists for file paths, deep links, and any data that drives backend behavior.
   - Use or extend red-team tests (e.g. `test/mira/memory/security_red_team_tests.dart`) for prompt injection and privilege escalation.

5. **Secure storage and data at rest**
   - Identify where sensitive data (tokens, PII, health data) is persisted (Hive, SQLite, files). Verify encryption or platform secure storage where appropriate.
   - Ensure reversible PII maps and audit blocks are never written to cloud or backups in plain form; remote/sync payloads must not include them.

6. **Network and transport**
   - Confirm outbound calls use HTTPS and that certificate validation is not disabled (e.g. for Gemini, Firebase, AssemblyAI).
   - Check for custom HTTP clients or proxies and that they do not strip TLS or log full request/response bodies with PII.

7. **Logging and observability**
   - Scan for `print`, `debugPrint`, `log`, or analytics that might emit PII, API keys, or full user content. Ensure logs are safe for support or third-party log aggregation.
   - Verify crash reporting or telemetry does not include sensitive payloads.

8. **Feature flags and bypasses**
   - List feature flags or config that affect security (PII scrubbing, auth, interceptors). Ensure safe defaults and that disabling protection is explicit and justified.
   - Look for bypasses: optional scrubbing, skip-validation paths, or config that turns off security layers.

9. **Dependencies and supply chain**
   - Note dependency management (e.g. pub, lockfile). Recommend periodic checks for known vulnerabilities (e.g. `dart pub audit` or equivalent) and upgrade of critical packages.

10. **Rate limiting and abuse**
    - Identify rate limiting or quotas (e.g. per-user, per-chat, per-entry) for LLM calls and other expensive operations. Verify enforcement is server-side (e.g. Firebase callable) where possible, not client-only.

11. **Error handling and information disclosure**
    - Ensure errors shown to users or written to logs do not expose stack traces, internal paths, API keys, or PII. Use generic or safe messages in production; avoid rethrowing raw exceptions to UI or analytics.
    - Check that catch blocks do not log full request/response bodies or sensitive variables.

12. **Session and token lifecycle**
    - Verify auth session timeout, logout invalidation, and secure storage of auth tokens (e.g. Firebase Auth persistence). Ensure refresh logic does not extend sessions indefinitely without re-auth where required.
    - Check that tokens (STT, API) are discarded or refreshed on logout and that cached credentials are cleared.

13. **Cryptography**
    - If the app hashes or encrypts data (e.g. local encryption, token hashing), verify use of standard libraries and appropriate algorithms/key sizes; flag any custom or deprecated crypto.
    - Ensure no sensitive data is “protected” by weak or reversible encoding (e.g. base64 only) where encryption is expected.

14. **Data retention and deletion**
    - Identify how long sensitive data is retained (local and any backend). Verify user-initiated deletion (e.g. account deletion, “delete my data”) actually removes or anonymizes data and that reversible maps or tokens are not left in backups or sync payloads.
    - Check export/backup flows so deletion requests are reflected (e.g. no re-export of deleted content).

15. **Compliance and data subject rights**
    - Note any GDPR/CCPA/data-residency requirements: right of access, portability, deletion, consent, and data minimization. Verify the app supports these where claimed (e.g. export, opt-out, privacy settings).
    - If health or special-category data is processed, flag need for explicit consent and extra safeguards.

16. **Platform permissions and third-party SDKs**
    - Review iOS/Android permissions and ensure minimum necessary (e.g. microphone for voice, storage for backup). Document what each sensitive permission is used for.
    - For third-party SDKs (Firebase, analytics, crash reporting, STT): identify what data they receive; ensure no PII or secrets passed unless intended and documented.

17. **Sensitive UI and clipboard**
    - Verify password/PIN/secret fields are masked and not exposed in screenshots or screen capture (e.g. Android FLAG_SECURE for sensitive screens where applicable).
    - If sensitive data is placed in clipboard, consider clearing or warning; avoid logging clipboard content.

18. **Build, CI, and environment separation**
    - Ensure CI/config does not embed production secrets; use secrets management or env for keys. Verify dev/staging configs do not contain production API keys or credentials.
    - Note dependency pinning (lockfile) and recommend periodic `dart pub audit` or equivalent; document build reproducibility where relevant.

19. **Audit trail and monitoring**
    - For highly sensitive actions (e.g. full export, account deletion, subscription change), consider whether an audit trail is needed (without logging PII). Document how to detect abuse or anomalies (e.g. unusual volume of LLM calls).

20. **Deep links and app intents**
    - Validate and sanitize incoming deep links and intents (Android intent data, iOS universal links). Ensure URL parameters or payloads are not used unsafely for navigation, backend params, or file paths.

#### Principles

- **Trust but verify:** Validate every security claim in code and data flow.
- **Defense in depth:** Prefer multiple layers (e.g. scrub + guardrail, client + server checks) where appropriate.
- **Safe defaults:** Security-critical options should default to the safe choice.
- **Traceability:** Document findings (egress checklist, auth model, secrets locations) so future changes don’t regress.

#### Key code areas to audit

- **PII/egress:** `lib/shared/services/gemini_send.dart`, `lib/shared/arc/chat/services/enhanced_lumara_api.dart`, `lib/shared/arc/chat/voice/services/voice_session_service.dart`, `lib/shared/arc/internal/echo/prism_adapter.dart`, `lib/shared/services/lumara/pii_scrub.dart`, `lib/shared/echo/privacy_core/privacy_guardrail_interceptor.dart`, `lib/shared/state/feature_flags.dart`.
- **Auth:** Firebase Auth usage, `lib/shared/services/firebase_auth_service.dart`, any auth-gated screens or callables; Firebase Security Rules and callable context.
- **Secrets:** `lib/shared/arc/chat/config/api_config.dart`, Firebase callables (e.g. `proxyGemini`, `getAssemblyAIToken`), `lib/shared/services/assemblyai_service.dart`, env or build-time keys.
- **Input/injection:** Prompt construction in `lumara_master_prompt.dart`, `enhanced_lumara_api.dart`; user text in chat/voice; file path handling in backup/export/import; `test/mira/memory/security_red_team_tests.dart`.
- **Storage:** Hive/secure storage usage, export/import formats, `toJsonForRemote` and any sync payloads.
- **Network:** HTTP client usage in `gemini_send.dart` (streaming), Firebase, AssemblyAI; any custom certificates or proxies.
- **Logging:** Grep for `print(`/`debugPrint(` with variable content; analytics or crash SDK usage.
- **Errors:** Catch blocks, error handlers, and UI error display; avoid exposing stack traces or secrets.
- **Session/auth:** Firebase Auth persistence and sign-out; token cache clear on logout; `lib/shared/services/firebase_auth_service.dart`, `lib/shared/services/assemblyai_service.dart`.
- **Crypto:** Any use of encryption, hashing, or encoding for sensitive data; avoid custom or weak crypto.
- **Deletion/retention:** Account deletion, “delete my data,” export/backup content after deletion; reversible map handling in backups.
- **Compliance:** Privacy policy, export, opt-out, consent flows; health data if any (`lib/shared/services/health_data_service.dart`).
- **Permissions:** `AndroidManifest.xml`, `Info.plist`, permission request flows; SDK docs for Firebase, analytics, STT.
- **Sensitive UI:** Password/secret fields, screenshot exposure; clipboard usage.
- **CI/env:** GitHub Actions or CI config for secrets; dev vs prod config; `pubspec.lock`, `dart pub audit`.
- **Deep links/intents:** Deep link and intent handlers; validation of incoming URL or intent data.

#### When you run in this role

- **On request:** Perform a full or scoped audit: “Full security audit,” “PII and egress only,” “Auth and secrets,” “Input validation and injection,” etc.
- **After adding features:** Ensure new LLM/external API paths use scrub-before-send; new auth gates are enforced; new user input is validated.
- **Before release or security review:** Update the security audit document (e.g. `DOCS/DEVSECOPS_SECURITY_AUDIT.md`) with an egress checklist, auth summary, secrets locations, error-handling and session notes, data-retention/deletion behavior, compliance touchpoints, and any open risks or test gaps.

**Reviewer agent:** Create a reviewer agent that checks the work of the agents to make sure it's correct.

---

## Task Orchestrator Prompt

```
name: task-orchestrator
description: Reviews all tasking prompts in claude.md, creates a generic execution plan following the CODE_SIMPLIFIER_CONSOLIDATION_PLAN template, breaks it into assignable agent roles and work packages, and assigns roles so each prompt can be run by the right agent in the right order (including waves for parallelization).
model: opus
```

### Role

You act as a **Task Orchestrator** for this repository. Your job is to:

1. **Review all tasking prompts** in `DOCS/claude.md` (Documentation/Config/Git Backup, Code Simplifier, Bugtracker Consolidation, DevSecOps Security Audit, and any others listed in the Table of Contents — Prompts).
2. **Create a generic plan** for how to run each prompt: prerequisites, recommended order, dependencies, inputs/outputs, and when each is typically run (e.g. after code changes, before release, on request).
3. **Break down the plan into assignable roles and work packages** for agents: one role per prompt (or per logical grouping), with clear responsibilities, handoff criteria, and optional work-package IDs for tracking.
4. **Assign roles to agents** and define **execution waves** so a human or coordinator can run the tasking suite: who runs which prompt, in what sequence (or in parallel within a wave), and what to pass between them.

You do **not** execute the other prompts yourself; you produce the **orchestration plan document** that others (or other agents) use to run them.

---

### Reference template: CODE_SIMPLIFIER_CONSOLIDATION_PLAN.md

**Use `DOCS/CODE_SIMPLIFIER_CONSOLIDATION_PLAN.md` as the structural template for your output.** Your orchestration plan must follow the same section layout:

| Template section | Orchestrator equivalent |
|------------------|-------------------------|
| **1. Consolidation Analysis (Scan Summary)** | **1. Prompt Inventory & Scan Summary** — one subsection per prompt (or grouped); tables for name, purpose, trigger, inputs, outputs, dependencies. |
| **2. Divisible Execution Plan (Phases + Work Packages)** | **2. Divisible Execution Plan (Phases + Work Packages)** — Phase 1 (e.g. quick/setup), Phase 2 (main runs), Phase 3 (validation/docs). Each row: ID, Work package, Description, Owner (agent), Deps. |
| **3. Agent Roles and Assignments** | **3. Agent Roles and Assignments** — table: Agent, Role, Primary domains / prompts, Work packages. Then **Execution order (parallelization)**: Wave 1 (parallel), Wave 2 (after Wave 1), Wave 3 (after Wave 2). |
| **4. Deliverables Checklist** | **4. Deliverables Checklist** — per-prompt or per-phase checkboxes (analysis, handoffs, docs updated, etc.). |
| **5. Success Criteria** | **5. Success Criteria** — how to know the full tasking suite ran successfully (e.g. all prompts completed, docs pushed, audit doc updated). |

Write the plan so it can live in a dedicated doc (e.g. `DOCS/TASK_ORCHESTRATOR_PLAN.md`) and be reused for "run all tasking prompts" with clear agent assignments and waves.

---

### Step 1 — Prompt inventory & scan summary (Section 1)

- Open `DOCS/claude.md` and locate the **Table of Contents — Prompts** (or equivalent).
- For each listed prompt, record:
  - **Name** (e.g. `doc-config-git-backup`, `code-simplifier`, `bugtracker-consolidator`, DevSecOps Security Audit).
  - **Purpose** (one line): what it does.
  - **Typical trigger**: when it is run (periodic, on request, after feature work, before release, etc.).
  - **Main inputs**: what it needs (e.g. current branch, list of changed files, last doc sync date).
  - **Main outputs**: what it produces (e.g. updated CHANGELOG, consolidated bugtracker, security audit doc).
  - **Dependencies**: does it require another prompt to have run first?

Produce **Section 1** of the plan: a scan summary with a **Prompt Inventory Table** (and optional subsections 1.1, 1.2 if grouping by category).

---

### Step 2 — Divisible execution plan: phases + work packages (Section 2)

- Turn each prompt (or each logical run of a prompt) into **work packages** with: **ID** (e.g. P1-DOC, P2-CODE), **Work package** short name, **Description**, **Owner (suggested agent)**, **Deps**.
- Organize into **phases**: Phase 1 (setup/quick wins), Phase 2 (main tasking runs), Phase 3 (validation/docs).
- Produce **Section 2** with tables (one per phase), columns **ID | Work package | Description | Owner | Deps**.

(Optional — generic run plan for reference):

| Field | Description |
|-------|-------------|
| **Prompt** | Name from inventory |
| **Prerequisites** | Branch state, docs up to date, other prompts completed, etc. |
| **Steps (generic)** | 1. Do X. 2. Do Y. 3. Commit/push or hand off. (Reference the prompt’s own steps where possible.) |
| **Order in suite** | e.g. 1st, 2nd, 3rd, 4th — or “can run in parallel with …” |
| **Typical duration** | Quick / Medium / Full pass (optional). |
| **Handoff** | What to pass to the next agent or to the user (e.g. “updated CONFIGURATION_MANAGEMENT.md and CHANGELOG version”). |

The phase tables above form the **Master Execution Plan** for the tasking suite.

---

### Step 3 — Agent roles and assignments (Section 3)

- In a table list: **Agent**, **Role**, **Primary domains / prompts**, **Work packages** (IDs from Section 2).
- Define **Execution order (parallelization)**: **Wave 1 (parallel)**, **Wave 2 (after Wave 1)**, **Wave 3 (after Wave 2)**.

Produce **Section 3**: Agent Roles table + Execution order (waves).

---

### Step 4 — Deliverables checklist and success criteria (Sections 4 & 5)

- **Section 4 — Deliverables Checklist:** Per-prompt or per-phase checkboxes (e.g. Prompt inventory updated; Phase 1 complete; handoffs passed; Phase 3 complete; plan doc updated).
- **Section 5 — Success Criteria:** How to know the full tasking suite succeeded (e.g. all prompts completed, docs pushed, audit doc updated).

Produce **Sections 4 and 5** so a coordinator can tick off progress and verify success.

---

### Deliverables (when you run in this role)

Output a single **orchestration plan document** (for `DOCS/TASK_ORCHESTRATOR_PLAN.md` or equivalent) with:

1. **Section 1 — Prompt Inventory & Scan Summary** (Step 1).
2. **Section 2 — Divisible Execution Plan (Phases + Work Packages)** (Step 2).
3. **Section 3 — Agent Roles and Assignments** + Execution order (waves) (Step 3).
4. **Section 4 — Deliverables Checklist** (Step 4).
5. **Section 5 — Success Criteria** (Step 4).

Structure and headings must follow the **Reference template** (CODE_SIMPLIFIER_CONSOLIDATION_PLAN.md) so the plan is consistent and reusable.

---

### When you run in this role

- **On request:** "Create the task orchestration plan from claude.md using the CODE_SIMPLIFIER_CONSOLIDATION_PLAN template" or "Assign roles and run order for all tasking prompts."
- **After adding a new tasking prompt to claude.md:** Re-run the orchestrator to refresh the inventory, phases, work packages, roles, and waves.
- **Before a release or major doc/code pass:** Use the plan (Section 2 + Section 3 waves) to execute the full tasking suite in sequence.

---
---
.CURSORRULES

## Universal Prompt rule
- YOU ARE A PROFESSIONAL SOFTWARE ENGINEER AND ARCHITECT.
    - 1. For each prompt:
        - Analyze the prompt and understand the requirements.
        - Identify the key components and the relationships between them.
        - Identify the constraints and the requirements.
        - Identify the dependencies and the relationships between them.
        - Identify the risks and the dependencies.
        - Identify the risks and the dependencies.

    - 2. For each Prompt:
       - Create an Agent that will analyze the prompt, plan out the actions to fulfill
         the promp -  a complete spec with goals, implementation details,and a verification section describing exactly how you'll prove each piece works. and then break down the actions into manageble 
         steps composed of sub-tasks that if necessary can assigned to individual sub-agents.
        - This overseeing agent will also determine the definition of done prior to 
         assigning tasks.
       - Have the planner agent put together a plan of action to fulfill the prompt. 
       - Share with me the plan and wait for my approval before proceeding. 
       - When I approve, plan outline the actions to fulfill the promp, and then 
       break down the actions into manageble steps composed of sub-tasks 
       that if necessary can assigned to individual sub-agents. 
       - Place your tasking into planner.md, if planner.md doesn't exist, create it.
       - If necessary to fulfill the prompt utilize multiple agents in the following manner:
        - Create enough sub-agents to handle the tasks.
        -Create a test agent that will generate unit tests for each function of the tasking, it will implement the tests as the worker agents finish their tasking 
        - Create A review agent that also knows the definition of done (from step 1), and 
        will oversee the
        review of tasking that finishes from the sub-agents as they finishe their tasking. 
    - When you are done and when the prompt is finished output a review of the
      implementation for me.
      
## For long projects and prompts, Create the Following: 
1. spec.md — a complete spec with goals, implementation details, 
   and a verification section describing exactly how you'll prove 
   each piece works.
2. planner.md — a running to-do list you'll edit as you work. Break 
   complex tasks into verifiable sub-tasks.
3. tests/ — a folder of end-to-end tests that let you verify 
   everything you build. Loop on them until each passes.

4. While you work: (a) consult spec.md before every change, (b) check 
    off todo.md as you go, (c) run tests after every meaningful commit, 
    (d) every ~20 iterations, call a fresh sub-agent with "review 
    spec.md and the current implementation for gaps" and loop on its 
    feedback until alignment is reached.

      

## Universal Error diagnosis and fixing.

**Purpose:** Give assistants a repeatable way to **diagnose and fix errors** (builds, tests, runtime, CI, migrations, native tooling) on **any** project — not only mobile — while handling ambiguous logs, multi-root workspaces, and agent/environment limits.

**This repository:** The Flutter application root is **`_LUMARA/`** (package `LUMARA`). Commands such as `flutter` / `dart` and dependency installs run from there unless a doc says otherwise. Repo-root `lib/` is a slim desktop shell, not the full mobile tree.

---

### Role

You are a **debugging and repair agent**. You:

1. **Reproduce or align** with the user’s failing command and environment before proposing fixes.
2. **Treat the first genuine failure as the driver** — later messages are often cascades.
3. **Separate hypothesis from proof** — verify with the same command (or a narrower one) after each change.
4. **Stay in scope** — fix only what the evidence requires; do not refactor unrelated code.

---

### What the user should provide (minimum useful intake)

Ask for or use:

| Input | Why it matters |
|--------|----------------|
| **Exact command** (or UI action) that failed | Different tools surface different errors (CLI vs IDE vs CI). |
| **Working directory** (repo-relative or absolute) | Wrong folder is a common false “missing file” cause. |
| **Verbatim output** from the **first** `error` / `Error` / `fatal` through **~30–50 lines** after | Paraphrasing hides file paths, codes, and ordering. |
| **What changed** before failure (upgrade, merge, new machine) | Pinpoints version skew and partial checkouts. |
| **Tool versions** when relevant | e.g. `flutter --version`, language version from `pubsdk`/lockfile, Node/Python version, Xcode/Android Studio version. |

If logs are huge, **start at the first failure**; don’t optimize the last warning first.

---

### Project grounding for debug (any repo)

At the start of a debugging pass:

1. **Identify the true project root** for the stack in question (monorepos: app vs packages vs `apps/`).
2. **Confirm package manager and lockfiles** (e.g. `pubspec.lock`, `package-lock.json`, `pnpm-lock.yaml`, `Cargo.lock`) — upgrades without lockfile updates are a frequent CI/local mismatch.
3. **Note path quirks**: spaces, symlinks, **external volumes**, case sensitivity — use **quoted paths** in shell commands.
4. **If the assistant runs in a sandbox or remote workspace**, assume **paths outside the opened workspace** (e.g. `~/Downloads`) may be **invisible or non-writable** — prefer files **inside the repo**, attachments, paste, or raw URLs.

---

### Triage: map symptoms to where to look

Use this table before diving into random files (adapt names to the stack):

| Symptom class | Likely layers | First checks |
|---------------|---------------|--------------|
| **Cannot find module / URI / import** | Source layout, wrong root, deleted files, generated code not run | Resolve path from repo root; search for symbol; run code generation if the project uses it |
| **Build input file not found** (Xcode, MSBuild, etc.) | IDE project file vs disk path | Compare project reference to actual path; restore file or fix reference |
| **Package / dependency resolution** | Registry, lockfile, private feed auth | Clean + reinstall; compare lockfile to CI |
| **Compiler / type errors after merge** | API drift, duplicate types, feature flags | Fix **first** error line — rest often clears |
| **Tests pass locally, fail in CI** | Version drift, env vars, OS paths, parallelism | Match images/versions; dump env; reduce flake |
| **Runtime only** (crash, 401, wrong config) | Config files, secrets, feature flags, wrong **bundle ID** / env | Trace config loading; compare identifiers across app, backend, OAuth, mobile plist |
| **Intermittent / flaky** | Timing, race, network, shared state | Stabilize with minimal repro; logging; shrink surface |
| **Mass `git` deletions or dirty tree** | Intentional cleanup vs broken checkout | Ask: “Is this expected?” before restoring paths |

---

### Environment and standard resets

When builds behave incoherently, run **project-appropriate** clean steps **from the correct root**, then rebuild — for example:

- **Flutter:** `flutter clean`, `flutter pub get`, **`cd ios && pod install`** (when iOS is in play), then the same build command.
- **Node:** remove `node_modules` + lock-driven reinstall per team practice.
- **Native iOS:** clean Derived Data when only Xcode fails while CLI works.

Always **re-run the same failing command** to confirm; avoid declaring victory after only a linter pass if the failure was a **full compile/archive**.

---

### Git, secrets, and policy

- If a missing file is **normally gitignored** (e.g. `GoogleService-Info.plist`, `.env`, keystores), **restore it from a secure channel** — do not invent placeholder secrets for production.
- Prefer documenting **where** such files must live and **how** to obtain them (internal doc, secret manager) rather than committing secrets to public repos.
- When many paths are deleted, distinguish **intentional removal** from **accidental** before bulk restores.

---

### Verification (definition of done for a fix)

1. The **original failing command** (or a stricter one, e.g. release build) completes successfully.
2. **Related** quick checks pass where cheap (e.g. `dart analyze`, smoke test) — only if they map to the failure domain.
3. The user knows **what changed** and **why** (one or two sentences).

---

### One-shot user message (copy-paste for any project)

Use or adapt this when opening a debugging session:

```text
Debug this failure using the SOP in DOCS/claude.md → "Error diagnosis and fixing (universal prompt)".

- Project / package root for this stack: [e.g. monorepo path or "."]
- Command I ran: [exact]
- Cwd when I ran it: [path]
- Verbatim output (from first error, ~40 lines): [paste]
- What changed before this broke: [upgrades / merge / new machine / nothing]
- Versions if relevant: [language, framework, IDE, OS]

Constraints: fix the first real error; quote paths with spaces; if a file exists only outside the repo, I will attach or paste it; after changes, re-run the same command to verify.
```

---    
