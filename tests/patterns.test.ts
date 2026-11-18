// tests/patterns.test.ts
import { describe, expect, test } from "bun:test";
import { scrubText } from "../src/patterns";

test("rephrases every pinned omp marker", () => {
  const input = [
    "⁂ Role\nYou are omp's trusted coding assistant.",
    "⁂ Runtime\n# Skills & Rules\nMatching skill → MUST read `skill://<name>` first.\n<skills>\n- <name>: <description>\n</skills>",
    "# Internal URLs\nMost FS/bash tools resolve these; path selectors: `read` docs.\n- omp:// ...\n- local:// ...",
    "# xd:// Tool Devices\nWrite JSON args as `content` to `xd://<tool>` via `write`. Invalid args return schema in error → fix/retry.",
    "# Tool Inventory\n- read: `read`\n- bash: `bash`",
  ].join("\n");
  expect(scrubText(input)).toBe(
    [
      "⁂ Role\nYou are the coding assistant for this Antigravity bridge session. Work inside the user's workspace and use the tools available in this session to complete the request.",
      "⁂ Runtime\n# Capabilities & Rules\nMatching skill → MUST read `skill://<name>` first.\n<skills>\n- <name>: <description>\n</skills>",
      "# Resource references\nThe host resolves these reference schemes; consult `read` docs for path selectors.\n- omp:// ...\n- local:// ...",
      "# Device endpoints\nPass JSON arguments as `content` to `xd://<tool>` through `write`; invalid input returns a schema error - correct and retry.",
      "# Available tools\n- read: `read`\n- bash: `bash`",
    ].join("\n"),
  );
});

test("leaves unknown text unchanged", () => {
  const text = "Use the read tool to inspect files.\n\n## Task";
  expect(scrubText(text)).toBe(text);
});
