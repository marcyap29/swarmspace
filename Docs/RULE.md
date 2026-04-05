
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
       - Put together a plan of action to fulfill the prompt. 
       - Share with me the plan and wait for my approval before proceeding. 
       - When I approve, plan outthe actions to fulfill the promp, and then 
       break down the actions into manageble steps composed of sub-tasks 
       that if necessary can assigned to individual sub-agents. 
       - If necessary to fulfill the prompt utilize multiple agents in the following manner:
        - Create an Agent that will analyze the prompt, plan out the actions to fulfill
         the promp, and then break down the actions into manageble 
         steps composed of sub-tasks that if necessary can assigned to individual sub-agents.
        - This overseeing agent will also determine the definition of done prior to 
         assigning tasks.
        - Create enough sub-agents to handle the tasks.
        - Assign each sub-agent their respective sub-tasks that make up the steps.
        - Create A review agent that also knows the definition of done (from step 1), and 
        will oversee the
        review of tasking that finishes from the sub-agents as they finishe their tasking. 
    - When you are done and when the prompt is finished output a review of the
      implementation for me.

## Universal Error diagnosis and fixing.

**Purpose:** Give assistants a repeatable way to **diagnose and fix errors** (builds, tests, runtime, CI, migrations, native tooling) on **any** project — not only mobile — while handling ambiguous logs, multi-root workspaces, and agent/environment limits.

**This repository:** The Flutter application root is **`_LUMARA/`** (package `my_app`). Commands such as `flutter` / `dart` and dependency installs run from there unless a doc says otherwise. Repo-root `lib/` is a slim desktop shell, not the full mobile tree.

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