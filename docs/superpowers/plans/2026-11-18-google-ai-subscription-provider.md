# Google AI Subscription Provider Implementation Plan

> **DEFERRED — DOCUMENTATION ONLY. DO NOT EXECUTE THIS PLAN.** Not in this phase: no `src/`, `package.json`, `tests/`, `biome.json`, or other implementation files; no `bun install`, `bun test`, or `bunx`; no commits or pushes. This document is the canonical behavioral contract; the only files edited under the current scope are the two named in the header. Every implementation step below is future work, gated on explicit operator authorization.
> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Shape what omp sends to a Google AI Pro/Ultra subscription by scrubbing omp-specific identity text from the system prompt, context messages, and provider payload — off by default and enabled only by an explicit `/agy-byp on` command — while leaving the built-in `antigravity-cli` provider and its locally managed `agy acp`, OAuth grant, and native client identity untouched.

**Architecture:** One extension factory augments built-in subscription providers: `antigravity-cli` is **primary** (local `agy acp`, `/login antigravity-cli`, `PI_AGY_PATH`, OAuth grant exported into omp's credential store, native identity/headers/UA owned by the CLI); `google-antigravity` is the optional direct-OAuth fallback; `google-gemini-cli` is the legacy path. `google` and `google-vertex` are excluded because they are API-key/ADC lanes, not subscription. The primary CLI path ignores `onPayload`, so content shaping there is done only by `before_agent_start` (system-prompt array) and `context` (messages); the third hook, `before_provider_request`, is registered but scoped to the HTTP-backed `google-antigravity`/`google-gemini-cli` providers, where it rewrites the CCA-shaped outbound payload. A shared marker table rephrases only omp-specific identity strings; all structure, tool names, tool-call ids, labels, `sessionId`, headers, and UA are preserved. The plugin never auto-activates or auto-deactivates: `state.enabled` starts `false`, hooks return `undefined` (inert) until the user runs `/agy-byp on`, and only that explicit command may unpause the fallback.

**Tech Stack:** Bun 1.4.4+, TypeScript ESM, omp extension API, `@oh-my-pi/pi-ai`, `@oh-my-pi/pi-coding-agent`, `@oh-my-pi/pi-ai/registry/oauth`, `bun test`.

**Spec:** `docs/superpowers/specs/2026-11-18-google-ai-subscription-provider-design.md`

## Global Constraints

- Bun only: use `bun`, `bunx --bun`. Never `node`, `npm`, `npx`.
- Static imports only for `@oh-my-pi/*`; dynamic host-specifier imports fail in the extension loader. Track every deep specifier in `HOST_SPECIFIERS`.
- Never write to stdout from extension code. Diagnostics go to `pi.logger`, stderr, or `ctx.ui.notify`.
- Pin `@oh-my-pi/pi-coding-agent` and `@oh-my-pi/pi-ai` to `18.22.2` in devDependencies; allow `>=18.18.6` in peerDependencies and assert runtime semantics in host-contract tests; pin `typescript` to `7.0.2` and `@biomejs/biome` to `2.6.8`.
- Subscription provider set: **primary** built-in `antigravity-cli`; optional direct-OAuth fallback `google-antigravity`; legacy `google-gemini-cli`. Exclude `google` and `google-vertex` (API-key/ADC, not subscription). The plugin registers **no** provider, **no** OAuth flow, **no** CLI subprocess, and **no** HTTP relay.
- **Default OFF, explicit toggle only.** The factory must not auto-activate or auto-deactivate anything; `state.enabled` starts `false`; hooks return `undefined` while off. The only state change is the user's `/agy-byp on|off|status` command.
- **No auto-unpause in the factory.** Unpause the fallback via `setUnpausedProviders` from `@oh-my-pi/pi-ai/registry/oauth` only inside the explicit `on` command, and only when `OMP_AGY_BYP_UNPAUSE_FALLBACK` does not disable it (`=0`). `off` never re-pauses or deactivates a provider.
- Register exactly three hooks — `before_agent_start`, `context`, `before_provider_request` — and one command `/agy-byp` accepting `on|off|status`, from one default-exported factory in `src/index.ts`.
- `before_provider_request` is unreachable on `antigravity-cli` (the CLI transport never consumes `onPayload`); gate it to the HTTP-backed `google-antigravity` and `google-gemini-cli` providers only, and never emit a header/UA rewrite from it.
- Reachable but out of scope for v1 (YAGNI): on the CLI path `input`, `tool_call`/`tool_result`, `assistant_message`, and tool redefinition via `registerTool`/`setActiveTools` are also shapeable; do not register them now, but document them as future seams.
- Scrub **content only**. Never change tool names, tool-call ids, labels, `sessionId`, `requestId`, `userAgent`, headers, or User-Agent. Never add, remove, or rename payload/message fields.
- `OMP_AGY_BYP_MODE=generic|native` selects scrubbing: `generic` rephrases omp markers (default); `native` passes content through unchanged. `OMP_AGY_BYP_SCRUB_TOOL_DESCRIPTIONS=1` additionally rewrites tool descriptions (off by default). `OMP_AGY_BYP_UNPAUSE_FALLBACK=0` disables the fallback unpause.
- Preserve structure: keep section headings, message/tool-result pairing, array order and lengths; rephrase identifying strings rather than deleting sections.
- Status reports toggle state, the fallback provider's pause reason via `providerPauseReason` from `@oh-my-pi/pi-ai/registry/oauth`, and config guidance. No secret values are ever emitted.
- YAGNI: no dynamic model discovery, no image path, no token handling, no account rotation, no fingerprint impersonation.
- Keep `package.json` `files` to `["src", "README.md"]`; keep `docs/` out of installs.
- Use real implementations in tests. Boundary functions (unpause, pause-reason lookup, clock) may be injected; never mock the module under test.

## Review Focus

- **Tool loop broken by a "rename" mistake:** scrubbing must never alter tool names, tool-call ids, labels, `sessionId`, or `toolConfig`, or the model cannot emit usable calls. Pinned by the preservation test in Task 4.
- **Programmatic tool guidance dropped with the identity strings:** rephrasing the role/skill sections must keep section count and functional guidance, not delete them. Pinned by the structure test in Task 3.
- **Headers/UA mutated through the payload hook:** on the HTTP-backed subscription providers, `before_provider_request` cannot and must not touch transport headers or the Antigravity envelope fields (`sessionId`, labels, `requestId`, `userAgent`); on `antigravity-cli` the hook is unreachable and headers are owned by `agy`. Pinned by the preservation test in Task 4 and the CLI-inertness test in Task 5.
- **Mode/env flags misread:** `native` must leave content value-identical, and tool descriptions must be rewritten only with `OMP_AGY_BYP_SCRUB_TOOL_DESCRIPTIONS=1`. Pinned by the config tests in Task 2 and the opt-in test in Task 4.
- **Toggling safety:** default-off hooks must be inert, the factory must never unpause on load, and only the explicit `on` command may enable scrubbing and unpause the fallback; `off` must not deactivate providers. Pinned by the default-off and toggle tests in Task 5, including the `unpauseFallback: false` gate, enabled-state `before_agent_start`/`context` output, and `ctx.args` normalization.
- **Transport metadata:** `requestId`, `userAgent` and `project` are never rewritten. Pinned by the preservation test in Task 4.

---

### Task 1: Scaffold the plugin package, drift guard, and host contract

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `biome.json`
- Create: `.gitignore`
- Create: `LICENSE`
- Create: `src/version.ts`
- Test: `tests/drift.test.ts`
- Test: `tests/host-contract.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `HOST_VERSION_PIN = "18.22.2"`; `HOST_SPECIFIERS` array of every deep `@oh-my-pi/*` specifier used by the plugin (for v1: `["@oh-my-pi/pi-ai/registry/oauth"]`).

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

`biome.json`: minimal formatter/linter config with `indentStyle: "space"`, `indentWidth: 2` and `quoteStyle: "double"`, matching the two-space, double-quote snippets throughout this plan so they pass `bunx --bun @biomejs/biome check src tests` when copied verbatim; no rule that changes generated fixture data.

`.gitignore`: ignore `node_modules/`, `coverage/`, `*.tsbuildinfo`, `.env`, `.env.*` except `.env.example`, `.DS_Store`, logs, and `.omp/extensions/` local shims. Track `bun.lock`.

`LICENSE`: MIT, copyright Yuzu.

- [ ] **Step 3: Install dependencies before any test runs**

Run: `bun install`
Expected: exit 0; `bun.lock` exists and both `@oh-my-pi/pi-coding-agent` and `@oh-my-pi/pi-ai` resolve under `node_modules/`. The red baseline below must be "module `../src/version` not found", never "cannot find package `@oh-my-pi/*`".

- [ ] **Step 4: Record the host API signatures**

The installed 18.22.2 signatures are verified and pinned here: `setUnpausedProviders(providers: Iterable<string>): void` (replaces the whole unpause list; ids that are not paused are ignored) and `providerPauseReason(provider: string): string | undefined`, both exported by `@oh-my-pi/pi-ai/registry/oauth` (installed `pi-ai/src/registry/oauth/index.ts:62,97`; the sibling `@oh-my-pi/pi-ai/oauth` subpath resolves to the same module). The operator-layer `auth.unpausedProviders` setting exists in `pi-coding-agent/src/config/model-settings.ts:75,90` and is documented in `omp://settings.md` § 'Paused providers'; a project-layer value is ignored. No signature check is deferred to Task 5.

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
    // not be silently absorbed by a blanket cast.
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

---

### Task 2: Constants, config, provider roster, and marker patterns

**Files:**
- Create: `src/ids.ts`
- Create: `src/config.ts`
- Create: `src/providers.ts`
- Create: `src/patterns.ts`
- Test: `tests/config.test.ts`
- Test: `tests/providers.test.ts`
- Test: `tests/patterns.test.ts`

**Interfaces:**
- Consumes: nothing from prior tasks.
- Produces: `PRIMARY_PROVIDER_ID`, `FALLBACK_PROVIDER_ID`, `LEGACY_PROVIDER_ID`, `TOGGLE_COMMAND`; `ScrubMode`, `PluginConfig`, `DEFAULT_CONFIG`, `loadConfig(env)`; `SUBSCRIPTION_PROVIDER_IDS`, `EXCLUDED_PROVIDER_IDS`, `isSubscriptionProvider(provider)`; `MarkerRule`, `OMP_MARKERS`, `scrubText(text)`.

- [ ] **Step 1: Write the failing config test**

```ts
// tests/config.test.ts
import { describe, expect, test } from "bun:test";
import { DEFAULT_CONFIG, loadConfig } from "../src/config";

describe("loadConfig", () => {
  test("uses defaults when env is empty", () => {
    expect(loadConfig({})).toEqual(DEFAULT_CONFIG);
  });

  test("reads mode and tool-description opt-in", () => {
    expect(loadConfig({ OMP_AGY_BYP_MODE: "native" }).mode).toBe("native");
    expect(loadConfig({ OMP_AGY_BYP_MODE: "generic" }).mode).toBe("generic");
    expect(loadConfig({ OMP_AGY_BYP_SCRUB_TOOL_DESCRIPTIONS: "1" }).scrubToolDescriptions).toBe(true);
    expect(loadConfig({ OMP_AGY_BYP_SCRUB_TOOL_DESCRIPTIONS: "0" }).scrubToolDescriptions).toBe(false);
  });

  test("fallback unpause is on by default and env can disable it", () => {
    expect(loadConfig({}).unpauseFallback).toBe(true);
    expect(loadConfig({ OMP_AGY_BYP_UNPAUSE_FALLBACK: "0" }).unpauseFallback).toBe(false);
  });
});
```

- [ ] **Step 2: Write the failing provider-roster test**

```ts
// tests/providers.test.ts
import { expect, test } from "bun:test";
import { EXCLUDED_PROVIDER_IDS, isSubscriptionProvider, SUBSCRIPTION_PROVIDER_IDS } from "../src/providers";

test("roster has CLI primary, direct fallback, and legacy OAuth provider only", () => {
  expect(SUBSCRIPTION_PROVIDER_IDS).toEqual([
    "antigravity-cli",
    "google-antigravity",
    "google-gemini-cli",
  ]);
  expect(EXCLUDED_PROVIDER_IDS).toEqual(["google", "google-vertex"]);
});

test("isSubscriptionProvider excludes API-key and ADC providers", () => {
  for (const id of SUBSCRIPTION_PROVIDER_IDS) expect(isSubscriptionProvider(id)).toBe(true);
  expect(isSubscriptionProvider("google")).toBe(false);
  expect(isSubscriptionProvider("google-vertex")).toBe(false);
  expect(isSubscriptionProvider(undefined)).toBe(false);
});
```

- [ ] **Step 3: Write the failing marker-pattern test**

```ts
// tests/patterns.test.ts
import { describe, expect, test } from "bun:test";
import { scrubText } from "../src/patterns";

test("rephrases every pinned omp marker", () => {
  const input = [
    "You are omp's trusted coding assistant",
    "# Skills & Rules",
    "# Internal URLs",
    "# xd:// Tool Devices",
    "# Tool Inventory",
    "⁂ Tool Policy",
  ].join("\n");
  expect(scrubText(input)).toBe(
    [
      "You are a helpful coding assistant",
      "# Skills",
      "# References",
      "# Device Tools",
      "# Available Tools",
      "## Tool Policy",
    ].join("\n"),
  );
});

test("leaves unknown text unchanged", () => {
  const text = "Use the read tool to inspect files.\n\n## Task";
  expect(scrubText(text)).toBe(text);
});
```

- [ ] **Step 4: Run tests to verify they fail**

Run: `bun test tests/config.test.ts tests/providers.test.ts tests/patterns.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 5: Implement the modules**

`src/ids.ts`: export `PRIMARY_PROVIDER_ID = "antigravity-cli"`, `FALLBACK_PROVIDER_ID = "google-antigravity"`, `LEGACY_PROVIDER_ID = "google-gemini-cli"`, `TOGGLE_COMMAND = "agy-byp"`.

`src/config.ts`: define `ScrubMode = "generic" | "native"`; `PluginConfig` with `mode: ScrubMode`, `scrubToolDescriptions: boolean`, `unpauseFallback: boolean`. Define `DEFAULT_CONFIG = { mode: "generic", scrubToolDescriptions: false, unpauseFallback: true }`. Implement `loadConfig(env: NodeJS.ProcessEnv): PluginConfig`: `mode = env.OMP_AGY_BYP_MODE === "native" ? "native" : "generic"`; `scrubToolDescriptions = env.OMP_AGY_BYP_SCRUB_TOOL_DESCRIPTIONS === "1"`; `unpauseFallback = env.OMP_AGY_BYP_UNPAUSE_FALLBACK !== "0"`. `loadConfig` does **not** decide activation; state is runtime-only (Task 5).

`src/providers.ts`: export `SUBSCRIPTION_PROVIDER_IDS` and `EXCLUDED_PROVIDER_IDS` with the exact arrays from the test; `isSubscriptionProvider(provider: string | undefined): boolean` returns true only for IDs in `SUBSCRIPTION_PROVIDER_IDS`.

`src/patterns.ts`: define `MarkerRule = { from: string; to: string }` and `OMP_MARKERS` as the exact literal pairs from the test. `scrubText(text)` applies every rule with `String.prototype.replaceAll` in order and returns the result. Keep the pairs as data so Task 3 and Task 4 share one source of truth.

- [ ] **Step 6: Run tests to verify they pass**

Run: `bun test tests/config.test.ts tests/providers.test.ts tests/patterns.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

Subject: `feat: add config, provider roster, and omp marker patterns`.

---

### Task 3: System-prompt scrubber

**Files:**
- Create: `src/system-prompt.ts`
- Test: `tests/system-prompt.test.ts`

**Interfaces:**
- Consumes: `PluginConfig`, `DEFAULT_CONFIG` from Task 2; `scrubText` from `src/patterns.ts`.
- Produces: `scrubSystemPrompt(systemPrompt: string[], config: PluginConfig): string[]`.

- [ ] **Step 1: Write the failing tests**

```ts
// tests/system-prompt.test.ts
import { describe, expect, test } from "bun:test";
import { DEFAULT_CONFIG } from "../src/config";
import { scrubSystemPrompt } from "../src/system-prompt";

const OMP_PROMPT = [
  "You are omp's trusted coding assistant",
  "# Skills & Rules",
  "Matching skill → MUST read `skill://<name>` first.",
  "# Internal URLs",
  "⁂ Tool Policy",
  "Never write to stdout from extension code.",
];

test("generic mode rephrases markers but keeps section count and guidance", () => {
  const out = scrubSystemPrompt(OMP_PROMPT, { ...DEFAULT_CONFIG, mode: "generic" });
  expect(out).toHaveLength(OMP_PROMPT.length);
  expect(out[0]).toBe("You are a helpful coding assistant");
  expect(out).toContain("# Skills");
  expect(out).toContain("# References");
  expect(out).toContain("## Tool Policy");
  expect(out.some(line => line.includes("skill://"))).toBe(true);
});

test("native mode passes the prompt through unchanged", () => {
  const out = scrubSystemPrompt(OMP_PROMPT, { ...DEFAULT_CONFIG, mode: "native" });
  expect(out).toEqual(OMP_PROMPT);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/system-prompt.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `scrubSystemPrompt`**

In `src/system-prompt.ts`: if `config.mode === "native"`, return a shallow copy of `systemPrompt`. Otherwise `map` every entry through `scrubText`. Do not drop, merge, or reorder entries; do not special-case functional lines (they are not in `OMP_MARKERS`).

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test tests/system-prompt.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

Subject: `feat: scrub omp markers from system prompts`.

---

### Task 4: Payload and context scrubber

**Files:**
- Create: `src/payload.ts`
- Test: `tests/payload.test.ts`

**Interfaces:**
- Consumes: `PluginConfig`, `DEFAULT_CONFIG` from Task 2; `scrubText` from `src/patterns.ts`.
- Produces: `scrubPayload<T extends Record<string, unknown>>(payload: T, config: PluginConfig): T`; `scrubContextMessages(messages: readonly Msg[], config: PluginConfig): Msg[]` where `Msg = { role: string; content: string | { type: string; text?: string }[]; timestamp: number; toolCallId?: string; toolName?: string; [key: string]: unknown }`. The string arm is real: Task 4 Step 3 applies `scrubText` to `content` when it is a string, so the type must admit it.

- [ ] **Step 1: Write the failing tests**

```ts
// tests/payload.test.ts
import { describe, expect, test } from "bun:test";
import { DEFAULT_CONFIG } from "../src/config";
import { scrubContextMessages, scrubPayload } from "../src/payload";

function ccaPayload() {
  return {
    project: "proj",
    requestId: "agent/a/1/t/1",
    userAgent: "antigravity",
    request: {
      sessionId: "-123",
      labels: { cascade_id: "a", model_enum: "gemini-3.1-pro", request_id: "t-0", trajectory_id: "t" },
      systemInstruction: { role: "user", parts: [{ text: "You are omp's trusted coding assistant\n# Skills & Rules" }] },
      contents: [
        {
          role: "user",
          parts: [
            { text: "# Internal URLs\nhello" },
            { functionCall: { id: "call-1", name: "read", args: { path: "x" } } },
          ],
        },
        {
          role: "functionResponse",
          parts: [{ functionResponse: { id: "call-1", name: "read", response: { output: "ok" } } }],
        },
      ],
      tools: [{ functionDeclarations: [{ name: "read", description: "You are omp's trusted coding assistant — read a file" }] }],
      toolConfig: { functionCallingConfig: { mode: "VALIDATED" } },
      generationConfig: { maxOutputTokens: 64000 },
    },
  };
}

test("generic mode scrubs systemInstruction and contents text", () => {
  const before = ccaPayload();
  const after = scrubPayload(before, { ...DEFAULT_CONFIG, mode: "generic" });
  expect(after.request.systemInstruction.parts[0].text).toBe("You are a helpful coding assistant\n# Skills");
  expect(after.request.contents[0].parts[0].text).toBe("# References\nhello");
  expect(before.request.contents[0].parts[0].text).toBe("# Internal URLs\nhello");
});

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

test("tool descriptions are scrubbed only with the opt-in", () => {
  const before = ccaPayload();
  const off = scrubPayload(before, { ...DEFAULT_CONFIG, mode: "generic" });
  expect(off.request.tools[0].functionDeclarations[0].description).toBe(
    before.request.tools[0].functionDeclarations[0].description,
  );
  const on = scrubPayload(before, { ...DEFAULT_CONFIG, mode: "generic", scrubToolDescriptions: true });
  expect(on.request.tools[0].functionDeclarations[0].description).toBe(
    "You are a helpful coding assistant — read a file",
  );
});

test("native mode leaves the payload value-identical", () => {
  const before = ccaPayload();
  const after = scrubPayload(before, { ...DEFAULT_CONFIG, mode: "native", scrubToolDescriptions: true });
  expect(after).toEqual(before);
});

test("context messages scrub text but keep tool-call ids and names", () => {
  const messages = [
    { role: "user", content: [{ type: "text", text: "# Skills & Rules\nhi" }], timestamp: 1 },
    {
      role: "toolResult",
      toolCallId: "call-9",
      toolName: "read",
      content: [{ type: "text", text: "# Internal URLs\nok" }],
      isError: false,
      timestamp: 2,
    },
  ];
  const out = scrubContextMessages(messages, { ...DEFAULT_CONFIG, mode: "generic" });
  expect(out[0].content[0].text).toBe("# Skills\nhi");
  expect(out[1].content[0].text).toBe("# References\nok");
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

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/payload.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `scrubPayload` and `scrubContextMessages`**

Use `structuredClone` so the input is never mutated. In `native` mode return the clone unchanged. In `generic` mode rewrite **only** string values at these paths: `request.systemInstruction.parts[*].text`, `request.contents[*].parts[*].text`, and — only when `config.scrubToolDescriptions` is true — `request.tools[*].functionDeclarations[*].description`. Each string goes through `scrubText`. Never add/remove/rename a key; never touch `project`, `requestId`, `userAgent`, `request.sessionId`, `request.labels`, `request.toolConfig`, `request.generationConfig`, tool `name`, or functionCall/functionResponse `id`/`name`. There are no header/UA fields in the payload by construction — do not add any.

`scrubContextMessages` clones each message and applies `scrubText` to `content` when it is a string, or to each part's `text` when `content` is an array. Preserve every other field, including `role`, `toolCallId`, `toolName`, `isError` and `timestamp`.

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test tests/payload.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

Subject: `feat: scrub omp markers from provider payloads and context`.

---

### Task 5: Factory, default-off toggle, status command, and docs

**Files:**
- Create: `src/index.ts`
- Create: `README.md`
- Create: `HANDOFF.md`
- Test: `tests/index.test.ts`

**Interfaces:**
- Consumes: `loadConfig`, `PluginConfig` from Task 2; `SUBSCRIPTION_PROVIDER_IDS`, `EXCLUDED_PROVIDER_IDS` from `src/providers.ts`; `PRIMARY_PROVIDER_ID`, `FALLBACK_PROVIDER_ID`, `LEGACY_PROVIDER_ID`, `TOGGLE_COMMAND` from `src/ids.ts`; `scrubSystemPrompt` from Task 3; `scrubPayload`, `scrubContextMessages` from Task 4; `setUnpausedProviders`, `providerPauseReason` from `@oh-my-pi/pi-ai/registry/oauth`.
- Produces: `ToggleState = { enabled: boolean }`; `ExtensionDeps = { unpause: (ids: string[]) => void; pauseReason: (provider: string) => string | undefined; config: PluginConfig; state: ToggleState }`; `createExtension(deps: ExtensionDeps): (pi: ExtensionAPI) => void`; default export calls `createExtension` with the real OAuth APIs, `loadConfig(process.env)`, and `{ enabled: false }`.

- [ ] **Step 1: Write the failing factory tests**

```ts
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

  // Registration order is pinned to Task 5 Step 3; do not sort the keys, because a
  // sorted comparison would not catch a registration-order regression.
  expect(Object.keys(hooks)).toEqual([
    "before_agent_start",
    "context",
    "before_provider_request",
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/index.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the factory**

`createExtension({ unpause, pauseReason, config, state })` returns `(pi: ExtensionAPI) => void` that:
1. Calls `pi.setLabel("Google AI Subscription (Antigravity CLI)")`.
2. Registers `before_agent_start`: when `!state.enabled` return `undefined`; otherwise return `{ systemPrompt: scrubSystemPrompt(event.systemPrompt, config) }`, guarding an absent `systemPrompt`.
3. Registers `context`: when `!state.enabled` return `undefined`; otherwise return `{ messages: scrubContextMessages(event.messages, config) }`.
4. Registers `before_provider_request`: return `undefined` when `!state.enabled` or the model provider is neither `FALLBACK_PROVIDER_ID` nor `LEGACY_PROVIDER_ID`; otherwise return `scrubPayload(payload, config)`. The built-in `antigravity-cli` transport never consumes `onPayload`, so the hook is intentionally out of scope there; `google` and `google-vertex` are excluded as API-key/ADC lanes. No header or UA field is ever produced.
5. Registers `TOGGLE_COMMAND` with a handler that normalizes `ctx.args` (`string` or `string[]`), defaults to `status`, and:
   - `on`: sets `state.enabled = true` and, only when `config.unpauseFallback`, calls `unpause([FALLBACK_PROVIDER_ID])`; notifies that scrubbing is on.
   - `off`: sets `state.enabled = false`; makes **no** pause/deactivate/unpause call; notifies that scrubbing is off.
   - `status`: notifies toggle state, the roster (`PRIMARY_PROVIDER_ID`, `FALLBACK_PROVIDER_ID`, `LEGACY_PROVIDER_ID`), `config.mode` and scrub flags, `pauseReason(FALLBACK_PROVIDER_ID) ?? "not paused"`, and config guidance naming `auth.unpausedProviders` (verified in the installed 18.22.2 build; operator layers only, never a project layer). Never emit token or credential values.
   - unknown args: notify the usage `/agy-byp on|off|status`.
6. Never call `registerProvider`, `registerOAuthProvider`, `registerTool`, spawn a CLI, or open a socket. Tool descriptions are not re-registered on the CLI path in v1 — doing so changes `toolsKey` and can abandon a parked turn — so `OMP_AGY_BYP_SCRUB_TOOL_DESCRIPTIONS=1` applies only to the HTTP payload seam. The default export is `createExtension({ unpause: setUnpausedProviders, pauseReason: providerPauseReason, config: loadConfig(process.env), state: { enabled: false } })`. Import the extension API type from the package's exported entry; if a new deep specifier is needed, add it to `HOST_SPECIFIERS` in Task 1 first.


- [ ] **Step 4: Write the docs**

`README.md`: purpose; default-off behavior and the explicit `/agy-byp on|off|status` workflow; prerequisites (`/login antigravity-cli`, `agy` downloaded/verified by omp, `PI_AGY_PATH` override, `nc` on PATH for IDE-tool transport); provider scope table (`antigravity-cli` primary, `google-antigravity` optional fallback, `google-gemini-cli` legacy; `google`/`google-vertex` excluded); the three hooks and which paths they reach (`before_agent_start` and `context` on all subscription providers, `before_provider_request` on the HTTP-backed fallback/legacy providers only); the env table (`OMP_AGY_BYP_MODE`, `OMP_AGY_BYP_SCRUB_TOOL_DESCRIPTIONS` — HTTP payload seam only, `OMP_AGY_BYP_UNPAUSE_FALLBACK`); and an honest limitation: scrubbing only rephrases omp's own content strings, cannot change `agy`-owned headers/UA or the fixed `agy acp` argv, and there is no guarantee any upstream detector reads prompt text. Never paste an access token into `--api-key`.

`HANDOFF.md`: live-only checks for a human, with exact commands:

```sh
omp plugin link /absolute/path/to/omp-agy-byp
omp plugin doctor
omp models -e /absolute/path/to/omp-agy-byp/src/index.ts
```

Warn that `-e` must follow the subcommand, `--help` never loads extensions, exit code is zero on load failure, and stderr must be read for `Failed to load extension`. Add steps to run `/login antigravity-cli`, confirm `/agy-byp status` reports `off`, run `/agy-byp on`, select a model, observe one response, and compare the reported system prompt with `OMP_AGY_BYP_MODE=native`.

- [ ] **Step 5: Run tests to verify they pass**

Run: `bun test tests/index.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

Subject: `feat: add default-off toggle hooks and status command`.

---

### Task 6: Full verification and self-review

**Files:**
- Modify: `HANDOFF.md` only if a verification gap appears.

**Interfaces:**
- Consumes: complete tree.
- Produces: verified plugin package; no API changes.

- [ ] **Step 1: Run gates in order**

```sh
bunx --bun tsc --noEmit -p tsconfig.json
bunx --bun @biomejs/biome check src tests
bun test tests/
```

Expected: each command exits 0. Run the full gate suite **once, after all tasks have landed**, from the integrator — task subagents must not run build/lint/test gates mid-flight (OOM discipline).

- [ ] **Step 2: Self-review against the global constraints**

Check: Bun-only commands; static `@oh-my-pi/*` imports and matching `HOST_SPECIFIERS`; no stdout writes; host pins; no custom provider/OAuth/relay/CLI subprocess; exactly three hooks and one `/agy-byp` command; default-off inertness and no factory unpause; explicit `on|off|status` behavior; provider roster excludes `google`/`google-vertex`; only content strings rewritten; tool names, tool-call ids, labels, `sessionId`, headers and UA untouched; `generic`/`native` and both scrub flags honored; fallback unpause only in `on` and guarded by env; status emits no secrets; docs list the human-only checks and the honest limitation.

- [ ] **Step 3: Commit any verification-driven fix**

If no fix is needed, append this exact entry to the SDD ledger at `.superpowers/sdd/2026-11-18-google-ai-subscription-provider/progress.md` (the plan-scoped progress ledger used by `subagent-driven-development`; its first line is `# SDD ledger — plan: docs/superpowers/plans/2026-11-18-google-ai-subscription-provider.md`):

`Task 6: no verification fix needed — gate suite green in Step 1; no source or doc changes.`

If a fix is needed, commit it with subject `fix: address verification findings`, then append `Task 6: fix committed — <short SHA> — <one-line reason>` to the same ledger. Never invent a different ledger path or entry format; if the resolved workspace path is disambiguated, use that path instead.
