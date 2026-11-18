# Plan 006: Make the spec's R1–R9 scrub scope canonical in Goals and Decisions

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving on. If anything in the "STOP conditions" section occurs, stop and report — do not improvise. This is a **documentation-only** plan: edit ONLY the one file in the Scope section. Do not create or modify plugin source, `package.json`, `tests/`, other spec/plan docs, or anything under `docs/research/`; do not install dependencies, run the test suite, commit, or push. The implementation steps quoted inside the plan are contract text to be corrected, not work to perform now.
>
> **Drift check (run first)**: `git diff --stat 1faaac3..HEAD -- docs/superpowers/specs/2026-11-18-google-ai-subscription-provider-design.md`
> The in-scope spec already carries uncommitted signature-addendum edits at planning time, so this command prints nothing and is **not** the useful check. Confirm every "Current state" excerpt below against the **live working-tree** file before editing (use `rg -n`/`read`); on a mismatch, treat it as a STOP condition. `plans/README.md` is maintained by Main — do not edit it.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW (documentation only; no runtime code depends on this file)
- **Depends on**: none — plan 002 already applied its contract edits to this same spec file; build on the current working-tree text.
- **Category**: docs
- **Planned at**: commit `1faaac3`, 2026-11-18
- **Issue**: none

## Why this matters

The spec currently carries two competing rewrite scopes. Goals (`:14`) and Decisions "Scrub targets" (`:61`) authorize roughly R1–R5, while the signature addendum (`:125`) declares all of R1–R9 "safe to rewrite", silently adding R6 "Tool Policy" prose, R7 persona names, R8 deletion of the `use-superpowers` entry, and R9 "Delegation" prose. An implementer following the addendum would touch four extra surfaces, and R8 is an outright line deletion that contradicts the governing "replace, don't delete" rule. The addendum even claims "It does not change the core decisions above" (`:102`) while doing exactly that. This plan promotes R6–R9 into the governing Goals and Decisions lists, explicitly reconciles R8 as the single deletion exception, and leaves the default-OFF / manual-toggle / content-only core untouched — so there is one authoritative scope an executor can follow.

## Current state

### Files and roles

- `docs/superpowers/specs/2026-11-18-google-ai-subscription-provider-design.md` — the design contract (131 lines). Abbreviated below as **spec**. This is the only file this plan edits.
- `docs/research/omp-antigravity-signature-mapping/F-signature-map.md` — source of the R1–R9 classification. **Read-only for this plan**; do not edit it.
- Repo convention: match the spec's existing bullet structure, backticked identifiers, em-dash phrasing and `[F-*.md]` citation style. Do not restyle unrelated lines. No secret values anywhere.

### The divergence, with exact anchors (verbatim current excerpts)

**spec:14 — Goals rewrite bullet (narrow scope):**
```
- Rewrite omp-specific documentation markers — the literal role line, the `Internal URLs` and `xd://` headings, the `Skills & Rules` heading/rule line, and `Tool Inventory`/preset markers — before they are supplied to the model. Functional internal URL schemes (including `skill://`) are never rewritten. Tool descriptions are rewritten only on the HTTP CCA payload seam and only when `OMP_AGY_BYP_SCRUB_TOOL_DESCRIPTIONS=1`; on `antigravity-cli` they stay verbatim in v1. [F-signature.md] [F-antigravity-cli-hooks.md]
```

**spec:61 — Decisions "Scrub targets" bullet (same narrow scope + "replace, don't delete"):**
```
- **Scrub targets:** the literal `You are omp's trusted coding assistant` role line; the `Internal URLs` and `xd://` Tool Devices headings; the `Skills & Rules` heading and `skill://` rule line; and `Tool Inventory`/preset markers. Tool descriptions are a target only on the HTTP CCA payload seam and only with the opt-in flag, never on `antigravity-cli`. Replace with neutral, generic wording rather than deleting the surrounding guidance. Only documentation/marker text in prompt prose is rewritten: functional URL schemes (including `skill://` everywhere except that literal rule line) and tool-call payloads are never renamed. [F-signature.md] [F-antigravity-cli-hooks.md]
```

**spec:102 — addendum intro (false "no change" claim):**
```
This addendum records the signature-mapping pass. It does not change the core decisions above: the plugin remains default OFF, manual-toggle-only, and content-only. It explains why the existing "no header/TLS spoofing, no provider rotation, no detector-efficacy claim" boundaries are deliberate rather than incidental. [REPORT.md]
```

**spec:123 — addendum reachability paragraph (ambiguous gating):**
```
On the primary CLI path only three model-visible content surfaces exist — the joined system prompt (ACP `_meta.antigravity.systemPrompt.append`), messages/context, and tool descriptions — and `before_agent_start` / `context` are the only reachable rewrite seams. F-signature-map.md classifies each omp marker (R1–R9) into text safe to rewrite versus contracts that must stay byte-stable. This is a **reachability map, not evidence of detector efficacy**: no source ties omp prompt strings or tool names to upstream enforcement, and any rewrite remains gated by the Decisions above (default OFF, manual toggle, contract preservation). [F-signature-map.md] [REPORT.md]
```

**spec:125 — addendum "safe to rewrite" bullet (wide scope, contradicts R8 deletion):**
```
- **Safe to rewrite — prose/labels only (R1–R9):** R1 role line; R2 "Skills & Rules" heading prose (keep `skill://<name>` and the MUST-read rule); R3 "Internal URLs" prose (keep every scheme string); R4 "xd:// Tool Devices" prose (keep `xd://<tool>` and `write`); R5 "Tool Inventory" label (keep the name list byte-identical); R6 "Tool Policy" prose (keep every named tool id and the `xd://report_issue` line); R7 persona names → neutral working-style wording; R8 drop the `use-superpowers` skill entry rather than renaming it; R9 "Delegation" prose (keep `task`/`wait` ids). Replace with neutral wording rather than deleting surrounding guidance, and apply only at a turn boundary so `systemKey`/`toolsKey` stay stable. [F-signature-map.md]
```

**spec:126 — hard-preserve list (must stay byte-stable; context only, do not edit):**
```
- **Hard-preserve contracts — never rewrite:** built-in tool ids; `mcp__<server>_<tool>` and `mcp_ide-tools_<name>` prefixes; internal URL schemes (`omp://`, `local://`, `artifact://`, `agent://`, `proc://`, `history://`, `ssh://`, `skill://`, `pr://`, `mr://`); `skill://<name>` plus the MUST-read-first rule; `xd://<tool>`/`write`; `agy_<uuid>` call ids, `antigravityCli` payload fields (`conversationId`, `digest`, optional checkpoint) and the transcriptDigest-hashed prefix; `systemKey`/`toolsKey` mid-turn; ACP `_meta` keys; fixed argv/env and forced `SSH_TTY`/`AGY_CLI_DISABLE_AUTO_UPDATE`; OAuth client id/secret and credential envelope; HTTP headers/UA/TLS/CCA labels/requestId/sessionId; `metadata.user_id` gating. `PI_AGY_PATH` is technically rewritable but is a hard preserve in practice — a shim drops the genuine signed-CLI fingerprint. [F-signature-map.md]
```

### R6–R9 detail from the research map — do not re-litigate

- **R6 "Tool Policy" prose** (`F-signature-map.md:126-150`): rewrite the prose/labels only; keep every named tool id and the `xd://report_issue` line. The After block's ids are all real advertised tools — `find` **is** in the installed 18.22.2 `BUILTIN_TOOL_NAMES`. The R6 problem is literal/heading drift in the prompt template, **not** a non-existent tool. Never remove or rename tool ids to "fix" R6.
- **R7 persona names** (`F-signature-map.md:152-164`): `Caveman` / `Ponytail` / `Unslop` → neutral working-style wording; prose only, no tool/scheme references.
- **R8 `use-superpowers` entry** (`F-signature-map.md:166-173`): drop the one line; the surrounding `<skills>` block and other entries stay untouched. **Do NOT rename the skill** — skill resolution uses the exact name and a renamed token would break dispatch. This is why R8 is the sole documented deletion exception to "replace, don't delete".
- **R9 "Delegation" prose** (`F-signature-map.md:175+`): rewrite the prose only; keep `task`/`wait` ids if advertised.
- **R2** (`spec:125`): keep `skill://<name>` and the MUST-read-first rule verbatim — this must be stated explicitly in the promoted wording.

### Core invariants — must remain byte-stable (default OFF / manual toggle)

These lines are NOT in scope; the edits below must not change their meaning or key phrases. `spec:16` "Stay **inert by default (OFF)**"; `spec:17` "Expose exactly one explicit `/agy-byp on|off|status` slash command as the only manual toggle"; `spec:57` "**Explicit activation, default OFF:**"; `spec:58` "**The command is the only state writer:**" with "makes **no** pause, deactivate, or unpause call"; `spec:64` "**Config tunes behaviour, not activation:**". Promotion of R6–R9 widens *which prose is scrubbed once the plugin is on* — it never changes activation, toggling, unpause, config gating, headers/TLS or any preserve contract.

## Commands you will need

All commands are docs-only; run from the repo root.

| Purpose | Command | Expected on success |
| --- | --- | --- |
| Drift/baseline | `rg -n '<baseline patterns>' <spec>` | matches `Tool Inventory` + old claim; **no** `sole documented deletion` yet |
| Target strings | `rg -n '<promoted-scope patterns>' <spec>` | matches on all promoted lines |
| Stale strings | `rg -n '<stale patterns>' <spec>` | exit 1, **no** matches |
| Core invariants | `rg -n '<core-invariant phrases>' <spec>` | all five phrases still present (lines 16, 17, 57, 58, 64) |
| Whitespace gate | `git diff --check` | exit 0, no output |
| Scope gate | `git status --short` | no new files; no file outside the Scope section edited by you |

`<spec>` means `docs/superpowers/specs/2026-11-18-google-ai-subscription-provider-design.md`. Exact commands — copy verbatim; the `|` characters are regex alternation inside the single quotes, not shell pipes, so keep them quoted:

```bash
# baseline
rg -n 'Tool Inventory|It does not change the core decisions above|sole documented deletion' docs/superpowers/specs/2026-11-18-google-ai-subscription-provider-design.md
# promoted scope
rg -n 'sole documented deletion|skill resolution uses the exact name|MUST-read-first rule verbatim|Tool Policy|persona names|Delegation' docs/superpowers/specs/2026-11-18-google-ai-subscription-provider-design.md
# stale strings (expect exit 1, no matches)
rg -n 'It does not change the core decisions above|rather than deleting surrounding guidance, and apply only at a turn boundary' docs/superpowers/specs/2026-11-18-google-ai-subscription-provider-design.md
# core invariants (default-off / manual toggle)
rg -n 'inert by default \(OFF\)|only manual toggle|Explicit activation, default OFF:|The command is the only state writer:|Config tunes behaviour, not activation' docs/superpowers/specs/2026-11-18-google-ai-subscription-provider-design.md
```

## Scope

**In scope — the only file you may modify:**
- `docs/superpowers/specs/2026-11-18-google-ai-subscription-provider-design.md`

**Out of scope — do NOT touch:**
- `docs/superpowers/plans/2026-11-18-google-ai-subscription-provider.md` — another plan owns it.
- `plans/README.md` — Main maintains the index.
- `AGENTS.md`, everything under `docs/research/` (including `F-signature-map.md` and `REPORT.md`), `src/`, `package.json`, `tests/`.
- No commits, no pushes, no dependency install, no test runs.

## Git workflow

- Do not branch, commit, or push. Main owns integration.
- Preserve the existing uncommitted signature-addendum edits; apply only the edits below.

## Steps

### Step 0: Verify drift and the exact baseline

1. Run the drift/baseline command from "Commands you will need".
2. Confirm the live spec still matches the five "Current state" excerpts, especially that `spec:125` contains `R8 drop the \`use-superpowers\` skill entry rather than renaming it` and the trailing `Replace with neutral wording rather than deleting surrounding guidance, and apply only at a turn boundary`.
3. Confirm the core-invariant phrases are present.

**Verify**: `rg -n 'It does not change the core decisions above|use-superpowers|inert by default \(OFF\)' docs/superpowers/specs/2026-11-18-google-ai-subscription-provider-design.md` → matches on lines 102, 125/126 and 16. If any expected excerpt is missing or reworded, the spec drifted → STOP.

### Step 1: Promote R6–R9 into the Goals rewrite bullet (spec:14)

Replace `spec:14` **in place** with the target below. It adds R6 "Tool Policy", R7 persona names, R8 the `use-superpowers` entry and R9 "Delegation" to the authoritative Goals scope, states R8 is the sole deletion exception with the exact-name reason, and keeps the R2 MUST-read rule verbatim. Keep the tool-description and functional-URL rules from the current line.

**target:**
```
- Rewrite omp-specific documentation markers — the full R1–R9 prose/label scope: the role line; the `Internal URLs`, `xd:// Tool Devices`, `Skills & Rules`, `Tool Inventory`/preset, `Tool Policy` and `Delegation` headings/labels; persona names; and the `use-superpowers` skill entry — before they are supplied to the model. Rewrite prose/labels only, never identifiers: keep the `skill://<name>` and MUST-read-first rule verbatim (R2), every internal URL scheme string, tool ids, the `xd://report_issue` line and `task`/`wait` ids byte-stable. R8 (`use-superpowers`) is the sole documented deletion — drop that one entry rather than renaming it because skill resolution uses the exact name; every other target is replaced with neutral wording, not deleted. Functional internal URL schemes (including `skill://`) are never otherwise rewritten. Tool descriptions are rewritten only on the HTTP CCA payload seam and only when `OMP_AGY_BYP_SCRUB_TOOL_DESCRIPTIONS=1`; on `antigravity-cli` they stay verbatim in v1. [F-signature.md] [F-signature-map.md] [F-antigravity-cli-hooks.md]
```

**Verify**: `rg -n 'full R1–R9 prose/label scope|sole documented deletion|skill resolution uses the exact name|MUST-read-first rule verbatim \(R2\)' docs/superpowers/specs/2026-11-18-google-ai-subscription-provider-design.md` → all four match on line 14.

### Step 2: Promote R6–R9 into the Decisions "Scrub targets" bullet (spec:61)

Replace `spec:61` **in place** with the target below. This is the canonical, most detailed enumeration: it names R1–R9 explicitly, states R2's MUST-read rule verbatim, records R8 as the single deletion exception with its reason, and keeps "replace, don't delete", the tool-description gate, and the turn-boundary/`systemKey`/`toolsKey` rule.

**target:**
```
- **Scrub targets:** the canonical R1–R9 prose/label scope — the literal `You are omp's trusted coding assistant` role line (R1); the `Skills & Rules` heading prose (R2 — keep `skill://<name>` and the MUST-read-first rule verbatim); the `Internal URLs` prose (R3 — keep every scheme string); the `xd:// Tool Devices` prose (R4 — keep `xd://<tool>` and `write`); the `Tool Inventory` label (R5 — keep the name list byte-identical); the `Tool Policy` prose (R6 — keep every named tool id and the `xd://report_issue` line); persona names → neutral working-style wording (R7); the `use-superpowers` skill entry (R8 — the **sole documented deletion**: drop that one entry rather than renaming it because skill resolution uses the exact name); and the `Delegation` prose (R9 — keep `task`/`wait` ids). Replace with neutral, generic wording rather than deleting the surrounding guidance; R8 is the only exception. Only documentation/marker text in prompt prose is rewritten: functional URL schemes (including `skill://` everywhere except that literal rule line) and tool-call payloads are never renamed. Tool descriptions are a target only on the HTTP CCA payload seam and only with the opt-in flag, never on `antigravity-cli`. Apply only at a turn boundary so `systemKey`/`toolsKey` stay stable. [F-signature.md] [F-signature-map.md] [F-antigravity-cli-hooks.md]
```

**Verify**: `rg -n 'canonical R1–R9 prose/label scope|\(R6 — keep every named tool id|sole documented deletion|\(R9 — keep `task`/`wait` ids\)|R8 is the only exception' docs/superpowers/specs/2026-11-18-google-ai-subscription-provider-design.md` → all five match on line 61.

### Step 3: Reconcile the addendum so it no longer reads as a second scope (spec:102, 123, 125)

The addendum must point at the promoted Goals/Decisions list as the single source of truth, drop the false "does not change the core decisions" claim, and fix the R8/deletion contradiction. Replace each listed line **in place**; keep the hard-preserve line `spec:126` untouched.

**spec:102 — target:**
```
This addendum records the signature-mapping pass. Its R1–R9 safe-to-rewrite scope is now promoted into the Goals and Decisions **Scrub targets** above; the core decisions remain unchanged — the plugin stays default OFF, manual-toggle-only and content-only. It explains why the existing "no header/TLS spoofing, no provider rotation, no detector-efficacy claim" boundaries are deliberate rather than incidental. [REPORT.md]
```

**spec:123 — target:**
```
On the primary CLI path only three model-visible content surfaces exist — the joined system prompt (ACP `_meta.antigravity.systemPrompt.append`), messages/context, and tool descriptions — and `before_agent_start` / `context` are the only reachable rewrite seams. F-signature-map.md classifies each omp marker (R1–R9) into text safe to rewrite versus contracts that must stay byte-stable; that R1–R9 list is the canonical **Scrub targets** scope in the Goals and Decisions above, not a second or wider scope. This is a **reachability map, not evidence of detector efficacy**: no source ties omp prompt strings or tool names to upstream enforcement, and any rewrite remains gated by the Decisions above (default OFF, manual toggle, contract preservation). [F-signature-map.md] [REPORT.md]
```

**spec:125 — target:**
```
- **Safe to rewrite — prose/labels only (R1–R9; canonical scope in Goals/Decisions "Scrub targets"):** R1 role line; R2 "Skills & Rules" heading prose (keep `skill://<name>` and the MUST-read-first rule verbatim); R3 "Internal URLs" prose (keep every scheme string); R4 "xd:// Tool Devices" prose (keep `xd://<tool>` and `write`); R5 "Tool Inventory" label (keep the name list byte-identical); R6 "Tool Policy" prose (keep every named tool id and the `xd://report_issue` line); R7 persona names → neutral working-style wording; R8 drop the `use-superpowers` skill entry rather than renaming it — the sole documented deletion, because skill resolution uses the exact name; R9 "Delegation" prose (keep `task`/`wait` ids). Replace with neutral wording rather than deleting surrounding guidance; R8 is the only exception. Apply only at a turn boundary so `systemKey`/`toolsKey` stay stable. [F-signature-map.md]
```

**Verify**: `rg -n 'now promoted into the Goals and Decisions|not a second or wider scope|canonical scope in Goals/Decisions|R8 is the only exception' docs/superpowers/specs/2026-11-18-google-ai-subscription-provider-design.md` → matches on lines 102, 123 and 125. Then run the "Stale strings" and "Core invariants" checks from "Commands you will need": stale → exit 1 no matches; invariants → all five phrases present.

### Step 4: Final gate

Run, in order:
1. `git diff --check` → exit 0, no output.
2. `git status --short` → the spec is the only file you changed; no new files created.
3. Re-run the full "Target strings", "Stale strings" and "Core invariants" commands from "Commands you will need" and confirm each expected result.

**Verify**: all three commands above produce their stated results.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `rg -n 'sole documented deletion|skill resolution uses the exact name' docs/superpowers/specs/2026-11-18-google-ai-subscription-provider-design.md` → matches on lines 14, 61 and 125 (R8 exception stated in Goals, Decisions and addendum).
- [ ] `rg -n 'MUST-read-first rule verbatim' docs/superpowers/specs/2026-11-18-google-ai-subscription-provider-design.md` → matches on lines 14, 61 and 125 (R2 verbatim).
- [ ] `rg -n 'It does not change the core decisions above|rather than deleting surrounding guidance, and apply only at a turn boundary' docs/superpowers/specs/2026-11-18-google-ai-subscription-provider-design.md` → exit 1, no matches.
- [ ] `rg -n 'inert by default \(OFF\)|only manual toggle|Explicit activation, default OFF:|The command is the only state writer:|Config tunes behaviour, not activation' docs/superpowers/specs/2026-11-18-google-ai-subscription-provider-design.md` → all five present (default-off/manual-toggle core unchanged).
- [ ] The hard-preserve line `spec:126` and all tool ids in it (including `find`, which is a real 18.22.2 built-in) are byte-unchanged.
- [ ] `git diff --check` exit 0, no output.
- [ ] `git status --short` shows no file outside the Scope section modified by you and no new files.

## STOP conditions

Stop and report back (do not improvise) if:

- Any "Current state" excerpt does not match the live working-tree spec (the document drifted since this plan was written).
- A verification fails twice after a careful re-application of the target text.
- The fix appears to require editing the plan file, `F-signature-map.md`, `REPORT.md`, `plans/README.md`, or any source/config file — all are out of scope.
- You are tempted to remove or rename a tool id (for example `find`) while rewriting R6 prose: those ids are real advertised tools; this is template/literal drift, not a tool-existence bug.
- You are tempted to rename the `use-superpowers` skill token: R8 is a deletion, not a rename, because skill resolution uses the exact name.
- The default-OFF, manual-toggle-only or content-only wording changes in any way.

## Maintenance notes

- This plan resolves audit finding DOCS-01 (the addendum's R1–R9 scope exceeded the governing Goals/Decisions) by **promotion**, so the research map's R6–R9 are now contract, not stray evidence. If the R1–R9 classification in `F-signature-map.md` changes, update the Goals and Decisions enumerations in lockstep with the addendum.
- A future implementer should scrub exactly the promoted R1–R9 prose once enabled, with R2 kept verbatim and R8 dropped (not renamed) as the single deletion; all other preserves and the default-OFF toggle remain authoritative.
- Reviewer focus: confirm there is one authoritative scope (Goals `:14`, Decisions `:61`, addendum `:102/:123/:125` all agree), and that no activation/transport text was broadened.
