# Design: Antigravity tool alias adapter for omp

**Date:** 2026-11-18

> **Round 2 design draft — not yet approved for implementation.** It depends on research in `docs/research/antigravity-tool-schema-mimicry/REPORT.md`. Round 1 ships a content-only extension; this design requires a patched omp host.

## Intent

Make the tool surface that `agy acp` sees resemble a **safe subset** of Google's documented hook-doc App/CLI/IDE tool vocabulary (`view_file`, `write_to_file`, `grep_search`, …), while omp's TUI, transcript, session store, approval keys and tool loop keep canonical omp identities. Round 1 already shapes prompt text. This round shapes tool names, descriptions, schemas, arguments and results at the ACP/MCP projection seam. The SDK `BuiltinTools` enum is a separate vocabulary and is not transplanted.

Research verdict: impossible from an extension without losing canonical identity. `toMcpTool`, `#onToolCall` and `toMcpOutput` are provider-internal. Therefore the adapter is host-source work: a small pinned patch to omp 18.22.2 plus an extension-supplied alias provider.

## Goals

- Outbound: project active omp tools to `agy` with Antigravity-shaped names/descriptions/input schemas from the hook-doc safe subset, over the loopback MCP `tools/list`.
- Inbound: before omp emits `step.writer.toolCall`, reverse-map the alias name and its argument keys back to the canonical omp tool and arguments.
- Result path: translate canonical tool results back into the alias result shape before `toMcpOutput` returns them to `agy`.
- Preserve `agy_<uuid>` call ids, tool-call/result pairing, `antigravityCli` payload keys, `transcriptDigest` inputs, ACP `_meta`, approval keys and session-store identity.
- Keep Round 1 behavior: default OFF, one `/agy-byp on|off|status` command, three hooks, no transport/auth changes.
- Fail loudly when the host patch is absent, drifted, or the alias provider is unstable.

## Non-goals

- No header, User-Agent, TLS, HTTP/2, OAuth, token, endpoint, quota, account-rotation or paused-route work.
- No claim of detector defeat or upstream enforcement evasion. Exact `agy` runtime tool schemas are unverified because the binary is closed; the target comes from official hook docs only and is best-effort. The SDK `BuiltinTools` enum is not mixed in.
- No live login or terminal probe against Google.
- No remote or built-in API replacement; `registerCustomApi("antigravity-acp")` is reserved and rejected.
- No mid-turn alias changes. Toggle changes take effect at the next `AgyHost.step` tool preparation boundary; if the plugin is on mid-turn, the change is deferred and `/agy-byp status` reports it as pending. Never abandon a parked turn to apply a cosmetic alias.

## Constraints

- Pinned host: omp 18.22.2. `AGY_CLI_DISABLE_AUTO_UPDATE=1`; installed catalog targets agy 1.5.9 as a historical baseline; owner changelog top is 1.5.11. No six-alias rename through 1.5.11. The overview page's "CLI 1.2.14" is a stale UI mockup, not the release version. Version drift invalidates the patch.
- `toolsKey = stableStringifyJson(tools)`; changing projected tools while a call is parked abandons the turn and forces restore/replay.
- `transcriptDigest` hashes `{id, name, arguments}` at call creation. Reverse mapping must happen before that hash, not in a `tool_call` extension handler.
- `tool_call` handler results cannot rename tools; `toolName` is read-only and `execute` runs after the digest.
- The `mcp_ide-tools_` prefix is agy-owned; omp must not invent or rewrite it.
- Built-in tool ids, `mcp__` names, internal URL schemes and `agy_<uuid>` ids are dispatch contracts.
- Approval keys are tool-name based; canonical names must reach omp's dispatch and approval path.

## Approaches

| Approach | Tradeoff | Decision |
|---|---|---|
| Extension-only shadow tools (`registerTool`/`setActiveTools`) | Reachable now, but omp transcript/TUI/session/approvals record the shadow name; `tool_call` cannot rename back. | Rejected: fails canonical identity. |
| Pinned host-source adapter at `toMcpTool`, `#onToolCall`, `toMcpOutput` | Preserves canonical identity and digest/approval semantics; requires maintaining a host patch and reinstall step. | Chosen. |
| Direct CCA fallback body rewrite | Full HTTP payload control on `google-antigravity`/`google-gemini-cli`; no native agy surface, no ACP state machinery, lossy schema normalization. | Rejected as primary; possible separate future lane. |
| Keep text-only Round 1 | No new risk, no tool-surface mimicry. | Rejected by user goal. |

## Design

### Components

1. **Host patch** (`host-patch/0001-tool-alias.patch`)
   - Applies to installed omp 18.22.2 source: `pi-ai/src/providers/antigravity-cli/host.ts` and `mcp-bridge.ts`.
   - Adds three internal hooks: outbound projection in `toMcpTool`, inbound name/args reverse map at the top of `#onToolCall` before validation/digest, and result shaping in `toMcpOutput`.
   - Exposes one host-level registration function consumed by the extension. No behavior unless a provider is registered.
2. **Alias provider** (`src/tool-alias.ts`)
   - Owns the canonical-to-Antigravity alias table derived from the research report: names, descriptions, input schemas, argument maps and result maps.
   - Exposes a single small interface: `resolveOutbound(tool) -> projected | undefined`, `resolveInbound(aliasName, args) -> { toolName, args } | undefined`, `resolveResult(toolName, result) -> projectedResult`.
   - Returns `undefined` unless the Round 1 toggle is ON **and** `mode !== "native"`. Native mode disables all mimicry, text and tool shape, because it is the pass-through comparison mode.
3. **Patch verifier** (`scripts/check-host-patch.ts`)
   - Inspects the runtime-resolved `@oh-my-pi/pi-coding-agent` installation that the running extension actually resolves, not just this repo's local `node_modules`; dev tests may also check the local pinned copy.
   - An unpatched or drifted host does not block extension load and does not disable Round 1 text scrubbing. `/agy-byp status` reports `patch: missing|drifted|ok`, and the alias resolver returns `undefined` until the patch is present.
4. **Extension wiring** (`src/index.ts`, modified)
   - Registers the alias provider at load. Same factory, three hooks and one command; no new toggle or env activator.
   - `/agy-byp status` reports patch state, alias mode/pending state and existing toggle/flags; no secrets.

### Data flow

1. User runs `/agy-byp on`. Toggle state flips; the alias provider becomes active at the next tool preparation boundary, not mid-parked-turn. If deferred, status reports it as pending.
2. `AgyHost.step` asks `toMcpTool` for each active tool. Patch calls `resolveOutbound`; if a rule exists, projected name/description/schema are served over MCP `tools/list`. Canonical omp tool objects are unchanged.
3. The model calls either eager `mcp_ide-tools_<alias>` or, under default lazy loading, `call_mcp_tool` with `ToolName=<alias>`; omp receives the bare alias via `tools/call` in both cases. Omp strips any prefix as today, then patch calls `resolveInbound` before schema validation and `step.writer.toolCall`. Canonical name and canonical args flow into digest, approval, TUI and session store; `agy_<uuid>` stays unchanged.
4. Omp executes the canonical tool. Before `toMcpOutput` returns the result to `agy`, patch calls `resolveResult` to reshape it into the alias result vocabulary.
5. `/agy-byp off` deactivates the provider at the next tool preparation boundary, does not alter provider pause state or host files, and never kills a parked turn. Projected tool shape stays stable until that boundary.

### Invariants

- No alias rule may change the canonical tool name, id, call id, digest input after reverse mapping, approval key, URL scheme or `_meta` key.
- Alias names must be unique and stable per session; duplicate projected names must fail at load, not at tool call.
- Argument maps must be total for declared schema properties; missing mappings fail loudly before dispatch.
- Result maps must preserve error/success semantics and tool-call/result pairing.
- Patch is inert without an active provider; host behavior is byte-identical to stock 18.22.2 when OFF.

### Testing

- Unit tests for alias table: outbound projection, inbound reverse map, argument/result round trips, unknowns, duplicate detection, missing mappings.
- Host-patch tests with a patched 18.22.2 checkout: `toMcpTool` output, `#onToolCall` canonical name/digest/args, `toMcpOutput` result shape, `toolsKey` stability, parked-turn guard.
- Existing Round 1 gates must remain green on an unpatched host; patch-specific tests run only when the runtime-resolved host verifier finds the expected patch.
- No live Google probes. HANDOFF gets human-only steps for patched-host load and one tool round trip.

## Rollout and maintenance

- Patch version is pinned to omp 18.22.2; any host bump requires re-review and a new patch file. Never silently apply a fuzzy patch.
- The plugin refuses to activate the alias adapter on an unpatched or drifted host; it does not refuse to load, and Round 1 text scrubbing stays available.
- Docs state plainly: alias target is a safe subset of hook-doc tool names and arguments; agy-internal tools including `run_workflow`, `manage_task`, MCP resources, permissions and subagents are out of scope; there are no alias additions in v1. Exact schemas/required arrays, `StartLine` base, literal `ide-tools` server name and bridge eager/lazy config remain unverified.

## Left to the builder

Plan exact patch hunks, file layout, alias table entries and test fixtures after this design is approved. The research report is the authority for what is known and unverified.
