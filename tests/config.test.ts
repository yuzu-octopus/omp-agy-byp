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
    expect(loadConfig({ OMP_AGY_BYP_SCRUB_TOOL_DESCRIPTIONS: "1" }).scrubToolDescriptions).toBe(
      true,
    );
    expect(loadConfig({ OMP_AGY_BYP_SCRUB_TOOL_DESCRIPTIONS: "0" }).scrubToolDescriptions).toBe(
      false,
    );
  });

  test("fallback unpause is on by default and env can disable it", () => {
    expect(loadConfig({}).unpauseFallback).toBe(true);
    expect(loadConfig({ OMP_AGY_BYP_UNPAUSE_FALLBACK: "0" }).unpauseFallback).toBe(false);
  });
});
