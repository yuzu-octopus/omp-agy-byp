# Design: Google AI subscription provider for omp

**Date:** 2026-11-18

## Intent

Let an omp user run models against their own Google AI Pro/Ultra subscription while keeping omp's native handling of CLI execution, OAuth, credentials, headers and request envelope. The plugin adds only improved content shaping: it rewrites omp-specific strings in the system prompt, context and tool descriptions so the conversation reaching the model reads like a generic client. It never registers a provider, never handles tokens, never relays traffic, and never changes transport identity.

The supported providers are layered: `antigravity-cli` is the primary path (Google's signed-in `agy` CLI, native identity owned by the CLI); `google-antigravity` is the direct-OAuth CCA fallback; `google-gemini-cli` is legacy. `google` and `google-vertex` are API-key/ADC lanes and are out of subscription scope. On the primary path omp issues no HTTP headers, user-agent or authorization header at all — inference lives inside the `agy acp` subprocess, whose built-in transport id is `antigravity-acp`. [F-omp-docs.md] [F-antigravity-cli-source.md] [F-evasion-map.md]

## Goals

- Integrate with every relevant Google provider: primary `antigravity-cli`, plus `google-antigravity` and `google-gemini-cli` as supported fallback/legacy paths; document `google` and `google-vertex` as out-of-scope API-key/ADC lanes. Reuse what omp already handles for each — CLI/OAuth lifecycle, credential store, native headers/user-agent, CCA envelope and ACP/IDE tool bridge — and change content only. [F-omp-docs.md] [F-source-google.md]
- Rewrite omp-specific documentation markers — the literal role line, the `Internal URLs` and `xd://` headings, the `Skills & Rules` heading/rule line, and `Tool Inventory`/preset markers — before they are supplied to the model. Functional internal URL schemes (including `skill://`) are never rewritten. Tool descriptions are rewritten only on the HTTP CCA payload seam and only when `OMP_AGY_BYP_SCRUB_TOOL_DESCRIPTIONS=1`; on `antigravity-cli` they stay verbatim in v1. [F-signature.md] [F-antigravity-cli-hooks.md]
- Keep the omp tool loop mechanically intact: bare tool names, tool-call ids, ACP turn boundaries, and on the CCA paths the request envelope, stay untouched. [F-signature.md]
- Stay **inert by default (OFF)**: no hook runs, no provider state is requested, and nothing is unpaused until the user flips the manual toggle. [F-omp-docs.md]
- Expose exactly one explicit `/agy-byp on|off|status` slash command as the only manual toggle: `on` enables the hooks and requests the fallback unpause, `off` only disables the hooks, and `status` reports state. There are no aliases and no status shortcut, and no provider deactivation or re-pause.

## Non-goals

- No guarantee of upstream outcome and no claims of detector defeat; content shaping is best-effort, not an evasion or ban-avoidance technique.
- Header, user-agent, TLS or HTTP/2 spoofing: the native CLI and built-in CCA providers already emit the correct client identity, and the ACP path exposes no socket to the plugin. [F-source-google.md] [F-antigravity-cli-source.md] [F-evasion-map.md]
- Registering or overriding a provider, taking over login, reimplementing OAuth, extracting or storing tokens, editing config files, or relaying requests through a gateway.
- Replacing the built-in `antigravity-acp` stream, or altering the OAuth client id/secret, the CLI's file-auth marker, the `agy` argv, ACP/MCP identifiers, or conversation and credential digests. [F-antigravity-cli-source.md]
- Automatic activation or deactivation of anything: no unpause at load, no implicit enablement on first request, no background state changes.
- Supporting the `google` (API-key) or `google-vertex` (API-key/ADC) paid lanes; the plugin must leave them alone. [F-omp-docs.md]
- Renaming or removing tools, altering tool-call/result pairing, or rewriting envelope fields (`sessionId`, `requestId`, `labels`).
- Patching host source or compiled provider code; this is a design for an extension only. No source code edits.

## Approaches

### A. Custom command-backed `agy` provider (rejected)

The earlier design spawned a signed-in `agy` from a new `agy-byp` provider and translated NDJSON into assistant events. Rejected: the subprocess owns its headers, user-agent and TLS, so the plugin has no header control; and omp already ships `antigravity-cli`, which performs genuine CLI delegation with omp-managed credentials and an ACP tool bridge. A second wrapper only duplicates it and would own token and process lifecycle the plugin must not handle. [F-evasion-map.md]

### B. Custom CCA transport for any Google provider (rejected)

Write a custom `streamSimple` that reproduces the Cloud Code Assist request. Rejected: it duplicates the native envelope, headers, version discovery, failover and thinking config, and requires embedding OAuth client credentials plus storing and refreshing tokens. The direct providers are also paused or legacy. [F-source-google.md] [F-omp-docs.md]

### C. Augment the built-in providers with opt-in content hooks (chosen)

Leave transport, auth and provider selection to omp and register content-rewriting hooks that are inert until the user turns them on. `antigravity-acp` is a built-in API id whose stream an extension cannot replace, so augmentation is the only safe seam. Coverage follows omp's own provider layering: [F-antigravity-cli-source.md]

| Provider | Role | What the plugin may touch | What omp keeps |
| --- | --- | --- | --- |
| `antigravity-cli` (API `antigravity-acp`) | Primary, supported CLI path | Prompt and messages supplied over ACP; tool descriptions are left verbatim in v1 | `agy` binary, CLI-owned identity, OAuth grant/refresh, ACP/IDE bridge, tool execution |
| `google-antigravity` | Direct-OAuth CCA fallback, paused by default | Text parts of the CCA payload via `before_provider_request` | Native headers/UA, envelope, failover, credentials |
| `google-gemini-cli` | Legacy CCA provider | Same content-only scrub as the fallback | Native transport and credentials |
| `google`, `google-vertex` | API-key/ADC lanes, out of scope | Nothing — hooks pass through untouched | Everything |

[F-omp-docs.md] [F-source-google.md] [F-signature.md] [F-antigravity-cli-hooks.md]

## Decisions

- **Provider coverage:** primary `antigravity-cli` (auth id and provider id; built-in API `antigravity-acp`); fallback `google-antigravity`; legacy `google-gemini-cli`. The plugin does not route between them — the user selects a model/provider in omp as usual, and the same content scrub applies to whichever in-scope provider serves it. `google` and `google-vertex` are explicitly excluded. [F-antigravity-cli-source.md]
- **Reuse, do not replace:** no provider registration or override, no login takeover, no OAuth flow, no header/user-agent/endpoint/envelope changes. All three in-scope providers keep omp's native handling. `antigravity-cli` is not paused, so it never needs unpausing. [F-source-google.md] [F-antigravity-cli-source.md]
- **Explicit activation, default OFF:** at load the factory registers hooks and the command, loads config, and sets state to off. Hooks are registered but inert — they return `undefined` and perform no rewrite, so omp's inputs pass through untouched. Nothing is unpaused, no provider is enabled or disabled, no config file is written, and no network call is made at load.
- **The command is the only state writer:** `/agy-byp on` enables the hooks and, when `unpauseFallback` is true, calls `unpause(['google-antigravity'])`; `/agy-byp off` only sets `state.enabled = false` and makes **no** pause, deactivate, or unpause call; `/agy-byp status` reports state. There are no aliases and no `agy-byp-status` shortcut. The unpause surface affects only the HTTP fallback, never `antigravity-cli`. The host owns the lifetime of the unpause; the plugin never persists or withdraws it. [F-antigravity-cli-source.md]
- **Hooks:** `before_agent_start` replaces the system prompt, `context` rewrites messages, and `before_provider_request` rewrites the CCA payload. On `antigravity-cli` only the first two fire: the CLI stream ignores `onPayload`/`onResponse`, so neither `before_provider_request` nor `after_provider_response` runs for its inference. `scrubPayload()` is strictly scoped to the CCA fallback and legacy HTTP paths, never to `antigravity-cli`. [F-antigravity-cli-hooks.md]
- **Narrow CLI scope:** the reachable surfaces on the CLI path are the system prompt via `before_agent_start`, messages via `input`/`context`, tool name/description/schema via `registerTool`/`setActiveTools`, tool args/results via `tool_call`/`tool_result`, visible text via `assistant_message`, and env/`PI_AGY_PATH` before first spawn. The plugin deliberately limits itself to prompt and messages; it leaves tool descriptions verbatim in v1 — re-registering tools changes `toolsKey` and can abandon a parked turn — and never renames tools, intercepts tool arguments or results, rewrites assistant output, or changes the environment. [F-antigravity-cli-hooks.md]
- **Scrub targets:** the literal `You are omp's trusted coding assistant` role line; the `Internal URLs` and `xd://` Tool Devices headings; the `Skills & Rules` heading and `skill://` rule line; and `Tool Inventory`/preset markers. Tool descriptions are a target only on the HTTP CCA payload seam and only with the opt-in flag, never on `antigravity-cli`. Replace with neutral, generic wording rather than deleting the surrounding guidance. Only documentation/marker text in prompt prose is rewritten: functional URL schemes (including `skill://` everywhere except that literal rule line) and tool-call payloads are never renamed. [F-signature.md] [F-antigravity-cli-hooks.md]
- **Preserve:** tool names (bare in omp, `mcp_ide-tools_<name>` inside agy), built-in tool ids, `mcp__`/`mcp_ide-tools_` prefixes, tool-call ids (`agy_<uuid>` in the ACP path) and tool-result pairing, agy-internal tools such as `manage_task`, every internal URL scheme (`omp://`, `local://`, `artifact://`, `agent://`, `proc://`, `history://`, `ssh://`, `skill://`, `pr://`, `mr://`), ACP conversation and turn boundaries, and on CCA paths the request envelope (`sessionId`, `requestId`, `labels`), tool declarations and thought-signature parts. Never rewrite these; `skill://` is preserved except in the literal rule line named above. [F-signature.md] [F-antigravity-cli-source.md] [F-antigravity-cli-hooks.md]
- **Hard boundaries:** hooks can rewrite prompt, system prompt, messages and tool schemas, but cannot change the OAuth client id/secret, the CLI's file-auth marker, the `agy` argv, the MCP tool prefix, ACP `_meta` keys, native headers/user-agent/TLS, or conversation and credential digests. These are fixed in the installed host and are outside the plugin's reach. [F-antigravity-cli-source.md]
- **Config tunes behaviour, not activation:** `OMP_AGY_BYP_MODE=generic|native`, default `generic` (scrubbing active once on); `native` is a pass-through mode. `OMP_AGY_BYP_SCRUB_TOOL_DESCRIPTIONS=1` opt-in, default off (`0`/unset keeps descriptions verbatim); it affects only the HTTP CCA payload seam, never `antigravity-cli`. `OMP_AGY_BYP_UNPAUSE_FALLBACK=0` disables the fallback unpause. None of these variables can turn the plugin on or request unpause on its own.
- **No secrets:** the spec, config and status output carry no tokens, credentials, client secrets or account identifiers.

## Data flow

1. **Load:** the factory calls `loadConfig()`, registers the three hooks and the `/agy-byp` command, and sets state to off. Hooks are inert; no unpause, no config writes, no network.
2. **Explicit opt-in:** the user runs `/agy-byp on`. Only then do hooks apply and only then is the `google-antigravity` unpause requested (when `unpauseFallback` is true). `/agy-byp off` disables the hooks only — it makes no pause/deactivate/unpause call, so the host-controlled unpause persists for its lifetime; `/agy-byp status` reports toggle state, pause reason, mode and flags.
3. **Primary path:** with `antigravity-cli`, omp runs the signed-in `agy` CLI (`PI_AGY_PATH` selects an existing executable; `nc` is needed for the IDE-tool transport) and stages the OAuth grant through the CLI's file-auth mechanism. `scrubSystemPrompt()` and `scrubContextMessages()` rewrite omp markers before omp supplies the system prompt as ACP `_meta.antigravity.systemPrompt.append` and the messages as ACP input. agy builds the request with native identity; omp issues no HTTP headers itself. [F-omp-docs.md] [F-antigravity-cli-source.md]
4. **Tool bridge:** tool schemas and descriptions cross a loopback MCP bridge; names, call ids (`agy_<uuid>`) and descriptions are all passed through verbatim in v1. Re-registering tools to change descriptions would change `toolsKey` and can abandon a parked turn. agy presents tool names as `mcp_ide-tools_<name>`; omp keeps execution and approvals. [F-antigravity-cli-source.md] [F-antigravity-cli-hooks.md]
5. **Fallback path:** if the user has turned the plugin on and selected the unpaused `google-antigravity` provider, `before_provider_request` → `scrubPayload()` rewrites only text parts of the CCA body, leaving the native headers, user-agent and envelope intact. This payload hook never fires for `antigravity-cli`. [F-source-google.md] [F-antigravity-cli-hooks.md]
6. **Legacy path:** the same content-only scrub applies if `google-gemini-cli` is selected; omp's native transport and credentials are unchanged. This provider is legacy because consumer serving on its older endpoint ended 2026-06-18. [F-evasion-map.md]
7. **Out of scope:** requests served by `google` or `google-vertex` pass through every hook untouched; the plugin never strips or alters their API-key/ADC credentials.
8. **Status:** `/agy-byp status` reports effective activation, the fallback's pause reason (`providerPauseReason('google-antigravity') ?? 'not paused'`), mode, scrub flags, and config guidance naming `auth.unpausedProviders` — without secrets.

## Interfaces

- `loadConfig(env: NodeJS.ProcessEnv): PluginConfig` — returns `mode: "generic" | "native"`, `scrubToolDescriptions: boolean` (default `false`), `unpauseFallback: boolean` (default `true`); never an activation switch.
- `scrubSystemPrompt(systemPrompt: string[], config: PluginConfig): string[]` — `before_agent_start` handler; called only while enabled; returns the rewritten prompt array.
- `scrubContextMessages(messages: readonly Msg[], config: PluginConfig): Msg[]` — `context` handler; called only while enabled.
- `scrubPayload<T extends Record<string, unknown>>(payload: T, config: PluginConfig): T` — `before_provider_request` handler; HTTP-backed `google-antigravity`/`google-gemini-cli` only, never `antigravity-cli`; tool descriptions only when `config.scrubToolDescriptions` is true.
- `createExtension(deps: ExtensionDeps): (pi: ExtensionAPI) => void` — the default-exported factory; `ExtensionDeps = { unpause: (ids: string[]) => void; pauseReason: (provider: string) => string | undefined; config: PluginConfig; state: ToggleState }`; `ToggleState = { enabled: boolean }`.
- `/agy-byp on|off|status` — one slash command handled inside the factory: `on` sets `state.enabled = true` and, when `config.unpauseFallback`, calls `unpause(['google-antigravity'])`; `off` sets `state.enabled = false` and makes no pause/deactivate/unpause call; `status` reports state, pause reason, mode, flags and `auth.unpausedProviders` guidance. No aliases, no `agy-byp-status` shortcut, no `getState()`.
- Inert return value: every hook returns `undefined` while `state.enabled` is false (or while the provider is out of scope), so omp's inputs are not rewritten.
- **Host API contract (verified on installed 18.22.2):** `setUnpausedProviders(providers: Iterable<string>): void` and `providerPauseReason(provider: string): string | undefined` from `@oh-my-pi/pi-ai/registry/oauth` (installed `pi-ai/src/registry/oauth/index.ts:62,97`); `setUnpausedProviders` replaces the whole list and ignores ids that are not paused. The operator-layer `auth.unpausedProviders` setting is documented in `omp://settings.md` § 'Paused providers' and is ignored from a project layer (`pi-coding-agent/src/config/model-settings.ts:75,90`). The host owns the lifetime of an unpause; the plugin never persists it. [F-antigravity-cli-source.md]

## Risks

- **No proof a detector reads prompt text, and the identity surface is out of reach.** Scrubbing content signatures is speculative mitigation; no source ties omp prompt strings to upstream enforcement. The OAuth client id/secret, ACP/MCP identifiers, argv and digests stay fixed, and agy may further transform the prompt before the model sees it. [F-signature.md] [F-antigravity-cli-source.md] [F-evasion-map.md]
- **Explicit-state risk.** Default OFF means the plugin does nothing until the user opts in. Conversely `/agy-byp on` requests unpause of a provider Google has paused — a user decision, never an automatic one. A missed inertness guard could change prompts or request unpause without consent.
- **User must remember to enable.** Nothing happens on install or in a new session until the user runs `/agy-byp on`; because activation is manual and defaults OFF, an unenabled plugin looks like a no-op and content shaping silently does not occur.
- **Tool rewrites break the loop.** Renaming built-in tool ids, inventing `mcp__`/`mcp_ide-tools_` prefixes, touching agy-internal `manage_task`, changing `agy_<uuid>` call ids, rewriting internal URL schemes, or splitting tool-call/result turns breaks tool execution and the agy MCP bridge; only description text is ever rewritten, and only on the HTTP CCA payload seam behind the flag — on `antigravity-cli` even descriptions stay verbatim, because re-registering tools changes `toolsKey` and can abandon a parked turn. [F-signature.md] [F-antigravity-cli-hooks.md]
- **Provider-selection risk.** `google-antigravity` is paused and `google-gemini-cli` is legacy; selecting `google` or `google-vertex` uses a paid API-key/ADC lane, not the subscription. The plugin does not route or warn beyond status; provider choice stays with the user. [F-omp-docs.md] [F-evasion-map.md]
- **Payload hooks do not reach the CLI path.** Source confirms `antigravity-cli` ignores `onPayload`/`onResponse`, so `before_provider_request` never fires for its inference and `after_provider_response` has no trigger there. CCA envelope, header and response-metadata rewrites are unreachable on the primary path; `scrubPayload()` applies only to the HTTP fallback (`google-antigravity`) and legacy (`google-gemini-cli`) providers, and the primary path never depends on it. [F-antigravity-cli-hooks.md]
- **Version skew.** `antigravity-cli` is absent from the 18.18.6 source snapshot and present in the installed 18.22.2; hook signatures, ACP/IDE bridge behaviour, model rosters and the unpause API may drift. Pin host-version contract checks. [F-source-google.md] [F-antigravity-cli-source.md] [F-omp-docs.md]
- **ACP timing.** agy's short MCP timeout and retained-conversation semantics mean long tool operations need cancellation and redelivery; prompt scrubbing must not disturb saved turn boundaries. Changing the system prompt or tool set while a tool turn is parked, or altering tool-call/result pairing or conversation digests, abandons the live turn and forces a reseed or restore. [F-omp-docs.md] [F-antigravity-cli-hooks.md]

Evidence base: `docs/research/omp-antigravity-investigation/F-omp-docs.md`, `docs/research/omp-antigravity-investigation/F-source-google.md`, `docs/research/omp-antigravity-investigation/F-signature.md`, `docs/research/omp-antigravity-investigation/F-evasion-map.md`, `docs/research/omp-antigravity-investigation/F-antigravity-cli-source.md`, `docs/research/omp-antigravity-investigation/F-antigravity-cli-hooks.md`.
