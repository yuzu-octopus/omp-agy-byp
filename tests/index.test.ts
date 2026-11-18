// tests/index.test.ts
import { afterEach, expect, test } from "bun:test";
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
function attach(
  hooks: Record<string, Hook>,
  commands: Record<string, CommandHandler>,
  deps: Parameters<typeof createExtension>[0],
) {
  return createExtension(deps)(
    makePi(hooks, commands) as unknown as Parameters<ReturnType<typeof createExtension>>[0],
  );
}

const payload = {
  request: {
    systemInstruction: {
      parts: [
        {
          text: "⁂ Runtime\n# Skills & Rules\nMatching skill → MUST read `skill://<name>` first.\n<skills>\n- <name>: <description>\n</skills>",
        },
      ],
    },
  },
};
const commandCtx = (notices: string[] = []): CommandCtx => ({
  ui: {
    notify: (message: string) => {
      notices.push(message);
    },
  },
});
const requestCtx = (provider: string) => ({ model: { provider } });
const requestEvent = { type: "before_provider_request" as const, payload };

test("default off: three hooks and one command, never unpauses, hooks inert", () => {
  const hooks: Record<string, Hook> = {};
  const commands: Record<string, CommandHandler> = {};
  const calls: string[][] = [];
  attach(hooks, commands, {
    unpause: (ids) => calls.push(ids),
    pauseReason: () => undefined,
    config: DEFAULT_CONFIG,
    state: { enabled: false },
  });

  // Registration order is pinned to Task 5 Step 3; do not sort the keys, because a
  // sorted comparison would not catch a registration-order regression.
  expect(Object.keys(hooks)).toEqual(["before_agent_start", "context", "before_provider_request"]);
  expect(Object.keys(commands)).toEqual(["agy-byp"]);
  expect(calls).toEqual([]);
  expect(
    hooks.before_agent_start!(
      { systemPrompt: ["You are omp's trusted coding assistant."] },
      requestCtx("antigravity-cli"),
    ),
  ).toBeUndefined();
  expect(hooks.context!({ messages: [] }, requestCtx("antigravity-cli"))).toBeUndefined();
  expect(
    hooks.before_provider_request!(requestEvent, requestCtx("antigravity-cli")),
  ).toBeUndefined();
});

test("on enables scrubbing and unpauses fallback once; status reports state and guidance", () => {
  const hooks: Record<string, Hook> = {};
  const commands: Record<string, CommandHandler> = {};
  const calls: string[][] = [];
  const notices: string[] = [];
  const state = { enabled: false };

  attach(hooks, commands, {
    unpause: (ids) => calls.push(ids),
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
  const out = hooks.before_provider_request!(
    requestEvent,
    requestCtx("google-antigravity"),
  ) as typeof payload;
  expect(out.request.systemInstruction.parts[0].text).toBe(
    "⁂ Runtime\n# Capabilities & Rules\nMatching skill → MUST read `skill://<name>` first.\n<skills>\n- <name>: <description>\n</skills>",
  );
});

test("on with unpauseFallback=false enables hooks but never unpauses", () => {
  const hooks: Record<string, Hook> = {};
  const commands: Record<string, CommandHandler> = {};
  const calls: string[][] = [];
  const state = { enabled: false };
  attach(hooks, commands, {
    unpause: (ids) => calls.push(ids),
    pauseReason: () => undefined,
    config: { ...DEFAULT_CONFIG, unpauseFallback: false },
    state,
  });
  commands["agy-byp"]!("on", commandCtx());
  expect(state.enabled).toBe(true);
  expect(calls).toEqual([]);
  const out = hooks.before_provider_request!(
    requestEvent,
    requestCtx("google-antigravity"),
  ) as typeof payload;
  expect(out.request.systemInstruction.parts[0].text).toBe(
    "⁂ Runtime\n# Capabilities & Rules\nMatching skill → MUST read `skill://<name>` first.\n<skills>\n- <name>: <description>\n</skills>",
  );
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
  const prompt = hooks.before_agent_start!(
    {
      systemPrompt: [
        "⁂ Role\nYou are omp's trusted coding assistant.",
        "⁂ Runtime\n# Skills & Rules\nMatching skill → MUST read skill://<name> first.\n<skills>\n- <name>: <description>\n</skills>",
      ],
    },
    requestCtx("antigravity-cli"),
  ) as { systemPrompt: string[] };
  expect(prompt.systemPrompt).toEqual([
    "⁂ Role\nYou are the coding assistant for this Antigravity bridge session. Work inside the user's workspace and use the tools available in this session to complete the request.",
    "⁂ Runtime\n# Capabilities & Rules\nMatching skill → MUST read skill://<name> first.\n<skills>\n- <name>: <description>\n</skills>",
  ]);
  const messages = hooks.context!(
    {
      messages: [
        {
          role: "user",
          content:
            "# Internal URLs\nMost FS/bash tools resolve these; path selectors: `read` docs.\n- omp:// ...\n- local:// ...\nhi",
          timestamp: 1,
        },
      ],
    },
    requestCtx("antigravity-cli"),
  ) as { messages: { role: string; content: string; timestamp: number }[] };
  expect(messages.messages[0].content).toBe(
    "# Internal URLs\nThe host resolves these reference schemes; consult `read` docs for path selectors.\n- omp:// ...\n- local:// ...\nhi",
  );
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
    unpause: (ids) => calls.push(ids),
    pauseReason: () => undefined,
    config: DEFAULT_CONFIG,
    state,
  });
  commands["agy-byp"]!("off", commandCtx());
  expect(state.enabled).toBe(false);
  expect(calls).toEqual([]);
  expect(
    hooks.before_provider_request!(requestEvent, requestCtx("antigravity-cli")),
  ).toBeUndefined();
});

test("before_provider_request ignores excluded API-key providers and scrubs the CLI", () => {
  const hooks: Record<string, Hook> = {};
  const commands: Record<string, CommandHandler> = {};
  attach(hooks, commands, {
    unpause: () => {},
    pauseReason: () => undefined,
    config: DEFAULT_CONFIG,
    state: { enabled: true },
  });
  for (const provider of ["google", "google-vertex"]) {
    expect(hooks.before_provider_request!(requestEvent, requestCtx(provider))).toBeUndefined();
  }
  const scrubbed = hooks.before_provider_request!(
    requestEvent,
    requestCtx("antigravity-cli"),
  ) as typeof payload;
  expect(scrubbed.request.systemInstruction.parts[0].text).toContain("# Capabilities & Rules");
});

test("google and google-vertex pass through every hook untouched", () => {
  const hooks: Record<string, Hook> = {};
  const commands: Record<string, CommandHandler> = {};
  attach(hooks, commands, {
    unpause: () => {},
    pauseReason: () => undefined,
    config: DEFAULT_CONFIG,
    state: { enabled: true },
  });
  const systemPrompt = ["You are omp's trusted coding assistant."];
  const messages = [
    { role: "user", content: "You are omp's trusted coding assistant.", timestamp: 1 },
  ];
  for (const provider of ["google", "google-vertex"]) {
    const ctx = requestCtx(provider);
    expect(hooks.before_agent_start!({ systemPrompt }, ctx)).toBeUndefined();
    expect(hooks.context!({ messages }, ctx)).toBeUndefined();
    expect(hooks.before_provider_request!(requestEvent, ctx)).toBeUndefined();
  }
});

// --- Task 3: alias provider wiring and patch status ---

type AliasProvider = {
  resolveOutbound(tool: { name: string }): unknown;
  resolveInbound(aliasName: string, args: unknown): unknown;
  resolveResult(toolName: string, result: unknown): unknown;
};
type GlobalAliasHook = typeof globalThis & {
  __ompAgBypSetToolAliasProvider?: (provider: AliasProvider) => void;
};
const aliasGlobal = globalThis as GlobalAliasHook;
type PatchStatus = "ok" | "missing" | "drifted";

afterEach(() => {
  delete aliasGlobal.__ompAgBypSetToolAliasProvider;
});

function captureProvider(): AliasProvider[] {
  const providers: AliasProvider[] = [];
  aliasGlobal.__ompAgBypSetToolAliasProvider = (provider) => {
    providers.push(provider);
  };
  return providers;
}

function depsFor(
  state: { enabled: boolean },
  patch: PatchStatus,
  mode: "generic" | "native" = "generic",
): Parameters<typeof createExtension>[0] {
  return {
    unpause: () => {},
    pauseReason: () => undefined,
    config: { ...DEFAULT_CONFIG, mode },
    state,
    checkPatch: () => ({ status: patch }),
  };
}

test("registers the alias provider at load only when the host hook is a function", () => {
  const providers = captureProvider();
  attach({}, {}, depsFor({ enabled: false }, "ok"));
  expect(providers).toHaveLength(1);
  expect(typeof providers[0]!.resolveOutbound).toBe("function");
  expect(typeof providers[0]!.resolveInbound).toBe("function");
  expect(typeof providers[0]!.resolveResult).toBe("function");

  delete aliasGlobal.__ompAgBypSetToolAliasProvider;
  expect(() => attach({}, {}, depsFor({ enabled: false }, "ok"))).not.toThrow();
  expect(providers).toHaveLength(1);

  aliasGlobal.__ompAgBypSetToolAliasProvider =
    "not-a-function" as unknown as GlobalAliasHook["__ompAgBypSetToolAliasProvider"];
  expect(() => attach({}, {}, depsFor({ enabled: false }, "ok"))).not.toThrow();
  expect(providers).toHaveLength(1);
});

test("alias resolvers are inert when off, native, or patch is not ok", () => {
  const cases: Array<{
    enabled: boolean;
    mode: "generic" | "native";
    patch: PatchStatus;
    active: boolean;
  }> = [
    { enabled: false, mode: "generic", patch: "ok", active: false },
    { enabled: true, mode: "native", patch: "ok", active: false },
    { enabled: true, mode: "generic", patch: "missing", active: false },
    { enabled: true, mode: "generic", patch: "drifted", active: false },
    { enabled: true, mode: "generic", patch: "ok", active: true },
  ];
  for (const c of cases) {
    const providers = captureProvider();
    attach({}, {}, depsFor({ enabled: c.enabled }, c.patch, c.mode));
    const provider = providers[0]!;
    const outbound = provider.resolveOutbound({ name: "bash" });
    const inbound = provider.resolveInbound("run_command", { CommandLine: "ls" });
    const result = provider.resolveResult("bash", "done");
    if (c.active) {
      expect(outbound).toMatchObject({ name: "run_command" });
      expect(inbound).toEqual({
        toolName: "bash",
        args: { command: "ls", waitMsBeforeAsync: 5000 },
      });
      expect(result).toEqual({ content: [{ type: "text", text: "done" }] });
    } else {
      expect(outbound).toBeUndefined();
      expect(inbound).toBeUndefined();
      expect(result).toBeUndefined();
    }
    delete aliasGlobal.__ompAgBypSetToolAliasProvider;
  }
});

test("patch missing or drifted keeps text scrubbing and reports patch state without secrets", () => {
  for (const patch of ["missing", "drifted"] as const) {
    const hooks: Record<string, Hook> = {};
    const commands: Record<string, CommandHandler> = {};
    const notices: string[] = [];
    attach(hooks, commands, depsFor({ enabled: true }, patch));
    const ctx = requestCtx("antigravity-cli");
    const out = hooks.before_provider_request!(requestEvent, ctx) as typeof payload;
    expect(out.request.systemInstruction.parts[0].text).toContain("# Capabilities & Rules");
    const prompt = hooks.before_agent_start!(
      {
        systemPrompt: [
          "⁂ Runtime\n# Skills & Rules\nmatching skill → MUST read skill://<name> first.",
        ],
      },
      ctx,
    ) as { systemPrompt: string[] };
    expect(prompt.systemPrompt[0]).toContain("# Capabilities & Rules");
    commands["agy-byp"]!("status", commandCtx(notices));
    expect(notices.at(-1)).toContain(`patch: ${patch}`);
    expect(notices.at(-1)).not.toContain("Bearer ");
    expect(notices.at(-1)).not.toContain("sk-");
  }
});

test("toggle sets a pending alias state cleared at before_agent_start", () => {
  const providers = captureProvider();
  const hooks: Record<string, Hook> = {};
  const commands: Record<string, CommandHandler> = {};
  const notices: string[] = [];
  const state = { enabled: false };
  attach(hooks, commands, depsFor(state, "ok"));
  const provider = providers[0]!;
  const prompt = { systemPrompt: ["You are omp's trusted coding assistant."] };

  commands["agy-byp"]!("status", commandCtx(notices));
  expect(notices.at(-1)).toContain("patch: ok");
  expect(notices.at(-1)).toContain("alias: off");

  commands["agy-byp"]!("on", commandCtx(notices));
  expect(state.enabled).toBe(true);
  expect("aliasPending" in state && state.aliasPending === true).toBe(true);
  commands["agy-byp"]!("status", commandCtx(notices));
  expect(notices.at(-1)).toContain("alias: pending");
  expect(provider.resolveOutbound({ name: "bash" })).toBeUndefined();

  hooks.before_agent_start!(prompt, requestCtx("antigravity-cli"));
  expect("aliasPending" in state && state.aliasPending === false).toBe(true);
  commands["agy-byp"]!("status", commandCtx(notices));
  expect(notices.at(-1)).toContain("alias: active");
  expect(provider.resolveOutbound({ name: "bash" })).toMatchObject({ name: "run_command" });

  commands["agy-byp"]!("off", commandCtx(notices));
  expect("aliasPending" in state && state.aliasPending === true).toBe(true);
  commands["agy-byp"]!("status", commandCtx(notices));
  expect(notices.at(-1)).toContain("alias: pending");
  hooks.before_agent_start!(prompt, requestCtx("antigravity-cli"));
  commands["agy-byp"]!("status", commandCtx(notices));
  expect(notices.at(-1)).toContain("alias: off");
  expect(provider.resolveOutbound({ name: "bash" })).toBeUndefined();
});
