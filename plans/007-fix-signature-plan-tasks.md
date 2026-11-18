# Plan 007: Make the implementation plan's signature tasks executable and verifiable

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving on. This plan edits **one documentation file only** — `docs/superpowers/plans/2026-11-18-google-ai-subscription-provider.md`. Do **not** create `src/`, `tests/`, `package.json`, `node_modules/` or any other implementation artifact; do not run `bun install`, `bun test`, `bunx --bun tsc` or `bunx --bun @biomejs/biome`. The future-work code shown inside the plan is *contract text to correct*, not code to run now. It depends on plans 005 and 006; if their status rows are not `DONE`, STOP. A reviewer dispatched you, so **do not** update `plans/README.md` — Main maintains the index. If anything in "STOP conditions" occurs, stop and report; do not improvise.
>
> **Drift check (run first)**: `git diff --stat 1faaac3..HEAD -- docs/superpowers/plans/2026-11-18-google-ai-subscription-provider.md`
> The target file is modified in the working tree at planning time, so committed-history output may be empty. The authoritative gate is the live-file excerpt check in Step 0. On any mismatch, STOP and report.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW (documentation only; no runtime code depends on these files)
- **Depends on**: `plans/005-fix-signature-evidence-audit.md`, `plans/006-fix-signature-spec-scope.md`
- **Category**: docs (executor-readiness of the implementation plan's signature tasks)
- **Planned at**: commit `1faaac3`, 2026-11-18
- **Issue**: none

## Why this matters

The improve audit of the signature-mapping docs confirmed eight defects in Tasks 6–8 and the header of `docs/superpowers/plans/2026-11-18-google-ai-subscription-provider.md`. The most serious is that Task 7 creates `scrubSignatureText` but never wires it into the shipped modules, so after the task lands the runtime still uses Task 2's coarse `scrubText` and the whole R1–R9 mapping is dead code. Next, the Task 7 tests feed shortened strings that a literal implementation of the cited research can never match, and the highest-risk rewrite (R6 tool-policy condensation) has no assertion at all. Task 8's README test checks for `"single credential"`, a phrase its own implementation instruction never mandates, and its "no rotation" loop only inspects the test's own env literal — it can never fail. The R2 rewrite drops the `MUST read` line the plan's own Review Focus says must survive verbatim, the DEFERRED banner claims only two docs are in scope when seven are, and Task 6 appends to an SDD ledger that does not exist yet. Left in place, an executor following this plan either cannot make the red/green sequence pass or passes it without implementing the promised behavior. This plan makes every one of those statements true and testable without writing implementation code.

## Current state

### The one in-scope file

- `docs/superpowers/plans/2026-11-18-google-ai-subscription-provider.md` — 949-line superpowers implementation plan for a default-off omp extension. Line numbers below are from the live file at `1faaac3` and shift after each edit: **always anchor on the verbatim "CURRENT" text, not the number**.

### Finding → fix-block map

| # | Finding (ImproveSigPlan id) | Location now | Fix block |
|---|---|---|---|
| 1 | Task 7 never wires `scrubSignatureText` into shipped hooks/modules (CORRECTNESS-01) | `:783-793`, `:715-717`, `:832` | C, E |
| 2 | Task 7 test inputs are not the literal "Before" blocks; R7/R8 targets are truncated (CORRECTNESS-02) | `:795-823` | D |
| 3 | R3–R6 rewrite contracts have no exact assertions; R6 has none at all (TEST COVERAGE-01) | `:808-822`, `:832`, `:838-856` | D, G |
| 4 | R2 rewrite drops the `MUST read` rule that Review Focus says survives verbatim (DOCS-01) | `:44`, `:810-812`, `:832`, `:838-856`; research `F-signature-map.md:75` | D, G, Step 0 |
| 5 | Task 8 README test asserts a literal its implementation step never mandates (CORRECTNESS-03) | `:927` vs `:940` | H |
| 6 | Task 8 no-rotation env loop is tautological (TEST COVERAGE-02) | `:912-922`, `:46` | I |
| 7 | DEFERRED banner understates the seven docs in the current docs-only scope (DOCS-02) | `:3` | A |
| 8 | Task 6 ledger path does not exist (DOCS-03) | `:776-780` | B |

### Verbatim excerpts (anchor on these, not line numbers)

`docs/superpowers/plans/2026-11-18-google-ai-subscription-provider.md:3`:

```markdown
> **DEFERRED — DOCUMENTATION ONLY. DO NOT EXECUTE THIS PLAN.** Not in this phase: no `src/`, `package.json`, `tests/`, `biome.json`, or other implementation files; no `bun install`, `bun test`, or `bunx`; no commits or pushes. This document is the canonical behavioral contract; the only files edited under the current scope are the two named in the header. Every implementation step below is future work, gated on explicit operator authorization.
```

`:44` and `:46` (Review Focus — both stay **unchanged**; they become accurate after blocks D, G and I land):

```markdown
- **Signature-mapping hard preserves:** R1–R9 rewrites are text-only. Tool ids (`read`/`write`/`bash`/`edit`/`grep`/`glob`/`task`/`wait`/`think`/`ast_grep`/`ast_edit`/`lsp`), internal URL schemes (`omp:// local:// artifact:// agent:// proc:// history:// ssh:// skill:// pr:// mr://`), the `skill://<name>` MUST-read-first rule, the `xd://<tool>` + `write` transport, function-call ids (`call-*`, `agy_<uuid>`), ACP meta keys (`_meta.antigravity.systemPrompt.append`, `_meta["antigravity.google/conversation_id"]`), and all header/UA fields must survive verbatim. Pinned by the hard-preserve test in Task 7.
- **No key rotation:** the plugin registers no key pool, rotation, or 429 failover; `antigravity-cli` has one credential per account. Proxy rotation-on-429 is documented but rotation→ban causation is unproven; do not assert it. Pinned by the single-key/no-rotation assertions in Task 8.
```

`:776-780` (Task 6 Step 3):

```markdown
If no fix is needed, append this exact entry to the SDD ledger at `.superpowers/sdd/2026-11-18-google-ai-subscription-provider/progress.md` (the plan-scoped progress ledger used by `subagent-driven-development`; its first line is `# SDD ledger — plan: docs/superpowers/plans/2026-11-18-google-ai-subscription-provider.md`):

`Task 6: no verification fix needed — gate suite green in Step 1; no source or doc changes.`

If a fix is needed, commit it with subject `fix: address verification findings`, then append `Task 6: fix committed — <short SHA> — <one-line reason>` to the same ledger. Never invent a different ledger path or entry format; if the resolved workspace path is disambiguated, use that path instead.
```

`:783-793` and `:795-823` (Task 7 header and first test) — reproduced in full in blocks C and D below.

`:832` (Task 7 Step 3, single long line):

```markdown
Define `SIGNATURE_RULES` as the literal R1–R9 pairs from `docs/research/omp-antigravity-signature-mapping/F-signature-map.md` § Safe rewrites: R1 role line; R2 `# Skills & Rules`→`# Capabilities & Rules` plus the MUST-read prose; R3 `# Internal URLs`→`# Resource references` plus its prose (keep every scheme string); R4 `# xd:// Tool Devices`→`# Device endpoints` plus the `write`/`xd://` prose; R5 `# Tool Inventory`→`# Available tools` (name list byte-identical); R6 `⁂ Tool Policy` guidance condensed but every embedded tool id kept; R7 persona names (Caveman/Ponytail/Unslop)→neutral working-style prose; R8 the `use-superpowers` skill line dropped (`to: ""` — never rename it); R9 `# Delegation`→`# Coordination` prose (keep `task`/`wait` ids). `scrubSignatureText(text)` applies every rule with `String.prototype.replaceAll` in order; keep the pairs as data so every scrubber shares one source of truth.
```

`:838-856` (Task 7 Step 4 hard-preserve test) — reproduced in block G below.

`:912-930` (Task 8 tests) and `:940` (Task 8 Step 3) — reproduced in blocks H and I below.

### Canonical R1–R9 literal blocks (planning-time snapshot)

Source: `docs/research/omp-antigravity-signature-mapping/F-signature-map.md` § "Safe rewrites" (lines 46–187). These are the exact fenced `text` blocks. **Plan 005 changes two of them** — R2's After block is corrected to keep the `MUST read` line verbatim, and R6 is re-derived from the live 18.22.2 prompt and marked illustrative. Step 0 below requires re-reading the live file after plans 005/006 land; if a block differs from this snapshot, **the live file wins**. The `find`/`lsp`/`ast_grep`/`ast_edit` ids in R6 are real advertised tools in the installed 18.22.2 build (`builtin-names.ts`); R6's problem is literal/template drift, not a nonexistent tool.

- **R1** Before: `⁂ Role\nYou are omp's trusted coding assistant.` / After: `⁂ Role\nYou are the coding assistant for this Antigravity bridge session. Work inside the user's workspace and use the tools available in this session to complete the request.`
- **R2** Before: `⁂ Runtime\n# Skills & Rules\nMatching skill → MUST read \`skill://<name>\` first.\n<skills>\n- <name>: <description>\n</skills>` / After (post-005): same block with only the heading changed to `# Capabilities & Rules` — the `Matching skill → MUST read \`skill://<name>\` first.` line stays byte-identical.
- **R3** Before: `# Internal URLs\nMost FS/bash tools resolve these; path selectors: \`read\` docs.\n- omp:// ...\n- local:// ...` / After: `# Resource references\nThe host resolves these reference schemes; consult \`read\` docs for path selectors.\n- omp:// ...\n- local:// ...`
- **R4** Before: `# xd:// Tool Devices\nWrite JSON args as \`content\` to \`xd://<tool>\` via \`write\`. Invalid args return schema in error → fix/retry.` / After: `# Device endpoints\nPass JSON arguments as \`content\` to \`xd://<tool>\` through \`write\`; invalid input returns a schema error - correct and retry.`
- **R5** Before: `# Tool Inventory\n- read: \`read\`\n- bash: \`bash\`` / After: `# Available tools\n- read: \`read\`\n- bash: \`bash\`` (name list byte-identical).
- **R6** Before (snapshot): `⁂ Tool Policy\n# General\nEvery turn costs seconds: batch all independent reads/searches/checks into one turn. Once the change is verified, stop and report; no extra audits, broad suites, or repo-wide checks unless asked. SHOULD resolve prerequisites, parallelize independent calls.\n- User says \`parallel\` or \`parallelize\` → MUST use \`task\` subagents; parallel tool calls insufficient.\n# Tool I/O\n- Prefer relative \`path\`-like fields.\n- Most tools take \`intent\`: capitalized 2–6-word present-participle intent (e.g. "Reading model role settings").\n# Exploration\nNEVER open guessed files. Read \`find\` hits only.` / After (snapshot): `⁂ Tool Policy\n# General\nBatch independent reads and checks; report once the change is verified. Use \`task\` subagents only when parallel work is explicitly requested.\n# Tool I/O\nPrefer relative paths. Most tools accept an \`intent\` label.\n# Specialized tools\nUse \`read\`/\`edit\`/\`write\`/\`grep\`/\`glob\`/\`find\`/\`bash\`/\`lsp\`/\`ast_grep\`/\`ast_edit\` for their named roles; never shell \`grep\`/\`sed\`/\`awk\` for edits.` — **re-copy both strings from the live research file in Step 0**.
- **R7** Before: `## Identity\n- **Ponytail**: full — lazy senior dev. YAGNI, stdlib first, shortest diff. Non-negotiable default.\n- **Caveman:** default lite. Non-negotiable default; see Caveman Policy section.` / After: `## Working style\n- Prefer the smallest correct change. Keep changes boring and maintainable.\n- Be direct and concise in responses.`
- **R8** Before: `- use-superpowers: At conversation start, check skills before responding, even clarifying questions.` / After: `""` (the line is removed; never rename the skill).
- **R9** Before: `# Delegation\nDelegation preferred. Once design settles, SHOULD fan substantial work to \`task\`; multi-file changes, refactors, features, tests, investigations strong candidates.\n## Delegation gates\n- Before spawning, map slices/shared contracts; user-enumerated 2+ self-contained runnable slices exempt.` / After: `# Coordination\nUse \`task\` subagents only for explicitly requested parallel work or genuinely independent slices; keep other work inline.`

### Grounding facts the replacements must honor

- The seven docs in the current docs-only scope are the spec, this plan, and the five files in `docs/research/omp-antigravity-signature-mapping/` (`REPORT.md`, `F-signature-map.md`, `F-header-tls.md`, `F-quota-rotation.md`, `F-antigravity-latest.md`). This is the exact set shown by `git status --short` at `1faaac3`: two modified `docs/superpowers/*` files plus the untracked five-file research directory. `AGENTS.md`, the six `docs/research/omp-antigravity-investigation/` files, `plans/README.md` and all implementation files are **not** in this scope.
- Plan 006's canonical resolution promotes R6–R9 into the spec's Goals and Decisions and states that **R2 keeps `MUST read \`skill://<name>\` first` verbatim**; R8 is the sole documented deletion exception because skill resolution uses the exact name. Plan 005 fixes the research-side R2 After block and R6 snapshot. Do not re-litigate either decision here.
- The exact contract phrase for the no-rotation README assertion is **`one credential per account`** (plan `:46` and Task 8 Step 3 at `:940` already use it). `"single credential"` appears only in the test at `:927` and must be replaced there.
- The SDD ledger path is deliberately unchanged: `.superpowers/sdd/2026-11-18-google-ai-subscription-provider/progress.md`, first line `# SDD ledger — plan: docs/superpowers/plans/2026-11-18-google-ai-subscription-provider.md`. It is created by `subagent-driven-development`'s `task-done` workflow when this plan is eventually executed; it does not exist during the docs-only phase.
- Shipped scrubbing chain at planning time: `src/patterns.ts` (`OMP_MARKERS`, `scrubText`) → consumed by `src/system-prompt.ts` (`scrubSystemPrompt`) and `src/payload.ts` (`scrubPayload`, `scrubContextMessages`) → called by the three hooks registered in `src/index.ts` (`:715-717`). Task 7 must make `src/signature-map.ts` the single source of truth for all four modules.
- Coarse fixtures that must be migrated in the same commit as the wiring (all in this plan file): `:245-260` (Task 2 `tests/patterns.test.ts`), `:314-330` (Task 3 `OMP_PROMPT` + expectations), `:385,390,399,409-410,433-439,450-470` (Task 4 payload/context fixtures), `:616,634,646-649` (Task 5 hook expectations).
- Repo conventions: neutral, cited, confidence-tagged documentation; no secret values; match existing bullets/backticks; do not restyle unrelated lines. Docs-only verification is `git` + `rg` plus one read-only `bun -e` parser (Step 0) — never an install, build, lint or test command.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Committed drift | `git diff --stat 1faaac3..HEAD -- docs/superpowers/plans/2026-11-18-google-ai-subscription-provider.md` | exit 0 (may be empty; see Step 0 live gate) |
| Live-file gate | `rg -n --fixed-strings '<exact CURRENT line>' docs/superpowers/plans/2026-11-18-google-ai-subscription-provider.md` | exactly one hit each |
| Dependency status | `rg -n '^\| 00[56]' plans/README.md` and read rows 005/006 | both rows `DONE` |
| Stale-phrase absence | `rg -n 'single credential\|only files edited under the current scope\|Task 7: R1–R9' docs/superpowers/plans/2026-11-18-google-ai-subscription-provider.md` | no output (exit 1) |
| Wiring presence | `rg -n 'scrubSignatureText\|OMP_MARKERS\|one credential per account' docs/superpowers/plans/2026-11-18-google-ai-subscription-provider.md` | `scrubSignatureText` and `one credential per account` present; no `OMP_MARKERS` |
| Whitespace | `git diff --check -- docs/superpowers/plans/2026-11-18-google-ai-subscription-provider.md` | exit 0, no output |
| Secret scan | `rg -n 'GOCSPX-[A-Za-z0-9_-]{6,}\|AIza[0-9A-Za-z_-]{10,}\|-----BEGIN [A-Z ]*PRIVATE KEY' docs/superpowers/plans/2026-11-18-google-ai-subscription-provider.md` | exit 1 (no matches) |
| Scope | `git status --short` | only the target plan doc newly changed; the 005/006 outputs and the research directory are unchanged by you |

The `bun -e` command in Step 5 parses local files and writes nothing; it is not a build, test or install command. **Never run** `bun install`, `bun test`, `bunx --bun tsc`, or `bunx --bun @biomejs/biome`.

## Suggested executor toolkit

- Read the two dependency plans (`plans/005-fix-signature-evidence-audit.md`, `plans/006-fix-signature-spec-scope.md`) and confirm their status rows are `DONE` before Step 0.
- Re-read `docs/research/omp-antigravity-signature-mapping/F-signature-map.md` § "Safe rewrites" from the working tree after 005 has landed; that is the authority for every R1–R9 literal you write.
- No skills or installs are needed.

## Scope

**In scope** (the only file you may modify):
- `docs/superpowers/plans/2026-11-18-google-ai-subscription-provider.md`

**Out of scope** (do NOT touch, even though related):
- `docs/research/omp-antigravity-signature-mapping/*.md` — owned by plan 005; read only. If their R2/R6 text does not match the contract, STOP.
- `docs/superpowers/specs/2026-11-18-google-ai-subscription-provider-design.md` — owned by plan 006.
- `AGENTS.md`, `docs/research/omp-antigravity-investigation/**`, `plans/README.md`, and every other plan file.
- Any plugin implementation: no `src/`, `package.json`, `tests/`, `node_modules/`, no install/test/commit of plugin code. The fixtures you edit are fenced contract text inside the plan file, not real test files.

## Git workflow

- Branch at planning time: `main`. Do not switch branches.
- Commit style is conventional (`docs: …`); if asked to commit, use `docs: fix signature tasks in the implementation plan`.
- Do not push or open a PR unless explicitly instructed.

## Steps

Apply blocks **A–I in order**. After each replacement, re-read the file and use the verbatim "CURRENT" text as the anchor for the next block; do not trust the original line numbers after earlier edits.

### Step 0: Dependency, drift, live-file and research gates

1. Confirm rows 005 and 006 in `plans/README.md` are `DONE`. If either is missing or not `DONE`, STOP and report.
2. Run the drift check. Then confirm these three exact strings each occur once in the live plan file:

```sh
rg -n --fixed-strings 'the only files edited under the current scope are the two named in the header' docs/superpowers/plans/2026-11-18-google-ai-subscription-provider.md
rg -n --fixed-strings 'If no fix is needed, append this exact entry to the SDD ledger at' docs/superpowers/plans/2026-11-18-google-ai-subscription-provider.md
rg -n --fixed-strings 'Object.keys(env))' docs/superpowers/plans/2026-11-18-google-ai-subscription-provider.md
```

3. Re-read `docs/research/omp-antigravity-signature-mapping/F-signature-map.md` § "Safe rewrites". Confirm the R2 After block contains the exact line `Matching skill → MUST read \`skill://<name>\` first.` and record the current R6 Before/After fenced blocks verbatim for use in block D. If the R2 line is absent, STOP and report (plan 005 has not applied its R2 fix).

**Verify**: both dependency rows `DONE`; the three `rg` commands return exactly one hit each; the research R2 After preserves the MUST-read line. Any deviation → STOP.

### Step 1: Block A — name all seven docs in the DEFERRED banner

**CURRENT (verbatim, `:3`)**: the banner line reproduced in "Current state" above.

**REPLACE WITH (verbatim)**:

````markdown
> **DEFERRED — DOCUMENTATION ONLY. DO NOT EXECUTE THIS PLAN.** Not in this phase: no `src/`, `package.json`, `tests/`, `biome.json`, or other implementation files; no `bun install`, `bun test`, or `bunx`; no commits or pushes. This document is the canonical behavioral contract. The current docs-only scope is exactly seven files: this plan (`docs/superpowers/plans/2026-11-18-google-ai-subscription-provider.md`); `docs/superpowers/specs/2026-11-18-google-ai-subscription-provider-design.md`; and the five files under `docs/research/omp-antigravity-signature-mapping/` — `REPORT.md`, `F-signature-map.md`, `F-header-tls.md`, `F-quota-rotation.md`, `F-antigravity-latest.md`. Every implementation step below is future work, gated on explicit operator authorization.
````

**Verify**: `rg -n --fixed-strings 'The current docs-only scope is exactly seven files' docs/superpowers/plans/2026-11-18-google-ai-subscription-provider.md` → one hit; the stale phrase "only files edited under the current scope" → no hit.

### Step 2: Block B — Task 6 ledger exists only at SDD execution time

**CURRENT (verbatim, `:776-780`)**: the paragraph reproduced in "Current state" above.

**REPLACE WITH (verbatim)** — keep the path and entry formats byte-identical; add only the creation semantics before the existing first sentence:

````markdown
The ledger does **not** exist during the docs-only phase. `subagent-driven-development` creates it when this deferred plan is executed: before the first append, its `task-done` workflow creates `.superpowers/sdd/2026-11-18-google-ai-subscription-provider/progress.md` with first line `# SDD ledger — plan: docs/superpowers/plans/2026-11-18-google-ai-subscription-provider.md`. Do not create it now — the banner above forbids new files in this phase.

If no fix is needed, append this exact entry to the SDD ledger at `.superpowers/sdd/2026-11-18-google-ai-subscription-provider/progress.md` (the plan-scoped progress ledger used by `subagent-driven-development`; its first line is `# SDD ledger — plan: docs/superpowers/plans/2026-11-18-google-ai-subscription-provider.md`):

`Task 6: no verification fix needed — gate suite green in Step 1; no source or doc changes.`

If a fix is needed, commit it with subject `fix: address verification findings`, then append `Task 6: fix committed — <short SHA> — <one-line reason>` to the same ledger. Never invent a different ledger path or entry format; if the resolved workspace path is disambiguated, use that path instead.
````

**Verify**: `rg -n --fixed-strings 'The ledger does **not** exist during the docs-only phase' docs/superpowers/plans/2026-11-18-google-ai-subscription-provider.md` → one hit; `rg -n --fixed-strings '.superpowers/sdd/2026-11-18-google-ai-subscription-provider/progress.md' ...` → two hits (new sentence + original paragraph).

### Step 3: Block C — Task 7 Files/Interfaces make the mapping the shipped source of truth

**CURRENT (verbatim, `:787-793`)**:

````markdown
**Files:**
- Create: `src/signature-map.ts`
- Test: `tests/signature-map.test.ts`

**Interfaces:**
- Consumes: the `MarkerRule`/`scrubText` idea from Task 2 (`src/patterns.ts`).
- Produces: `SIGNATURE_RULES: readonly MarkerRule[]` (R1–R9 literal pairs, `to: ""` for the R8 drop); `scrubSignatureText(text: string): string`.
````

**REPLACE WITH (verbatim)**:

````markdown
**Files:**
- Create: `src/signature-map.ts`
- Test: `tests/signature-map.test.ts`
- Modify (wiring — the shipped scrubbers must use R1–R9, not Task 2's coarse table): `src/patterns.ts`, `src/system-prompt.ts`, `src/payload.ts`, `src/index.ts`; and the fixture/expectation strings in `tests/patterns.test.ts`, `tests/system-prompt.test.ts`, `tests/payload.test.ts`, `tests/index.test.ts` listed in Step 5 below.

**Interfaces:**
- Consumes: `MarkerRule` from Task 2 (`src/patterns.ts`); the R1–R9 literal pairs from `docs/research/omp-antigravity-signature-mapping/F-signature-map.md` § Safe rewrites.
- Produces: `SIGNATURE_RULES: readonly MarkerRule[]` (R1–R9 literal pairs, `to: ""` for the R8 drop) and `scrubSignatureText(text: string): string` from `src/signature-map.ts` — the **single source of truth** for all scrubbing. `OMP_MARKERS` and `scrubText` are removed from `src/patterns.ts`; `src/system-prompt.ts` and `src/payload.ts` import `scrubSignatureText` directly. `src/index.ts` keeps registering the same three hooks and continues to call `scrubSystemPrompt`/`scrubContextMessages`/`scrubPayload`, so the shipped `before_agent_start`, `context` and `before_provider_request` paths use R1–R9 without any new hook registration.
````

**Verify**: `rg -n --fixed-strings 'OMP_MARKERS` and `scrubText` are removed from `src/patterns.ts`' docs/superpowers/plans/2026-11-18-google-ai-subscription-provider.md` → one hit.

### Step 4: Block D — Task 7 Step 1 test uses byte-identical R1–R9 inputs and exact assertions

Replace the whole Step 1 test snippet — from the line `- [ ] **Step 1: Write the failing R1–R9 rewrite tests**` through its closing ``` fence (currently `:795-823`) — with the block below. Use the live R1–R9 fenced blocks captured in Step 0: **R2 After keeps the MUST-read line; R6 constants are re-copied from the live research file** (the snapshot strings below are from `1faaac3` and are shown so you can see the expected shape — replace them if the live file differs). Each `before`/`after` string must equal the corresponding research fenced block byte-for-byte, including `⁂` headers, list markers and trailing periods.

````markdown
- [ ] **Step 1: Write the failing R1–R9 rewrite tests**

```ts
// tests/signature-map.test.ts
import { describe, expect, test } from "bun:test";
import { scrubSignatureText } from "../src/signature-map";

// These literals are byte-identical copies of the Before/After fenced `text` blocks in
// docs/research/omp-antigravity-signature-mapping/F-signature-map.md § Safe rewrites.
const R: Record<string, { before: string; after: string }> = {
  R1: {
    before: "⁂ Role\nYou are omp's trusted coding assistant.",
    after: "⁂ Role\nYou are the coding assistant for this Antigravity bridge session. Work inside the user's workspace and use the tools available in this session to complete the request.",
  },
  R2: {
    before: "⁂ Runtime\n# Skills & Rules\nMatching skill → MUST read `skill://<name>` first.\n<skills>\n- <name>: <description>\n</skills>",
    // R2 relabels the heading only: the MUST-read line stays byte-identical (hard preserve).
    after: "⁂ Runtime\n# Capabilities & Rules\nMatching skill → MUST read `skill://<name>` first.\n<skills>\n- <name>: <description>\n</skills>",
  },
  R3: {
    before: "# Internal URLs\nMost FS/bash tools resolve these; path selectors: `read` docs.\n- omp:// ...\n- local:// ...",
    after: "# Resource references\nThe host resolves these reference schemes; consult `read` docs for path selectors.\n- omp:// ...\n- local:// ...",
  },
  R4: {
    before: "# xd:// Tool Devices\nWrite JSON args as `content` to `xd://<tool>` via `write`. Invalid args return schema in error → fix/retry.",
    after: "# Device endpoints\nPass JSON arguments as `content` to `xd://<tool>` through `write`; invalid input returns a schema error - correct and retry.",
  },
  R5: {
    before: "# Tool Inventory\n- read: `read`\n- bash: `bash`",
    after: "# Available tools\n- read: `read`\n- bash: `bash`",
  },
  R6: {
    // Re-copy both strings from the live R6 fenced blocks (plan 005 marks R6 illustrative).
    before: "⁂ Tool Policy\n# General\nEvery turn costs seconds: batch all independent reads/searches/checks into one turn. Once the change is verified, stop and report; no extra audits, broad suites, or repo-wide checks unless asked. SHOULD resolve prerequisites, parallelize independent calls.\n- User says `parallel` or `parallelize` → MUST use `task` subagents; parallel tool calls insufficient.\n# Tool I/O\n- Prefer relative `path`-like fields.\n- Most tools take `intent`: capitalized 2–6-word present-participle intent (e.g. \"Reading model role settings\").\n# Exploration\nNEVER open guessed files. Read `find` hits only.",
    after: "⁂ Tool Policy\n# General\nBatch independent reads and checks; report once the change is verified. Use `task` subagents only when parallel work is explicitly requested.\n# Tool I/O\nPrefer relative paths. Most tools accept an `intent` label.\n# Specialized tools\nUse `read`/`edit`/`write`/`grep`/`glob`/`find`/`bash`/`lsp`/`ast_grep`/`ast_edit` for their named roles; never shell `grep`/`sed`/`awk` for edits.",
  },
  R7: {
    before: "## Identity\n- **Ponytail**: full — lazy senior dev. YAGNI, stdlib first, shortest diff. Non-negotiable default.\n- **Caveman:** default lite. Non-negotiable default; see Caveman Policy section.",
    after: "## Working style\n- Prefer the smallest correct change. Keep changes boring and maintainable.\n- Be direct and concise in responses.",
  },
  R8: {
    before: "- use-superpowers: At conversation start, check skills before responding, even clarifying questions.",
    after: "",
  },
  R9: {
    before: "# Delegation\nDelegation preferred. Once design settles, SHOULD fan substantial work to `task`; multi-file changes, refactors, features, tests, investigations strong candidates.\n## Delegation gates\n- Before spawning, map slices/shared contracts; user-enumerated 2+ self-contained runnable slices exempt.",
    after: "# Coordination\nUse `task` subagents only for explicitly requested parallel work or genuinely independent slices; keep other work inline.",
  },
};

for (const id of ["R1", "R2", "R3", "R4", "R5", "R6", "R7", "R8", "R9"]) {
  test(`${id} rewrites its literal Before block to its literal After block`, () => {
    expect(scrubSignatureText(R[id]!.before)).toBe(R[id]!.after);
  });
}

test("R3 schemes, R5 tool names and R6 tool ids survive their rewrites byte-for-byte", () => {
  for (const scheme of ["omp://", "local://", "artifact://", "agent://", "proc://", "history://", "ssh://", "skill://", "pr://", "mr://"]) {
    expect(R.R3!.after, `dropped ${scheme}`).toContain(scheme);
  }
  expect(R.R5!.after.split("\n").slice(1)).toEqual(R.R5!.before.split("\n").slice(1));
  for (const id of ["read", "edit", "write", "grep", "glob", "find", "bash", "lsp", "ast_grep", "ast_edit"]) {
    expect(R.R6!.after, `dropped ${id}`).toContain(id);
  }
});

test("R2 keeps the MUST-read skill rule verbatim", () => {
  expect(R.R2!.after).toContain("Matching skill → MUST read `skill://<name>` first.");
});
```
````

**Verify**: the byte-identity gate in Step 5 below reports every research fenced block present in the file; `rg -n 'toContain\("smallest correct change"\)' ...` → no output (the truncated R7 target is gone); `rg -n --fixed-strings 'even clarifying questions.' ...` → one hit.

### Step 5: Byte-identity gate for every R1–R9 literal

Run this read-only parser (it writes nothing; it only compares local files). It extracts every fenced `text` block from the research "Safe rewrites" section, converts it to the exact double-quoted TypeScript string-literal form the plan's test uses (`JSON.stringify` produces the same `\n` escapes and `\"` quoting), and fails if any literal is not present verbatim in the implementation plan file. The `^```$` multiline anchor handles R8's empty After block; run this only after plans 005/006 are `DONE` (before 005 lands, the old R2 After is the one expected miss).

```sh
bun -e '
const md = await Bun.file("docs/research/omp-antigravity-signature-mapping/F-signature-map.md").text();
const plan = await Bun.file("docs/superpowers/plans/2026-11-18-google-ai-subscription-provider.md").text();
const section = md.split("## Safe rewrites")[1]?.split("## Hard preserves")[0] ?? "";
const blocks = [...section.matchAll(/^```text\n([\s\S]*?)^```$/gm)].map(m => m[1].replace(/\n$/, ""));
let missing = 0;
for (const b of blocks) {
  const literal = JSON.stringify(b);
  if (!plan.includes(literal)) { console.error("MISSING:", literal); missing++; }
}
console.log(`${blocks.length} blocks checked, ${missing} missing`);
if (blocks.length !== 18 || missing) process.exit(1);
'
```

**Verify**: prints exactly `18 blocks checked, 0 missing` (9 Before + 9 After, including R8's empty After represented as `after: ""` in the plan) and exits 0. A nonzero count means either plan 005 has not landed or a literal was reworded instead of copied — re-copy from the live research file and re-run; do not weaken the gate.

### Step 6: Block E — wire the mapping into shipped modules and migrate fixtures

1. In Task 7, replace Step 3's implementation line (`:832`, reproduced in "Current state") with a verbatim instruction that: (a) defines `SIGNATURE_RULES` as the R1–R9 literal pairs from the research file, with `to: ""` for R8; (b) implements `scrubSignatureText` by applying each rule with `String.prototype.replaceAll` in order; (c) **states explicitly that `OMP_MARKERS` and `scrubText` are removed from `src/patterns.ts` and R1–R9 replaces them** — no retained alias, no second table; (d) makes `src/system-prompt.ts` and `src/payload.ts` import `scrubSignatureText` from `src/signature-map`; and (e) notes that `src/index.ts` needs no new hook — its existing three hooks call the migrated scrubbers, so the shipped behavior changes with them.
2. Insert a new Step 4 immediately after that implementation step (renumber the old Steps 4–6 to 5–7, keeping the commit subject byte-identical):

````markdown
- [ ] **Step 4: Verify the shipped modules use the mapping (no dead code)**

```ts
// append to tests/signature-map.test.ts
import { readFileSync } from "node:fs";

test("shipped modules use R1-R9 as the single source of truth", () => {
  const read = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");
  const patterns = read("../src/patterns.ts");
  const systemPrompt = read("../src/system-prompt.ts");
  const payload = read("../src/payload.ts");
  const index = read("../src/index.ts");
  for (const [name, src] of [["patterns", patterns], ["system-prompt", systemPrompt], ["payload", payload]]) {
    expect(src, `${name} does not call scrubSignatureText`).toContain("scrubSignatureText");
  }
  for (const fn of ["scrubSystemPrompt", "scrubContextMessages", "scrubPayload"]) {
    expect(index, `factory no longer registers ${fn}`).toContain(fn);
  }
  expect(patterns).not.toContain("OMP_MARKERS");
});
```
````

3. In the same commit, migrate every coarse fixture named in "Grounding facts" so Tasks 2–5 expectations assert R1–R9 strings instead of the old coarse strings (`"You are a helpful coding assistant"`, `"# Skills"`, `"# References"`, `"# Device Tools"`, `"# Available Tools"`, `"## Tool Policy"`). Concretely: Task 2 `tests/patterns.test.ts` fixture/expectation arrays (`:245-260`); Task 3 `OMP_PROMPT` and `generic-mode` expectations (`:314-330`) use the full R1/R2 Before blocks and their After blocks; Task 4 `ccaPayload()` text fields and all text expectations (`:385,390,399,409-410,433-439,450-470`) use the R1/R3 Before/After strings; Task 5 hook expectations (`:616,634,646-649`) use the new headings. Keep every non-content assertion (tool names, call ids, labels, `sessionId`, `requestId`, `userAgent`, structure, native-mode value-identity) unchanged.

**Verify**: `rg -n 'You are a helpful coding assistant|"# Skills"|"# References"|"# Device Tools"|"# Available Tools"|"## Tool Policy"' docs/superpowers/plans/2026-11-18-google-ai-subscription-provider.md` → no output; `rg -n --fixed-strings 'OMP_MARKERS and `scrubText` are removed from `src/patterns.ts`' ...` → one hit; `rg -n --fixed-strings 'does not call scrubSignatureText' ...` → one hit.

### Step 7: Block G — R3–R6 and MUST-read assertions in the hard-preserve test

Keep the existing `hard preserves survive every rewrite` test in Task 7 Step 4 (now Step 5), but change its input strings to the literal R1/R3/R4/R5 Before blocks where applicable and add the MUST-read assertion. Replace only the `for (const kept of [...])` line group and insert two lines after it:

**CURRENT (verbatim, inside the test at `:850-855`)**:

````markdown
  for (const kept of [
    "skill://", "xd://<tool>", "write", "call-1", "agy_1234-abcd",
    "_meta.antigravity.systemPrompt.append", "_meta[\"antigravity.google/conversation_id\"]",
    "read", "bash", "task", "wait", "userAgent", "requestId", "sessionId", ...schemes,
  ]) expect(out, `dropped ${kept}`).toContain(kept);
````

**REPLACE WITH (verbatim)**:

````markdown
  for (const kept of [
    "skill://", "xd://<tool>", "write", "call-1", "agy_1234-abcd",
    "_meta.antigravity.systemPrompt.append", "_meta[\"antigravity.google/conversation_id\"]",
    "read", "bash", "task", "wait", "userAgent", "requestId", "sessionId", ...schemes,
    "Matching skill → MUST read `skill://<name>` first.",
  ]) expect(out, `dropped ${kept}`).toContain(kept);
  // R6 condensation is the highest-risk rewrite: pin every embedded tool id after rewrite.
  for (const id of ["read", "edit", "write", "grep", "glob", "find", "bash", "lsp", "ast_grep", "ast_edit"]) {
    expect(scrubSignatureText(R.R6!.before), `dropped ${id}`).toContain(id);
  }
````

**Verify**: `rg -n --fixed-strings 'Matching skill → MUST read `skill://<name>` first."' docs/superpowers/plans/2026-11-18-google-ai-subscription-provider.md` → at least one hit inside the hard-preserve test; Review Focus `:44` is unchanged and now truthful.

### Step 8: Block H — Task 8 README assertion uses the mandated phrase

**CURRENT (verbatim, `:924-930`)**:

````markdown
test("README records the header/TLS truth and single-key limits", () => {
  const readme = readFileSync(new URL("../README.md", import.meta.url), "utf8");
  for (const s of [
    "no HTTP headers", "TLS", "owns", "single credential", "no key pool",
    "JA3/JA4", "rotation", "best-effort",
  ]) expect(readme, `README missing: ${s}`).toContain(s);
});
````

**REPLACE WITH (verbatim)** — only the credential phrase changes:

````markdown
test("README records the header/TLS truth and single-key limits", () => {
  const readme = readFileSync(new URL("../README.md", import.meta.url), "utf8");
  for (const s of [
    "no HTTP headers", "TLS", "owns", "one credential per account", "no key pool",
    "JA3/JA4", "rotation", "best-effort",
  ]) expect(readme, `README missing: ${s}`).toContain(s);
});
````

**Verify**: `rg -n --fixed-strings '"one credential per account"' docs/superpowers/plans/2026-11-18-google-ai-subscription-provider.md` → one hit in the test and Step 3's checklist at `:940` already contains the same phrase; `rg -n --fixed-strings 'single credential' ...` → no output.

### Step 9: Block I — replace the tautological no-rotation loop with a source-level assertion

**CURRENT (verbatim, `:912-922`)**:

````markdown
test("no rotation or TLS env knob exists in config", () => {
  const env = {
    OMP_AGY_BYP_MODE: "generic",
    OMP_AGY_BYP_SCRUB_TOOL_DESCRIPTIONS: "1",
    OMP_AGY_BYP_UNPAUSE_FALLBACK: "0",
  };
  expect(Object.keys(loadConfig(env)).sort()).toEqual(
    ["mode", "scrubToolDescriptions", "unpauseFallback"],
  );
  for (const k of Object.keys(env)) expect(k).not.toMatch(/ROTAT|TLS|JA3|JA4/);
});
````

**REPLACE WITH (verbatim)** — the new test reads the shipped source, so adding any new env knob (rotation, TLS, JA3/JA4 or otherwise) to `src/config.ts` or `src/index.ts` fails it; the config-shape assertion is retained:

````markdown
test("no rotation or TLS env knob exists in the shipped config or factory", () => {
  const sources = ["../src/config.ts", "../src/index.ts"]
    .map(p => readFileSync(new URL(p, import.meta.url), "utf8"))
    .join("\n");
  const envNames = [...new Set(sources.match(/OMP_AGY_BYP_[A-Z0-9_]+/g) ?? [])].sort();
  expect(envNames).toEqual([
    "OMP_AGY_BYP_MODE",
    "OMP_AGY_BYP_SCRUB_TOOL_DESCRIPTIONS",
    "OMP_AGY_BYP_UNPAUSE_FALLBACK",
  ]);
  const env = {
    OMP_AGY_BYP_MODE: "generic",
    OMP_AGY_BYP_SCRUB_TOOL_DESCRIPTIONS: "1",
    OMP_AGY_BYP_UNPAUSE_FALLBACK: "0",
  };
  expect(Object.keys(loadConfig(env)).sort()).toEqual(
    ["mode", "scrubToolDescriptions", "unpauseFallback"],
  );
});
````

Leave Review Focus `:46` **unchanged**: with this source-level assertion it is now accurate. Narrowing Review Focus alone was considered and rejected because it would leave the stated hard preserve unpinned.

**Verify**: `rg -n --fixed-strings 'not.toMatch(/ROTAT|TLS|JA3|JA4/)' ...` → no output; `rg -n --fixed-strings 'OMP_AGY_BYP_[A-Z0-9_]+' ...` → one hit; `rg -n --fixed-strings 'Pinned by the single-key/no-rotation assertions in Task 8' ...` → one hit (unchanged).

### Step 10: Final docs-only verification

Run every command in the "Commands you will need" table, in order. Confirm each expected result (`rg` exits 1 on no matches — success for negative checks). Then re-read the edited sections (banner, Task 6 Step 3, Tasks 7–8) end to end and confirm no future-work step lost its red/green pairing or its commit subject.

**Verify**: all table commands produce their expected results; `git diff --check` → exit 0; `git status --short` → only the target plan doc newly changed by you.

## Test plan

No code tests apply — this is a documentation edit. Verification is the Step 0 dependency/drift/live/research gates, the Step 5 read-only byte-identity parser over all R1–R9 fenced blocks, five stale-phrase `rg` scans, a positive-content check for each replacement (seven-doc banner, ledger-creation sentence, wiring/removal statements, MUST-read assertion, mandated README phrase, source-level no-rotation assertion), a whitespace check, a secret scan, and a scope check.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `plans/README.md` rows 005 and 006 are `DONE` before Step 0 (recorded; no edit by you).
- [ ] The Step 5 parser prints exactly `18 blocks checked, 0 missing` and exits 0.
- [ ] `rg -n 'You are a helpful coding assistant|"# Skills"|"# References"|"# Device Tools"|"# Available Tools"|"## Tool Policy"' docs/superpowers/plans/2026-11-18-google-ai-subscription-provider.md` → no output.
- [ ] `rg -n 'single credential|only files edited under the current scope|not.toMatch\(/ROTAT' docs/superpowers/plans/2026-11-18-google-ai-subscription-provider.md` → no output.
- [ ] `rg -n --fixed-strings 'OMP_MARKERS and `scrubText` are removed from `src/patterns.ts`' ...` → one hit.
- [ ] `rg -n --fixed-strings 'does not call scrubSignatureText' ...` → one hit.
- [ ] `rg -n --fixed-strings 'Matching skill → MUST read `skill://<name>` first."' ...` → at least one hit.
- [ ] `rg -n --fixed-strings 'one credential per account' ...` → at least two hits (test assertion + Step 3 checklist).
- [ ] `rg -n --fixed-strings 'The ledger does **not** exist during the docs-only phase' ...` → one hit.
- [ ] `git diff --check -- docs/superpowers/plans/2026-11-18-google-ai-subscription-provider.md` → exit 0, no output.
- [ ] Secret scan → no matches.
- [ ] `git status --short` → no new path outside the one in-scope file versus the Step 0 baseline.
- [ ] No implementation file, `node_modules/`, lockfile, or commit was created.

## STOP conditions

Stop and report back (do not improvise) if:

- Plan 005 or 006 is not `DONE`, or the live research R2 After block does **not** preserve `Matching skill → MUST read \`skill://<name>\` first.` — the R2 contract would be unresolved.
- Any `file:line` excerpt in "Current state" does not match the live document (drift since `1faaac3`).
- The Step 5 parser reports a missing fenced block after you re-copied it once — do not invent a literal to make it pass.
- A correction appears to require editing the research docs, the spec, `AGENTS.md`, `plans/README.md`, or implementation files — those are owned by other plans/phases.
- A future-work step's red/green pairing cannot be preserved (e.g. a fixture migration leaves an expectation asserting a stale coarse string).
- You find an actual secret value in a document. Do not echo it; stop and report the file and line only.

## Maintenance notes

- The byte-identity gate is coupled to the research "Safe rewrites" section headings. If plan 005 retitles that section, update the parser's two `split` markers rather than deleting the gate.
- R6 is explicitly illustrative after plan 005 (its Before text is template-derived from 18.22.2). When the pinned host version moves past 18.22.2, re-derive R1–R9 from the live system prompt before relying on any rewrite; a stale literal is a silent no-op, not a failing test.
- `find`, `lsp`, `ast_grep` and `ast_edit` are real top-level tools in the installed 18.22.2 build; do not "fix" R6 by deleting them. The defect was literal/template drift.
- When this deferred plan is eventually executed under SDD, the ledger is created at execution time (Block B); do not pre-create it in a later docs-only pass.
- `plans/README.md` is maintained by Main; this plan intentionally does not add its own status row.
