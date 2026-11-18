// tests/system-prompt.test.ts
import { describe, expect, test } from "bun:test";
import { DEFAULT_CONFIG } from "../src/config";
import { scrubSystemPrompt } from "../src/system-prompt";

const OMP_PROMPT = [
  "⁂ Role\nYou are omp's trusted coding assistant.",
  "⁂ Runtime\n# Skills & Rules\nMatching skill → MUST read `skill://<name>` first.\n<skills>\n- <name>: <description>\n</skills>",
  "# Internal URLs\nMost FS/bash tools resolve these; path selectors: `read` docs.\n- omp:// ...\n- local:// ...",
  "Never write to stdout from extension code.",
];

test("generic mode rephrases markers but keeps section count and guidance", () => {
  const out = scrubSystemPrompt(OMP_PROMPT, { ...DEFAULT_CONFIG, mode: "generic" });
  expect(out).toHaveLength(OMP_PROMPT.length);
  expect(out[0]).toBe("⁂ Role\nYou are the coding assistant for this Antigravity bridge session. Work inside the user's workspace and use the tools available in this session to complete the request.");
  expect(out[1]).toBe("⁂ Runtime\n# Capabilities & Rules\nMatching skill → MUST read `skill://<name>` first.\n<skills>\n- <name>: <description>\n</skills>");
  expect(out[2]).toBe("# Resource references\nThe host resolves these reference schemes; consult `read` docs for path selectors.\n- omp:// ...\n- local:// ...");
  expect(out.some(line => line.includes("skill://"))).toBe(true);
});

test("native mode passes the prompt through unchanged", () => {
  const out = scrubSystemPrompt(OMP_PROMPT, { ...DEFAULT_CONFIG, mode: "native" });
  expect(out).toEqual(OMP_PROMPT);
});
