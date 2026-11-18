# Plan 004: Harden the implementation plan's test snippets

> **Executor instructions**: Follow this plan step by step. It edits **one documentation file only**. Run every verification command and confirm the expected result before moving on. Do not create `src/`, `package.json`, `tests/`, `node_modules/` or any plugin code — implementation is explicitly deferred. If anything in "STOP conditions" occurs, stop and report; do not improvise. A reviewer dispatched you, so **do not** update `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 1e75876..HEAD -- docs/superpowers/plans/2026-11-18-google-ai-subscription-provider.md`
> The target file is currently modified in the working tree relative to `HEAD`, so the committed-history diff may be empty. The authoritative gate is the live-file excerpt check in Step 1 below. On any mismatch, STOP and report.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW (documentation only)
- **Depends on**: none
- **Category**: docs (executor-readiness of an implementation plan)
- **Planned at**: commit `1e75876`, 2026-11-18
- **Issue**: none

## Why this matters

`docs/superpowers/plans/2026-11-18-google-ai-subscription-provider.md` is the executable specification a future implementer will follow. Nine defects in its test snippets make a correct implementation fail (a sort-order assertion), make the red baseline measure the wrong failure (tests run before dependency install), encode an impossible provider/API pair, leave the two safety-critical behaviors untested (unpause env gate, enabled-state hooks), never assert the transport-metadata fields the document promises to preserve, use `as never` casts that prevent host-signature drift from being caught, reference an SDD ledger that is never defined, mandate tab indentation while all snippets use two spaces, and define a `Msg` type that contradicts the implementation step. Fixing the plan now costs minutes; leaving it means an implementer "fixes" working code to satisfy broken tests or skips the safety behavior entirely.

## Current state

- `docs/superpowers/plans/2026-11-18-google-ai-subscription-provider.md` — the only file in scope; a 675-line superpowers implementation plan for a default-off omp extension.
- The nine defects and their current locations (line numbers are from the live file at `1e75876` + working-tree edits, and shift after each edit — always anchor on the verbatim "CURRENT" text, not the number):

| # | Finding | Location now | Fix block |
|---|---------|--------------|-----------|
| 1 | `Object.keys(hooks).sort()` compared to an unsorted expected array | lines 526–530 | B5 |
| 2 | `bun install` only in Task 1 Step 8, after both red-test steps | lines 59–147 | B1 |
| 3 | Host fixture pairs `api: "google-antigravity"` with `provider: "antigravity-cli"` | lines 126–127 | B1 |
| 4 | Unpause env gate, enabled-state hooks, arg normalization untested | lines 515–602 | B5, B7 |
| 5 | `userAgent` / `requestId` named as preserved but never asserted | lines 394–405 | B3 |
| 6 | `as never` casts hide host-signature drift | lines 132, 510, 533–537, 546, 563, 572, 584, 599 | B1, B5 |
| 7 | Final step refers to an undefined "SDD ledger" | line 675 | B8 |
| 8 | Biome config says tabs; every snippet uses two spaces | line 103 | B2 |
| 9 | `Msg.content` is part-array only, but the implementation handles strings | line 347 (plus a missing test) | B4, B6 |

- Grounding facts the replacements must honor (verified during recon):
  - The chosen design is Approach C: augment built-in providers with opt-in content hooks; no provider, OAuth, CLI subprocess or relay is registered (`spec` lines 32–42; plan line 19).
  - `antigravity-cli`'s built-in **API/transport id is `antigravity-acp`**; its **provider id is `antigravity-cli`**. `google-antigravity` is a separate HTTP fallback (`docs/research/omp-antigravity-investigation/F-antigravity-cli-source.md` lines 9–11). Hence the fixture's correct pair is `api: "antigravity-acp"`, `provider: "antigravity-cli"`.
  - In the installed host types (18.22.2), `AssistantMessage` is exported from `@oh-my-pi/pi-ai` and its required fields are `role`, `content`, `api`, `provider`, `model`, `usage` (5 numeric fields), `stopReason`, `timestamp` — exactly the fields the current fixture supplies. A typed annotation therefore replaces `as never` without adding fields. (`Api = KnownApi | (string & {})`, `Provider = string`, so `"antigravity-acp"` / `"antigravity-cli"` are valid.)
  - The SDD ledger is the plan-scoped progress ledger created by `subagent-driven-development`'s `task-done` script: `.superpowers/sdd/<plan-basename>/progress.md`, first line `# SDD ledger — plan: <plan path>`. For this plan that is `.superpowers/sdd/2026-11-18-google-ai-subscription-provider/progress.md`.
  - `git status --short` at planning time already showed the target plan doc, the spec doc and `docs/research/omp-antigravity-investigation/` as modified/untracked. Those are other agents' work; leave them untouched.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Committed drift | `git diff --stat 1e75876..HEAD -- docs/superpowers/plans/2026-11-18-google-ai-subscription-provider.md` | exit 0 (may be empty; see live-file gate) |
| Live-file gate | `rg -n --fixed-strings '<exact CURRENT line>' docs/superpowers/plans/2026-11-18-google-ai-subscription-provider.md` | exactly one hit at the stated line |
| Whitespace | `git diff --check -- docs/superpowers/plans/2026-11-18-google-ai-subscription-provider.md` | exit 0, no output |
| Absence gate | `rg -n 'as never\|tabs and double quotes' docs/superpowers/plans/2026-11-18-google-ai-subscription-provider.md` | no output (exit 1) |
| Scope gate | `git status --short` | only the target plan doc newly changed; no source/test files created |

**Never run** `bun install`, `bun test`, `bunx --bun tsc`, `bunx --bun @biomejs/biome`, or any build/test/lint command. This is a documentation edit; running them would create `node_modules/` and violate the docs-only scope. All verification below is `git` + `rg`.

## Scope

**In scope** (the only file you may modify):
- `docs/superpowers/plans/2026-11-18-google-ai-subscription-provider.md`

**Out of scope** (do NOT touch, even though they look related):
- `docs/superpowers/specs/2026-11-18-google-ai-subscription-provider-design.md`, `AGENTS.md`, every file under `docs/research/omp-antigravity-investigation/`, and `plans/README.md`.
- Any plugin implementation: no `src/`, `package.json`, `tests/`, `node_modules/`, no install/test/commit of plugin code.
- The other audit findings (spec/plan signature and alias alignment, tool-description default/scope conflict, `off` unpause semantics, deferral banner, research-doc cleanup). They belong to other plans; do not fold them into this one.
- New tool names, new env variables, or a change to the chosen architecture. This plan hardens tests of the design that is already written.

## Steps

Apply blocks B1–B8 **in order**. After each replacement, re-read the file and use the verbatim "CURRENT" text as the anchor for the next block; do not trust the original line numbers after earlier edits.

### Step 1: Live-file gate

Before editing, confirm you are looking at the current file:

```sh
rg -n --fixed-strings 'Run: `bun install`, then commit with subject `feat: scaffold omp plugin package`.' docs/superpowers/plans/2026-11-18-google-ai-subscription-provider.md
rg -n --fixed-strings 'api: "google-antigravity"' docs/superpowers/plans/2026-11-18-google-ai-subscription-provider.md
rg -n --fixed-strings 'If no fix is needed, record that in the SDD ledger.' docs/superpowers/plans/2026-11-18-google-ai-subscription-provider.md
```

**Verify**: one hit each (expected lines 147, 127, 675). Any missing or duplicated hit → STOP and report.

### Step 2: B1 — reorder Task 1 so install precedes the red tests; fix fixture and casts

Replace the whole Task 1 step sequence — from the line `- [ ] **Step 1: Write the failing drift test**` through the line ``Run: `bun install`, then commit with subject `feat: scaffold omp plugin package`.`` — with the block below. This single replacement fixes findings 2, 3 and the Task 1 half of 6, and keeps the manifest/config content byte-identical apart from the described moves.

**CURRENT (verbatim, lines 59–147)**:

````markdown
- [ ] **Step 1: Write the failing drift test**

```ts
// tests/drift.test.ts
import { describe, expect, test } from "bun:test";
import { VERSION } from "@oh-my-pi/pi-coding-agent";
import { providerPauseReason, setUnpausedProviders } from "@oh-my-pi/pi-ai/registry/oauth";
import { HOST_SPECIFIERS, HOST_VERSION_PIN } from "../src/version";

describe("host drift", () => {
  test("installed host matches dev pin", () => {
    expect(VERSION).toBe(HOST_VERSION_PIN);
  });

  test("every deep host specifier is tracked", () => {
    expect(HOST_SPECIFIERS).toContain("@oh-my-pi/pi-ai/registry/oauth");
  });

  test("unpause and pause-reason APIs exist on the installed host", () => {
    expect(typeof setUnpausedProviders).toBe("function");
    expect(typeof providerPauseReason).toBe("function");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/drift.test.ts`
Expected: FAIL — `../src/version` not found.

- [ ] **Step 3: Create the manifest**

`package.json` must contain:
- `"name": "omp-agy-byp"`, `"version": "0.1.0"`, `"license": "MIT"`, `"type": "module"`.
- `"omp": { "name": "Google AI Subscription (Antigravity CLI)", "version": "0.1.0", "extensions": ["./src/index.ts"] }`.
- `"engines": { "bun": ">=1.4.4" }`.
- `"files": ["src", "README.md"]`.
- `"scripts"`: `test: bun test tests/`, `typecheck: bunx --bun tsc --noEmit -p tsconfig.json`, `typecheck:fast: bun check`, `lint: bunx --bun @biomejs/biome check src tests`, `lint:fix: bunx --bun @biomejs/biome check src tests --write`.
- `devDependencies` pin `@oh-my-pi/pi-coding-agent` and `@oh-my-pi/pi-ai` to `18.22.2`; `peerDependencies` allow `>=18.18.6`; devDependencies also pin `@biomejs/biome` `2.6.8`, `typescript` `7.0.2`, `@types/bun` `^1.4.2`.

- [ ] **Step 4: Create config files**

`tsconfig.json`: target `ESNext`, module `Preserve`, moduleResolution `bundler`, strict, noEmit, skipLibCheck, `types: ["bun"]`, allowImportingTsExtensions, allowArbitraryExtensions, include `src` and `tests`.

`biome.json`: minimal formatter/linter config with tabs and double quotes; no rule that changes generated fixture data.

`.gitignore`: ignore `node_modules/`, `coverage/`, `*.tsbuildinfo`, `.env`, `.env.*` except `.env.example`, `.DS_Store`, logs, and `.omp/extensions/` local shims. Track `bun.lock`.

`LICENSE`: MIT, copyright Yuzu.

- [ ] **Step 5: Implement `src/version.ts`**

Export `HOST_VERSION_PIN = "18.22.2"` and `HOST_SPECIFIERS = ["@oh-my-pi/pi-ai/registry/oauth"] as const`. Add any further deep specifier to this array in the same task that introduces it.

- [ ] **Step 6: Write the host-contract test**

```ts
// tests/host-contract.test.ts
import { describe, expect, test } from "bun:test";
import { AssistantMessageEventStream } from "@oh-my-pi/pi-ai";

describe("host contract", () => {
  test("canonical assistant stream settles with terminal result", async () => {
    const stream = new AssistantMessageEventStream();
    const message = {
      role: "assistant",
      content: [{ type: "text", text: "ok" }],
      api: "google-antigravity",
      provider: "antigravity-cli",
      model: "gemini-3.1-pro",
      usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0 },
      stopReason: "stop",
      timestamp: 1,
    } as never;
    stream.push({ type: "start", partial: message });
    stream.push({ type: "done", reason: "stop", message });
    expect(await stream.result()).toBe(message);
  });
});
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `bun test tests/drift.test.ts tests/host-contract.test.ts`
Expected: PASS. Confirm the real signatures of `setUnpausedProviders` and `providerPauseReason` in the installed `18.22.2` build; if they differ from `(ids: string[]) => void` and `(provider: string) => string | undefined`, record them here before Task 5.

- [ ] **Step 8: Install and commit**

Run: `bun install`, then commit with subject `feat: scaffold omp plugin package`.
````

**REPLACE WITH (verbatim)**:

````markdown
- [ ] **Step 1: Create the manifest**

`package.json` must contain:
- `"name": "omp-agy-byp"`, `"version": "0.1.0"`, `"license": "MIT"`, `"type": "module"`.
- `"omp": { "name": "Google AI Subscription (Antigravity CLI)", "version": "0.1.0", "extensions": ["./src/index.ts"] }`.
- `"engines": { "bun": ">=1.4.4" }`.
- `"files": ["src", "README.md"]`.
- `"scripts"`: `test: bun test tests/`, `typecheck: bunx --bun tsc --noEmit -p tsconfig.json`, `typecheck:fast: bun check`, `lint: bunx --bun @biomejs/biome check src tests`, `lint:fix: bunx --bun @biomejs/biome check src tests --write`.
- `devDependencies` pin `@oh-my-pi/pi-coding-agent` and `@oh-my-pi/pi-ai` to `18.22.2`; `peerDependencies` allow `>=18.18.6`; devDependencies also pin `@biomejs/biome` `2.6.8`, `typescript` `7.0.2`, `@types/bun` `^1.4.2`.

- [ ] **Step 2: Create config files**

`tsconfig.json`: target `ESNext`, module `Preserve`, moduleResolution `bundler`, strict, noEmit, skipLibCheck, `types: ["bun"]`, allowImportingTsExtensions, allowArbitraryExtensions, include `src` and `tests`.

`biome.json`: minimal formatter/linter config with tabs and double quotes; no rule that changes generated fixture data.

`.gitignore`: ignore `node_modules/`, `coverage/`, `*.tsbuildinfo`, `.env`, `.env.*` except `.env.example`, `.DS_Store`, logs, and `.omp/extensions/` local shims. Track `bun.lock`.

`LICENSE`: MIT, copyright Yuzu.

- [ ] **Step 3: Install dependencies before any test runs**

Run: `bun install`
Expected: exit 0; `bun.lock` exists and both `@oh-my-pi/pi-coding-agent` and `@oh-my-pi/pi-ai` resolve under `node_modules/`. The red baseline below must be "module `../src/version` not found", never "cannot find package `@oh-my-pi/*`".

- [ ] **Step 4: Record the host API signatures**

Confirm the real signatures of `setUnpausedProviders` and `providerPauseReason` in the installed `18.22.2` build and write them here **before Task 5**: `setUnpausedProviders(ids: string[]): void` and `providerPauseReason(provider: string): string | undefined`. If either differs, STOP and report — do not hard-code the `ExtensionDeps` boundary types until the drift test and Task 5 agree with the installed build.

- [ ] **Step 5: Write the failing drift test**

```ts
// tests/drift.test.ts
import { describe, expect, test } from "bun:test";
import { VERSION } from "@oh-my-pi/pi-coding-agent";
import { providerPauseReason, setUnpausedProviders } from "@oh-my-pi/pi-ai/registry/oauth";
import { HOST_SPECIFIERS, HOST_VERSION_PIN } from "../src/version";

describe("host drift", () => {
  test("installed host matches dev pin", () => {
    expect(VERSION).toBe(HOST_VERSION_PIN);
  });

  test("every deep host specifier is tracked", () => {
    expect(HOST_SPECIFIERS).toContain("@oh-my-pi/pi-ai/registry/oauth");
  });

  test("unpause and pause-reason APIs exist on the installed host", () => {
    expect(typeof setUnpausedProviders).toBe("function");
    expect(typeof providerPauseReason).toBe("function");
  });
});
```

- [ ] **Step 6: Run test to verify it fails for the intended reason**

Run: `bun test tests/drift.test.ts`
Expected: FAIL — `../src/version` not found. A missing `@oh-my-pi/*` package means Step 3 was skipped: fix that before continuing.

- [ ] **Step 7: Implement `src/version.ts`**

Export `HOST_VERSION_PIN = "18.22.2"` and `HOST_SPECIFIERS = ["@oh-my-pi/pi-ai/registry/oauth"] as const`. Add any further deep specifier to this array in the same task that introduces it.

- [ ] **Step 8: Write the host-contract test**

```ts
// tests/host-contract.test.ts
import { describe, expect, test } from "bun:test";
import { AssistantMessageEventStream, type AssistantMessage } from "@oh-my-pi/pi-ai";

describe("host contract", () => {
  test("canonical assistant stream settles with terminal result", async () => {
    const stream = new AssistantMessageEventStream();
    // Typed against the host interface: a shape change in 18.22.2 must fail typecheck,
    // not be silently absorbed by an `as never` cast.
    const message: AssistantMessage = {
      role: "assistant",
      content: [{ type: "text", text: "ok" }],
      api: "antigravity-acp",
      provider: "antigravity-cli",
      model: "gemini-3.1-pro",
      usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0 },
      stopReason: "stop",
      timestamp: 1,
    };
    stream.push({ type: "start", partial: message });
    stream.push({ type: "done", reason: "stop", message });
    expect(await stream.result()).toBe(message);
  });
});
```

The `api`/`provider` pair must match the roster: `antigravity-acp` is the built-in API id for the `antigravity-cli` provider; `google-antigravity` is the separate HTTP fallback and must not appear in this fixture.

- [ ] **Step 9: Run tests to verify they pass**

Run: `bun test tests/drift.test.ts tests/host-contract.test.ts`
Expected: PASS.

- [ ] **Step 10: Commit**

Subject: `feat: scaffold omp plugin package`. (Runs in the future implementation phase, never during the docs-only phase.)
````

**Verify**: `rg -n 'bun install|bun test tests/drift' docs/superpowers/plans/2026-11-18-google-ai-subscription-provider.md` → the `bun install` line precedes the first `bun test` line; `rg -n --fixed-strings 'api: "antigravity-acp"' ...` → one hit; `rg -n --fixed-strings 'as never' ...` → no hit in the host-contract snippet.

### Step 3: B2 — make the Biome convention match the snippets

**CURRENT (verbatim, line 103)**:

```markdown
`biome.json`: minimal formatter/linter config with tabs and double quotes; no rule that changes generated fixture data.
```

**REPLACE WITH (verbatim)**:

```markdown
`biome.json`: minimal formatter/linter config with `indentStyle: "space"`, `indentWidth: 2` and `quoteStyle: "double"`, matching the two-space, double-quote snippets throughout this plan so they pass `bunx --bun @biomejs/biome check src tests` when copied verbatim; no rule that changes generated fixture data.
```

**Verify**: `rg -n --fixed-strings 'indentStyle: "space"' docs/superpowers/plans/2026-11-18-google-ai-subscription-provider.md` → one hit; `rg -n --fixed-strings 'tabs and double quotes' ...` → no output.

### Step 4: B3 — assert the transport-metadata fields named in the preservation requirement

In the Task 4 snippet, replace only this test.

**CURRENT (verbatim, lines 394–405)**:

````markdown
test("preserves tool names, tool-call ids, labels, sessionId and structure", () => {
  const before = ccaPayload();
  const after = scrubPayload(before, { ...DEFAULT_CONFIG, mode: "generic", scrubToolDescriptions: true });
  expect(after.request.labels).toEqual(before.request.labels);
  expect(after.request.sessionId).toBe(before.request.sessionId);
  expect(after.request.contents[0].parts[1].functionCall).toEqual(before.request.contents[0].parts[1].functionCall);
  expect(after.request.contents[1].parts[0].functionResponse).toEqual(before.request.contents[1].parts[0].functionResponse);
  expect(after.request.tools[0].functionDeclarations[0].name).toBe("read");
  expect(after.request.toolConfig).toEqual(before.request.toolConfig);
  expect(Object.keys(after).sort()).toEqual(Object.keys(before).sort());
  expect(Object.keys(after.request).sort()).toEqual(Object.keys(before.request).sort());
});
````

**REPLACE WITH (verbatim)**:

````markdown
test("preserves tool names, tool-call ids, labels, sessionId, requestId, userAgent and structure", () => {
  const before = ccaPayload();
  const after = scrubPayload(before, { ...DEFAULT_CONFIG, mode: "generic", scrubToolDescriptions: true });
  expect(after.request.labels).toEqual(before.request.labels);
  expect(after.request.sessionId).toBe(before.request.sessionId);
  expect(after.requestId).toBe(before.requestId);
  expect(after.userAgent).toBe(before.userAgent);
  expect(after.project).toBe(before.project);
  expect(after.request.contents[0].parts[1].functionCall).toEqual(before.request.contents[0].parts[1].functionCall);
  expect(after.request.contents[1].parts[0].functionResponse).toEqual(before.request.contents[1].parts[0].functionResponse);
  expect(after.request.tools[0].functionDeclarations[0].name).toBe("read");
  expect(after.request.toolConfig).toEqual(before.request.toolConfig);
  expect(Object.keys(after).sort()).toEqual(Object.keys(before).sort());
  expect(Object.keys(after.request).sort()).toEqual(Object.keys(before.request).sort());
});
````

**Verify**: `rg -n --fixed-strings 'expect(after.userAgent).toBe(before.userAgent);' ...` → one hit; same for `requestId`.

### Step 5: B4 — widen the `Msg` type to include string content

**CURRENT (verbatim, line 347)**:

```markdown
- Produces: `scrubPayload<T extends Record<string, unknown>>(payload: T, config: PluginConfig): T`; `scrubContextMessages(messages: readonly Msg[], config: PluginConfig): Msg[]` where `Msg = { role: string; content: { type: string; text?: string }[]; timestamp: number; toolCallId?: string; toolName?: string; [key: string]: unknown }`.
```

**REPLACE WITH (verbatim)**:

```markdown
- Produces: `scrubPayload<T extends Record<string, unknown>>(payload: T, config: PluginConfig): T`; `scrubContextMessages(messages: readonly Msg[], config: PluginConfig): Msg[]` where `Msg = { role: string; content: string | { type: string; text?: string }[]; timestamp: number; toolCallId?: string; toolName?: string; [key: string]: unknown }`. The string arm is real: Task 4 Step 3 applies `scrubText` to `content` when it is a string, so the type must admit it.
```

**Verify**: `rg -n --fixed-strings 'content: string | { type: string; text?: string }[]' ...` → one hit; `rg -n --fixed-strings 'content: { type: string; text?: string }[]' ...` → no output.

### Step 6: B5 — add a test that pins the string-content branch

Insert the following test immediately after the `test("context messages scrub text but keep tool-call ids and names", ...)` block in the Task 4 snippet, before the closing ``` fence (currently line 443).

**CURRENT (the closing lines of that snippet)**:

````markdown
  expect(out[1].toolCallId).toBe("call-9");
  expect(out[1].toolName).toBe("read");
});
```
````

**REPLACE WITH (verbatim)**:

````markdown
  expect(out[1].toolCallId).toBe("call-9");
  expect(out[1].toolName).toBe("read");
});

test("context messages with string content are scrubbed without losing fields", () => {
  const messages = [{ role: "user", content: "# Internal URLs\nhello", timestamp: 3 }];
  const out = scrubContextMessages(messages, { ...DEFAULT_CONFIG, mode: "generic" });
  expect(out[0].content).toBe("# References\nhello");
  expect(out[0].role).toBe("user");
  expect(out[0].timestamp).toBe(3);
});
```
````

**Verify**: `rg -n --fixed-strings 'context messages with string content are scrubbed without losing fields' ...` → one hit.

### Step 7: B6 — rewrite the Task 5 factory test snippet (sort order, typed fixtures, missing coverage)

Replace the entire `ts` snippet under Task 5 Step 1 — from `// tests/index.test.ts` through the final `});` before the closing fence (currently lines 482–603).

**CURRENT (verbatim, lines 482–603)**:

````markdown
// tests/index.test.ts
import { describe, expect, test } from "bun:test";
import { DEFAULT_CONFIG } from "../src/config";
import { createExtension } from "../src/index";

function makePi(
  hooks: Record<string, (...args: never[]) => unknown>,
  commands: Record<string, (ctx: unknown) => void>,
) {
  return {
    setLabel: () => {},
    on: (name: string, handler: (...args: never[]) => unknown) => {
      hooks[name] = handler;
      return () => {};
    },
    registerProvider: () => {
      throw new Error("must not register a provider");
    },
    registerOAuthProvider: () => {
      throw new Error("must not register OAuth");
    },
    registerTool: () => {
      throw new Error("must not register tools");
    },
    registerCommand: (name: string, config: { handler: (ctx: unknown) => void }) => {
      commands[name] = config.handler;
    },
    logger: { info() {}, warn() {}, error() {}, debug() {} },
  } as never;
}

const payload = { request: { systemInstruction: { parts: [{ text: "# Skills & Rules" }] } } };

test("default off: three hooks and one command, never unpauses, hooks inert", () => {
  const hooks: Record<string, (...args: never[]) => unknown> = {};
  const commands: Record<string, (ctx: unknown) => void> = {};
  const calls: string[][] = [];
  createExtension({
    unpause: ids => calls.push(ids),
    pauseReason: () => undefined,
    config: DEFAULT_CONFIG,
    state: { enabled: false },
  })(makePi(hooks, commands));

  expect(Object.keys(hooks).sort()).toEqual([
    "before_agent_start",
    "context",
    "before_provider_request",
  ]);
  expect(Object.keys(commands)).toEqual(["agy-byp"]);
  expect(calls).toEqual([]);
  expect(hooks.before_agent_start!({ systemPrompt: ["You are omp's trusted coding assistant"] } as never)).toBeUndefined();
  expect(hooks.context!({ messages: [] } as never)).toBeUndefined();
  expect(
    hooks.before_provider_request!(payload, { provider: "antigravity-cli" } as never, undefined as never),
  ).toBeUndefined();
});

test("on enables scrubbing and unpauses fallback once; status reports state and guidance", () => {
  const hooks: Record<string, (...args: never[]) => unknown> = {};
  const commands: Record<string, (ctx: unknown) => void> = {};
  const calls: string[][] = [];
  const notices: string[] = [];
  const state = { enabled: false };
  const ctx = (args: string) => ({ args, ui: { notify: (message: string) => notices.push(message) } }) as never;

  createExtension({
    unpause: ids => calls.push(ids),
    pauseReason: () => "paused by auth rule",
    config: DEFAULT_CONFIG,
    state,
  })(makePi(hooks, commands));

  commands["agy-byp"]!(ctx("status"));
  expect(notices.at(-1)).toContain("off");
  expect(notices.at(-1)).toContain("paused by auth rule");
  expect(notices.at(-1)).toContain("unpausedProviders");

  commands["agy-byp"]!(ctx("on"));
  expect(state.enabled).toBe(true);
  expect(calls).toEqual([["google-antigravity"]]);
  const out = hooks.before_provider_request!(payload, { provider: "google-antigravity" } as never, undefined as never) as typeof payload;
  expect(out.request.systemInstruction.parts[0].text).toBe("# Skills");
});

test("off makes hooks inert again without deactivating or re-pausing", () => {
  const hooks: Record<string, (...args: never[]) => unknown> = {};
  const commands: Record<string, (ctx: unknown) => void> = {};
  const calls: string[][] = [];
  const state = { enabled: true };
  const ctx = (args: string) => ({ args, ui: { notify: () => {} } }) as never;

  createExtension({
    unpause: ids => calls.push(ids),
    pauseReason: () => undefined,
    config: DEFAULT_CONFIG,
    state,
  })(makePi(hooks, commands));
  commands["agy-byp"]!(ctx("off"));
  expect(state.enabled).toBe(false);
  expect(calls).toEqual([]);
  expect(
    hooks.before_provider_request!(payload, { provider: "antigravity-cli" } as never, undefined as never),
  ).toBeUndefined();
});

test("before_provider_request ignores CLI and excluded API-key providers", () => {
  const hooks: Record<string, (...args: never[]) => unknown> = {};
  const commands: Record<string, (ctx: unknown) => void> = {};
  createExtension({
    unpause: () => {},
    pauseReason: () => undefined,
    config: DEFAULT_CONFIG,
    state: { enabled: true },
  })(makePi(hooks, commands));
  for (const provider of ["antigravity-cli", "google", "google-vertex"]) {
    expect(
      hooks.before_provider_request!(payload, { provider } as never, undefined as never),
    ).toBeUndefined();
  }
});
````

**REPLACE WITH (verbatim)**:

````markdown
// tests/index.test.ts
import { describe, expect, test } from "bun:test";
import { DEFAULT_CONFIG } from "../src/config";
import { createExtension } from "../src/index";

type Hook = (...args: unknown[]) => unknown;
type ToggleCtx = { args: string | string[] | undefined; ui: { notify: (message: string) => void } };
type PiStub = {
  setLabel: (label: string) => void;
  on: (name: string, handler: Hook) => () => void;
  registerProvider: () => never;
  registerOAuthProvider: () => never;
  registerTool: () => never;
  registerCommand: (name: string, config: { handler: (ctx: ToggleCtx) => void }) => void;
  logger: { info(): void; warn(): void; error(): void; debug(): void };
};

function makePi(hooks: Record<string, Hook>, commands: Record<string, (ctx: ToggleCtx) => void>): PiStub {
  return {
    setLabel: () => {},
    on: (name, handler) => {
      hooks[name] = handler;
      return () => {};
    },
    registerProvider: () => {
      throw new Error("must not register a provider");
    },
    registerOAuthProvider: () => {
      throw new Error("must not register OAuth");
    },
    registerTool: () => {
      throw new Error("must not register tools");
    },
    registerCommand: (name, config) => {
      commands[name] = config.handler;
    },
    logger: { info() {}, warn() {}, error() {}, debug() {} },
  };
}

// One explicit host-boundary cast, not a cast on every fixture: ExtensionAPI is much
// wider than the members this factory uses. Host-signature drift is caught by
// tests/drift.test.ts and by the typed AssistantMessage in tests/host-contract.test.ts.
function attach(hooks: Record<string, Hook>, commands: Record<string, (ctx: ToggleCtx) => void>, deps: Parameters<typeof createExtension>[0]) {
  return createExtension(deps)(makePi(hooks, commands) as unknown as Parameters<ReturnType<typeof createExtension>>[0]);
}

const payload = { request: { systemInstruction: { parts: [{ text: "# Skills & Rules" }] } } };
const ctx = (args: string | string[] | undefined, notices: string[] = []): ToggleCtx => ({
  args,
  ui: { notify: (message: string) => { notices.push(message); } },
});

test("default off: three hooks and one command, never unpauses, hooks inert", () => {
  const hooks: Record<string, Hook> = {};
  const commands: Record<string, (ctx: ToggleCtx) => void> = {};
  const calls: string[][] = [];
  attach(hooks, commands, {
    unpause: ids => calls.push(ids),
    pauseReason: () => undefined,
    config: DEFAULT_CONFIG,
    state: { enabled: false },
  });

  // Sorted lexicographically: "before_provider_request" precedes "context".
  expect(Object.keys(hooks).sort()).toEqual([
    "before_agent_start",
    "before_provider_request",
    "context",
  ]);
  expect(Object.keys(commands)).toEqual(["agy-byp"]);
  expect(calls).toEqual([]);
  expect(hooks.before_agent_start!({ systemPrompt: ["You are omp's trusted coding assistant"] })).toBeUndefined();
  expect(hooks.context!({ messages: [] })).toBeUndefined();
  expect(
    hooks.before_provider_request!(payload, { provider: "antigravity-cli" }, undefined),
  ).toBeUndefined();
});

test("on enables scrubbing and unpauses fallback once; status reports state and guidance", () => {
  const hooks: Record<string, Hook> = {};
  const commands: Record<string, (ctx: ToggleCtx) => void> = {};
  const calls: string[][] = [];
  const notices: string[] = [];
  const state = { enabled: false };

  attach(hooks, commands, {
    unpause: ids => calls.push(ids),
    pauseReason: () => "paused by auth rule",
    config: DEFAULT_CONFIG,
    state,
  });

  commands["agy-byp"]!(ctx("status", notices));
  expect(notices.at(-1)).toContain("off");
  expect(notices.at(-1)).toContain("paused by auth rule");
  expect(notices.at(-1)).toContain("unpausedProviders");

  commands["agy-byp"]!(ctx("on", notices));
  expect(state.enabled).toBe(true);
  expect(calls).toEqual([["google-antigravity"]]);
  const out = hooks.before_provider_request!(payload, { provider: "google-antigravity" }, undefined) as typeof payload;
  expect(out.request.systemInstruction.parts[0].text).toBe("# Skills");
});

test("on with unpauseFallback=false enables hooks but never unpauses", () => {
  const hooks: Record<string, Hook> = {};
  const commands: Record<string, (ctx: ToggleCtx) => void> = {};
  const calls: string[][] = [];
  const state = { enabled: false };
  attach(hooks, commands, {
    unpause: ids => calls.push(ids),
    pauseReason: () => undefined,
    config: { ...DEFAULT_CONFIG, unpauseFallback: false },
    state,
  });
  commands["agy-byp"]!(ctx("on"));
  expect(state.enabled).toBe(true);
  expect(calls).toEqual([]);
  const out = hooks.before_provider_request!(payload, { provider: "google-antigravity" }, undefined) as typeof payload;
  expect(out.request.systemInstruction.parts[0].text).toBe("# Skills");
});

test("enabled hooks scrub the system prompt and context messages", () => {
  const hooks: Record<string, Hook> = {};
  const commands: Record<string, (ctx: ToggleCtx) => void> = {};
  attach(hooks, commands, {
    unpause: () => {},
    pauseReason: () => undefined,
    config: DEFAULT_CONFIG,
    state: { enabled: true },
  });
  const prompt = hooks.before_agent_start!({ systemPrompt: ["You are omp's trusted coding assistant", "# Skills & Rules"] }) as { systemPrompt: string[] };
  expect(prompt.systemPrompt).toEqual(["You are a helpful coding assistant", "# Skills"]);
  const messages = hooks.context!({ messages: [{ role: "user", content: "# Internal URLs\nhi", timestamp: 1 }] }) as { messages: { role: string; content: string; timestamp: number }[] };
  expect(messages.messages[0].content).toBe("# References\nhi");
  expect(messages.messages[0].timestamp).toBe(1);
});

test("command args accept string arrays and default to status", () => {
  const hooks: Record<string, Hook> = {};
  const commands: Record<string, (ctx: ToggleCtx) => void> = {};
  const notices: string[] = [];
  const state = { enabled: false };
  attach(hooks, commands, {
    unpause: () => {},
    pauseReason: () => undefined,
    config: DEFAULT_CONFIG,
    state,
  });
  commands["agy-byp"]!(ctx(["on"], notices));
  expect(state.enabled).toBe(true);
  commands["agy-byp"]!(ctx(undefined, notices));
  expect(notices.at(-1)).toContain("on");
});

test("off makes hooks inert again without deactivating or re-pausing", () => {
  const hooks: Record<string, Hook> = {};
  const commands: Record<string, (ctx: ToggleCtx) => void> = {};
  const calls: string[][] = [];
  const state = { enabled: true };
  attach(hooks, commands, {
    unpause: ids => calls.push(ids),
    pauseReason: () => undefined,
    config: DEFAULT_CONFIG,
    state,
  });
  commands["agy-byp"]!(ctx("off"));
  expect(state.enabled).toBe(false);
  expect(calls).toEqual([]);
  expect(
    hooks.before_provider_request!(payload, { provider: "antigravity-cli" }, undefined),
  ).toBeUndefined();
});

test("before_provider_request ignores CLI and excluded API-key providers", () => {
  const hooks: Record<string, Hook> = {};
  const commands: Record<string, (ctx: ToggleCtx) => void> = {};
  attach(hooks, commands, {
    unpause: () => {},
    pauseReason: () => undefined,
    config: DEFAULT_CONFIG,
    state: { enabled: true },
  });
  for (const provider of ["antigravity-cli", "google", "google-vertex"]) {
    expect(
      hooks.before_provider_request!(payload, { provider }, undefined),
    ).toBeUndefined();
  }
});
````

Notes the executor must preserve exactly:
- The expected hook array is **sorted lexicographically**: `before_agent_start`, `before_provider_request`, `context`. Sorting the keys and comparing to the old array fails on correct code.
- `as never` is gone from every fixture. The only cast left is one documented host-boundary cast in `attach`, because the fake `pi` intentionally implements a subset of `ExtensionAPI`.
- The three new cases pin: the env gate (`unpauseFallback: false`), enabled-state output of `before_agent_start` and `context`, and `ctx.args` array/`undefined` normalization.

**Verify**: `rg -n 'as never' docs/superpowers/plans/2026-11-18-google-ai-subscription-provider.md` → no output; `rg -n --fixed-strings '"before_provider_request",' ...` → one hit in the sorted array; `rg -n --fixed-strings 'unpauseFallback: false' ...` → one hit here (B7 adds a second).

### Step 8: B7 — state the new pins in the coverage claim

**CURRENT (verbatim, line 39)**:

```markdown
- **Toggling safety:** default-off hooks must be inert, the factory must never unpause on load, and only the explicit `on` command may enable scrubbing and unpause the fallback; `off` must not deactivate providers. Pinned by the default-off and toggle tests in Task 5.
```

**REPLACE WITH (verbatim)**:

```markdown
- **Toggling safety:** default-off hooks must be inert, the factory must never unpause on load, and only the explicit `on` command may enable scrubbing and unpause the fallback; `off` must not deactivate providers. Pinned by the default-off and toggle tests in Task 5, including the `unpauseFallback: false` gate, enabled-state `before_agent_start`/`context` output, and `ctx.args` normalization.
- **Transport metadata:** `requestId`, `userAgent` and `project` are never rewritten. Pinned by the preservation test in Task 4.
```

**Verify**: `rg -n --fixed-strings 'unpauseFallback: false' docs/superpowers/plans/2026-11-18-google-ai-subscription-provider.md` → two hits (one in the Task 5 snippet, one in this coverage bullet); `rg -n --fixed-strings 'Transport metadata:' ...` → one hit.

### Step 9: B8 — define the SDD ledger before the final step can refer to it

**CURRENT (verbatim, line 675)**:

```markdown
If no fix is needed, record that in the SDD ledger. If a fix is needed, commit it with subject `fix: address verification findings`.
```

**REPLACE WITH (verbatim)**:

```markdown
If no fix is needed, append this exact entry to the SDD ledger at `.superpowers/sdd/2026-11-18-google-ai-subscription-provider/progress.md` (the plan-scoped progress ledger used by `subagent-driven-development`; its first line is `# SDD ledger — plan: docs/superpowers/plans/2026-11-18-google-ai-subscription-provider.md`):

`Task 6: no verification fix needed — gate suite green in Step 1; no source or doc changes.`

If a fix is needed, commit it with subject `fix: address verification findings`, then append `Task 6: fix committed — <short SHA> — <one-line reason>` to the same ledger. Never invent a different ledger path or entry format; if the resolved workspace path is disambiguated, use that path instead.
```

**Verify**: `rg -n --fixed-strings '.superpowers/sdd/2026-11-18-google-ai-subscription-provider/progress.md' ...` → one hit; `rg -n --fixed-strings 'If no fix is needed, record that in the SDD ledger.' ...` → no output.

## Verification (docs-only — run once, after all nine blocks)

All commands are relative to the repository root.

```sh
git diff --check -- docs/superpowers/plans/2026-11-18-google-ai-subscription-provider.md
rg -n 'as never|tabs and double quotes|If no fix is needed, record that in the SDD ledger' docs/superpowers/plans/2026-11-18-google-ai-subscription-provider.md
rg -n --fixed-strings 'api: "google-antigravity"' docs/superpowers/plans/2026-11-18-google-ai-subscription-provider.md
rg -n --fixed-strings 'content: { type: string; text?: string }[]' docs/superpowers/plans/2026-11-18-google-ai-subscription-provider.md
git status --short
```

**Expected**: `git diff --check` exits 0 with no output; all three `rg` commands produce **no output** (exit 1); `git status --short` shows the target plan doc as modified alongside the pre-existing spec/research changes, and shows **no** `src/`, `package.json`, `tests/` or `node_modules/` entries.

Positive-presence gates (each must print at least one hit; the `unpauseFallback: false` gate prints two):

```sh
rg -n --fixed-strings 'api: "antigravity-acp"' docs/superpowers/plans/2026-11-18-google-ai-subscription-provider.md
rg -n --fixed-strings 'expect(after.userAgent).toBe(before.userAgent);' docs/superpowers/plans/2026-11-18-google-ai-subscription-provider.md
rg -n --fixed-strings 'expect(after.requestId).toBe(before.requestId);' docs/superpowers/plans/2026-11-18-google-ai-subscription-provider.md
rg -n --fixed-strings 'context messages with string content are scrubbed without losing fields' docs/superpowers/plans/2026-11-18-google-ai-subscription-provider.md
rg -n --fixed-strings 'unpauseFallback: false' docs/superpowers/plans/2026-11-18-google-ai-subscription-provider.md
rg -n --fixed-strings 'indentStyle: "space"' docs/superpowers/plans/2026-11-18-google-ai-subscription-provider.md
rg -n --fixed-strings '.superpowers/sdd/2026-11-18-google-ai-subscription-provider/progress.md' docs/superpowers/plans/2026-11-18-google-ai-subscription-provider.md
```

## Done criteria

Machine-checkable. ALL must hold:

- [ ] Every "REPLACE WITH" block B1–B8 is present verbatim in the target plan doc.
- [ ] `git diff --check -- <target>` exits 0 with no output.
- [ ] `rg -n 'as never' <target>` returns no matches.
- [ ] `rg -n --fixed-strings 'tabs and double quotes' <target>` returns no matches.
- [ ] `rg -n --fixed-strings 'api: "antigravity-acp"' <target>` returns one match.
- [ ] `rg -n --fixed-strings 'expect(after.userAgent).toBe(before.userAgent);' <target>` and the `requestId` equivalent each return one match.
- [ ] `rg -n --fixed-strings 'If no fix is needed, record that in the SDD ledger.' <target>` returns no matches; the ledger path appears once.
- [ ] No file other than the target plan doc was newly modified/created (`git status --short` compared with the Step 1 baseline).
- [ ] No build, lint, test or install command was run.

## STOP conditions

Stop and report back (do not improvise) if:

- Any "CURRENT" excerpt does not match the live file (another plan landed first, or the doc drifted). Re-read and report the differing line.
- A replacement would require editing a file outside the single in-scope path.
- The installed-host signature note conflicts with the `ExtensionDeps` boundary already written in Task 5 (do not reconcile it yourself — that belongs to the spec/plan-alignment plan).
- You are tempted to run `bun install`, `bun test`, a formatter, or to create any plugin source file. That is out of scope in this phase.
- `plans/README.md` does not exist yet — do not create it; a reviewer maintains the index.

## Maintenance notes

- When implementation is finally authorized, the corrected Task 1 red baseline must fail on the missing `../src/version` module, not on missing dependencies. That ordering is the whole point of B1.
- `type AssistantMessage` is imported from `@oh-my-pi/pi-ai`; if the implementer finds it is not exported by the pinned `18.22.2`, that is a real drift finding — report it, do not swap back to `as never`.
- The `Msg` union and its string-content test (B4/B5) are load-bearing together: widening the type without the test leaves the branch unverified.
- The deferred banner, spec/plan signature and alias alignment, tool-description default/scope, `off` unpause semantics, and research-doc cleanup are intentionally **not** here; they are owned by the other fix plans from the same audit. Do not duplicate them.
