// tests/signature-map.test.ts
import { buildSystemPrompt } from "@oh-my-pi/pi-coding-agent/system-prompt";
import { expect, test } from "bun:test";
import { DEFAULT_CONFIG } from "../src/config";
import { scrubContextMessages, scrubPayload } from "../src/payload";
import { SIGNATURE_RULES, scrubSignatureText } from "../src/signature-map";
import { scrubSystemPrompt } from "../src/system-prompt";

// Rendered with the installed, pinned 18.22.2 host. Explicit fixtures keep the
// sections that carry R1-R9 stable across local skill/config discovery.
async function renderedHostPrompt(): Promise<string> {
  const built = await buildSystemPrompt({
    cwd: process.cwd(),
    noContextFiles: true,
    excludeAgentsMd: true,
    skills: [
      {
        name: "using-superpowers",
        description:
          "At conversation start, check skills before responding, even clarifying questions.",
        filePath: "/tmp/using-superpowers.md",
        baseDir: "/tmp",
        source: "test",
      },
      {
        name: "demo",
        description: "A skill used only to render the skills block.",
        filePath: "/tmp/demo.md",
        baseDir: "/tmp",
        source: "test",
      },
    ],
    toolNames: ["read", "write", "task", "wait"],
    xdevTools: [{ name: "read", summary: "read docs" }],
    intentField: "i",
    delegationBias: "balanced",
    eagerTasks: true,
    taskBatch: true,
    scoutAvailable: false,
    taskIrcEnabled: false,
  });
  return built.systemPrompt.join("\n");
}

const SIGNATURES = [
  "You are omp's trusted coding assistant.",
  "# Skills & Rules",
  "Most FS/bash tools resolve these; path selectors:",
  "Write JSON args as `content` to xd://<tool> via `write`.",
  "# Tool Inventory",
  "Every turn costs seconds:",
  "Default modes: Ponytail full, Caveman lite, Unslop always.",
  "using-superpowers",
  "Delegation preferred. Once design settles, SHOULD fan substantial work to `task`",
];

const DISPATCH_CONTRACTS = [
  "Matching skill → MUST read skill://<name> first.",
  "xd://<tool>",
  "xd://read/urls",
  "`write`",
  "`task`",
  "`wait`",
  "`read`",
  "skill://",
  "omp://",
  "local://",
  "artifact://",
  "agent://",
  "proc://",
  "history://",
  "ssh://",
];

test("every shipped R1-R9 rule matches the rendered 18.22.2 host prompt", async () => {
  const prompt = await renderedHostPrompt();
  expect(SIGNATURE_RULES).toHaveLength(9);
  for (const [index, rule] of SIGNATURE_RULES.entries()) {
    expect(rule.from.length, `R${index + 1} is empty`).toBeGreaterThan(0);
    expect(prompt, `R${index + 1} cannot match the rendered host prompt`).toContain(rule.from);
  }
});

test("scrubbing removes omp signatures from rendered host text and keeps dispatch contracts", async () => {
  const scrubbed = scrubSignatureText(await renderedHostPrompt());
  for (const signature of SIGNATURES)
    expect(scrubbed, `signature survived: ${signature}`).not.toContain(signature);
  for (const contract of DISPATCH_CONTRACTS)
    expect(scrubbed, `dispatch contract dropped: ${contract}`).toContain(contract);
});

test("unmapped text passes through unchanged (breaks if a rewrite overmatches)", () => {
  const text = "Use the read tool to inspect files.\n\n## Task";
  expect(scrubSignatureText(text)).toBe(text);
});

test("hard preserves survive every rewrite", async () => {
  const input = [
    await renderedHostPrompt(),
    "call-1 agy_1234-abcd",
    '_meta.antigravity.systemPrompt.append _meta["antigravity.google/conversation_id"]',
    "userAgent: antigravity requestId: agent/a/1/t/1 sessionId: -123",
    "omp:// local:// artifact:// agent:// proc:// history:// ssh:// skill:// pr:// mr://",
  ].join("\n");
  const out = scrubSignatureText(input);
  for (const kept of [
    ...DISPATCH_CONTRACTS,
    "call-1",
    "agy_1234-abcd",
    "_meta.antigravity.systemPrompt.append",
    '_meta["antigravity.google/conversation_id"]',
    "userAgent:",
    "requestId:",
    "sessionId:",
    "pr://",
    "mr://",
  ])
    expect(out, `dropped ${kept}`).toContain(kept);
});

test("runtime scrubbers apply the shipped rules to rendered prompt, payload and context", async () => {
  const prompt = await renderedHostPrompt();
  const expected = scrubSignatureText(prompt);

  expect(scrubSystemPrompt([prompt], { ...DEFAULT_CONFIG, mode: "generic" })).toEqual([expected]);

  const payload = {
    request: {
      systemInstruction: { parts: [{ text: prompt }] },
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      tools: [{ functionDeclarations: [{ name: "read", description: prompt }] }],
    },
  };
  const scrubbed = scrubPayload(payload, {
    ...DEFAULT_CONFIG,
    mode: "generic",
    scrubToolDescriptions: true,
  });
  expect(scrubbed.request.systemInstruction.parts[0].text).toBe(expected);
  expect(scrubbed.request.contents[0].parts[0].text).toBe(expected);
  expect(scrubbed.request.tools[0].functionDeclarations[0].description).toBe(expected);
  expect(scrubbed.request.tools[0].functionDeclarations[0].name).toBe("read");

  const ctx = scrubContextMessages([{ role: "user", content: prompt, timestamp: 1 }], {
    ...DEFAULT_CONFIG,
    mode: "generic",
  });
  expect(ctx[0].content).toBe(expected);
});
