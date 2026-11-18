import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

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
const HOOK_SCOPES = [
  { anchor: "__ompAgBypSetToolAliasProvider", owner: undefined },
  { anchor: "__ompAgBypReverseToolCall", owner: "async #onToolCall(" },
  { anchor: "__ompAgBypProjectResult", owner: "function toMcpOutput(" },
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
    if (!text.includes(anchor))
      return { status: "missing", reason: `anchor ${anchor} absent from ${hostFile}` };
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

  for (const { anchor, owner } of HOOK_SCOPES) {
    const anchorAt = text.indexOf(anchor);
    if (braceDepthAt(text, anchorAt) === 0) continue;
    const ownerBody = owner ? functionBody(text, owner) : undefined;
    if (!ownerBody || anchorAt < ownerBody.start || anchorAt >= ownerBody.end) {
      return { status: "drifted", reason: `${anchor} is outside its expected host seam` };
    }
  }

  return { status: "ok" };
}

function packageRoot(entry: string, packageName: string): string | undefined {
  let dir = dirname(entry);
  while (dir !== dirname(dir)) {
    const manifest = join(dir, "package.json");
    if (existsSync(manifest)) {
      try {
        const pkg = JSON.parse(readFileSync(manifest, "utf8"));
        if (pkg.name === packageName) return dir;
      } catch {
        // Keep walking: a broken manifest is not this package.
      }
    }
    dir = dirname(dir);
  }
  return undefined;
}

export function resolveRuntimeHostRoot(): string | undefined {
  const require = createRequire(import.meta.url);
  try {
    const aiRoot = packageRoot(require.resolve("@oh-my-pi/pi-ai"), "@oh-my-pi/pi-ai");
    if (aiRoot) return aiRoot;
  } catch {
    // Try the coding-agent package next.
  }
  try {
    const agentRoot = packageRoot(
      require.resolve("@oh-my-pi/pi-coding-agent"),
      "@oh-my-pi/pi-coding-agent",
    );
    if (agentRoot) return dirname(agentRoot);
  } catch {
    // No runtime host is resolvable from this plugin location.
  }
  return undefined;
}

export function checkRuntimeHostPatch(): HostPatchResult {
  try {
    const root = resolveRuntimeHostRoot();
    if (!root) return { status: "missing", reason: "runtime host root not found" };
    return checkHostPatch(root);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return { status: "missing", reason: `cannot inspect runtime host: ${detail}` };
  }
}
