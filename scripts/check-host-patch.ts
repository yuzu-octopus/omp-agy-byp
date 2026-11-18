import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export type HostPatchStatus = "ok" | "missing" | "drifted";

export interface HostPatchResult {
  status: HostPatchStatus;
  reason?: string;
}

const HOST_CANDIDATES = [
  join("pi-ai", "src", "providers", "antigravity-cli", "host.ts"),
  join("src", "providers", "antigravity-cli", "host.ts"),
];

export const HOST_PATCH_ANCHORS = [
  "__ompAgBypSetToolAliasProvider",
  "__ompAgBypProjectTool",
  "__ompAgBypReverseToolCall",
  "__ompAgBypProjectResult",
] as const;

const DECLARED_ANCHORS = [
  "__ompAgBypSetToolAliasProvider",
  "__ompAgBypReverseToolCall",
  "__ompAgBypProjectResult",
] as const;

export function resolveHostFile(hostRoot: string): string | undefined {
  for (const relative of HOST_CANDIDATES) {
    const candidate = join(hostRoot, relative);
    if (existsSync(candidate)) return candidate;
  }
  return undefined;
}

function countOccurrences(text: string, needle: string): number {
  let count = 0;
  let index = text.indexOf(needle);
  while (index !== -1) {
    count += 1;
    index = text.indexOf(needle, index + needle.length);
  }
  return count;
}

function braceDepthAt(text: string, index: number): number {
  let depth = 0;
  for (let i = 0; i < index; i += 1) {
    if (text[i] === "{") depth += 1;
    else if (text[i] === "}") depth -= 1;
  }
  return depth;
}

function functionBody(text: string, signature: string): { start: number; end: number } | undefined {
  const signatureIndex = text.indexOf(signature);
  if (signatureIndex === -1) return undefined;
  const open = text.indexOf("{", signatureIndex);
  if (open === -1) return undefined;
  let depth = 0;
  for (let i = open; i < text.length; i += 1) {
    if (text[i] === "{") depth += 1;
    else if (text[i] === "}") {
      depth -= 1;
      if (depth === 0) return { start: open, end: i + 1 };
    }
  }
  return undefined;
}

export function checkHostPatch(hostRoot: string): HostPatchResult {
  const hostFile = resolveHostFile(hostRoot);
  if (!hostFile) return { status: "missing", reason: `host source not found under ${hostRoot}` };

  let text: string;
  try {
    text = readFileSync(hostFile, "utf8");
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return { status: "drifted", reason: `cannot read ${hostFile}: ${detail}` };
  }

  for (const anchor of HOST_PATCH_ANCHORS) {
    if (!text.includes(anchor)) return { status: "missing", reason: `anchor ${anchor} absent from ${hostFile}` };
  }
  for (const anchor of HOST_PATCH_ANCHORS) {
    const count = countOccurrences(text, anchor);
    if (count !== 1) return { status: "drifted", reason: `anchor ${anchor} occurs ${count} times` };
  }

  const toMcpToolBody = functionBody(text, "function toMcpTool(");
  if (!toMcpToolBody) return { status: "drifted", reason: "toMcpTool body not found" };
  const projectedAt = text.indexOf("__ompAgBypProjectTool");
  if (projectedAt < toMcpToolBody.start || projectedAt >= toMcpToolBody.end) {
    return { status: "drifted", reason: "__ompAgBypProjectTool is outside toMcpTool" };
  }

  for (const anchor of DECLARED_ANCHORS) {
    const declarationAt = text.indexOf(`function ${anchor}`);
    if (declarationAt === -1) {
      return { status: "drifted", reason: `${anchor} is not a function declaration` };
    }
    if (braceDepthAt(text, declarationAt) !== 0) {
      return { status: "drifted", reason: `${anchor} is nested in another function body` };
    }
  }

  return { status: "ok" };
}
