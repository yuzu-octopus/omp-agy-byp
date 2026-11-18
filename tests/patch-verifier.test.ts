import { expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { checkHostPatch } from "../scripts/check-host-patch";
import { applyHostPatch } from "../scripts/apply-host-patch";

function hostFixture(patched: boolean): string {
  const root = mkdtempSync(join(tmpdir(), "ag-byp-host-"));
  const dir = join(root, "pi-ai/src/providers/antigravity-cli");
  mkdirSync(dir, { recursive: true });
  const base = [
    "function toMcpTool(tool: Tool): McpToolDefinition {",
    "  return { name: tool.name, description: tool.description, inputSchema: schema };",
    "}",
  ].join("\n");
  const text = patched
    ? [
        base.replace("return {", "return globalThis.__ompAgBypProjectTool?.(tool) ?? {"),
        "function __ompAgBypSetToolAliasProvider(): void {}",
        "function __ompAgBypReverseToolCall(): void {}",
        "function __ompAgBypProjectResult(): void {}",
      ].join("\n")
    : base;
  writeFileSync(join(dir, "host.ts"), text);
  return root;
}

test("verifier accepts a patched host fixture", () => {
  expect(checkHostPatch(hostFixture(true)).status).toBe("ok");
});

test("verifier reports missing patch without mutating the host", () => {
  expect(checkHostPatch(hostFixture(false)).status).toBe("missing");
});

test("apply verifies host version before the already-applied short circuit", () => {
  const root = hostFixture(true);
  writeFileSync(
    join(root, "pi-ai", "package.json"),
    JSON.stringify({ name: "@oh-my-pi/pi-ai", version: "18.22.1" }),
  );
  expect(() => applyHostPatch(root)).toThrow(/18\.22\.1 is not pinned 18\.22\.2/);
});

test("check verifies host version on an already-patched host", () => {
  const root = hostFixture(true);
  writeFileSync(
    join(root, "pi-ai", "package.json"),
    JSON.stringify({ name: "@oh-my-pi/pi-ai", version: "18.22.1" }),
  );
  expect(() => applyHostPatch(root, { check: true })).toThrow(/18\.22\.1 is not pinned 18\.22\.2/);
});

test("apply stays idempotent on a correctly pinned patched host", () => {
  const root = hostFixture(true);
  writeFileSync(
    join(root, "pi-ai", "package.json"),
    JSON.stringify({ name: "@oh-my-pi/pi-ai", version: "18.22.2" }),
  );
  expect(applyHostPatch(root).action).toBe("already-applied");
});
