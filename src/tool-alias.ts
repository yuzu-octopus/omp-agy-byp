import { resolve } from "node:path";

export type ProjectedTool = {
  name: string;
  description?: string;
  inputSchema: Record<string, unknown>;
};

export type ToolAliasProvider = {
  resolveOutbound(tool: {
    name: string;
    description?: string;
    inputSchema?: unknown;
  }): ProjectedTool | undefined;
  resolveInbound(aliasName: string, args: unknown): { toolName: string; args: unknown } | undefined;
  resolveResult(toolName: string, result: unknown): unknown;
};

export type ArgumentMapping =
  | { kind: "field"; source: string; target: string; resolveAbsolute?: boolean }
  | { kind: "default"; source: string; target: string; value: unknown }
  | { kind: "constant"; target: string; value: unknown };

export type AliasRule = {
  toolName: string;
  aliasName: string;
  description: string;
  inputSchema: Record<string, unknown>;
  argumentMap: readonly ArgumentMapping[];
};

// Required arrays are deliberately conservative: hook docs publish key names,
// not the native model-facing JSON schemas, so only keys omp always supplies
// (plus synthesized constant/default values) are asserted as required.
export const ALIAS_RULES: readonly AliasRule[] = [
  {
    toolName: "read",
    aliasName: "view_file",
    description: "View the contents of a file.",
    inputSchema: {
      type: "object",
      properties: {
        AbsolutePath: { type: "string", description: "Absolute path of the file to view." },
        StartLine: { type: "integer", description: "Line to start viewing; index base unverified." },
        EndLine: { type: "integer", description: "Line to stop viewing; index base unverified." },
        IsSkillFile: { type: "boolean", description: "Whether the file is a skill file." },
      },
      required: ["AbsolutePath"],
    },
    argumentMap: [
      { kind: "field", source: "path", target: "AbsolutePath", resolveAbsolute: true },
      { kind: "field", source: "offset", target: "StartLine" },
    ],
  },
  {
    toolName: "write",
    aliasName: "write_to_file",
    description: "Create new files.",
    inputSchema: {
      type: "object",
      properties: {
        TargetFile: { type: "string", description: "Absolute path of the file to write." },
        Overwrite: { type: "boolean", description: "Whether an existing file may be overwritten." },
        CodeContent: { type: "string", description: "Content to write." },
        Description: { type: "string", description: "Human-readable description of the change." },
        IsArtifact: { type: "boolean" },
        ArtifactMetadata: { type: "object" },
      },
      required: ["TargetFile", "CodeContent"],
    },
    argumentMap: [
      { kind: "field", source: "path", target: "TargetFile", resolveAbsolute: true },
      { kind: "field", source: "content", target: "CodeContent" },
      { kind: "field", source: "overwrite", target: "Overwrite" },
      { kind: "field", source: "description", target: "Description" },
    ],
  },
  {
    toolName: "edit",
    aliasName: "replace_file_content",
    description: "Edit a single contiguous block of text in a file.",
    inputSchema: {
      type: "object",
      properties: {
        TargetFile: { type: "string", description: "Absolute path of the file to edit." },
        Instruction: { type: "string" },
        Description: { type: "string" },
        AllowMultiple: { type: "boolean" },
        TargetContent: { type: "string", description: "Text to replace." },
        ReplacementContent: { type: "string", description: "Replacement text." },
        StartLine: { type: "integer" },
        EndLine: { type: "integer" },
        TargetLintErrorIds: { type: "array", items: { type: "string" } },
      },
      required: ["TargetFile", "TargetContent", "ReplacementContent"],
    },
    argumentMap: [
      { kind: "field", source: "path", target: "TargetFile", resolveAbsolute: true },
      { kind: "field", source: "old_string", target: "TargetContent" },
      { kind: "field", source: "new_string", target: "ReplacementContent" },
    ],
  },
  {
    toolName: "grep",
    aliasName: "grep_search",
    description: "Run fast text searches within specific paths.",
    inputSchema: {
      type: "object",
      properties: {
        SearchPath: { type: "string", description: "Path to search within." },
        Query: { type: "string", description: "Regex query to search for." },
        IsRegex: { type: "boolean", const: true, default: true },
        CaseInsensitive: { type: "boolean" },
        Includes: { type: "string" },
        MatchPerLine: { type: "boolean" },
      },
      required: ["SearchPath", "Query", "IsRegex"],
    },
    argumentMap: [
      { kind: "field", source: "pattern", target: "Query" },
      { kind: "field", source: "path", target: "SearchPath" },
      { kind: "constant", target: "IsRegex", value: true },
    ],
  },
  {
    toolName: "glob",
    aliasName: "find_by_name",
    description: "Search for files and directories using glob patterns.",
    inputSchema: {
      type: "object",
      properties: {
        Pattern: { type: "string", description: "Glob pattern to match." },
        SearchDirectory: { type: "string", description: "Absolute directory to search." },
        Type: { type: "string" },
        Excludes: { type: "array", items: { type: "string" } },
        Extensions: { type: "array", items: { type: "string" } },
        FullPath: { type: "boolean" },
        MaxDepth: { type: "integer" },
      },
      required: ["SearchDirectory", "Pattern"],
    },
    argumentMap: [
      { kind: "field", source: "pattern", target: "Pattern" },
      { kind: "field", source: "path", target: "SearchDirectory", resolveAbsolute: true },
    ],
  },
  {
    toolName: "bash",
    aliasName: "run_command",
    description: "Propose a Bash command to run.",
    inputSchema: {
      type: "object",
      properties: {
        CommandLine: { type: "string", description: "Command to run." },
        Cwd: { type: "string", description: "Working directory for the command." },
        WaitMsBeforeAsync: { type: "integer", default: 5000 },
      },
      required: ["CommandLine", "Cwd", "WaitMsBeforeAsync"],
    },
    argumentMap: [
      { kind: "field", source: "command", target: "CommandLine" },
      { kind: "field", source: "cwd", target: "Cwd" },
      { kind: "default", source: "waitMsBeforeAsync", target: "WaitMsBeforeAsync", value: 5000 },
    ],
  },
];

export function validateAliasRules(rules: readonly AliasRule[]): void {
  const aliases = new Set<string>();
  const tools = new Set<string>();
  for (const rule of rules) {
    if (aliases.has(rule.aliasName)) throw new Error(`duplicate alias: ${rule.aliasName}`);
    if (tools.has(rule.toolName)) throw new Error(`duplicate canonical tool: ${rule.toolName}`);
    aliases.add(rule.aliasName);
    tools.add(rule.toolName);
    const mapped = new Set(rule.argumentMap.map((entry) => entry.target));
    const required = Array.isArray(rule.inputSchema.required)
      ? rule.inputSchema.required.filter((key): key is string => typeof key === "string")
      : [];
    for (const key of required) {
      if (!mapped.has(key)) {
        throw new Error(`${rule.aliasName}: missing argument map for required key ${key}`);
      }
    }
  }
}

validateAliasRules(ALIAS_RULES);

const BY_TOOL = new Map(ALIAS_RULES.map((rule) => [rule.toolName, rule]));
const BY_ALIAS = new Map(ALIAS_RULES.map((rule) => [rule.aliasName, rule]));

export type ToolAliasProviderOptions = {
  enabled: () => boolean;
  mode: () => string;
};

export function createToolAliasProvider(options: ToolAliasProviderOptions): ToolAliasProvider {
  const isActive = (): boolean => options.enabled() && options.mode() !== "native";

  return {
    resolveOutbound(tool): ProjectedTool | undefined {
      if (!isActive()) return undefined;
      const rule = BY_TOOL.get(tool.name);
      if (!rule) return undefined;
      return {
        name: rule.aliasName,
        description: rule.description,
        inputSchema: rule.inputSchema,
      };
    },

    resolveInbound(aliasName, args) {
      if (!isActive()) return undefined;
      const rule = BY_ALIAS.get(aliasName);
      if (!rule) return undefined;

      const raw = (
        args !== null && typeof args === "object" && !Array.isArray(args) ? args : {}
      ) as Record<string, unknown>;
      const mapped: Record<string, unknown> = {};
      for (const entry of rule.argumentMap) {
        if (entry.kind === "constant") continue;
        const value = raw[entry.target];
        if (value === undefined) {
          if (entry.kind === "default") mapped[entry.source] = entry.value;
          continue;
        }
        mapped[entry.source] =
          "resolveAbsolute" in entry && entry.resolveAbsolute === true && typeof value === "string"
            ? resolve(value)
            : value;
      }
      return { toolName: rule.toolName, args: mapped };
    },

    resolveResult(_toolName, result): unknown {
      if (!isActive()) return undefined;
      if (typeof result === "string") return { content: [{ type: "text", text: result }] };
      return result;
    },
  };
}
