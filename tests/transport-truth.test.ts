// tests/transport-truth.test.ts
import { readFileSync } from "node:fs";
import { describe, expect, test } from "bun:test";
import { DEFAULT_CONFIG, loadConfig } from "../src/config";
import { scrubPayload } from "../src/payload";

test("scrubbing never emits or mutates header/transport fields", () => {
  const before = {
    requestId: "agent/a/1/t/1",
    userAgent: "antigravity",
    project: "proj",
    request: {
      sessionId: "-123",
      labels: { cascade_id: "a", request_id: "t-0" },
      // R1 matches the rendered role line; the "⁂ Role" prefix is inert here.
      systemInstruction: {
        parts: [{ text: "⁂ Role\nYou are omp's trusted coding assistant." }],
      },
    },
  };
  const after = scrubPayload(structuredClone(before), { ...DEFAULT_CONFIG, mode: "generic" });
  expect(after.request.systemInstruction.parts[0].text).not.toContain("omp's");
  expect(after.requestId).toBe(before.requestId);
  expect(after.userAgent).toBe(before.userAgent);
  expect(after.project).toBe(before.project);
  expect(after.request.sessionId).toBe(before.request.sessionId);
  expect(after.request.labels).toEqual(before.request.labels);
  expect(Object.keys(after).sort()).toEqual(Object.keys(before).sort());
});

test("no rotation or TLS env knob exists in the shipped config or factory", () => {
  const sources = ["../src/config.ts", "../src/index.ts"]
    .map((p) => readFileSync(new URL(p, import.meta.url), "utf8"))
    .join("\n");
  const envNames = [...new Set(sources.match(/OMP_AGY_BYP_[A-Z0-9_]+/g) ?? [])].sort();
  expect(envNames).toEqual([
    "OMP_AGY_BYP_MODE",
    "OMP_AGY_BYP_SCRUB_TOOL_DESCRIPTIONS",
    "OMP_AGY_BYP_UNPAUSE_FALLBACK",
  ]);
  const env = {
    OMP_AGY_BYP_MODE: "generic",
    OMP_AGY_BYP_SCRUB_TOOL_DESCRIPTIONS: "1",
    OMP_AGY_BYP_UNPAUSE_FALLBACK: "0",
  };
  expect(Object.keys(loadConfig(env)).sort()).toEqual([
    "mode",
    "scrubToolDescriptions",
    "unpauseFallback",
  ]);
});

test("README records the header/TLS truth and single-key limits", () => {
  const readme = readFileSync(new URL("../README.md", import.meta.url), "utf8");
  for (const s of [
    "no HTTP headers",
    "TLS",
    "owns",
    "one credential per account",
    "no key pool",
    "JA3/JA4",
    "rotation",
    "best-effort",
  ])
    expect(readme, `README missing: ${s}`).toContain(s);
});
