# Brief: Antigravity tool-schema mimicry through omp's ACP bridge

## Question

Can an omp extension reshape the tool names, descriptions, schemas, call ids and tool-call/result traffic so the signed-in `agy acp` child sees a tool surface resembling Google's official Antigravity client, while omp's TUI, session store and tool loop keep canonical omp identities? What is actually reachable on the built-in `antigravity-cli` / `antigravity-acp` path, what only exists on the direct CCA fallback, and what breaks if attempted?

## Decision

Whether round 2 should add a tool-shape adapter and reverse translator, where that seam lives, and which parts must stay out of scope. This research informs a design, not an implementation.

## Answer form

Cited technical report with a feasibility matrix by seam, exact code anchors, named failure modes, and a recommended design. Not a yes/no slogan and not a bypass guarantee.

## Scope

IN:
- Installed omp 18.22.2 ACP bridge: `registerTool`, `setActiveTools`, tool schema normalization, loopback MCP `tools/list`, `mcp_ide-tools_<name>` projection, `agy_<uuid>` call ids, ACP `_meta`, turn boundaries and digests.
- Official `agy` ACP tool surface from first-party docs/source: tool names, schemas, descriptions, capabilities, approval/execution semantics, `_meta` extensions, session store behavior.
- Native Antigravity client tool identity: published tool names/schemas/descriptions, MCP naming, built-in tools such as task management, and anything observable from official source rather than relay folklore.
- Request/response translation: whether outbound tool definitions and inbound tool calls/results can be rewritten safely without breaking omp dispatch, approvals, digests, `systemKey`/`toolsKey`, or parked turns.
- Direct CCA fallback comparison: payload-level tool declaration shaping on `google-antigravity`/`google-gemini-cli`, and why that differs from ACP.
- Failure modes: tool-loop detachment, cache invalidation, schema rejection, signature/digest mismatch, approval mismatch, version drift, and no-op rules.

OUT:
- Writing plugin code, manifests, tests, or config.
- Header/UA/TLS/HTTP2 spoofing, token handling, OAuth changes, account rotation, quota pools, or paused-route workarounds.
- Live login or terminal probes against Google.
- Legal/ToS recommendation.

## Assumptions

- Primary path is built-in `antigravity-cli` with API id `antigravity-acp`; `google-antigravity` and `google-gemini-cli` are secondary and legacy paths.
- Local omp session state stays raw; any translation is outbound/inbound at provider seams only.
- Existing repository findings are starting evidence, not authority; primary sources must be re-fetched or re-read.
- Research date: 2026-11-18. Today confirmed by system date.
- Round 2 implementation, if approved, will use the same sequential subagent-driven workflow with implementer + reviewer per task.

## Depth mode

deep — 5-8 round-1 workers, up to 2 follow-up rounds, target 25+ distinct sources.

## Date

2026-11-18
