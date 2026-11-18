# F-signature-map — omp → agy signature mapping (loop-safe rewrites)

Scope. This maps the model-visible omp markers on the PRIMARY `antigravity-cli` / `antigravity-acp` path (local `agy acp` bridge) to loop-safe rewrite targets that read like a genuine Antigravity bridge client, and separates safe-to-rewrite prompt text from hard contracts that must be preserved verbatim. Today 2026-11-18. No secret values quoted.

Reachability decides what any rewrite can touch. On `antigravity-cli` omp emits no HTTP headers, User-Agent, or Authorization header; `agy` owns the socket, TLS stack, headers and CCA envelope (F-antigravity-cli-source.md §9; F-antigravity-cli-hooks.md F2; room seq 101/115). Only three model-visible content surfaces exist: (a) the joined system prompt, shipped as `_meta.antigravity.systemPrompt.append` on session/new and loadSession; (b) tool name/description/schema, projected into a loopback MCP tools/list and seen by agy as `mcp_ide-tools_<name>`; (c) messages/context. Reachable extension seams are `before_agent_start` (systemPrompt string[] replacement), `context` (messages), and registerTool/setActiveTools. `before_provider_request` and `after_provider_response` are wired into provider options but never read by the CLI transport, so they do not fire (F-antigravity-cli-hooks.md F1; F-signature.md scope correction; room seq 105). Any mapping that assumes payload/header rewrite on this path is a no-op.

Confidence: High = direct source line cited; Medium = inferred from source structure or injected-rules placement; Low/speculative = detector efficacy or closed-CLI internals.

Sources: docs/research/omp-antigravity-investigation/F-signature.md; F-antigravity-cli-hooks.md; F-antigravity-cli-source.md; AGENTS.md; packages/coding-agent/src/prompts/system/system-prompt.md (host snapshot 18.18.6); pi-ai/src/providers/antigravity-cli/agent.md (installed 18.22.2); `F-quota-rotation.md` (S10 / OmniProxy `GOOGLE_SUBSCRIPTION.md`, first-party relay A/B).

## Mapping table

| # | omp marker (source) | Model-visible surface | Rewritable on CLI path? | Loop-safe target | Confidence |
| --- | --- | --- | --- | --- | --- |
| 1 | Role line `You are omp's trusted coding assistant.` (system-prompt.md:4-5) | System-prompt text; joined and appended via ACP meta | Yes - text only | Replace the identity clause with a bridge-native one; keep the rest of the section byte-stable | High |
| 2 | RFC 2119 keywords / XML-tag precedence preamble (system-prompt.md:1-2) | System-prompt text | Yes - generic instruction style, low identifying value | Neutralise or keep; no tool contract depends on it | Medium |
| 3 | Section `⁂ Engineering` (system-prompt.md:7+) | System-prompt text | Yes | Keep behaviour rules; relabel only if desired | High |
| 4 | `# Skills & Rules` + `Matching skill → MUST read skill://<name> first.` + skills/generic-rules blocks (system-prompt.md:40-60; F-signature F2/F6) | System-prompt text | Partly - heading/prose yes; `skill://` scheme and MUST-read-first contract are hard while skills are enabled | Relabel to a neutral capability heading; keep `skill://<name>` literal and the MUST-read rule if skills remain | High |
| 5 | `# Internal URLs` section prose (system-prompt.md:67-73) | System-prompt text + tool arguments | Prose yes; scheme list no | Relabel to resource references; keep exact scheme strings | High |
| 6 | `# Tool Inventory` (system-prompt.md:75-83) | System-prompt text | Label yes; name list no | Relabel to available tools; keep the name list identical to the advertised tool set | High |
| 7 | `# xd:// Tool Devices` (system-prompt.md:85-89) | System-prompt text + tool arguments | Prose yes; `xd://` scheme and `write` transport no | Reword as device endpoints; keep `xd://<tool>` literal and the `write` reference | High |
| 8 | `⁂ Scratchpad` / `think` (system-prompt.md:90-93) | System-prompt text | Label yes; `think` tool id no | Keep the `think` id; relabel prose only | High |
| 9 | `⁂ Tool Policy` section (system-prompt.md:95-158) | System-prompt text | Mostly yes; embedded tool ids, `xd://report_issue`, task/wait/find refs are contracts | Condense to neutral tool-use policy while preserving exact tool ids mentioned | High |
| 10 | Caveman / Ponytail / Unslop persona names (injected generic-rules and skill descriptions; F-signature F2/F6; AGENTS.md code-conventions echo) | System-prompt text via generic-rules/skills | Yes - remove or replace persona names | Replace with neutral working-style guidance | Medium |
| 11 | `use-superpowers` skill name (skills name+description line) | System-prompt text via `<skills>` | Yes - drop the entry, do not rename it | Omit the omp-specific skill entry; keep the rest of the skills block | Low/Medium |
| 12 | `# Delegation` / task & wait subagent prose (system-prompt.md:160+) | System-prompt text | Prose yes; `task`/`wait` tool ids no | Replace with one generic coordination line; keep ids if those tools stay advertised | High |
| 13 | Built-in tool ids (read, write, bash, edit, grep, glob, task, wait, think, ast_grep, ast_edit, lsp...) (F-hooks F6; builtin-names.ts) | Tool schemas | No | Hard preserve - dispatch contract | High |
| 14 | MCP-discovered name prefix `mcp__<server>_<tool>` (F-hooks F6) | Tool names | No | Hard preserve - never invent this prefix in prompts | High |
| 15 | agy view prefix `mcp_ide-tools_<name>` (F-source §7; mcp-bridge.ts) | Tool titles in ACP | No | Hard preserve - not an omp tool name | High |
| 16 | Internal URL schemes `omp:// local:// artifact:// agent:// proc:// history:// ssh:// skill:// pr:// mr://` (F-hooks F6) | Tool args + prompt | No | Hard preserve - host-resolved resources, not interchangeable aliases | High |
| 17 | `agy_<uuid>` tool-call ids; `antigravityCli` payload (conversationId, digest, checkpoint); exact prefix hashed by transcriptDigest (F-source §7; F-hooks F6) | Messages / session state | No | Hard preserve - planTurn resumes only an exact prefix with the matching pending toolCallId | High |
| 18 | `systemKey` (joined system prompt) and `toolsKey = stableStringifyJson(tools)` stability (F-hooks F4/F6; host.ts:222-249,227-249) | ACP session state | Only at a turn boundary | Hard preserve mid-turn - changes abandon the parked turn and reseed/restore | High |
| 19 | ACP meta keys `_meta.antigravity.systemPrompt.append` and `_meta["antigravity.google/conversation_id"]` (F-source §4/§7) | Transport | No | Hard preserve - fixed in installed source. The genuine-client changelog uses `antigravity.google/root_conversation_id` on MCP `tools/call`; omp's `conversation_id` is a distinct string at a different protocol point, and whether they map to the same conversation is unverified (`F-antigravity-latest.md` F4/G8). | High |
| 20 | argv `agy acp --agent bridge --gemini-dir ... --ide-mcp-port ... --dangerously-skip-permissions`; env `SSH_TTY=omp-agy-file-auth`, `AGY_CLI_DISABLE_AUTO_UPDATE=1` (F-source §4/§6) | Process | No | Hard preserve - no extension API for per-request argv/child env | High |
| 21 | OAuth client id/secret, structured credential envelope, native token file, account key/version (F-source §2/§5/§9) | Auth/binary | No | Hard preserve - owned by omp login hook and agy | High |
| 22 | `PI_AGY_PATH` binary override (F-source §3; F-hooks Rejected) | Binary selection | Technically yes, unsafe | Do not treat as rewrite; a shim drops the genuine signed-CLI fingerprint | High |
| 23 | HTTP headers / User-Agent / Authorization / TLS / CCA labels, requestId, sessionId (F-signature F3/F8; F-source §9; room seq 129 HeaderTlsScout) | Transport (HTTP CCA path only) | Not reachable on CLI; on the HTTP path caller `options.headers` sets fields | Hard preserve / no-op on CLI; on the HTTP fallback `before_provider_request` cannot rewrite headers, but a caller can supply `options.headers`, spread last in request assembly, which overrides any built-in field (`F-header-tls.md` F4/F6) | High |
| 24 | `metadata.user_id` shape and provider gating to anthropic only (F-signature F4) | Request metadata (HTTP path only) | Not reachable on CLI | Hard preserve - gated in buildSessionMetadata | High |

Summary: the only safe rewrite class is TEXT in the system prompt (and, at lower value, tool descriptions). Everything that is a dispatch id, resource scheme, transport meta key, credential, or fingerprint is a hard contract.

## Safe rewrites

Each pair below is an **illustrative template**, not a literal string to paste. The `Before` blocks are abbreviated from the system-prompt template: placeholders such as `{{intentField}}` and `{{toolRefs.find}}` render to the session's actual field and tool ids (e.g. `i` and `find` in installed 18.22.2). Before applying any rewrite, verify the `Before` text against the live rendered prompt for that session — a mismatch means the rewrite is a no-op. Preserve array structure, section order, tool ids and schemes verbatim.

R1 - Role line (system-prompt.md:4-5). Confidence High.

Before:
```text
⁂ Role
You are omp's trusted coding assistant.
```
After:
```text
⁂ Role
You are the coding assistant for this Antigravity bridge session. Work inside the user's workspace and use the tools available in this session to complete the request.
```
Loop-safety: identity text only; no tool id or scheme touched.

R2 - Skills & Rules (system-prompt.md:40-48). Confidence High. Relabel only; keep the scheme and MUST-read contract so skill dispatch still works.

Before:
```text
⁂ Runtime
# Skills & Rules
Matching skill → MUST read `skill://<name>` first.
<skills>
- <name>: <description>
</skills>
```
After:
```text
⁂ Runtime
# Capabilities & Rules
Matching skill → MUST read `skill://<name>` first.
<skills>
- <name>: <description>
</skills>
```

R3 - Internal URLs (system-prompt.md:67-73). Confidence High. Keep every scheme string.

Before:
```text
# Internal URLs
Most FS/bash tools resolve these; path selectors: `read` docs.
- omp:// ...
- local:// ...
```
After:
```text
# Resource references
The host resolves these reference schemes; consult `read` docs for path selectors.
- omp:// ...
- local:// ...
```

R4 - xd:// Tool Devices (system-prompt.md:85-89). Confidence High. Keep `xd://` and the write tool ref.

Before:
```text
# xd:// Tool Devices
Write JSON args as `content` to `xd://<tool>` via `write`. Invalid args return schema in error → fix/retry.
```
After:
```text
# Device endpoints
Pass JSON arguments as `content` to `xd://<tool>` through `write`; invalid input returns a schema error - correct and retry.
```

R5 - Tool Inventory (system-prompt.md:75-83). Confidence High. Keep the name list byte-identical.

Before:
```text
# Tool Inventory
- read: `read`
- bash: `bash`
```
After:
```text
# Available tools
- read: `read`
- bash: `bash`
```

R6 - Tool Policy, condensed illustrative excerpt of the installed 18.22.2 template (system-prompt.md:98-139). Confidence High for the placeholder shapes; illustrative, not paste-ready. Keep `find`, `lsp`, `ast_grep`, `ast_edit` and every other advertised tool id.

Before:
```text
⁂ Tool Policy
# General
Every turn costs seconds: batch all independent reads/searches/checks into one turn. Once the change is verified, stop and report; no extra audits, broad suites, or repo-wide checks unless asked. SHOULD resolve prerequisites, parallelize independent calls. Retry empty/partial/narrow results differently; NEVER settle for plausibility when another call reduces uncertainty.

# Tool I/O
- Prefer relative paths.
{{#if intentTracing}}- Most tools take `{{intentField}}`: capitalized 2–6-word present-participle intent (e.g. "Reading model role settings").{{/if}}

# Specialized Tools
{{#has tools "read"}}- File/directory reads: `{{toolRefs.read}}` (directory lists entries).{{/has}}
{{#has tools "lsp"}}- Language server available: MUST use `{{toolRefs.lsp}}` for definitions, references, hover; code actions for refactors/imports/fixes. NEVER text-search/edit for code intelligence.{{/has}}
{{#has tools "find"}}- Unknown behavior/location: descriptive `{{toolRefs.find}}` FIRST; NEVER guess `grep`/`glob` targets.{{/has}}

# Exploration
NEVER open guessed files.{{#has tools "find"}} Read `{{toolRefs.find}}` hits only.{{/has}}{{#has tools "read"}} Read small files whole; ranges only for large files. NEVER re-read content you already have.{{/has}}
```
After:
```text
⁂ Tool Policy
# General
Batch independent reads and checks; report once the change is verified. Use `task` subagents only when parallel work is explicitly requested.
# Tool I/O
Prefer relative paths. Most tools accept an intent label rendered from `{{intentField}}` (`i` in the installed 18.22.2 session).
# Specialized tools
Use `read`/`edit`/`write`/`grep`/`glob`/`find`/`bash`/`lsp`/`ast_grep`/`ast_edit` for their named roles; never shell `grep`/`sed`/`awk` for edits.
```
Loop-safety: `find`, `lsp`, `ast_grep`, `ast_edit` are real advertised tools in installed 18.22.2 (`find` is in `BUILTIN_TOOL_NAMES`; the live template renders `{{toolRefs.find}}`); no id was removed or renamed. Keep the `xd://report_issue` line if that device is enabled. This is an illustrative rewrite — re-verify the Before block against the live rendered prompt or it is a no-op.

R7 - Persona names Caveman / Ponytail / Unslop (injected generic-rules/skills; Medium). Before:
```text
## Identity
- **Ponytail**: full — lazy senior dev. YAGNI, stdlib first, shortest diff. Non-negotiable default.
- **Caveman:** default lite. Non-negotiable default; see Caveman Policy section.
```
After:
```text
## Working style
- Prefer the smallest correct change. Keep changes boring and maintainable.
- Be direct and concise in responses.
```
Loop-safety: prose only; does not reference tools or schemes.

R8 - `use-superpowers` skill entry (Low/Medium). Confidence: the exact placement in the live session is unverified. Before:
```text
- use-superpowers: At conversation start, check skills before responding, even clarifying questions.
```
After:
```text
```
(the line is removed; the surrounding `<skills>` block and other entries are untouched). Do NOT rename the skill to a new string, because skill resolution uses the exact name and a renamed token would break dispatch if the model tries to open it.

R9 - Delegation text (system-prompt.md:160+). Confidence High. Keep `task`/`wait` if advertised. Before:
```text
# Delegation
Delegation preferred. Once design settles, SHOULD fan substantial work to `task`; multi-file changes, refactors, features, tests, investigations strong candidates.
## Delegation gates
- Before spawning, map slices/shared contracts; user-enumerated 2+ self-contained runnable slices exempt.
```
After:
```text
# Coordination
Use `task` subagents only for explicitly requested parallel work or genuinely independent slices; keep other work inline.
```
Loop-safety: `task`/`wait` ids are unchanged; only guidance prose is condensed.

## Hard preserves

Do not rewrite these; each is a dispatch, session, transport, or identity contract. Source anchors are the investigation reports cited in scope.

- Built-in tool ids read/write/bash/edit/grep/glob/task/wait/think/ast_grep/ast_edit/lsp and hidden ids. Canonicalised from a fixed list; renaming breaks tool execution or makes xd:// devices unreachable (F-hooks F6; F-signature F5).
- `mcp__<server>_<tool>` prefix for MCP-discovered tools; never invent it in prompts (F-hooks F6).
- `mcp_ide-tools_<name>` - agy's view of an omp tool; AgyHost strips this prefix only to announce a tool (F-source §7; F-hooks F6).
- Internal URL schemes omp:// local:// artifact:// agent:// proc:// history:// ssh:// skill:// pr:// / mr:// - host-resolved resources, not interchangeable aliases (F-hooks F6).
- `skill://<name>` and the MUST-read-first rule while skills are enabled - scheme resolution plus behavioural contract (system-prompt.md:42; F-signature F6).
- `xd://<tool>` and the `write` transport - devices are mounted through read/write, not separate tool schemas (system-prompt.md:87; F-signature F5).
- `agy_<uuid>` tool-call ids; `antigravityCli` payload fields conversationId, digest, optional checkpoint; the exact message prefix hashed by transcriptDigest; toolsKey = stableStringifyJson(tools). planTurn resumes only an exact prefix with the matching pending toolCallId, otherwise it restores a checkpoint or reseeds (F-source §7; F-hooks F6; host.ts:656-669).
- `systemKey` from the joined system prompt and tool-list stability while a tool turn is parked - changing them abandons the live turn (F-hooks F4/F6; host.ts:222-249,227-249). This is the main reason to apply prompt rewrites only at a turn boundary.
- ACP meta keys `_meta.antigravity.systemPrompt.append` and `_meta["antigravity.google/conversation_id"]`; client identity bridge / Host tool bridge / v1; MCP server tools / v1; ACP protocolVersion 1 (F-source §4/§7/§9). The genuine-client `antigravity.google/root_conversation_id` (MCP `tools/call`, official changelog) is a different key; treat the two as distinct and unverified-equivalent, not interchangeable (`F-antigravity-latest.md` F4/G8; `F-antigravity-cli-source.md:59,75`).
- argv `agy acp --agent bridge --gemini-dir ... --ide-mcp-port ... --dangerously-skip-permissions`; forced env SSH_TTY=omp-agy-file-auth and AGY_CLI_DISABLE_AUTO_UPDATE=1; `nc` on PATH; fixed MCP protocol 2025-06-18 and 127.0.0.1 ephemeral loopback (F-source §4/§6/§7; F-hooks F5).
- OAuth client id/secret, structured credential envelope, the native antigravity-oauth-token file layout, agyCredentialKey and agyCredentialVersion (F-source §2/§5/§9).
- HTTP headers, User-Agent, Authorization, TLS stack, CCA labels/requestId/sessionId - owned by agy; no extension surface (F-source §9; F-hooks F2; HeaderTlsScout room seq 129). On the HTTP fallback, `before_provider_request`/`after_provider_response` cannot rewrite headers; callers can pass `options.headers`, spread last in request assembly, which overrides any built-in header field (`F-header-tls.md` F4/F6). Payload hooks may still rewrite body fields but must preserve valid CCA schema and tool-call ids (F-signature F8/Rewritable 4).
- metadata.user_id shape and anthropic-only provider gating in buildSessionMetadata (F-signature F4).
- PI_AGY_PATH as a rewrite: mechanically possible but it skips SHA-512 verification and removes the genuine signed-CLI fingerprint that is this provider's structural advantage (F-hooks Rejected; F-source §3).

## Risks

- Efficacy for omp's own markers is unverified. A first-party relay A/B (S10, cited in `F-quota-rotation.md`) documents upstream identification of specific system-prompt identity lines in Claude Code / Claude Agent SDK / Codex GPT-5 / Hermes Agent and a `400`→`200` outcome change when those exact lines are rewritten; it is relay-reported, not a Google publication, and did not test omp markers or tool names. Scrubbing omp markers remains speculative mitigation (F-signature O5; F-hooks Q2). Label any omp-specific efficacy claim Low/speculative.
- Mid-turn prompt changes are unsafe. A changed system prompt changes systemKey and can force a fresh/restore reseed of a parked turn; changed tool definitions change toolsKey and restart the host (F-hooks F4/F6; host.ts:222-249). Apply only at a turn boundary.
- Over-scrubbing degrades the tool loop. Dropping tool-policy, internal-URL and xd:// guidance reduces reliable tool calling even though tool schemas are unchanged (F-signature Rewritable 1).
- Renaming a skill entry breaks dispatch; remove the line rather than invent a new name (skill:// resolution is exact).
- Assuming before_provider_request/after_provider_response fire on the CLI path yields a silent no-op; the CLI transport ignores onPayload/onResponse (F-hooks F1; room seq 101/105/115).
- Header/UA/TLS spoofing from an extension is structurally impossible on this path; agy owns the socket (F-hooks Rejected; room seq 129).
- PI_AGY_PATH wrappers trade away the genuine-CLI fingerprint for no measured gain (F-hooks Rejected).
- Prompt-cache invalidation after a systemPrompt rewrite is unknown; retry/fallback hops may reintroduce the original block (F-signature O3/O4).
- HTTP side requests (compaction, judges, image generation) may still traverse HTTP providers where before_provider_request does fire; a CLI-only mapping does not cover them (F-hooks Q5; F-signature O1).

## Open questions

- Q1 (Low/speculative). What measurable detector signal, if any, is affected by prompt-only scrubbing on the CLI path? The S10 relay A/B shows an effect for other clients' identity lines; this map establishes reachability for omp's markers, not omp-specific efficacy (F-hooks Q2; F-signature O5).
- Q2 (speculative). Does upstream identify clients from content surfaces at all, versus transport/telemetry fingerprint? A first-party relay A/B (S10) shows yes for specific system-prompt identity lines in other clients; no Google publication and no A/B covers omp's own markers or tool names.
- Q3 (Medium). Does the bridge agent definition pi-ai/src/providers/antigravity-cli/agent.md (name bridge, description Host-provided system prompt and tools, mainAgent true, tools [], inheritCustomizations false, excludeDefaultComponents true) impose any additional identity strings beyond the omp system prompt? It is written into <geminiDir>/config/agents/bridge.md, not rewritten by an extension.
- Q4 (Medium). Does agy normalise the `_meta.antigravity.systemPrompt.append` block before presenting it to the model, and would section relabeling change prompt-cache prefixes? Source confirms transport only.
- Q5 (High for shape, Low for safety). On the HTTP fallback, what is the full CloudCodeAssistRequest field inventory needed to rewrite labels/requestId safely via before_provider_request (F-signature O2)?
- Q6 (Medium). Do image-generation, quota and usage side requests ever run through antigravity-acp, or only HTTP providers (F-hooks Q5; F-signature O1)?
- Q7 (Medium). Does removing the use-superpowers skill entry change model behaviour in a way that outweighs the identity gain? The entry's exact live placement was not verified in repo source.
- Q8 (Medium). Whether any future omp version wires onPayload/onResponse into streamAntigravityCli would change the rewrite surface. In 18.22.2 both are set by stream dispatch but ignored (F-source Open questions).
- Q9 (Low/speculative). Upstream agy env knobs and telemetry switches outside this repo (CODE_ASSIST_ENDPOINT, SURFACE/GEMINI_CLI_SURFACE) remain speculative (F-hooks Q1).
- Q10 (Medium). Are `antigravity.google/root_conversation_id` (genuine client, MCP `tools/call`) and `_meta["antigravity.google/conversation_id"]` (omp ACP bridge) related keys? Both strings are sourced, but the relationship is unverified; needs a source trace or traffic capture. Do not change omp's key from docs alone.
