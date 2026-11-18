# Antigravity tool-schema mimicry through omp's ACP bridge

**Answer:** Outbound tool shape is reachable, but only by modifying installed host source — no extension hook can do it while preserving omp identity. `registerTool`/`setActiveTools` can register Antigravity-shaped shadow tools that agy sees as `mcp_ide-tools_<name>`, but then omp's tool-call blocks, transcript, TUI, session store and approval keys all record the shadow name: canonical identity is lost. The canonical-preserving design is a provider-internal adapter — alias outbound at `toMcpTool` (`host.ts:854-859`) and reverse-map inbound before `step.writer.toolCall` (`host.ts:626-672`, esp. `:665`) — which is host-source work, not plugin work. Direct CCA fallback gives byte-level body control but no native agy surface. [1][3][4][6][7][10][21][25]

**Confidence:** High on installed-source reachability and failure mechanics — multiple first-party reads, cross-checked in F3/F4/F5/F6/F8. Medium on the official native tool surface: Google docs and SDK source are primary, but `agy` is a closed proprietary binary, so exact runtime schemas and descriptions are unverified. No efficacy or detection claim made; no live probes.

## Why

Three facts force the conclusion.

1. **The model-visible tool surface is an MCP projection, not an ACP field.** ACP defines `tool_call` reports but no tool definitions; its schema has no `tools/list`, `inputSchema` or `ToolDefinition`. omp passes `mcpServers: []` on `session/new` and instead serves a loopback MCP server on `127.0.0.1:<ephemeral>` (protocol `2025-06-18`) to the `agy acp --ide-mcp-port <port>` child. `toMcpTool` maps each active tool to `{name, description, inputSchema}`; the name is bare `tool.name`. agy applies the `mcp_ide-tools_` prefix. [1][2][25][31][34]

2. **Inbound dispatch and identity are keyed by that same raw name.** `tools/call` looks up `byName.get(params.name)`, validates args against the advertised schema, mints `agy_<uuid32>`, and emits `step.writer.toolCall` with the raw name. `transcriptDigest` hashes `{id, name, arguments}`; the digest, `antigravityCli` payload and ledger are fixed at that moment. `toolsKey = stableStringifyJson(tools)` is compared per step; any change while a call is parked abandons the turn and forces restore/replay. [1][5]

3. **Extension events are too late or too weak to fix identity.** `tool_call` exposes `toolName` read-only; handler results contain only `block`/`input`/`additionalContext`. Revised `input` is baked into `toolCall.arguments` after the digest was computed, so argument reverse-translation desyncs it. A shadow tool's `execute` runs after `finish("toolUse")` and cannot rewrite the emitted name. `customWireName` is ignored by `toMcpTool`; `onPayload`/`onResponse` are never called by `streamAntigravityCli`; `registerCustomApi("antigravity-acp")` throws. [2][3][5]

## What would change this

- First-party `agy` source or binary inspection publishing exact native tool schemas, names and `tool_call` title bytes → the mimicry target becomes concrete; today it is only documented at the capability level.
- omp wires `onPayload`/`onResponse` into `streamAntigravityCli`, or exposes `transformProviderContext` to extensions → whole-`Context` rewriting becomes reachable.
- Goal relaxed from "omp keeps canonical identities" to "shape only" → shadow tools become an acceptable extension-level answer.
- agy negotiates ACP v2 (`tool_call_update` upsert, nullable `name`, `_meta` patches) → the adapter contract changes; this bridge pins `protocolVersion: 1`. [1][23][30]

## Considered and rejected

| Option | Why rejected |
|---|---|
| Shadow tools via `registerTool`/`setActiveTools` | agy sees alias, but omp transcript/TUI/session/approvals see shadow name; `toolName` read-only, `execute` post-digest. [3][5][6] |
| `before_provider_request` / `after_provider_response` (`onPayload`/`onResponse`) | Options are dropped: `streamAntigravityCli` forwards only `cwd`, `reasoning`, `signal`, `credentialVersion`; zero references to those hooks under the CLI transport. [1][2] |
| `registerCustomApi("antigravity-acp")` | `antigravity-acp` is in `BUILTIN_API_IDS`; registration throws "built-in API names are reserved". [2] |
| `customWireName` wire alias | Absent from extension `ToolDefinition`; `toMcpTool` projects `tool.name` only. [1][3][5] |
| Rename in `tool_call`/`assistant_message`/`context` | No name field in handler results; post-emission rewrites change `transcriptDigest` inputs without updating the stored digest. [3][5] |
| Rewrite `mcp_ide-tools_` prefix | agy-owned; omp only strips it from ACP `tool_call.title` for announcement bookkeeping. No omp effect. [1] |
| Rename built-in ids, `mcp__` tools, internal URL schemes, or `agy_<uuid>` | Dispatch contracts; breaks resolution, cache/checkpoint identity or resource resolution. [4][1] |
| Direct CCA fallback (`google-antigravity`/`google-gemini-cli`) | Gives full-body `onPayload` control and `VALIDATED`/`toolConfig`/labels, but no official `agy acp` child, no native tool surface, no digest/parked-turn machinery; `normalizeSchemaForCCA` is lossy. [7][9] |

## Findings

### 1. Official Antigravity tool surface — the target shape

Google publishes the native tool vocabulary in first-party docs and SDK source. Hook docs list App/CLI/IDE tools and argument keys: `view_file`, `write_to_file`, `replace_file_content`, `multi_replace_file_content`, `list_dir`, `find_by_name`, `grep_search`, `search_web`, `read_url_content`, `run_command`, `manage_task`, `schedule`, `list_permissions`, `ask_permission`, `invoke_subagent`, `define_subagent`, `send_message`, `manage_subagents`, `ask_question`, `generate_image`. [10] The first-party Python SDK defines a separate 15-member `BuiltinTools` enum (`list_directory` … `finish`), with `start_subagent` a deprecated alias. SDK docs list only 13 of the 15 — source wins over the docs page. [15][14] Do not transplant one vocabulary into the other. [10][15]

Official MCP rule: eager tools register as `mcp_<serverName>_<toolName>`; lazy tools (default) are discovered from `<app-data-dir>/mcp/<serverName>/<toolName>.json` and invoked via `call_mcp_tool`. That makes `mcp_ide-tools_<name>` a server-prefixed MCP tool (`serverName` = `ide-tools`), not a native tool name. The literal `ide-tools` server name is inferred from omp's regex plus the owner naming rule, not independently observed. [1][2][11]

`agy acp` is an official ACP server: JSON-RPC over stdio, protocol version 1, "Antigravity ACP Server", flags including `--agent`, `--ide-mcp-port` (requires `nc` on `PATH`), `--dangerously-skip-permissions`; session options `model` and thinking level. [12][13] The ACP registry marks the agent `proprietary` and distributes a closed `agy_acp_server.par`/`.exe`; the first-party CLI repo has no tool-schema source. Exact runtime JSON schemas, descriptions, internal IDs and native `toolCallId` format are therefore **unverified**. [17][21]

MCP itself requires tool `name` (unique identifier), optional `description` (hint), `inputSchema` `{type:"object", properties?, required?}`, and permits `_meta`. Names have no format constraint beyond uniqueness. [34][35] `_meta` keys are legally open (`antigravity.google/conversation_id` is a valid prefixed key) but MCP assigns them no semantics and neither MCP nor ACP guarantees a peer reads them. [36][27]

ACP-side facts relevant to mimicry: `toolCallId` and `title` are the only required `ToolCall` fields; `name` is optional, opaque, informational, and carries no authorization; `kind` and `status` are closed v1 enums; content blocks are a closed oneOf; `_meta` is the sanctioned extension channel, with custom fields forbidden at a spec type's root. ACP v1 has no tool definitions — tool shaping is an MCP-layer concern. [25][27][28][31][32][36]

### 2. Reachability by seam

| Seam | Status | Authority |
|---|---|---|
| `registerTool` / `setActiveTools` → `context.tools` → `toMcpTool` → `tools/list` | REACHABLE | Authoritative for agy-visible name/description/schema. Canonical identity not preserved. [3][1][5] |
| `before_agent_start` system prompt; `context` messages | REACHABLE | Prompt/append + replayed blocks only; digest-covered fields must survive. [3][5] |
| `tool_call` / `tool_result` | REACHABLE | Args/content only; `toolName` read-only; arg rewrite is post-digest. [3][5] |
| `assistant_message`, `message_update`/`end`, `tool_execution_*` | REACHABLE | Observational or digest hazard; snapshot edits not authoritative. [3][5] |
| `toMcpTool`, `#onToolCall`, `planTurn`, `transcriptDigest` | NOT EXTENSION-REACHABLE | Provider-internal; only place a canonical-preserving adapter can live. [1][5] |
| `onPayload` / `onResponse`, `beforeDispatch`, `onSseEvent` | UNREACHABLE | Dropped by `streamAntigravityCli`; no call site in CLI transport. [1][2][5] |
| `registerCustomApi("antigravity-acp")` | BLOCKED | Built-in API id reserved. [2] |
| `transformProviderContext` | NOT EXTENSION-REACHABLE | Internal SDK transform chain only. [5] |

### 3. Outbound projection

`AgyHost.step` maps `context.tools` through `toMcpTool` — `normalizeSchemaForMCP(toolWireSchema(tool))` — and serves the array verbatim at `tools/list`. Duplicate names throw at bridge construction; non-object schema throws. The prefix is added by agy, not omp. `toolsKey` is the whole projected array; a change restarts the child and invalidates parked turns, so an alias layer must be stable for the session. [1][2][5]

### 4. Inbound translation and canonical identity

`#onToolCall` validates args, mints `agy_<uuid32>`, records `transcriptDigest`, finishes with `{type:"antigravityCli", conversationId, digest}`, and parks the MCP reply until omp's `toolResult` returns via `toMcpOutput`. `planTurn` resumes only on an exact digest-matching prefix with matching `pendingToolCallId`; otherwise it restores a checkpoint or replays. Approval is omp-side: agy runs `--dangerously-skip-permissions` and the ACP `requestPermission` callback always returns `cancelled`. [1][5]

Under shadow tools, the shadow name enters `step.writer.toolCall` → assistant `ToolCall.name` → `transcriptDigest` → session store → TUI renderer → approval key (`tools.approval.<name>`). `tool_call` handler results have no name field; `execute` runs after the digest. No extension-reachable technique aliases outbound and reverse-maps inbound before emission. Verdict: canonical-preserving mimicry requires host-source modification; the extension-reachable fallback is shape-only with shadow identity. [5][6][3][4]

### 5. Safe vs unsafe reshape

Safe if applied at a turn boundary and held stable: new tool names, description/schema edits, per-turn `systemPrompt`, and tool-call/result content shaping that preserves ids, names and call/result pairing. Unsafe: built-in tool IDs, `mcp__` minting, the agy-owned `mcp_ide-tools_` prefix, `agy_<uuid>` ids, internal URL schemes (`omp://`, `local://`, `artifact://`, `agent://`, `proc://`, `skill://`, `ssh://`, `pr://`, …), the `antigravityCli` payload/digests/keys, agy-internal tools (`manage_task`, MCP resources), and the reserved `antigravity-acp` API id. [4][1][2][9]

### 6. Concrete failure modes

- **Tool-loop detachment.** Unknown renamed tool → JSON-RPC `-32602`; duplicate projected name → bridge constructor throw; `toolsKey`/cwd/credential/system/model change while parked → `parkedTurnMoves` → `#abandonTurn()`; agy's 180 s MCP deadline → detach after 165 s hold + 5 s cancel; conversation-id mismatch → "outside active step". [1][5]
- **Cache invalidation / reseed.** `toolsKey` change restarts agy; `systemKey` change reloads conversation; digest mismatch fails checkpoint lookup → full text replay. [1][5]
- **Schema rejection.** Invalid projected schema throws; unsupported keywords are stripped by `normalizeSchemaForMCP`; bad model args are rejected with a schema-aware error before omp executes. [1][2]
- **Digest mismatch.** Rewriting tool name/id/arguments in `context` or mid-turn changes `transcriptDigest` without updating the stored digest; resume/restore fail. [1][5]
- **Approval mismatch.** Approvals key on the dispatched tool name; renaming changes the settings key and grant identity. [4][5]
- **Version drift.** Managed binary updates are pinned off (`AGY_CLI_DISABLE_AUTO_UPDATE=1`); catalog notes target agy 1.5.9 while first-party changelog reaches 1.5.11; `PI_AGY_PATH` bypasses SHA-512 verification. Any agy change to `_meta` acceptance, MCP framing or naming breaks the adapter. [8][9][12][16]
- **No-ops.** `onPayload`/`onResponse`, `customWireName`, `mcp__` canonicalization, prefix renaming and reserved-id registration either never fire or throw on this path. [5][1][2]

### 7. Direct CCA fallback contrast

On `google-antigravity`/`google-gemini-cli`, omp builds one HTTP body and `onPayload` can replace it wholesale after `buildRequest` — declarations, `toolConfig.functionCallingConfig` (`VALIDATED` default / `ANY` forced-tool directive), envelope labels, `requestId`, `sessionId`, `model_enum`, endpoint. Conversion uses `normalizeSchemaForCCA`, which is lossy (strips/spills keywords, falls back to an empty object). Inbound ids are provider strings (`<name>_<ts>_<n>` when duplicate) with no `mcp_ide-tools_` or `agy_` scheme. That seam exists only on the fallback: the ACP path never assembles a CCA body. Switching gains byte-level declaration control but loses the native agy surface and all ACP state machinery. [7][9]

## Open questions

- Exact agy runtime tool names, JSON schemas, descriptions, `tool_call.title` bytes and native tool-call id format — closed binary; unresolved.
- Whether agy semantically consumes `_meta.antigravity.systemPrompt.append` or `antigravity.google/conversation_id`; both are wire-legal but non-standard/unspecified. [12][13][27][36]
- Prompt-cache impact of tool/schema renames on the ACP path — unverified.
- Whether a future omp release exposes `transformProviderContext` or wires payload hooks into the CLI transport — pinned to 18.22.2 here.
- Whether a mid-turn change during a *detached* parked call is universally safe — source shows a narrower abandonment rule; no end-to-end test.
- Backend acceptance of reshaped CCA declarations/labels — no live validation; out of scope.

## Sources

All installed sources fetched 2026-11-18 from omp 18.22.2, root `/home/yuzu/.bun/install/global/node_modules/@oh-my-pi`. All external URLs fetched 2026-11-18 and verified to resolve to the named owner document (F9). Every entry is [primary] (owner source, first-party doc/spec or installed host source). No secondary source is used in this report.

**Installed host source — [primary]**

1. [primary] ACP host bundle: `pi-ai/src/providers/antigravity-cli/host.ts`, `mcp-bridge.ts`, `step-writer.ts`, `reconcile.ts`, `conversation-store.ts`, `pi-ai/src/providers/antigravity-cli.ts`, `agent.md`, `transcript.md`, `late-tool-result.md` — 2026-11-18.
2. [primary] Dispatch/schema: `pi-ai/src/api-registry.ts`, `stream.ts`, `types.ts`, `utils/schema/normalize.ts`, `utils/schema/wire.ts` — 2026-11-18.
3. [primary] Extension/session API: `pi-coding-agent/src/extensibility/extensions/types.ts`, `shared-events.ts`, `runner.ts`, `loader.ts`, `sdk.ts`, `session/agent-session.ts`, `session/session-tools.ts` — 2026-11-18.
4. [primary] Tool identity/approval: `pi-coding-agent/src/tools/builtin-names.ts`, `tools/approval.ts`, `tools/essential-tools.ts`, `mcp/tool-bridge.ts`, `internal-urls/router.ts` — 2026-11-18.
5. [primary] Agent loop: `pi-agent-core/src/agent-loop.ts`, `agent.ts` — 2026-11-18.
6. [primary] TUI rendering: `pi-tui/src/chat/chat-transcript-builder.ts`, `tool-execution.ts` — 2026-11-18.
7. [primary] CCA fallback: `pi-ai/src/providers/google-gemini-cli.ts`, `google-shared.ts` — 2026-11-18.
8. [primary] Binary/credential/catalog: `pi-ai/src/providers/antigravity-cli/binary.ts`, `credentials.ts`, `pi-ai/src/registry/oauth/antigravity-cli.ts`, `pi-catalog/src/compat/rules/providers/antigravity-cli.kdl` — 2026-11-18.
9. [primary] omp internal docs: `omp://providers.md`, `omp://provider-quirks.md`, `pi-ai/src/utils/schema/CONSTRAINTS.md`, `pi-ai/src/providers/google-antigravity-forced-tool.md` — 2026-11-18.

**Official Google / Antigravity — [primary]**

10. [primary] Hooks: https://antigravity.google/docs/hooks — 2026-11-18.
11. [primary] MCP: https://antigravity.google/docs/mcp — 2026-11-18.
12. [primary] IDE extensions (ACP): https://antigravity.google/docs/ide/extensions/acp — 2026-11-18.
13. [primary] CLI ACP: https://antigravity.google/docs/cli/acp — 2026-11-18.
14. [primary] SDK tools docs: https://antigravity.google/docs/sdk/tools.md — 2026-11-18.
15. [primary] SDK `BuiltinTools` source: https://raw.githubusercontent.com/google-antigravity/antigravity-sdk-python/main/google/antigravity/types.py — 2026-11-18.
16. [primary] CLI changelog: https://raw.githubusercontent.com/google-antigravity/antigravity-cli/main/CHANGELOG.md — 2026-11-18.
17. [primary] CLI repo root: https://api.github.com/repos/google-antigravity/antigravity-cli/contents/ — 2026-11-18.
18. [primary] Features: https://antigravity.google/docs/features — 2026-11-18.
19. [primary] Task groups: https://antigravity.google/docs/tools.md — 2026-11-18.
20. [primary] SDK MCP docs: https://antigravity.google/docs/sdk/mcp.md — 2026-11-18.

**ACP spec and registry — [primary]**

21. [primary] ACP registry: https://cdn.agentclientprotocol.com/registry/v1/latest/registry.json — 2026-11-18.
22. [primary] Overview: https://agentclientprotocol.com/protocol/v1/overview.md — 2026-11-18.
23. [primary] Initialization: https://agentclientprotocol.com/protocol/v1/initialization.md — 2026-11-18.
24. [primary] Session setup: https://agentclientprotocol.com/protocol/v1/session-setup.md — 2026-11-18.
25. [primary] Tool calls: https://agentclientprotocol.com/protocol/v1/tool-calls.md — 2026-11-18.
26. [primary] Content: https://agentclientprotocol.com/protocol/v1/content.md — 2026-11-18.
27. [primary] Extensibility: https://agentclientprotocol.com/protocol/v1/extensibility.md — 2026-11-18.
28. [primary] RFD tool-call-name: https://agentclientprotocol.com/rfds/tool-call-name.md — 2026-11-18.
29. [primary] RFD client-system-prompt: https://agentclientprotocol.com/rfds/client-system-prompt.md — 2026-11-18.
30. [primary] v2 tool calls: https://agentclientprotocol.com/protocol/v2/tool-calls.md — 2026-11-18.
31. [primary] v1 JSON schema: https://raw.githubusercontent.com/agentclientprotocol/agent-client-protocol/main/schema/v1/schema.json — 2026-11-18.
32. [primary] v1 Rust tool_call types: https://raw.githubusercontent.com/agentclientprotocol/agent-client-protocol/main/agent-client-protocol-schema/src/v1/tool_call.rs — 2026-11-18.
33. [primary] Docs index: https://agentclientprotocol.com/llms.txt — 2026-11-18.

**MCP spec — [primary]**

34. [primary] Tools: https://modelcontextprotocol.io/specification/2025-06-18/server/tools — 2026-11-18.
35. [primary] Schema reference: https://modelcontextprotocol.io/specification/2025-06-18/schema — 2026-11-18.
36. [primary] Overview / `_meta`: https://modelcontextprotocol.io/specification/2025-06-18/basic/index — 2026-11-18.
