# Antigravity Tool Alias Adapter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a pinned omp 18.22.2 host patch that aliases omp tools into a safe subset of Antigravity hook-doc tool names for `agy`, reverse-maps calls/results before omp identity is emitted, and leaves Round 1 behavior intact on unpatched hosts.

**Architecture:** Extension supplies a `ToolAliasProvider` through a `globalThis` registration hook injected by the host patch. The patch wraps `toMcpTool`, `#onToolCall`, `toMcpOutput`; the extension keeps the same three hooks and one `/agy-byp` command. Canonical omp names, ids, digests, approvals and session state never change.

**Tech Stack:** Bun 1.4.4, TypeScript 7.0.2, omp 18.22.2, existing Round 1 package, Biome 2.6.8.

**Spec:** `docs/superpowers/specs/2026-11-18-antigravity-tool-alias-adapter-design.md`

## Global Constraints

- Bun only: `bun`, `bunx --bun`. Never `node`/`npm`/`npx`.
- Static `@oh-my-pi/*` imports. No stdout from extension code.
- Default OFF. Same three hooks and one `/agy-byp on|off|status` command. No new activation env var.
- `OMP_AGY_BYP_MODE=native` disables text scrubbing and tool alias mimicry.
- Unpatched host: extension loads; Round 1 text scrubbing works; alias provider inactive; status reports patch state.
- Patched host: alias only active when toggle ON and mode is `generic`. Toggle changes apply at the next `AgyHost.step` tool preparation boundary, never mid-parked-turn.
- Alias target: hook-doc safe subset only (`view_file`, `write_to_file`, `replace_file_content`, `grep_search`, `find_by_name`, `run_command`). No SDK enum transplant. No `manage_task`, MCP resources, permissions or subagent tools.
- Hard preserves: canonical tool ids/names, `agy_<uuid>`, `antigravityCli` payload, `transcriptDigest` inputs, approval keys, URL schemes, ACP `_meta`, headers/UA/TLS.
- No OAuth, token, relay, endpoint, quota, rotation or live Google probes.
- Patch is pinned to installed omp 18.22.2 and must refuse drift.

## Review Focus

- A renamed tool must not reach omp transcript, TUI, approval keys or digest as the alias name. Pin in the patched `#onToolCall` test.
- Outbound alias schema must be stable per session; changing it while parked abandons turns. Pin in `toolsKey` stability test.
- Argument translation must happen before schema validation and digest; `tool_call` extension handlers are too late. Pin in host-patch test.
- Result translation must preserve success/error and pairing. Pin in `toMcpOutput` test.
- Unpatched host must not break Round 1. Pin in extension load/toggle tests.
- Native mode must disable both text and tool mimicry. Pin in provider tests.

---

### Task 1: Host patch, verifier, and idempotent apply script

**Files:**
- Create: `host-patch/0001-tool-alias.patch`
- Create: `scripts/apply-host-patch.ts`
- Create: `scripts/check-host-patch.ts`
- Test: `tests/patch-verifier.test.ts`

**Interfaces:**
- Consumes: installed omp 18.22.2 source at runtime-resolved `@oh-my-pi/pi-coding-agent` host path.
- Produces: `checkHostPatch(hostRoot: string): { status: "ok"|"missing"|"drifted"; reason?: string }`; CLI `bun scripts/apply-host-patch.ts --check [--host <path>]`, and same without `--check` to apply idempotently with `.orig` backup.

- [ ] **Step 1: Write failing verifier tests**

```ts
// tests/patch-verifier.test.ts
import { expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { checkHostPatch } from "../scripts/check-host-patch";

function hostFixture(patched: boolean): string {
  const root = mkdtempSync(join(tmpdir(), "ag-byp-host-"));
  const dir = join(root, "pi-ai/src/providers/antigravity-cli");
  mkdirSync(dir, { recursive: true });
  const base = [
    "function toMcpTool(tool: Tool): McpToolDefinition {",
    "  return { name: tool.name, description: tool.description, inputSchema: schema };",
    "}",
  ].join("\n");
  const text = patched
    ? [
        base.replace("return {", "return globalThis.__ompAgBypProjectTool?.(tool) ?? {"),
        "function __ompAgBypSetToolAliasProvider(): void {}",
        "function __ompAgBypReverseToolCall(): void {}",
        "function __ompAgBypProjectResult(): void {}",
      ].join("\n")
    : base;
  writeFileSync(join(dir, "host.ts"), text);
  return root;
}

test("verifier accepts a patched host fixture", () => {
  expect(checkHostPatch(hostFixture(true)).status).toBe("ok");
});

test("verifier reports missing patch without mutating the host", () => {
  expect(checkHostPatch(hostFixture(false)).status).toBe("missing");
});
```

- [ ] **Step 2: Run the test; expect missing-module failure**

Run: `bun test tests/patch-verifier.test.ts`
Expected: FAIL — `../scripts/check-host-patch` not found.

- [ ] **Step 3: Implement verifier and apply script**

`checkHostPatch(hostRoot)` resolves `<hostRoot>/pi-ai/src/providers/antigravity-cli/host.ts`, reads it, and requires unique occurrences of `__ompAgBypSetToolAliasProvider`, `__ompAgBypProjectTool`, `__ompAgBypReverseToolCall`, and `__ompAgBypProjectResult`. Any missing anchor => `missing`; duplicate or anchor in unexpected function body => `drifted`.

`apply-host-patch.ts` applies `host-patch/0001-tool-alias.patch` by exact anchored string replacement, refuses non-18.22.2 hosts, writes `<file>.orig` once, and is idempotent. No fuzzy patching.

- [ ] **Step 4: Re-run focused test**

Run: `bun test tests/patch-verifier.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

Subject: `feat: add pinned host patch verifier and apply script`.

---

### Task 2: Alias table and provider

**Files:**
- Create: `src/tool-alias.ts`
- Test: `tests/tool-alias.test.ts`

**Interfaces:**
- Consumes: `PluginConfig` from `src/config.ts`.
- Produces: `ToolAliasProvider`, `createToolAliasProvider(options: { enabled: () => boolean; mode: () => string }): ToolAliasProvider`; `ALIAS_RULES: readonly AliasRule[]`.

```ts
export type ProjectedTool = { name: string; description?: string; inputSchema: Record<string, unknown> };
export type ToolAliasProvider = {
  resolveOutbound(tool: { name: string; description?: string; inputSchema?: unknown }): ProjectedTool | undefined;
  resolveInbound(aliasName: string, args: unknown): { toolName: string; args: unknown } | undefined;
  resolveResult(toolName: string, result: unknown): unknown;
};
```

Exact safe-subset rules:

| omp tool | alias | argument map |
|---|---|---|
| `read` | `view_file` | `path -> AbsolutePath`, `offset -> StartLine` |
| `write` | `write_to_file` | `path -> TargetFile`, `content -> CodeContent`, `overwrite -> Overwrite` |
| `edit` | `replace_file_content` | `path -> TargetFile`, `old_string -> TargetContent`, `new_string -> ReplacementContent` |
| `grep` | `grep_search` | `pattern -> Query`, `path -> SearchPath` |
| `glob` | `find_by_name` | `pattern -> Pattern`, `path -> SearchDirectory` |
| `bash` | `run_command` | `command -> CommandLine`, `cwd -> Cwd` |

- [ ] **Step 1: Write failing provider tests**

Cover: outbound projection for all six rules; unknown tool returns `undefined`; inbound alias/args round trip; result round trip; duplicate alias detection; missing required argument map fails; disabled and native modes return `undefined` from all resolvers.

Run: `bun test tests/tool-alias.test.ts`
Expected: FAIL — module missing.

- [ ] **Step 2: Implement `src/tool-alias.ts`**

Define JSON schemas for the six aliases using hook-doc argument keys with `type`, `properties`, and `required` where mandatory. Keep descriptions short and factual. `resolveInbound` must reject unknown aliases and translate only declared keys; extra keys are dropped. `resolveResult` is identity for v1 except wrapping text under `{ content: [{type:"text", text}] }` when a canonical result is a plain string.

- [ ] **Step 3: Re-run focused test**

Run: `bun test tests/tool-alias.test.ts`
Expected: PASS.

- [ ] **Step 4: Commit**

Subject: `feat: add safe Antigravity tool alias table and provider`.

---

### Task 3: Wire provider into extension and status

**Files:**
- Modify: `src/index.ts`
- Test: `tests/index.test.ts`

**Interfaces:**
- Consumes: `createToolAliasProvider`, `checkHostPatch` from Tasks 1–2.
- Produces: no new exported runtime API; default factory registers the provider via `globalThis.__ompAgBypSetToolAliasProvider` when the host hook exists.

- [ ] **Step 1: Write failing wiring tests**

Add tests to `tests/index.test.ts`: provider is registered at load when the global hook exists; resolvers stay inert when state OFF or `mode === "native"`; when patch missing, hooks still scrub text and status says `patch: missing`; `on` mid-turn sets a pending alias state; status includes patch and pending fields. Use model-bearing contexts as in Round 1.

Run: `bun test tests/index.test.ts`
Expected: FAIL — new assertions absent from code.

- [ ] **Step 2: Implement wiring**

At load, register provider only when `globalThis.__ompAgBypSetToolAliasProvider` is a function. Provider reads `state.enabled` and `config.mode`. Do not throw on stock hosts. Extend status notification with `patch: ok|missing|drifted` and `alias: active|pending|off`. Keep three hooks and one command.

Run: `bun test tests/index.test.ts`
Expected: PASS.

- [ ] **Step 3: Commit**

Subject: `feat: register tool alias provider and report patch state`.

---

### Task 4: Patch host behavior tests

**Files:**
- Create: `tests/host-alias-adapter.test.ts`
- Modify: `host-patch/0001-tool-alias.patch` only if tests expose a seam bug.

**Interfaces:**
- Consumes: patched host fixture and `src/tool-alias.ts`.
- Produces: no plugin API change.

- [ ] **Step 1: Write failing adapter tests**

Use a temporary fixture that mirrors the patched host functions, not live Google: assert `toMcpTool(read)` emits `view_file` schema; `#onToolCall("view_file", args)` emits canonical `name:"read"` and canonical args into `step.writer.toolCall`; digest input uses canonical name/args; `toMcpOutput` on a canonical result returns alias-shaped output; `toolsKey` is stable across repeated calls; unknown alias is rejected.

Run: `bun test tests/host-alias-adapter.test.ts`
Expected: FAIL — fixture/patch seam not present.

- [ ] **Step 2: Implement patch seam fixes**

Adjust patch hunks so reverse mapping occurs before `agy.tools.get(name)`, validation, id and digest creation; store canonical name on pending call for result projection. Never change call ids or digest algorithm.

Run: `bun test tests/host-alias-adapter.test.ts`
Expected: PASS.

- [ ] **Step 3: Commit**

Subject: `test: pin canonical identity across alias adapter`.

---

### Task 5: Docs, human handoff, and final gate

**Files:**
- Modify: `README.md`, `HANDOFF.md`, `AGENTS.md`
- Test: existing suite only.

- [ ] **Step 1: Document exact operator steps**

README: host patch requirement, apply/check commands, default OFF, native mode, safe subset, unverified agy schemas, no detector claim.
HANDOFF: human-only steps to apply patch to a disposable host copy, load extension, run `/agy-byp status`, flip on, run one tool round trip, and revert `.orig`. No live Google login performed by agents.
AGENTS: update layout and gates for `host-patch/`, `scripts/`, and patch tests.

- [ ] **Step 2: Run integrated gates once**

```sh
bunx --bun tsc --noEmit -p tsconfig.json
bunx --bun @biomejs/biome check src tests
bun test tests/
```

Expected: all exit 0.

- [ ] **Step 3: Commit**

Subject: `docs: document host patch workflow and alias adapter`.

## Execution handoff

Plan complete. User already specified the execution method: sequential subagent-driven development with hy4 implementers and reviewers. Need plan review confirmation before dispatch.
