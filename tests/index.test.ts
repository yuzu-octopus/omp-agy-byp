// tests/index.test.ts
import { expect, test } from "bun:test";
import { DEFAULT_CONFIG } from "../src/config";
import { createExtension } from "../src/index";

type Hook = (...args: unknown[]) => unknown;
type CommandCtx = { ui: { notify: (message: string) => void } };
type CommandHandler = (args: string, ctx: CommandCtx) => void;
type PiStub = {
  setLabel: (label: string) => void;
  on: (name: string, handler: Hook) => void;
  registerProvider: () => never;
  registerOAuthProvider: () => never;
  registerTool: () => never;
  registerCommand: (name: string, config: { handler: CommandHandler }) => void;
  logger: { info(): void; warn(): void; error(): void; debug(): void };
};

function makePi(hooks: Record<string, Hook>, commands: Record<string, CommandHandler>): PiStub {
  return {
    setLabel: () => {},
    on: (name, handler) => {
      hooks[name] = handler;
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
function attach(hooks: Record<string, Hook>, commands: Record<string, CommandHandler>, deps: Parameters<typeof createExtension>[0]) {
  return createExtension(deps)(makePi(hooks, commands) as unknown as Parameters<ReturnType<typeof createExtension>>[0]);
}

const payload = { request: { systemInstruction: { parts: [{ text: "⁂ Runtime\n# Skills & Rules\nMatching skill → MUST read `skill://<name>` first.\n<skills>\n- <name>: <description>\n</skills>" }] } } };
const commandCtx = (notices: string[] = []): CommandCtx => ({
  ui: { notify: (message: string) => { notices.push(message); } },
});
const requestCtx = (provider: string) => ({ model: { provider } });
const requestEvent = { type: "before_provider_request" as const, payload };

test("default off: three hooks and one command, never unpauses, hooks inert", () => {
  const hooks: Record<string, Hook> = {};
  const commands: Record<string, CommandHandler> = {};
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
  expect(hooks.before_agent_start!({ systemPrompt: ["You are omp's trusted coding assistant"] }, {})).toBeUndefined();
  expect(hooks.context!({ messages: [] }, {})).toBeUndefined();
  expect(hooks.before_provider_request!(requestEvent, requestCtx("antigravity-cli"))).toBeUndefined();
});

test("on enables scrubbing and unpauses fallback once; status reports state and guidance", () => {
  const hooks: Record<string, Hook> = {};
  const commands: Record<string, CommandHandler> = {};
  const calls: string[][] = [];
  const notices: string[] = [];
  const state = { enabled: false };

  attach(hooks, commands, {
    unpause: ids => calls.push(ids),
    pauseReason: () => "paused by auth rule",
    config: DEFAULT_CONFIG,
    state,
  });

  commands["agy-byp"]!("status", commandCtx(notices));
  expect(notices.at(-1)).toContain("off");
  expect(notices.at(-1)).toContain("paused by auth rule");
  expect(notices.at(-1)).toContain("unpausedProviders");

  commands["agy-byp"]!("on", commandCtx(notices));
  expect(state.enabled).toBe(true);
  expect(calls).toEqual([["google-antigravity"]]);
  const out = hooks.before_provider_request!(requestEvent, requestCtx("google-antigravity")) as typeof payload;
  expect(out.request.systemInstruction.parts[0].text).toBe("⁂ Runtime\n# Capabilities & Rules\nMatching skill → MUST read `skill://<name>` first.\n<skills>\n- <name>: <description>\n</skills>");
});

test("on with unpauseFallback=false enables hooks but never unpauses", () => {
  const hooks: Record<string, Hook> = {};
  const commands: Record<string, CommandHandler> = {};
  const calls: string[][] = [];
  const state = { enabled: false };
  attach(hooks, commands, {
    unpause: ids => calls.push(ids),
    pauseReason: () => undefined,
    config: { ...DEFAULT_CONFIG, unpauseFallback: false },
    state,
  });
  commands["agy-byp"]!("on", commandCtx());
  expect(state.enabled).toBe(true);
  expect(calls).toEqual([]);
  const out = hooks.before_provider_request!(requestEvent, requestCtx("google-antigravity")) as typeof payload;
  expect(out.request.systemInstruction.parts[0].text).toBe("⁂ Runtime\n# Capabilities & Rules\nMatching skill → MUST read `skill://<name>` first.\n<skills>\n- <name>: <description>\n</skills>");
});

test("enabled hooks scrub the system prompt and context messages", () => {
  const hooks: Record<string, Hook> = {};
  const commands: Record<string, CommandHandler> = {};
  attach(hooks, commands, {
    unpause: () => {},
    pauseReason: () => undefined,
    config: DEFAULT_CONFIG,
    state: { enabled: true },
  });
  const prompt = hooks.before_agent_start!({ systemPrompt: ["⁂ Role\nYou are omp's trusted coding assistant.", "⁂ Runtime\n# Skills & Rules\nMatching skill → MUST read `skill://<name>` first.\n<skills>\n- <name>: <description>\n</skills>"] }, {}) as { systemPrompt: string[] };
  expect(prompt.systemPrompt).toEqual(["⁂ Role\nYou are the coding assistant for this Antigravity bridge session. Work inside the user's workspace and use the tools available in this session to complete the request.", "⁂ Runtime\n# Capabilities & Rules\nMatching skill → MUST read `skill://<name>` first.\n<skills>\n- <name>: <description>\n</skills>"]);
  const messages = hooks.context!({ messages: [{ role: "user", content: "# Internal URLs\nMost FS/bash tools resolve these; path selectors: `read` docs.\n- omp:// ...\n- local:// ...\nhi", timestamp: 1 }] }, {}) as { messages: { role: string; content: string; timestamp: number }[] };
  expect(messages.messages[0].content).toBe("# Resource references\nThe host resolves these reference schemes; consult `read` docs for path selectors.\n- omp:// ...\n- local:// ...\nhi");
  expect(messages.messages[0].timestamp).toBe(1);
});

test("empty command args default to status", () => {
  const hooks: Record<string, Hook> = {};
  const commands: Record<string, CommandHandler> = {};
  const notices: string[] = [];
  const state = { enabled: false };
  attach(hooks, commands, {
    unpause: () => {},
    pauseReason: () => undefined,
    config: DEFAULT_CONFIG,
    state,
  });
  commands["agy-byp"]!("on", commandCtx(notices));
  expect(state.enabled).toBe(true);
  commands["agy-byp"]!("", commandCtx(notices));
  expect(notices.at(-1)).toContain("on");
});

test("off makes hooks inert again without deactivating or re-pausing", () => {
  const hooks: Record<string, Hook> = {};
  const commands: Record<string, CommandHandler> = {};
  const calls: string[][] = [];
  const state = { enabled: true };
  attach(hooks, commands, {
    unpause: ids => calls.push(ids),
    pauseReason: () => undefined,
    config: DEFAULT_CONFIG,
    state,
  });
  commands["agy-byp"]!("off", commandCtx());
  expect(state.enabled).toBe(false);
  expect(calls).toEqual([]);
  expect(hooks.before_provider_request!(requestEvent, requestCtx("antigravity-cli"))).toBeUndefined();
});

test("before_provider_request ignores CLI and excluded API-key providers", () => {
  const hooks: Record<string, Hook> = {};
  const commands: Record<string, CommandHandler> = {};
  attach(hooks, commands, {
    unpause: () => {},
    pauseReason: () => undefined,
    config: DEFAULT_CONFIG,
    state: { enabled: true },
  });
  for (const provider of ["antigravity-cli", "google", "google-vertex"]) {
    expect(hooks.before_provider_request!(requestEvent, requestCtx(provider))).toBeUndefined();
  }
});
