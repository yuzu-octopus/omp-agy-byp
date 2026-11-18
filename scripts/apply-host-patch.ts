import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { checkHostPatch, type HostPatchStatus } from "./check-host-patch";

export const PINNED_HOST_VERSION = "18.22.2";

interface PatchEdit {
  id: string;
  anchor: string[];
  replacement: string[];
}

interface PatchFile {
  id: string;
  hostVersion: string;
  target: string;
  edits: PatchEdit[];
}

export interface ApplyResult {
  action: "checked" | "already-applied" | "applied";
  status?: HostPatchStatus;
  reason?: string;
  files: string[];
}

export class HostPatchError extends Error {}

const DEFAULT_PATCH_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "host-patch",
  "0001-tool-alias.patch",
);

function countOccurrences(text: string, needle: string): number {
  let count = 0;
  let index = text.indexOf(needle);
  while (index !== -1) {
    count += 1;
    index = text.indexOf(needle, index + needle.length);
  }
  return count;
}

function loadPatch(patchPath: string): PatchFile {
  const raw = JSON.parse(readFileSync(patchPath, "utf8"));
  if (raw.hostVersion !== PINNED_HOST_VERSION) {
    throw new HostPatchError(`patch pins ${String(raw.hostVersion)}, expected ${PINNED_HOST_VERSION}`);
  }
  if (typeof raw.target !== "string" || !Array.isArray(raw.edits)) {
    throw new HostPatchError("malformed patch file");
  }
  return raw as PatchFile;
}

function verifyHostVersion(hostRoot: string, hostFile: string): void {
  const candidates = [
    join(dirname(hostFile), "package.json"),
    join(hostRoot, "pi-ai", "package.json"),
    join(hostRoot, "package.json"),
  ];
  const seen = new Set<string>();
  for (const candidate of candidates) {
    if (seen.has(candidate) || !existsSync(candidate)) continue;
    seen.add(candidate);
    let pkg: { version?: unknown };
    try {
      pkg = JSON.parse(readFileSync(candidate, "utf8"));
    } catch {
      continue;
    }
    if (typeof pkg.version !== "string") continue;
    if (pkg.version !== PINNED_HOST_VERSION) {
      throw new HostPatchError(`host version ${pkg.version} is not pinned ${PINNED_HOST_VERSION}`);
    }
    return;
  }
  throw new HostPatchError(`cannot verify host version ${PINNED_HOST_VERSION} under ${hostRoot}`);
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

function resolveRuntimeHostRoot(): string | undefined {
  const require = createRequire(import.meta.url);
  try {
    const aiRoot = packageRoot(require.resolve("@oh-my-pi/pi-ai"), "@oh-my-pi/pi-ai");
    if (aiRoot) return aiRoot;
  } catch {
    // Try the coding-agent package next.
  }
  try {
    const agentRoot = packageRoot(require.resolve("@oh-my-pi/pi-coding-agent"), "@oh-my-pi/pi-coding-agent");
    if (agentRoot) return dirname(agentRoot);
  } catch {
    // Caller must pass --host explicitly.
  }
  return undefined;
}

export function applyHostPatch(
  hostRoot: string,
  options: { patchPath?: string; check?: boolean } = {},
): ApplyResult {
  const patch = loadPatch(options.patchPath ?? DEFAULT_PATCH_PATH);
  const targetPath = join(hostRoot, patch.target);
  if (options.check) {
    if (existsSync(targetPath)) verifyHostVersion(hostRoot, targetPath);
    const { status, reason } = checkHostPatch(hostRoot);
    return { action: "checked", status, reason, files: [] };
  }

  if (!existsSync(targetPath)) throw new HostPatchError(`target not found: ${targetPath}`);
  verifyHostVersion(hostRoot, targetPath);

  const state = checkHostPatch(hostRoot);
  if (state.status === "ok") return { action: "already-applied", status: "ok", files: [] };
  if (state.status === "drifted") {
    throw new HostPatchError(`host patch is drifted: ${state.reason ?? "unknown reason"}`);
  }

  const original = readFileSync(targetPath, "utf8");
  let updated = original;
  for (const edit of patch.edits) {
    const anchor = edit.anchor.join("\n");
    const occurrences = countOccurrences(updated, anchor);
    if (occurrences !== 1) {
      throw new HostPatchError(`edit ${edit.id}: anchor occurs ${occurrences} times (expected 1); no fuzzy patching`);
    }
    updated = updated.replace(anchor, edit.replacement.join("\n"));
  }

  const backupPath = `${targetPath}.orig`;
  if (!existsSync(backupPath)) copyFileSync(targetPath, backupPath);
  writeFileSync(targetPath, updated);

  const after = checkHostPatch(hostRoot);
  if (after.status !== "ok") {
    writeFileSync(targetPath, original);
    throw new HostPatchError(
      `patch verification failed after write: ${after.reason ?? "unknown reason"}; original restored`,
    );
  }
  return { action: "applied", status: "ok", files: [targetPath] };
}

function main(): void {
  const args = process.argv.slice(2);
  const check = args.includes("--check");
  const hostIndex = args.indexOf("--host");
  const explicitHost = hostIndex === -1 ? undefined : args[hostIndex + 1];
  if (hostIndex !== -1 && (!explicitHost || explicitHost.startsWith("--"))) {
    console.error("--host requires a path");
    process.exit(2);
  }
  if (!check && !explicitHost) {
    console.error("Refusing to apply a host patch without an explicit --host <path>.");
    console.error("Usage: bun scripts/apply-host-patch.ts [--check] [--host <path>]");
    process.exit(2);
  }
  const hostRoot = explicitHost ?? resolveRuntimeHostRoot();
  if (!hostRoot) {
    console.error("Cannot resolve an installed omp host; pass --host <path> explicitly.");
    process.exit(1);
  }
  try {
    console.log(JSON.stringify(applyHostPatch(hostRoot, { check })));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

if (import.meta.main) main();
