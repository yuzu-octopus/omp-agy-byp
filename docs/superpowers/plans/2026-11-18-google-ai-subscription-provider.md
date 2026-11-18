# Google AI Subscription Provider Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an omp plugin that registers a command-backed provider using a signed-in local `agy` CLI to run Google-subscription models.

**Architecture:** One extension factory registers one provider. `streamSimple` builds a text prompt from omp's `Context`, spawns `agy -p <prompt> --model <slug> --output-format stream-json`, parses NDJSON, and translates the authoritative `result` event into omp assistant events. Credentials stay in the CLI keyring; no HTTP relay, OAuth flow, token export, or fingerprint spoofing.

**Tech Stack:** Bun 1.4.4+, TypeScript ESM, omp extension API, `@oh-my-pi/pi-ai`, `@oh-my-pi/pi-coding-agent`, `bun test`.

**Spec:** `docs/superpowers/specs/2026-11-18-google-ai-subscription-provider-design.md`

## Global Constraints

- Bun only: use `bun`, `bunx --bun`. Never `node`, `npm`, `npx`.
- Static imports only for `@oh-my-pi/*`; dynamic host-specifier imports fail in the extension loader.
- Never write to stdout from extension code. Diagnostics go to `pi.logger` or stderr.
- Use `ctx.setInterval`/`ctx.setTimeout`/`ctx.clearTimer`, never raw timers, in extension event handlers.
- Pin `@oh-my-pi/pi-coding-agent` and `@oh-my-pi/pi-ai` to `18.22.2` in devDependencies; use `>=18.18.6` in peerDependencies and assert runtime semantics in host-contract tests; pin `typescript` to `7.0.2` and `@biomejs/biome` to `2.6.8`.
- Register everything from one default-exported factory in `src/index.ts`.
- Provider id is `agy-byp`; API id is `agy-byp-cli`. Do not use `google`, `google-gemini-cli`, or `antigravity`.
- Exact spawn argv: `["-p", prompt, "--model", modelId, "--output-format", "stream-json"]`.
- Strip `ANTIGRAVITY_API_KEY`, `GEMINI_API_KEY`, `GOOGLE_API_KEY`, `GOOGLE_GENAI_API_KEY`, `GOOGLE_APPLICATION_CREDENTIALS`, `GOOGLE_GENAI_USE_VERTEXAI`, `GOOGLE_GENAI_USE_GCA` before spawn.
- Default timeout `300000` ms, clamped to `1000..600000` from `OMP_AGY_BYP_TIMEOUT_MS`.
- Default stderr capture `4096` bytes, clamped to `1024..65536` from `OMP_AGY_BYP_STDERR_CAPTURE_BYTES`.
- Binary override env var is `OMP_AGY_BYP_BINARY`; fallback is `Bun.which("agy")`.
- Text-only v1: no images, no host tool schemas, no token handling, no HTTP relay.
- Keep `package.json` `files` to `["src", "README.md"]`; keep `docs/` out of installs.
- Use real implementations in tests. Boundary functions (`SpawnFn`, binary locator, clock) may be injected; never mock the module under test.

## Review Focus

- **Missing or unauthenticated `agy`:** first request emits a terminal `error` event naming the missing binary or CLI login requirement; test in Task 5.
- **Malformed NDJSON or missing `result`:** no silent success; terminal `error` event with the failing line or exit status; test in Tasks 4 and 5.
- **Cancellation or timeout:** child process is killed and the stream emits `aborted` with a clear message; test in Task 5.
- **Non-text context:** images or unsupported assistant content fail fast with an explicit message; test in Task 3.
- **Credential fallback leak:** stripped env vars never reach the child; test in Task 2.

---

### Task 1: Scaffold the plugin package

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
- Produces: `HOST_VERSION_PIN = "18.22.2"`; `HOST_SPECIFIERS` array of every deep `@oh-my-pi/*` specifier used by the plugin. For v1 keep the array empty because only root imports are used.

- [ ] **Step 1: Write failing host pin test**

```ts
// tests/drift.test.ts
import { describe, expect, test } from "bun:test";
import { VERSION } from "@oh-my-pi/pi-coding-agent";
import { HOST_SPECIFIERS, HOST_VERSION_PIN } from "../src/version";

describe("host drift", () => {
  test("installed host matches dev pin", () => {
    expect(VERSION).toBe(HOST_VERSION_PIN);
  });

  test("every deep host specifier is tracked", () => {
    expect(Array.isArray(HOST_SPECIFIERS)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/drift.test.ts`
Expected: FAIL — `../src/version` not found.

- [ ] **Step 3: Create the manifest**

`package.json` must contain:
- `"name": "omp-agy-byp"`, `"version": "0.1.0"`, `"license": "MIT"`, `"type": "module"`.
- `"omp": { "name": "Google AI Subscription (Antigravity)", "version": "0.1.0", "extensions": ["./src/index.ts"] }`.
- `"engines": { "bun": ">=1.4.4" }`.
- `"files": ["src", "README.md"]`.
- `"scripts"`: `test: bun test tests/`, `typecheck: bunx --bun tsc --noEmit -p tsconfig.json`, `typecheck:fast: bun check`, `lint: bunx --bun @biomejs/biome check src tests`, `lint:fix: bunx --bun @biomejs/biome check src tests --write`.
- `devDependencies` pin host packages to `18.22.2`; `peerDependencies` allow `>=18.18.6`; devDependencies also pin `@biomejs/biome` `2.6.8`, `typescript` `7.0.2`, `@types/bun` `^1.4.2`.

- [ ] **Step 4: Create config files**

`tsconfig.json`: target `ESNext`, module `Preserve`, moduleResolution `bundler`, strict, noEmit, skipLibCheck, `types: ["bun"]`, allowImportingTsExtensions, allowArbitraryExtensions, include `src` and `tests`.

`biome.json`: minimal formatter/linter config with tabs and double quotes; no rule that changes generated fixture JSON.

`.gitignore`: ignore `node_modules/`, `coverage/`, `*.tsbuildinfo`, `.env`, `.env.*` except `.env.example`, `.DS_Store`, logs, and `.omp/extensions/` local shims. Track `bun.lock`.

`LICENSE`: MIT, copyright Yuzu.

- [ ] **Step 5: Implement `src/version.ts`**

Export `HOST_VERSION_PIN = "18.22.2"` and `HOST_SPECIFIERS = [] as const`.

- [ ] **Step 6: Write host-contract test**

```ts
import { describe, expect, test } from "bun:test";
import { AssistantMessageEventStream } from "@oh-my-pi/pi-ai";

describe("host contract", () => {
  test("canonical assistant stream settles with terminal result", async () => {
    const stream = new AssistantMessageEventStream();
    const message = {
      role: "assistant",
      content: [{ type: "text", text: "ok" }],
      api: "agy-byp-cli",
      provider: "agy-byp",
      model: "gemini-3.6-flash-high",
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
Expected: PASS.

- [ ] **Step 8: Install and commit**

Run: `bun install`, then commit with subject `feat: scaffold omp plugin package`.

---

### Task 2: Constants, config, model roster, and environment sanitization

**Files:**
- Create: `src/ids.ts`
- Create: `src/config.ts`
- Create: `src/models.ts`
- Create: `src/env.ts`
- Test: `tests/config.test.ts`
- Test: `tests/models.test.ts`
- Test: `tests/env.test.ts`

**Interfaces:**
- Consumes: `HOST_VERSION_PIN` from Task 1.
- Produces: `PROVIDER_ID`, `API_ID`, `BASE_URL`, `SUBSCRIPTION_ONLY_ENV_KEYS`; `PluginConfig`, `DEFAULT_CONFIG`, `loadConfig(env)`; `MODELS`, `MODEL_BY_ID`; `subscriptionOnlyEnv(env)`.

- [ ] **Step 1: Write failing config tests**

```ts
// tests/config.test.ts
import { describe, expect, test } from "bun:test";
import { DEFAULT_CONFIG, loadConfig } from "../src/config";

describe("loadConfig", () => {
  test("uses defaults", () => {
    expect(loadConfig({})).toEqual(DEFAULT_CONFIG);
  });

  test("clamps timeout and stderr capture", () => {
    const config = loadConfig({
      OMP_AGY_BYP_TIMEOUT_MS: "0",
      OMP_AGY_BYP_STDERR_CAPTURE_BYTES: "999999",
      OMP_AGY_BYP_BINARY: "/opt/bin/agy",
    });
    expect(config.timeoutMs).toBe(1000);
    expect(config.stderrCaptureBytes).toBe(65536);
    expect(config.binary).toBe("/opt/bin/agy");
  });
});
```

- [ ] **Step 2: Write failing env test**

```ts
// tests/env.test.ts
import { describe, expect, test } from "bun:test";
import { subscriptionOnlyEnv } from "../src/env";

test("strips subscription-only fallback keys", () => {
  const env = subscriptionOnlyEnv({
    PATH: "/usr/bin",
    GEMINI_API_KEY: "secret",
    GOOGLE_API_KEY: "secret",
    ANTIGRAVITY_API_KEY: "secret",
  });
  expect(env).toEqual({ PATH: "/usr/bin" });
});
```

- [ ] **Step 3: Write failing model roster test**

```ts
// tests/models.test.ts
import { describe, expect, test } from "bun:test";
import { MODELS, MODEL_BY_ID } from "../src/models";

test("model roster is complete and zero-cost", () => {
  expect(MODELS.map(model => model.id)).toEqual([
    "gemini-3.6-flash-high",
    "gemini-3.6-flash-medium",
    "gemini-3.5-flash-medium",
    "gemini-3.1-pro-high",
    "claude-sonnet-4-6",
    "claude-opus-4-6",
    "gpt-oss-120b-medium",
  ]);
  for (const model of MODELS) {
    expect(model.cost).toEqual({ input: 0, output: 0, cacheRead: 0, cacheWrite: 0 });
    expect(model.input).toEqual(["text"]);
    expect(MODEL_BY_ID[model.id]).toBe(model);
  }
});
```

- [ ] **Step 4: Run tests to verify they fail**

Run: `bun test tests/config.test.ts tests/env.test.ts tests/models.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 5: Implement the modules**

`src/ids.ts`: export `PROVIDER_ID = "agy-byp"`, `API_ID = "agy-byp-cli"`, `BASE_URL = "https://command-provider.invalid/"`, and the exact stripped-key array from Global Constraints.

`src/config.ts`: define `PluginConfig` with `binary: string | undefined`, `timeoutMs: number`, `stderrCaptureBytes: number`. Define `DEFAULT_CONFIG = { binary: undefined, timeoutMs: 300000, stderrCaptureBytes: 4096 }`. Implement `loadConfig(env: NodeJS.ProcessEnv): PluginConfig`; parse integers with `Number`, ignore non-finite values, clamp as specified.

`src/env.ts`: copy the input env and delete every key in `SUBSCRIPTION_ONLY_ENV_KEYS`.

`src/models.ts`: export `MODELS: ProviderModelConfig[]` with exact slugs above. Gemini models: `contextWindow: 1_000_000`, `maxTokens: 65_536`, `reasoning: true`, names from the reference adapter. Claude models: `contextWindow: 200_000`, `maxTokens: 8_192`, `reasoning: true`. GPT-OSS: `contextWindow: 128_000`, `maxTokens: 8_192`, `reasoning: false`. All `input: ["text"]` and zero costs. Export `MODEL_BY_ID`.

- [ ] **Step 6: Run tests to verify they pass**

Run: `bun test tests/config.test.ts tests/env.test.ts tests/models.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

Subject: `feat: add provider constants and model roster`.

---

### Task 3: Prompt serialization

**Files:**
- Create: `src/prompt.ts`
- Test: `tests/prompt.test.ts`

**Interfaces:**
- Consumes: `Context` from `@oh-my-pi/pi-ai`.
- Produces: `buildPrompt(context: Context): string`; `PromptError`.

- [ ] **Step 1: Write failing tests**

```ts
// tests/prompt.test.ts
import { describe, expect, test } from "bun:test";
import { buildPrompt } from "../src/prompt";

const timestamp = 1_700_000_000_000;

test("serializes system and text messages in order", () => {
  const prompt = buildPrompt({
    systemPrompt: ["You are concise.", "No markdown."],
    messages: [
      { role: "user", content: "first", timestamp },
      { role: "developer", content: [{ type: "text", text: "second" }], timestamp },
      { role: "assistant", content: [{ type: "text", text: "third" }], timestamp } as never,
      {
        role: "toolResult",
        toolCallId: "call-1",
        toolName: "read",
        content: [{ type: "text", text: "fourth" }],
        isError: false,
        timestamp,
      },
    ],
  });
  expect(prompt).toBe(
    "System:\nYou are concise.\n\nNo markdown.\n\nUser:\nfirst\n\nDeveloper:\nsecond\n\nAssistant:\nthird\n\nTool result (read):\nfourth",
  );
});

test("rejects image content", () => {
  expect(() =>
    buildPrompt({
      messages: [
        {
          role: "user",
          content: [{ type: "image", data: "abc", mimeType: "image/png" }],
          timestamp,
        },
      ],
    }),
  ).toThrow("image content is not supported");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/prompt.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `buildPrompt`**

Rules:
- Use only `systemPrompt` and `messages`; ignore `tools` and `inactiveTools`.
- Join `systemPrompt` entries with `\n\n` under a single `System:` section; omit the section when empty.
- Map roles to exact labels: `User`, `Developer`, `Assistant`, `Tool result (<toolName>)`.
- Accept string content and arrays of text parts; concatenate text parts with `\n`.
- Throw `PromptError("image content is not supported by agy-byp")` for any image part.
- Throw `PromptError("unsupported assistant content")` for assistant parts that are not text.
- Join sections with `\n\n`.

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test tests/prompt.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

Subject: `feat: serialize omp context into agy prompts`.

---

### Task 4: NDJSON parser

**Files:**
- Create: `src/ndjson.ts`
- Create: `tests/fixtures/agy-stream-sample.ndjson`
- Test: `tests/ndjson.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `AgyEvent` union; `parseAgyLine(line: string): AgyEvent | undefined`; `parseAgyStream(text: string): AgyEvent[]`; `AgyParseError`.

- [ ] **Step 1: Create fixture**

Copy the four-line sample from `M3NT1/antigravity-provider-for-opencode` `test/fixtures/agy-stream-sample.ndjson`: `init`, two `step_update`, one `result` with `status: "SUCCESS"`, response text, and usage.

- [ ] **Step 2: Write failing tests**

```ts
// tests/ndjson.test.ts
import { describe, expect, test } from "bun:test";
import { AgyParseError, parseAgyLine, parseAgyStream } from "../src/ndjson";

const fixture = await Bun.file(
  new URL("./fixtures/agy-stream-sample.ndjson", import.meta.url),
).text();

test("parses the reference stream", () => {
  const events = parseAgyStream(fixture);
  expect(events.map(event => event.event)).toEqual([
    "init",
    "step_update",
    "step_update",
    "result",
  ]);
  const result = events.at(-1);
  expect(result?.event).toBe("result");
  if (result?.event === "result") {
    expect(result.result.response).toBe(
      "Git rebase rewrites commit history onto a new base.\n",
    );
    expect(result.result.usage?.input_tokens).toBe(10418);
  }
});

test("flushes a final line without newline", () => {
  const line = '{"event":"result","result":{"status":"SUCCESS","response":"ok"}}';
  expect(parseAgyStream(line).at(-1)?.event).toBe("result");
});

test("throws on malformed JSON", () => {
  expect(() => parseAgyLine("not json")).toThrow(AgyParseError);
});

test("ignores unknown events", () => {
  expect(parseAgyLine('{"event":"mystery"}')).toBeUndefined();
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `bun test tests/ndjson.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement parser**

Define:
```ts
export type AgyUsage = {
  input_tokens?: number;
  output_tokens?: number;
  thinking_tokens?: number;
  cache_read_tokens?: number;
};
export type AgyEvent =
  | { event: "init"; conversation_id: string }
  | { event: "step_update"; step_update: { state: string; text_delta?: string; usage?: AgyUsage } }
  | { event: "result"; result: { status: string; response?: string; error?: string; usage?: AgyUsage } };
```
`parseAgyLine` trims, returns `undefined` for empty lines, throws `AgyParseError` on invalid JSON, returns `undefined` for unknown event names. Validate only the discriminant and top-level object; deeper field validation belongs to the runner. `parseAgyStream` splits on newlines, parses each line, and always flushes a non-empty trailing segment.

- [ ] **Step 5: Run test to verify it passes**

Run: `bun test tests/ndjson.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

Subject: `feat: parse agy stream-json events`.

---

### Task 5: Subprocess runner

**Files:**
- Create: `src/runner.ts`
- Create: `tests/fixtures/agy-success.ts`
- Create: `tests/fixtures/agy-error.ts`
- Create: `tests/fixtures/agy-slow.ts`
- Test: `tests/runner.test.ts`

**Interfaces:**
- Consumes: `PluginConfig`, `subscriptionOnlyEnv`, `parseAgyStream`, `AgyEvent`.
- Produces: `SpawnFn`, `SpawnOptions`, `SpawnedProcess`, `AgyRunResult`, `spawnAgy(options: SpawnAgyOptions): Promise<AgyRunResult>`.

- [ ] **Step 1: Create deterministic fixtures**

`tests/fixtures/agy-success.ts`: write the four reference NDJSON lines to stdout, exit 0.
`tests/fixtures/agy-error.ts`: write `cli login required` to stderr, exit 1.
`tests/fixtures/agy-slow.ts`: write `init`, wait 10000 ms, write `result`, exit 0.

- [ ] **Step 2: Write failing tests**

```ts
// tests/runner.test.ts
import { describe, expect, test } from "bun:test";
import { spawnAgy } from "../src/runner";

const fixture = new URL("./fixtures/agy-success.ts", import.meta.url).pathname;

function fixtureSpawn(command: string, args: readonly string[], options: Record<string, unknown>) {
  return Bun.spawn({
    cmd: [process.execPath, fixture, ...args],
    cwd: options.cwd as string | undefined,
    env: options.env as Record<string, string | undefined>,
    signal: options.signal as AbortSignal | undefined,
    stdout: "pipe",
    stderr: "pipe",
    timeout: options.timeout as number | undefined,
    killSignal: "SIGKILL",
  });
}

test("spawns exact argv and parses result", async () => {
  const result = await spawnAgy({
    binary: "unused-by-fixture-spawn",
    prompt: "hello",
    modelId: "gemini-3.6-flash-high",
    cwd: process.cwd(),
    timeoutMs: 5000,
    stderrCaptureBytes: 4096,
    spawnFn: fixtureSpawn,
  });
  expect(result.argv).toEqual([
    "unused-by-fixture-spawn",
    "-p",
    "hello",
    "--model",
    "gemini-3.6-flash-high",
    "--output-format",
    "stream-json",
  ]);
  expect(result.events.at(-1)?.event).toBe("result");
  expect(result.exitCode).toBe(0);
});

test("maps non-zero exit to an error", async () => {
  const errorFixture = new URL("./fixtures/agy-error.ts", import.meta.url).pathname;
  const spawnFn = (command: string, args: readonly string[], options: Record<string, unknown>) =>
    Bun.spawn({
      cmd: [process.execPath, errorFixture, ...args],
      env: options.env as Record<string, string | undefined>,
      signal: options.signal as AbortSignal | undefined,
      stdout: "pipe",
      stderr: "pipe",
      timeout: options.timeout as number | undefined,
      killSignal: "SIGKILL",
    });
  await expect(
    spawnAgy({
      binary: "agy",
      prompt: "hello",
      modelId: "gemini-3.6-flash-high",
      timeoutMs: 5000,
      stderrCaptureBytes: 4096,
      spawnFn,
    }),
  ).rejects.toThrow("cli login required");
});

test("aborts a slow child", async () => {
  const slowFixture = new URL("./fixtures/agy-slow.ts", import.meta.url).pathname;
  const controller = new AbortController();
  const spawnFn = (command: string, args: readonly string[], options: Record<string, unknown>) =>
    Bun.spawn({
      cmd: [process.execPath, slowFixture, ...args],
      env: options.env as Record<string, string | undefined>,
      signal: controller.signal,
      stdout: "pipe",
      stderr: "pipe",
      killSignal: "SIGKILL",
    });
  const pending = spawnAgy({
    binary: "agy",
    prompt: "hello",
    modelId: "gemini-3.6-flash-high",
    timeoutMs: 60000,
    stderrCaptureBytes: 4096,
    signal: controller.signal,
    spawnFn,
  });
  controller.abort(new Error("user cancelled"));
  await expect(pending).rejects.toThrow("user cancelled");
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `bun test tests/runner.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement runner**

Define:
```ts
export interface SpawnOptions {
  cwd?: string;
  env: Record<string, string | undefined>;
  signal?: AbortSignal;
  timeout: number;
}
export interface SpawnedProcess {
  stdout: ReadableStream<Uint8Array> | null;
  stderr: ReadableStream<Uint8Array> | null;
  exited: Promise<number>;
}
export type SpawnFn = (command: string, args: readonly string[], options: SpawnOptions) => SpawnedProcess;
export interface SpawnAgyOptions {
  binary: string;
  prompt: string;
  modelId: string;
  cwd?: string;
  signal?: AbortSignal;
  timeoutMs: number;
  stderrCaptureBytes: number;
  env?: NodeJS.ProcessEnv;
  spawnFn?: SpawnFn;
}
export interface AgyRunResult {
  argv: string[];
  events: AgyEvent[];
  stderr: string;
  exitCode: number;
}
```
Default `spawnFn` calls `Bun.spawn({ cmd: [command, ...args], cwd, env, signal, timeout, killSignal: "SIGKILL", stdout: "pipe", stderr: "pipe" })`. Read stdout and stderr concurrently with `new Response(stream).text()`. Parse stdout with `parseAgyStream`. Reject with an `Error` whose message is trimmed stderr when exit code is non-zero or no `result` event exists. For aborted signals, reject with `options.signal.reason instanceof Error ? reason : new Error("agy cancelled")`. Return the full argv for testability.

- [ ] **Step 5: Run tests to verify they pass**

Run: `bun test tests/runner.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

Subject: `feat: add agy subprocess runner`.

---

### Task 6: Stream adapter

**Files:**
- Create: `src/stream.ts`
- Test: `tests/stream.test.ts`

**Interfaces:**
- Consumes: `buildPrompt`, `spawnAgy`, `loadConfig`, `resolveBinary` injected through `StreamDeps`; `MODELS` is not needed here.
- Produces: `createStreamSimple(deps: StreamDeps): StreamSimple`.

- [ ] **Step 1: Write failing tests**

```ts
// tests/stream.test.ts
import { describe, expect, test } from "bun:test";
import { AssistantMessageEventStream } from "@oh-my-pi/pi-ai";
import { createStreamSimple } from "../src/stream";

const model = {
  id: "gemini-3.6-flash-high",
  name: "Gemini 3.6 Flash (High)",
  api: "agy-byp-cli",
  provider: "agy-byp",
  reasoning: true,
  input: ["text"],
  cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  contextWindow: 1_000_000,
  maxTokens: 65_536,
} as never;

test("emits canonical text events from result", async () => {
  const events: string[] = [];
  const stream = new AssistantMessageEventStream();
  const consume = (async () => {
    for await (const event of stream) events.push(event.type);
  })();
  const streamSimple = createStreamSimple({
    resolveBinary: () => "/opt/bin/agy",
    spawnAgy: async () => ({
      argv: [],
      events: [
        {
          event: "result",
          result: {
            status: "SUCCESS",
            response: "done",
            usage: { input_tokens: 10, output_tokens: 2, thinking_tokens: 1, cache_read_tokens: 3 },
          },
        },
      ],
      stderr: "",
      exitCode: 0,
    }),
    config: { binary: undefined, timeoutMs: 5000, stderrCaptureBytes: 4096 },
    now: () => 1_700_000_000_000,
  });
  streamSimple(model, { messages: [{ role: "user", content: "hi", timestamp: 1 }] }, {} as never, stream);
  await consume;
  expect(events).toEqual(["start", "text_start", "text_delta", "text_end", "done"]);
  const final = await stream.result();
  expect(final.content).toEqual([{ type: "text", text: "done" }]);
  expect(final.usage).toEqual({
    input: 10,
    output: 3,
    cacheRead: 3,
    cacheWrite: 0,
    totalTokens: 16,
  });
});

test("emits error event on runner failure", async () => {
  const events: string[] = [];
  const stream = new AssistantMessageEventStream();
  const consume = (async () => {
    for await (const event of stream) events.push(event.type);
  })();
  const streamSimple = createStreamSimple({
    resolveBinary: () => "/opt/bin/agy",
    spawnAgy: async () => {
      throw new Error("cli login required");
    },
    config: { binary: undefined, timeoutMs: 5000, stderrCaptureBytes: 4096 },
    now: () => 1_700_000_000_000,
  });
  streamSimple(model, { messages: [{ role: "user", content: "hi", timestamp: 1 }] }, {} as never, stream);
  await consume;
  expect(events.at(-1)).toBe("error");
  const final = await stream.result();
  expect(final.errorMessage).toBe("cli login required");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/stream.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement adapter**

Define `StreamDeps` with `resolveBinary: () => string`, `spawnAgy: typeof spawnAgy`, `config: PluginConfig`, `now: () => number`. Define `createStreamSimple(deps): (model, context, options, stream?) => AssistantMessageEventStream`. When no stream is passed, create one. Immediately push `{ type: "start", partial: output }`. Build output message with `role: "assistant"`, `content: []`, `api: API_ID`, `provider: PROVIDER_ID`, `model: model.id`, zero usage, `stopReason: "stop"`, `timestamp: deps.now()`. In async work: call prompt builder and runner; find the `result` event; if status is not `SUCCESS`, error with `result.error`; push text_start/delta/end at index 0; set usage from `result.usage` (`output = output_tokens + thinking_tokens`, `totalTokens = input + output + cacheRead`); push done. On error, set `stopReason` to `aborted` when `options.signal?.aborted`, otherwise `error`, set `errorMessage`, push error. Log via injected logger only when provided.

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test tests/stream.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

Subject: `feat: map agy results to assistant streams`.

---

### Task 7: Binary resolution, registration, status command, and README

**Files:**
- Create: `src/binary.ts`
- Create: `src/index.ts`
- Create: `README.md`
- Create: `HANDOFF.md`
- Test: `tests/binary.test.ts`
- Test: `tests/index.test.ts`

**Interfaces:**
- Consumes: all prior modules.
- Produces: `resolveBinary(env, which?)`; default extension factory.

- [ ] **Step 1: Write failing binary tests**

```ts
// tests/binary.test.ts
import { describe, expect, test } from "bun:test";
import { resolveBinary } from "../src/binary";

test("prefers explicit override", () => {
  expect(
    resolveBinary({ OMP_AGY_BYP_BINARY: "/custom/agy" }, () => "/path/agy"),
  ).toBe("/custom/agy");
});

test("falls back to which and throws when absent", () => {
  expect(resolveBinary({}, () => "/path/agy")).toBe("/path/agy");
  expect(() => resolveBinary({}, () => null)).toThrow(
    "agy binary not found; install the Antigravity CLI or set OMP_AGY_BYP_BINARY",
  );
});
```

- [ ] **Step 2: Write failing registration test**

```ts
// tests/index.test.ts
import { describe, expect, test } from "bun:test";
import extension from "../src/index";

test("registers one provider and status command", () => {
  const registrations: string[] = [];
  const pi = {
    setLabel: () => {},
    registerProvider: (name: string) => registrations.push(`provider:${name}`),
    registerCommand: (name: string) => registrations.push(`command:${name}`),
    logger: { warn() {}, error() {}, info() {}, debug() {} },
  } as never;
  extension(pi);
  expect(registrations).toEqual([
    "provider:agy-byp",
    "command:agy-byp-status",
  ]);
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `bun test tests/binary.test.ts tests/index.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 4: Implement binary resolution**

`resolveBinary(env: NodeJS.ProcessEnv, which: (name: string) => string | null = Bun.which): string` returns `env.OMP_AGY_BYP_BINARY` when non-empty, else `which("agy")`, else throws the exact test message.

- [ ] **Step 5: Implement factory**

`src/index.ts` default export:
- Call `pi.setLabel("Google AI Subscription (Antigravity)")`.
- Build config with `loadConfig(process.env)`.
- Build `streamSimple = createStreamSimple({ resolveBinary: () => resolveBinary(process.env), spawnAgy, config, logger: pi.logger, now: () => Date.now() })`.
- Call `pi.registerProvider(PROVIDER_ID, { baseUrl: BASE_URL, apiKey: "unused-by-extension", api: API_ID, models: MODELS, streamSimple })`.
- Call `pi.registerCommand("agy-byp-status", { description: "Check agy-byp binary and setup", handler(ctx) })`. Handler resolves binary, reports it with `ctx.ui.notify(..., "info")`, and logs failures with `pi.logger.error`; it must not run a chat request.
- Do not register OAuth, tools, hooks, or panels.

- [ ] **Step 6: Write docs**

`README.md`: purpose, prerequisites (`agy` installed, user has run `agy`, OS keyring available), install via marketplace, dev link, commands, models, limitations, safety note that credentials stay in the CLI keyring.

`HANDOFF.md`: live-only checks for a human, with exact commands:
```sh
omp plugin link /absolute/path/to/omp-agy-byp
omp plugin doctor
omp models -e /absolute/path/to/omp-agy-byp/src/index.ts
```
Warn that `-e` must follow the subcommand, `--help` never loads extensions, exit code is zero on load failure, and stderr must be read for `Failed to load extension`. Add steps to sign in with `agy`, select an `agy-byp` model, and observe one response.

- [ ] **Step 7: Run tests to verify they pass**

Run: `bun test tests/binary.test.ts tests/index.test.ts`
Expected: PASS.

- [ ] **Step 8: Commit**

Subject: `feat: register command-backed agy provider`.

---

### Task 8: Full verification and self-review

**Files:**
- Modify: `HANDOFF.md` only if a verification gap appears.

**Interfaces:**
- Consumes: complete tree.
- Produces: verified plugin package; no API changes.

- [ ] **Step 1: Run gate in order**

```sh
bunx --bun tsc --noEmit -p tsconfig.json
bunx --bun @biomejs/biome check src tests
bun test tests/
```

Expected: each command exits 0.

- [ ] **Step 2: Self-review against spec**

Check: no HTTP relay; no token extraction; no stdout writes; exact argv; env strip list; timeout/stderr clamps; one provider; one command; no image input; status command does not make requests; docs list human-only checks.

- [ ] **Step 3: Commit any verification-driven fix**

If no fix is needed, record that in the SDD ledger. If a fix is needed, commit it with subject `fix: address verification findings`.
