// tests/signature-map.test.ts
import { readFileSync } from "node:fs";
import { expect, test } from "bun:test";
import { DEFAULT_CONFIG } from "../src/config";
import { scrubContextMessages, scrubPayload } from "../src/payload";
import { SIGNATURE_RULES, scrubSignatureText } from "../src/signature-map";
import { scrubSystemPrompt } from "../src/system-prompt";

const IDS = ["R1", "R2", "R3", "R4", "R5", "R6", "R7", "R8", "R9"] as const;
type RuleId = (typeof IDS)[number];

// Byte-identical copies of the Before/After fenced `text` blocks in
// docs/research/omp-antigravity-signature-mapping/F-signature-map.md § Safe rewrites.
const R: Record<RuleId, { before: string; after: string }> = {
  R1: {
    before: "⁂ Role\nYou are omp's trusted coding assistant.",
    after:
      "⁂ Role\nYou are the coding assistant for this Antigravity bridge session. Work inside the user's workspace and use the tools available in this session to complete the request.",
  },
  R2: {
    before:
      "⁂ Runtime\n# Skills & Rules\nMatching skill → MUST read `skill://<name>` first.\n<skills>\n- <name>: <description>\n</skills>",
    // R2 relabels the heading only: the MUST-read line stays byte-identical (hard preserve).
    after:
      "⁂ Runtime\n# Capabilities & Rules\nMatching skill → MUST read `skill://<name>` first.\n<skills>\n- <name>: <description>\n</skills>",
  },
  R3: {
    before:
      "# Internal URLs\nMost FS/bash tools resolve these; path selectors: `read` docs.\n- omp:// ...\n- local:// ...",
    after:
      "# Resource references\nThe host resolves these reference schemes; consult `read` docs for path selectors.\n- omp:// ...\n- local:// ...",
  },
  R4: {
    before:
      "# xd:// Tool Devices\nWrite JSON args as `content` to `xd://<tool>` via `write`. Invalid args return schema in error → fix/retry.",
    after:
      "# Device endpoints\nPass JSON arguments as `content` to `xd://<tool>` through `write`; invalid input returns a schema error - correct and retry.",
  },
  R5: {
    before: "# Tool Inventory\n- read: `read`\n- bash: `bash`",
    after: "# Available tools\n- read: `read`\n- bash: `bash`",
  },
  R6: {
    // Illustrative in the research file; both strings are re-copied from its live fenced blocks.
    before:
      '⁂ Tool Policy\n# General\nEvery turn costs seconds: batch all independent reads/searches/checks into one turn. Once the change is verified, stop and report; no extra audits, broad suites, or repo-wide checks unless asked. SHOULD resolve prerequisites, parallelize independent calls. Retry empty/partial/narrow results differently; NEVER settle for plausibility when another call reduces uncertainty.\n\n# Tool I/O\n- Prefer relative paths.\n{{#if intentTracing}}- Most tools take `{{intentField}}`: capitalized 2–6-word present-participle intent (e.g. "Reading model role settings").{{/if}}\n\n# Specialized Tools\n{{#has tools "read"}}- File/directory reads: `{{toolRefs.read}}` (directory lists entries).{{/has}}\n{{#has tools "lsp"}}- Language server available: MUST use `{{toolRefs.lsp}}` for definitions, references, hover; code actions for refactors/imports/fixes. NEVER text-search/edit for code intelligence.{{/has}}\n{{#has tools "find"}}- Unknown behavior/location: descriptive `{{toolRefs.find}}` FIRST; NEVER guess `grep`/`glob` targets.{{/has}}\n\n# Exploration\nNEVER open guessed files.{{#has tools "find"}} Read `{{toolRefs.find}}` hits only.{{/has}}{{#has tools "read"}} Read small files whole; ranges only for large files. NEVER re-read content you already have.{{/has}}',
    after:
      "⁂ Tool Policy\n# General\nBatch independent reads and checks; report once the change is verified. Use `task` subagents only when parallel work is explicitly requested.\n# Tool I/O\nPrefer relative paths. Most tools accept an intent label rendered from `{{intentField}}` (`i` in the installed 18.22.2 session).\n# Specialized tools\nUse `read`/`edit`/`write`/`grep`/`glob`/`find`/`bash`/`lsp`/`ast_grep`/`ast_edit` for their named roles; never shell `grep`/`sed`/`awk` for edits.",
  },
  R7: {
    before:
      "## Identity\n- **Ponytail**: full — lazy senior dev. YAGNI, stdlib first, shortest diff. Non-negotiable default.\n- **Caveman:** default lite. Non-negotiable default; see Caveman Policy section.",
    after:
      "## Working style\n- Prefer the smallest correct change. Keep changes boring and maintainable.\n- Be direct and concise in responses.",
  },
  R8: {
    before:
      "- use-superpowers: At conversation start, check skills before responding, even clarifying questions.",
    after: "",
  },
  R9: {
    before:
      "# Delegation\nDelegation preferred. Once design settles, SHOULD fan substantial work to `task`; multi-file changes, refactors, features, tests, investigations strong candidates.\n## Delegation gates\n- Before spawning, map slices/shared contracts; user-enumerated 2+ self-contained runnable slices exempt.",
    after:
      "# Coordination\nUse `task` subagents only for explicitly requested parallel work or genuinely independent slices; keep other work inline.",
  },
};

for (const id of IDS) {
  test(`${id} rewrites its literal Before block to its literal After block (breaks when the ${id} mapping is dropped or altered)`, () => {
    expect(scrubSignatureText(R[id]!.before)).toBe(R[id]!.after);
  });
}

test("unmapped text passes through unchanged (breaks if a rewrite overmatches or normalises unrelated text)", () => {
  const text = "Use the read tool to inspect files.\n\n## Task";
  expect(scrubSignatureText(text)).toBe(text);
});

test("SIGNATURE_RULES pins exactly nine literal pairs and R8 is a deletion (breaks if a rule is added, renamed, or R8 becomes a rename)", () => {
  expect(SIGNATURE_RULES).toHaveLength(9);
  expect(SIGNATURE_RULES.map((rule) => [rule.from, rule.to])).toEqual(
    IDS.map((id) => [R[id]!.before, R[id]!.after]),
  );
  expect(SIGNATURE_RULES[7]!.to).toBe("");
});

test("test literals match the live research fenced blocks (breaks if the research file drifts away from the shipped mapping)", () => {
  const doc = readFileSync(
    new URL(
      "../docs/research/omp-antigravity-signature-mapping/F-signature-map.md",
      import.meta.url,
    ),
    "utf8",
  );
  for (const id of IDS) {
    const section = doc.split(new RegExp(`^${id} - `, "m"))[1];
    const block = (label: "Before" | "After") =>
      section
        ?.match(new RegExp(`${label}:\\n\`\`\`text\\n([\\s\\S]*?)\`\`\``))?.[1]
        ?.replace(/\n$/, "");
    expect(block("Before"), `${id} Before no longer matches the research file`).toBe(R[id]!.before);
    expect(block("After"), `${id} After no longer matches the research file`).toBe(R[id]!.after);
  }
});

test("R2 keeps the MUST-read skill rule verbatim (breaks if the skill dispatch contract is reworded)", () => {
  expect(R.R2!.after).toContain("Matching skill → MUST read `skill://<name>` first.");
});

test("R3 schemes, R5 tool names and R6 tool ids survive their rewrites byte-for-byte (breaks if a rewrite renames an advertised id or resource scheme)", () => {
  // R3's literal After block only carries the two schemes it quotes; the full scheme
  // set is pinned against scrubbing here, not against a literal that never held it.
  for (const scheme of ["omp://", "local://"]) {
    expect(R.R3!.after, `dropped ${scheme}`).toContain(scheme);
  }
  const schemeLine =
    "omp:// local:// artifact:// agent:// proc:// history:// ssh:// skill:// pr:// mr://";
  expect(scrubSignatureText(schemeLine)).toBe(schemeLine);
  expect(R.R5!.after.split("\n").slice(1)).toEqual(R.R5!.before.split("\n").slice(1));
  for (const id of [
    "read",
    "edit",
    "write",
    "grep",
    "glob",
    "find",
    "bash",
    "lsp",
    "ast_grep",
    "ast_edit",
  ]) {
    expect(R.R6!.after, `dropped ${id}`).toContain(id);
  }
});

test("shipped modules use R1-R9 as the single source of truth (breaks if scrubSignatureText is not wired or OMP_MARKERS returns)", () => {
  const read = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");
  const patterns = read("../src/patterns.ts");
  const systemPrompt = read("../src/system-prompt.ts");
  const payload = read("../src/payload.ts");
  const index = read("../src/index.ts");
  for (const [name, src] of [
    ["system-prompt", systemPrompt],
    ["payload", payload],
  ]) {
    expect(src, `${name} does not call scrubSignatureText`).toContain("scrubSignatureText");
  }
  for (const fn of ["scrubSystemPrompt", "scrubContextMessages", "scrubPayload"]) {
    expect(index, `factory no longer registers ${fn}`).toContain(fn);
  }
  expect(patterns).not.toContain("OMP_MARKERS");
  expect(patterns).not.toContain("scrubText");
});

test("hard preserves survive every rewrite (breaks if ids, ACP keys, meta keys or schemes are rewritten)", () => {
  const input = [
    "⁂ Role\nYou are omp's trusted coding assistant.",
    "⁂ Runtime\n# Skills & Rules\nMatching skill → MUST read `skill://<name>` first.\n<skills>\n- <name>: <description>\n</skills>",
    "# Internal URLs\nMost FS/bash tools resolve these; path selectors: `read` docs.\n- omp:// ...\n- local:// ...",
    "# xd:// Tool Devices\nWrite JSON args as `content` to `xd://<tool>` via `write`. Invalid args return schema in error → fix/retry.",
    "# Tool Inventory\n- read: `read`\n- bash: `bash`",
    "omp:// local:// artifact:// agent:// proc:// history:// ssh:// skill:// pr:// mr://",
    "call-1 agy_1234-abcd",
    '_meta.antigravity.systemPrompt.append _meta["antigravity.google/conversation_id"]',
    "tools: read write bash edit grep glob task wait think ast_grep ast_edit lsp",
    "userAgent: antigravity requestId: agent/a/1/t/1 sessionId: -123",
  ].join("\n");
  const out = scrubSignatureText(input);
  const schemes =
    "omp:// local:// artifact:// agent:// proc:// history:// ssh:// skill:// pr:// mr://".split(
      " ",
    );
  for (const kept of [
    "skill://",
    "xd://<tool>",
    "write",
    "call-1",
    "agy_1234-abcd",
    "_meta.antigravity.systemPrompt.append",
    '_meta["antigravity.google/conversation_id"]',
    "read",
    "bash",
    "task",
    "wait",
    "userAgent",
    "requestId",
    "sessionId",
    ...schemes,
    "Matching skill → MUST read `skill://<name>` first.",
  ])
    expect(out, `dropped ${kept}`).toContain(kept);
  // R6 condensation is the highest-risk rewrite: pin every embedded tool id after rewrite.
  for (const id of [
    "read",
    "edit",
    "write",
    "grep",
    "glob",
    "find",
    "bash",
    "lsp",
    "ast_grep",
    "ast_edit",
  ]) {
    expect(scrubSignatureText(R.R6!.before), `dropped ${id}`).toContain(id);
  }
});

test("generic-mode scrubSystemPrompt applies all nine literal rules (breaks if the runtime scrubs with the old coarse table)", () => {
  const out = scrubSystemPrompt(
    IDS.map((id) => R[id]!.before),
    { ...DEFAULT_CONFIG, mode: "generic" },
  );
  expect(out).toEqual(IDS.map((id) => R[id]!.after));
});

test("generic-mode payload and context scrubbers apply all nine literal rules (breaks if payload/context stay on the coarse table)", () => {
  const payload = {
    request: {
      systemInstruction: { parts: [{ text: R.R1!.before }] },
      contents: [{ role: "user", parts: IDS.map((id) => ({ text: R[id]!.before })) }],
      tools: [{ functionDeclarations: [{ name: "read", description: R.R9!.before }] }],
    },
  };
  const out = scrubPayload(payload, {
    ...DEFAULT_CONFIG,
    mode: "generic",
    scrubToolDescriptions: true,
  });
  expect(out.request.systemInstruction.parts[0]!.text).toBe(R.R1!.after);
  expect(out.request.contents[0]!.parts.map((part) => part.text)).toEqual(
    IDS.map((id) => R[id]!.after),
  );
  expect(out.request.tools[0]!.functionDeclarations[0]!.description).toBe(R.R9!.after);
  // The dispatch id beside the rewritten description stays byte-identical.
  expect(out.request.tools[0]!.functionDeclarations[0]!.name).toBe("read");

  const ctx = scrubContextMessages(
    IDS.map((id, i) => ({ role: "user", content: R[id]!.before, timestamp: i })),
    { ...DEFAULT_CONFIG, mode: "generic" },
  );
  expect(ctx.map((message) => message.content)).toEqual(IDS.map((id) => R[id]!.after));
});
