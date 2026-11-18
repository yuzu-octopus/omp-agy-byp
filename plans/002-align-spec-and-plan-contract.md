# Plan 002: Align the design spec and implementation plan on one canonical contract

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving on. If anything in the "STOP conditions" section occurs, stop and report — do not improvise. This is a **documentation-only** plan: edit only the two files in the Scope section. Do not create or modify plugin source, `package.json`, `tests/`, or any other file; do not install dependencies, run the test suite, commit, or push. The implementation steps quoted inside the plan are contract text to be corrected, not work to perform now.
>
> **Drift check (run first)**: `git diff --stat 1e75876 -- docs/superpowers/specs/2026-11-18-google-ai-subscription-provider-design.md docs/superpowers/plans/2026-11-18-google-ai-subscription-provider.md`
> Both files already carry uncommitted pivot edits at planning time, so `git diff --stat 1e75876..HEAD -- <same paths>` prints nothing and is **not** the right check. Confirm the "Current state" excerpts below against the live working-tree files before editing; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW (documentation only; no runtime code depends on these files)
- **Depends on**: none
- **Category**: docs
- **Planned at**: commit `1e75876`, 2026-11-18
- **Issue**: none

## Why this matters

The spec is the contract a reviewer checks; the plan is the executable specification an implementer follows. Today they contradict each other on tool-description scrubbing, `off`/unpause semantics, hook signatures, the command surface, the internal-URL preserve list, and the unpause mechanism, and the plan contains five self-inflicted executor traps (an impossible host fixture, a sorted-order assertion that fails on correct code, red tests run before install, a `Msg` type that contradicts its implementation, and an undefined "SDD ledger"). An agent following either document alone will build the wrong behavior or fail its own tests. This plan makes the **plan's tested behavior** the single canonical contract and edits both documents to say exactly the same thing.

## Current state

### Files and roles

- `docs/superpowers/specs/2026-11-18-google-ai-subscription-provider-design.md` — design contract (101 lines); lines 5–101 are the intent, decisions, data flow, Interfaces and Risks. Abbreviated below as **spec**.
- `docs/superpowers/plans/2026-11-18-google-ai-subscription-provider.md` — 675-line implementation plan; the behavioral ground truth because its tests pin the semantics. Abbreviated below as **plan**.
- `docs/research/omp-antigravity-investigation/F-antigravity-cli-hooks.md` — reachability evidence used in the target wording. **Read-only for this plan.**
- Repo convention: `AGENTS.md` says research lives under `docs/research/`, the future extension has no code yet, and only docs are edited in this phase. Match the documents' existing bullets, backticks and `[F-*.md]` citation style; do not restyle unrelated lines.

### Canonical contract (the decision — do not re-litigate it)

1. **Default OFF.** At load, `state.enabled = false`; hooks are registered but return `undefined` and perform no rewrite. No unpause, no config write, no network call.
2. **Exactly three hooks and one command.** `before_agent_start`, `context`, `before_provider_request`; a single `/agy-byp on|off|status` command. No `enable`/`disable` aliases, no `agy-byp-status` shortcut, no `getState()`, no `toggleCommand`, no `registerAgyByp`.
3. **Tool-description scrubbing is opt-in and HTTP-only.** `OMP_AGY_BYP_SCRUB_TOOL_DESCRIPTIONS=1` is **off by default** and only affects `scrubPayload()` on the HTTP-backed `google-antigravity`/`google-gemini-cli` seam. On `antigravity-cli`, tool names, ids and descriptions are left verbatim because re-registering tools changes `toolsKey` and can abandon a parked turn (`F-antigravity-cli-hooks.md:27`).
4. **`off` disables hooks only.** It makes **no** pause, deactivate, or unpause call. The host owns the lifetime of an unpause; the plugin never withdraws or persists it.
5. **Unpause uses the installed 18.22.2 host API, verified.** `setUnpausedProviders(providers: Iterable<string>): void` and `providerPauseReason(provider: string): string | undefined` from `@oh-my-pi/pi-ai/registry/oauth`. `auth.unpausedProviders` is a real operator-layer setting, ignored from a project layer.
6. **Signatures are the plan's:** `scrubSystemPrompt(systemPrompt, config)`, `scrubContextMessages(messages, config)`, `scrubPayload<T>(payload, config)`, `createExtension(deps)`, `ToggleState = { enabled: boolean }`.

### Verified host facts (inline evidence — do not re-derive)

- Installed `@oh-my-pi/pi-ai` and `@oh-my-pi/pi-coding-agent` are **18.22.2** (`package.json` version fields).
- `setUnpausedProviders(providers: Iterable<string>): void` — installed `pi-ai/src/registry/oauth/index.ts:62` — replaces the whole list; ids that are not paused are ignored (`:56-67`).
- `providerPauseReason(provider: string): string | undefined` — same file `:97`.
- Both `@oh-my-pi/pi-ai/registry/oauth` and `@oh-my-pi/pi-ai/oauth` resolve to that module (`pi-ai/package.json:123-137`). Keep the plan's existing `@oh-my-pi/pi-ai/registry/oauth` specifier; do not add a second one.
- `auth.unpausedProviders` exists as `cfgAuthUnpausedProviders` (`pi-coding-agent/src/config/model-settings.ts:75,90`), is operator-layer only, and is documented in `omp://settings.md` § "Paused providers" and `pi-catalog/src/compat/rules/README.md:424`.
- `antigravity-cli`'s built-in API id is `antigravity-acp`; `google-antigravity` is a separate HTTP fallback (`F-antigravity-cli-source.md:9-11`).
- The full internal-URL preserve list is `omp://`, `local://`, `artifact://`, `agent://`, `proc://`, `history://`, `ssh://`, `skill://`, `pr://`/`mr://` (`F-antigravity-cli-hooks.md:28`). The spec's list omits `history://` and `mr://`.

### Finding → location map

| # | Finding | Stale location(s) | Canonical direction |
| --- | --- | --- | --- |
| 1 | Tool-description scrub default/reachability | spec:14, 46, 60, 61, 64, 72, 95 | plan:26, 259, 622, 627 — off by default, HTTP only |
| 2 | `off`/unpause semantics | spec:17, 58, 70, 76, 87 | plan:21, 477, 619, 571–582 — no call on `off` |
| 3 | Interfaces/signatures + inert return | spec:57, 78–88 | plan:284, 347, 477, 614–616, 533–537 |
| 4 | Aliases / status shortcut / getState | spec:17, 58, 86–88 | plan:22, 477, 531, 617–622 — remove from spec |
| 5 | Internal URL preserve list | spec:62 (also 14, 61) | add `history://`, `mr://`; heading-vs-scheme rule |
| 6 | Unpause mechanism verification | spec:58; plan:143, 620 | record verified 18.22.2 signatures and config key |
| 7 | Host fixture api/provider pair | plan:126–127 | `api: "antigravity-acp"`, `provider: "antigravity-cli"` |
| 8 | Sorted hook test | plan:526–530 | drop `.sort()`; assert registration order |
| 9 | Install before red tests | plan:59–87, 145–147 | install becomes Step 0; Step 8 is commit only |
| 10 | `Msg.content` type | plan:347, 454, 425–442 | widen to `string | Part[]` and add a string-content test |
| 11 | Deferred banner | plan:3 | add prominent "do not execute" banner |
| 12 | SDD ledger | plan:675, 629, 637 | name `HANDOFF.md` `## Verification ledger` + format |
| 13 | Biome indentation | plan:103 | two spaces + double quotes, matching every snippet |

## Commands you will need

All commands are docs-only; run from the repo root.

| Purpose | Command | Expected on success |
| --- | --- | --- |
| Drift check | `git diff --stat 1e75876 -- <two doc paths>` | shows the two docs; excerpts match "Current state" |
| Whitespace gate | `git diff --check` | exit 0, no output |
| Stale-string sweep | `rg -n '<stale patterns>' <two doc paths>` | exit 1, **no** matches |
| Target-string sweep | `rg -n '<target patterns>' <two doc paths>` | each expected pattern present |
| Scope gate | `git status --short` | only the two docs modified; never touch the untracked `docs/research/omp-antigravity-investigation/` tree |

## Scope

**In scope — the only files you may modify:**
- `docs/superpowers/specs/2026-11-18-google-ai-subscription-provider-design.md`
- `docs/superpowers/plans/2026-11-18-google-ai-subscription-provider.md`

**Out of scope — do NOT touch:**
- `src/`, `package.json`, `tsconfig.json`, `biome.json`, `tests/`, `README.md`, `HANDOFF.md` (the plan only *describes* these; it must not create them).
- `AGENTS.md`, `plans/README.md`, and everything under `docs/research/` — other plans own those files.
- No commits, no pushes, no dependency install, no test runs.

## Git workflow

- Do not branch, commit, or push. Main owns integration.
- Preserve the existing uncommitted state of both documents; apply only the edits below.

## Steps

### Step 0: Verify drift and the baseline

1. Run the drift check from "Commands you will need".
2. Confirm these exact strings exist: `default enabled` (spec:64), `getState(): AgyBypState` (spec:86), `Object.keys(hooks).sort()` (plan:526), `api: "google-antigravity"` (plan:127), `tabs and double quotes` (plan:103), `SDD ledger` (plan:675).

**Verify**: `rg -n 'default enabled|getState\(\): AgyBypState|Object.keys\(hooks\)\.sort\(\)|api: "google-antigravity"|tabs and double quotes|SDD ledger' docs/superpowers/specs/2026-11-18-google-ai-subscription-provider-design.md docs/superpowers/plans/2026-11-18-google-ai-subscription-provider.md` → at least 6 matches, one per string. If any is missing, the documents drifted → STOP.

### Step 1: Spec — command semantics and hook contract (findings 2, 3, 4)

Replace each listed line **in place** with the target text. Keep the surrounding section and citation style.

**spec:14** — current:
```
- Rewrite omp-specific content signatures — the literal role line, `Internal URLs`, `xd://`, `skill://`, `Skills & Rules`, `Tool Inventory`/preset markers and tool descriptions — before they are supplied to the model. [F-signature.md]
```
target:
```
- Rewrite omp-specific documentation markers — the literal role line, the `Internal URLs` and `xd://` headings, the `Skills & Rules` heading/rule line, and `Tool Inventory`/preset markers — before they are supplied to the model. Functional internal URL schemes (including `skill://`) are never rewritten. Tool descriptions are rewritten only on the HTTP CCA payload seam and only when `OMP_AGY_BYP_SCRUB_TOOL_DESCRIPTIONS=1`; on `antigravity-cli` they stay verbatim in v1. [F-signature.md] [F-antigravity-cli-hooks.md]
```

**spec:17** — current:
```
- Expose an explicit `/agy-byp on|off|status` slash command (aliases `enable`/`disable`) as the only manual toggle — the sole thing that activates, deactivates, or requests a provider unpause.
```
target:
```
- Expose exactly one explicit `/agy-byp on|off|status` slash command as the only manual toggle: `on` enables the hooks and requests the fallback unpause, `off` only disables the hooks, and `status` reports state. There are no aliases and no status shortcut, and no provider deactivation or re-pause.
```

**spec:46** — current table row:
```
| `antigravity-cli` (API `antigravity-acp`) | Primary, supported CLI path | Prompt, messages and tool descriptions supplied over ACP | `agy` binary, CLI-owned identity, OAuth grant/refresh, ACP/IDE bridge, tool execution |
```
target:
```
| `antigravity-cli` (API `antigravity-acp`) | Primary, supported CLI path | Prompt and messages supplied over ACP; tool descriptions are left verbatim in v1 | `agy` binary, CLI-owned identity, OAuth grant/refresh, ACP/IDE bridge, tool execution |
```

**spec:57** — current:
```
- **Explicit activation, default OFF:** at load the factory registers hooks and the command, loads config, and sets state to off. Hooks are registered but inert — they return their inputs unchanged. Nothing is unpaused, no provider is enabled or disabled, no config file is written, and no network call is made at load.
```
target:
```
- **Explicit activation, default OFF:** at load the factory registers hooks and the command, loads config, and sets state to off. Hooks are registered but inert — they return `undefined` and perform no rewrite, so omp's inputs pass through untouched. Nothing is unpaused, no provider is enabled or disabled, no config file is written, and no network call is made at load.
```

**spec:58** — current:
```
- **The command is the only state writer:** `/agy-byp on` (alias `enable`) makes the hooks apply and requests unpause of the `google-antigravity` fallback; `/agy-byp off` (alias `disable`) makes them inert again and withdraws that request on a best-effort basis, without editing config; `/agy-byp status` reports state. Invoked as the omp slash command `/agy-byp on|off|status`. An `agy-byp-status` shortcut maps to `status`. The unpause surface affects only the HTTP fallback, never `antigravity-cli`. The host API governs how long an unpause request lives; the plugin never persists it itself. [F-antigravity-cli-source.md]
```
target:
```
- **The command is the only state writer:** `/agy-byp on` enables the hooks and, when `unpauseFallback` is true, calls `unpause(['google-antigravity'])`; `/agy-byp off` only sets `state.enabled = false` and makes **no** pause, deactivate, or unpause call; `/agy-byp status` reports state. There are no aliases and no `agy-byp-status` shortcut. The unpause surface affects only the HTTP fallback, never `antigravity-cli`. The host owns the lifetime of the unpause; the plugin never persists or withdraws it. [F-antigravity-cli-source.md]
```

**spec:60** — current:
```
- **Narrow CLI scope:** the reachable surfaces on the CLI path are the system prompt via `before_agent_start`, messages via `input`/`context`, tool name/description/schema via `registerTool`/`setActiveTools`, tool args/results via `tool_call`/`tool_result`, visible text via `assistant_message`, and env/`PI_AGY_PATH` before first spawn. The plugin deliberately limits itself to prompt, messages and tool descriptions; it never renames tools, intercepts tool arguments or results, rewrites assistant output, or changes the environment. [F-antigravity-cli-hooks.md]
```
target:
```
- **Narrow CLI scope:** the reachable surfaces on the CLI path are the system prompt via `before_agent_start`, messages via `input`/`context`, tool name/description/schema via `registerTool`/`setActiveTools`, tool args/results via `tool_call`/`tool_result`, visible text via `assistant_message`, and env/`PI_AGY_PATH` before first spawn. The plugin deliberately limits itself to prompt and messages; it leaves tool descriptions verbatim in v1 — re-registering tools changes `toolsKey` and can abandon a parked turn — and never renames tools, intercepts tool arguments or results, rewrites assistant output, or changes the environment. [F-antigravity-cli-hooks.md]
```

**Verify**: `rg -n 'withdraws that request on a best-effort basis|return their inputs unchanged|and tool descriptions supplied over ACP|shortcut maps to' docs/superpowers/specs/2026-11-18-google-ai-subscription-provider-design.md` → exit 1, no matches. These four phrases exist only in the lines edited in this step; the remaining stale phrases are removed in Step 2, so do not check them yet.

### Step 2: Spec — scrub targets, preserve list, config, data flow, Interfaces (findings 1, 2, 3, 4, 5, 6)

**spec:61** — current:
```
- **Scrub targets:** the literal `You are omp's trusted coding assistant` role line; the `Internal URLs` and `xd://` Tool Devices sections; `skill://` and the `Skills & Rules` section; `Tool Inventory`/preset markers; and tool descriptions when enabled. Replace with neutral, generic wording rather than deleting the surrounding guidance. Only documentation/marker text in prompt prose is rewritten: functional URL schemes and tool-call payloads are never renamed. [F-signature.md] [F-antigravity-cli-hooks.md]
```
target:
```
- **Scrub targets:** the literal `You are omp's trusted coding assistant` role line; the `Internal URLs` and `xd://` Tool Devices headings; the `Skills & Rules` heading and `skill://` rule line; and `Tool Inventory`/preset markers. Tool descriptions are a target only on the HTTP CCA payload seam and only with the opt-in flag, never on `antigravity-cli`. Replace with neutral, generic wording rather than deleting the surrounding guidance. Only documentation/marker text in prompt prose is rewritten: functional URL schemes (including `skill://` everywhere except that literal rule line) and tool-call payloads are never renamed. [F-signature.md] [F-antigravity-cli-hooks.md]
```

**spec:62** — current:
```
- **Preserve:** tool names (bare in omp, `mcp_ide-tools_<name>` inside agy), built-in tool ids, `mcp__`/`mcp_ide-tools_` prefixes, tool-call ids (`agy_<uuid>` in the ACP path) and tool-result pairing, agy-internal tools such as `manage_task`, internal URL schemes (`omp://`, `local://`, `artifact://`, `agent://`, `proc://`, `skill://`, `ssh://`, `pr://`), ACP conversation and turn boundaries, and on CCA paths the request envelope (`sessionId`, `requestId`, `labels`), tool declarations and thought-signature parts. Never rewrite these. [F-signature.md] [F-antigravity-cli-source.md] [F-antigravity-cli-hooks.md]
```
target:
```
- **Preserve:** tool names (bare in omp, `mcp_ide-tools_<name>` inside agy), built-in tool ids, `mcp__`/`mcp_ide-tools_` prefixes, tool-call ids (`agy_<uuid>` in the ACP path) and tool-result pairing, agy-internal tools such as `manage_task`, every internal URL scheme (`omp://`, `local://`, `artifact://`, `agent://`, `proc://`, `history://`, `ssh://`, `skill://`, `pr://`, `mr://`), ACP conversation and turn boundaries, and on CCA paths the request envelope (`sessionId`, `requestId`, `labels`), tool declarations and thought-signature parts. Never rewrite these; `skill://` is preserved except in the literal rule line named above. [F-signature.md] [F-antigravity-cli-source.md] [F-antigravity-cli-hooks.md]
```

**spec:64** — current:
```
- **Config tunes behaviour, not activation:** `OMP_AGY_BYP_MODE=generic|native`, default `generic` (scrubbing active once on); `native` is a pass-through mode. `OMP_AGY_BYP_SCRUB_TOOL_DESCRIPTIONS=1`, default enabled; set `0` to keep tool descriptions verbatim. Neither variable can turn the plugin on or request unpause.
```
target:
```
- **Config tunes behaviour, not activation:** `OMP_AGY_BYP_MODE=generic|native`, default `generic` (scrubbing active once on); `native` is a pass-through mode. `OMP_AGY_BYP_SCRUB_TOOL_DESCRIPTIONS=1` opt-in, default off (`0`/unset keeps descriptions verbatim); it affects only the HTTP CCA payload seam, never `antigravity-cli`. `OMP_AGY_BYP_UNPAUSE_FALLBACK=0` disables the fallback unpause. None of these variables can turn the plugin on or request unpause on its own.
```

**spec:70** — current:
```
2. **Explicit opt-in:** the user runs `/agy-byp on`. Only then do hooks apply and only then is the `google-antigravity` unpause requested. `/agy-byp off` reverses both; `/agy-byp status` reports them.
```
target:
```
2. **Explicit opt-in:** the user runs `/agy-byp on`. Only then do hooks apply and only then is the `google-antigravity` unpause requested (when `unpauseFallback` is true). `/agy-byp off` disables the hooks only — it makes no pause/deactivate/unpause call, so the host-controlled unpause persists for its lifetime; `/agy-byp status` reports toggle state, pause reason, mode and flags.
```

**spec:72** — current:
```
4. **Tool bridge:** tool schemas and descriptions cross a loopback MCP bridge; names and call ids (`agy_<uuid>`) are untouched, descriptions scrubbed only when the flag is on. agy presents tool names as `mcp_ide-tools_<name>`; omp keeps execution and approvals. [F-antigravity-cli-source.md]
```
target:
```
4. **Tool bridge:** tool schemas and descriptions cross a loopback MCP bridge; names, call ids (`agy_<uuid>`) and descriptions are all passed through verbatim in v1. Re-registering tools to change descriptions would change `toolsKey` and can abandon a parked turn. agy presents tool names as `mcp_ide-tools_<name>`; omp keeps execution and approvals. [F-antigravity-cli-source.md] [F-antigravity-cli-hooks.md]
```

**spec:76** — current:
```
8. **Status:** `/agy-byp status` reports effective activation, unpause-request state, mode, scrub flag, and whether omp markers were detected in the last rewritten payload — without secrets.
```
target:
```
8. **Status:** `/agy-byp status` reports effective activation, the fallback's pause reason (`providerPauseReason('google-antigravity') ?? 'not paused'`), mode, scrub flags, and config guidance naming `auth.unpausedProviders` — without secrets.
```

**spec:95** — current:
```
- **Tool rewrites break the loop.** Renaming built-in tool ids, inventing `mcp__`/`mcp_ide-tools_` prefixes, touching agy-internal `manage_task`, changing `agy_<uuid>` call ids, rewriting internal URL schemes, or splitting tool-call/result turns breaks tool execution and the agy MCP bridge; only descriptions are ever touched, and only behind the flag. [F-signature.md] [F-antigravity-cli-hooks.md]
```
target:
```
- **Tool rewrites break the loop.** Renaming built-in tool ids, inventing `mcp__`/`mcp_ide-tools_` prefixes, touching agy-internal `manage_task`, changing `agy_<uuid>` call ids, rewriting internal URL schemes, or splitting tool-call/result turns breaks tool execution and the agy MCP bridge; only descriptions are ever touched, and only on the HTTP CCA payload seam behind the flag — on `antigravity-cli` even descriptions stay verbatim, because re-registering tools changes `toolsKey` and can abandon a parked turn. [F-signature.md] [F-antigravity-cli-hooks.md]
```

**spec:78–88** — replace the whole `## Interfaces` section block (from the heading through the `agy-byp-status` bullet) with:
```
## Interfaces

- `loadConfig(env: NodeJS.ProcessEnv): PluginConfig` — returns `mode: "generic" | "native"`, `scrubToolDescriptions: boolean` (default `false`), `unpauseFallback: boolean` (default `true`); never an activation switch.
- `scrubSystemPrompt(systemPrompt: string[], config: PluginConfig): string[]` — `before_agent_start` handler; called only while enabled; returns the rewritten prompt array.
- `scrubContextMessages(messages: readonly Msg[], config: PluginConfig): Msg[]` — `context` handler; called only while enabled.
- `scrubPayload<T extends Record<string, unknown>>(payload: T, config: PluginConfig): T` — `before_provider_request` handler; HTTP-backed `google-antigravity`/`google-gemini-cli` only, never `antigravity-cli`; tool descriptions only when `config.scrubToolDescriptions` is true.
- `createExtension(deps: ExtensionDeps): (pi: ExtensionAPI) => void` — the default-exported factory; `ExtensionDeps = { unpause: (ids: string[]) => void; pauseReason: (provider: string) => string | undefined; config: PluginConfig; state: ToggleState }`; `ToggleState = { enabled: boolean }`.
- `/agy-byp on|off|status` — one slash command handled inside the factory: `on` sets `state.enabled = true` and, when `config.unpauseFallback`, calls `unpause(['google-antigravity'])`; `off` sets `state.enabled = false` and makes no pause/deactivate/unpause call; `status` reports state, pause reason, mode, flags and `auth.unpausedProviders` guidance. No aliases, no `agy-byp-status` shortcut, no `getState()`.
- Inert return value: every hook returns `undefined` while `state.enabled` is false (or while the provider is out of scope), so omp's inputs are not rewritten.
- **Host API contract (verified on installed 18.22.2):** `setUnpausedProviders(providers: Iterable<string>): void` and `providerPauseReason(provider: string): string | undefined` from `@oh-my-pi/pi-ai/registry/oauth` (installed `pi-ai/src/registry/oauth/index.ts:62,97`); `setUnpausedProviders` replaces the whole list and ignores ids that are not paused. The operator-layer `auth.unpausedProviders` setting is documented in `omp://settings.md` § 'Paused providers' and is ignored from a project layer (`pi-coding-agent/src/config/model-settings.ts:75,90`). The host owns the lifetime of an unpause; the plugin never persists it. [F-antigravity-cli-source.md]
```
Do not leave a trailing copy of the old bullets after the `## Risks` heading.

**Verify**: `rg -n 'history://|mr://|Iterable<string>|auth.unpausedProviders|scrubContextMessages|default off|no aliases' docs/superpowers/specs/2026-11-18-google-ai-subscription-provider-design.md` → matches on all seven patterns. Then `rg -n 'default enabled|withdraws that request|reverses both|return their inputs unchanged|AgyBypConfig|AgyBypState|unpauseRequested|registerAgyByp|toggleCommand|getState\(\): AgyBypState|scrubMessages|descriptions scrubbed only when the flag is on|Tool Inventory.*preset markers and tool descriptions|only descriptions are ever touched' docs/superpowers/specs/2026-11-18-google-ai-subscription-provider-design.md` → exit 1, no matches. Use the full old signature `getState\(\): AgyBypState`: the target Interfaces text names that accessor as absent and must not be swept up.

### Step 3: Plan — deferred banner, biome config, host fixture, recorded host signatures (findings 6, 7, 11, 13)

**plan:3** — prepend this blockquote **above** the existing `> **For agentic workers:**` line; do not delete or rewrite that line:
```
> **DEFERRED — DOCUMENTATION ONLY. DO NOT EXECUTE THIS PLAN.** Not in this phase: no `src/`, `package.json`, `tests/`, `biome.json`, or other implementation files; no `bun install`, `bun test`, or `bunx`; no commits or pushes. This document is the canonical behavioral contract; the only files edited under the current scope are the two named in the header. Every implementation step below is future work, gated on explicit operator authorization.
```

**plan:103** — current:
```
`biome.json`: minimal formatter/linter config with tabs and double quotes; no rule that changes generated fixture data.
```
target:
```
`biome.json`: minimal formatter/linter config with `indentStyle: "space"`, `indentWidth: 2` (two spaces) and double quotes, so the snippets in this plan pass `biome check src tests` unchanged; no rule that changes generated fixture data.
```

**plan:127** — in the `tests/host-contract.test.ts` fixture, current:
```
      api: "google-antigravity",
      provider: "antigravity-cli",
```
target:
```
      api: "antigravity-acp",
      provider: "antigravity-cli",
```
Do not change any other field of that fixture. The pair is now the real primary-provider pair (`antigravity-cli` uses built-in API `antigravity-acp`; `google-antigravity` is the separate HTTP fallback).

**plan:143** — current:
```
Expected: PASS. Confirm the real signatures of `setUnpausedProviders` and `providerPauseReason` in the installed `18.22.2` build; if they differ from `(ids: string[]) => void` and `(provider: string) => string | undefined`, record them here before Task 5.
```
target:
```
Expected: PASS. The installed 18.22.2 signatures are verified and pinned here: `setUnpausedProviders(providers: Iterable<string>): void` (replaces the whole unpause list; ids that are not paused are ignored) and `providerPauseReason(provider: string): string | undefined`, both exported by `@oh-my-pi/pi-ai/registry/oauth` (installed `pi-ai/src/registry/oauth/index.ts:62,97`; the sibling `@oh-my-pi/pi-ai/oauth` subpath resolves to the same module). The operator-layer `auth.unpausedProviders` setting exists in `pi-coding-agent/src/config/model-settings.ts:75,90` and is documented in `omp://settings.md` § 'Paused providers'; a project-layer value is ignored. No signature check is deferred to Task 5.
```
**plan:620** — current:
```
   - `status`: notifies toggle state, the roster (`PRIMARY_PROVIDER_ID`, `FALLBACK_PROVIDER_ID`, `LEGACY_PROVIDER_ID`), `config.mode` and scrub flags, `pauseReason(FALLBACK_PROVIDER_ID) ?? "not paused"`, and config guidance naming `auth.unpausedProviders`. Never emit token or credential values.
```
target:
```
   - `status`: notifies toggle state, the roster (`PRIMARY_PROVIDER_ID`, `FALLBACK_PROVIDER_ID`, `LEGACY_PROVIDER_ID`), `config.mode` and scrub flags, `pauseReason(FALLBACK_PROVIDER_ID) ?? "not paused"`, and config guidance naming `auth.unpausedProviders` (verified in the installed 18.22.2 build; operator layers only, never a project layer). Never emit token or credential values.
```

**Verify**: `rg -n 'DEFERRED — DOCUMENTATION ONLY|indentStyle: "space"|api: "antigravity-acp"|Iterable<string>|project-layer value is ignored' docs/superpowers/plans/2026-11-18-google-ai-subscription-provider.md` → matches on all five patterns. Then `rg -n 'tabs and double quotes|api: "google-antigravity"|Confirm the real signatures|record them here before Task 5' docs/superpowers/plans/2026-11-18-google-ai-subscription-provider.md` → exit 1, no matches.

### Step 4: Plan — install order, sorted hook test, Msg type, ledger (findings 8, 9, 10, 12)

**plan:59** — insert this new block immediately **before** the existing `- [ ] **Step 1: Write the failing drift test**` line (do not renumber later steps):
```
- [ ] **Step 0: Install dependencies before any red test**

Run: `bun install`
Expected: exit 0 and `bun.lock` present. This must precede Step 1 so the first red test fails on the missing `../src/version` module rather than on missing `@oh-my-pi/*` packages, and so Task 1 Step 7 can inspect the installed signatures.
```

**plan:145–147** — current:
```
- [ ] **Step 8: Install and commit**

Run: `bun install`, then commit with subject `feat: scaffold omp plugin package`.
```
target:
```
- [ ] **Step 8: Commit**

Commit with subject `feat: scaffold omp plugin package`.
```

**plan:526–530** — current:
```
  expect(Object.keys(hooks).sort()).toEqual([
    "before_agent_start",
    "context",
    "before_provider_request",
  ]);
```
target:
```
  expect(Object.keys(hooks)).toEqual([
    "before_agent_start",
    "context",
    "before_provider_request",
  ]);
```
Reason: object key order is insertion order, which matches the registration order in Task 5 Step 3; `.sort()` produces `before_agent_start, before_provider_request, context` and would fail on correct code.

**plan:347** — current:
```
- Produces: `scrubPayload<T extends Record<string, unknown>>(payload: T, config: PluginConfig): T`; `scrubContextMessages(messages: readonly Msg[], config: PluginConfig): Msg[]` where `Msg = { role: string; content: { type: string; text?: string }[]; timestamp: number; toolCallId?: string; toolName?: string; [key: string]: unknown }`.
```
target:
```
- Produces: `scrubPayload<T extends Record<string, unknown>>(payload: T, config: PluginConfig): T`; `scrubContextMessages(messages: readonly Msg[], config: PluginConfig): Msg[]` where `Msg = { role: string; content: string | { type: string; text?: string }[]; timestamp: number; toolCallId?: string; toolName?: string; [key: string]: unknown }` (the string form is handled by the implementation below; keep the union).
```

**plan:443** — insert this test inside the `tests/payload.test.ts` code block, immediately before the closing triple-backtick (i.e. after the existing `context messages scrub text but keep tool-call ids and names` test):
```
test("context messages with string content are scrubbed", () => {
  const messages = [{ role: "user", content: "# Skills & Rules\nhi", timestamp: 1 }];
  const out = scrubContextMessages(messages, { ...DEFAULT_CONFIG, mode: "generic" });
  expect(out[0].content).toBe("# Skills\nhi");
});
```

**plan:637** — append this sentence to that HANDOFF.md paragraph (after `...OMP_AGY_BYP_MODE=native`.):
```
 Include a `## Verification ledger` heading whose entries use the format `- <YYYY-MM-DD>: <outcome>`; Task 6 Step 3 writes there.
```

**plan:675** — current:
```
If no fix is needed, record that in the SDD ledger. If a fix is needed, commit it with subject `fix: address verification findings`.
```
target:
```
If no fix is needed, append `- <YYYY-MM-DD>: gates passed; no fix needed (planned at 1e75876).` under `## Verification ledger` in `HANDOFF.md`. If a fix is needed, commit it with subject `fix: address verification findings` and append a ledger line naming that commit.
```

**Verify**: `rg -n 'Step 0: Install dependencies|content: string \| \{ type: string|context messages with string content|Verification ledger|planned at 1e75876' docs/superpowers/plans/2026-11-18-google-ai-subscription-provider.md` → matches on all five patterns. Then `rg -n 'Object.keys\(hooks\)\.sort\(\)|Step 8: Install and commit|then commit with subject|content: \{ type: string; text\?: string \}\[\]|SDD ledger' docs/superpowers/plans/2026-11-18-google-ai-subscription-provider.md` → exit 1, no matches.

### Step 5: Final docs-only verification

Run all four commands and confirm each result:

1. `git diff --check` → exit 0, no output.
2. `rg -n 'default enabled|withdraws that request|reverses both|return their inputs unchanged|AgyBypConfig|AgyBypState|unpauseRequested|registerAgyByp|toggleCommand|getState\(\): AgyBypState|scrubMessages|tabs and double quotes|api: "google-antigravity"|Object.keys\(hooks\)\.sort\(\)|Step 8: Install and commit|SDD ledger|Confirm the real signatures|only descriptions are ever touched|content: \{ type: string; text\?: string \}\[\]' docs/superpowers/specs/2026-11-18-google-ai-subscription-provider-design.md docs/superpowers/plans/2026-11-18-google-ai-subscription-provider.md` → exit 1, no matches.
3. `rg -n 'DEFERRED — DOCUMENTATION ONLY|indentStyle: "space"|api: "antigravity-acp"|Iterable<string>|history://|mr://|Verification ledger|scrubContextMessages|content: string \|' docs/superpowers/specs/2026-11-18-google-ai-subscription-provider-design.md docs/superpowers/plans/2026-11-18-google-ai-subscription-provider.md` → matches present in both files as specified in Steps 1–4.
4. `git status --short` → only the two in-scope docs are modified; the pre-existing untracked `docs/research/omp-antigravity-investigation/` tree is untouched.

## Done criteria

- [ ] `git diff --check` exits 0.
- [ ] Step 5's stale-pattern `rg` returns no matches.
- [ ] Step 5's target-pattern `rg` finds every expected pattern in the correct file.
- [ ] `git status --short` shows no changes outside the two in-scope documents.
- [ ] No install, test, lint, build, commit, or push was run.

## STOP conditions

- The live text at any cited `spec:<line>` / `plan:<line>` does not match the "current" excerpt (pivot edits drifted).
- A stale pattern still matches after a replacement, or a target pattern is missing.
- `git diff --check` reports whitespace errors.
- `git status --short` shows an out-of-scope file changed.
- Another agent is editing either document concurrently — stop and report rather than merging by guesswork.

## Maintenance notes

- These two documents are now the single canonical contract. If implementation is later authorized, the plan's steps describe the intended build; the deferred banner at `plan:3` must be removed in that same change.
- `F-source-google-addendum.md` still carries a pre-18.22.2 warning about `unpausedProviders`. Closing that evidence file is **out of scope here** and belongs to the evidence-cleanup plan; the verified result is already inlined in `spec` Interfaces and `plan` Task 1 Step 7, so do not defer any host-API check to Task 5.
- Tool-description scrubbing on the CLI path (`registerTool`/`setActiveTools`) remains an explicitly deferred future seam, not a v1 feature; that deferral is intentional and documented, not an oversight.
