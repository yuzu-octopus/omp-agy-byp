import { expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { checkHostPatch } from "../scripts/check-host-patch";

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
