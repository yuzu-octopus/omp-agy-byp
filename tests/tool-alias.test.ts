import { resolve as resolveAbsolute } from "node:path";
import { expect, test } from "bun:test";
import {
  ALIAS_RULES,
  createToolAliasProvider,
  validateAliasRules,
  type AliasRule,
} from "../src/tool-alias";
import {
  normalizeSchemaForMCP,
  toolWireSchema,
  validateJsonSchemaValue,
} from "@oh-my-pi/pi-ai/utils/schema";

function active() {
  return createToolAliasProvider({ enabled: () => true, mode: () => "generic" });
}

// Plain-JSON mirrors of the installed omp 18.22.2 builtin tool parameters.
// additionalProperties:false matches the closed schemas the patched host derives
// from ArkType via toolWireSchema/normalizeSchemaForMCP.
const INSTALLED_TOOL_PARAMETERS: Record<string, Record<string, unknown>> = {
  read: {
    type: "object",
    properties: { path: { type: "string" }, offset: { type: "number" }, limit: { type: "number" } },
    required: ["path"],
    additionalProperties: false,
  },
  write: {
    type: "object",
    properties: { path: { type: "string" }, content: { type: "string" } },
    required: ["path", "content"],
    additionalProperties: false,
  },
  edit: {
    type: "object",
    properties: {
      path: { type: "string" },
      old_string: { type: "string" },
      new_string: { type: "string" },
    },
    required: ["path", "old_string", "new_string"],
    additionalProperties: false,
  },
  grep: {
    type: "object",
    properties: { pattern: { type: "string" }, path: { type: "string" } },
    required: ["pattern"],
    additionalProperties: false,
  },
  glob: {
    type: "object",
    properties: {
      path: { type: "string" },
      hidden: { type: "boolean" },
      gitignore: { type: "boolean" },
      limit: { type: "number" },
    },
    additionalProperties: false,
  },
  bash: {
    type: "object",
    properties: {
      command: { type: "string" },
      timeout: { type: "number" },
      cwd: { type: "string" },
      pty: { type: "boolean" },
      async: { type: "boolean" },
    },
    required: ["command"],
    additionalProperties: false,
  },
};

function installedSchema(toolName: string): Record<string, unknown> {
  const parameters = INSTALLED_TOOL_PARAMETERS[toolName];
  if (!parameters) throw new Error(`no installed schema for ${toolName}`);
  const tool = { name: toolName, description: "", parameters } as unknown as Parameters<
    typeof toolWireSchema
  >[0];
  return normalizeSchemaForMCP(toolWireSchema(tool)) as Record<string, unknown>;
}

const EXPECTED_ALIASES = [
  { toolName: "read", aliasName: "view_file", description: "View the contents of a file." },
  { toolName: "write", aliasName: "write_to_file", description: "Create new files." },
  {
    toolName: "edit",
    aliasName: "replace_file_content",
    description: "Edit a single contiguous block of text in a file.",
  },
  {
    toolName: "grep",
    aliasName: "grep_search",
    description: "Run fast text searches within specific paths.",
  },
  {
    toolName: "glob",
    aliasName: "find_by_name",
    description: "Search for files and directories using glob patterns.",
  },
  {
    toolName: "bash",
    aliasName: "run_command",
    description: "Propose a Bash command to run.",
  },
] as const;

function propsOf(rule: AliasRule): Record<string, Record<string, unknown>> {
  return (rule.inputSchema.properties ?? {}) as Record<string, Record<string, unknown>>;
}

function requiredOf(rule: AliasRule): readonly string[] {
  return (rule.inputSchema.required ?? []) as readonly string[];
}

function ruleFor(aliasName: string): AliasRule {
  const rule = ALIAS_RULES.find((candidate) => candidate.aliasName === aliasName);
  if (!rule) throw new Error(`missing rule ${aliasName}`);
  return rule;
}

function baseRule(): AliasRule {
  return {
    toolName: "read",
    aliasName: "view_file",
    description: "View the contents of a file.",
    inputSchema: {
      type: "object",
      properties: { AbsolutePath: { type: "string" } },
      required: ["AbsolutePath"],
    },
    argumentMap: [{ kind: "field", source: "path", target: "AbsolutePath", resolveAbsolute: true }],
  };
}

test("alias table holds exactly six unique rules with verbatim hook descriptions", () => {
  expect(ALIAS_RULES).toHaveLength(6);
  expect(ALIAS_RULES.map((rule) => [rule.toolName, rule.aliasName])).toEqual(
    EXPECTED_ALIASES.map((entry) => [entry.toolName, entry.aliasName]),
  );
  expect(new Set(ALIAS_RULES.map((rule) => rule.aliasName)).size).toBe(6);
  expect(ALIAS_RULES.map((rule) => rule.description)).toEqual(
    EXPECTED_ALIASES.map((entry) => entry.description),
  );
});

test("outbound projection returns alias name, verbatim description and object schema", () => {
  const provider = active();
  for (const entry of EXPECTED_ALIASES) {
    const projected = provider.resolveOutbound({
      name: entry.toolName,
      description: "omp-owned description that must not leak",
      inputSchema: { type: "string" },
    });
    expect(projected).toBeDefined();
    expect(projected?.name).toBe(entry.aliasName);
    expect(projected?.description).toBe(entry.description);
    expect(projected?.inputSchema.type).toBe("object");
    expect(typeof projected?.inputSchema.properties).toBe("object");
    expect(Array.isArray(projected?.inputSchema.required)).toBe(true);
  }
});

test("unknown canonical tool returns undefined", () => {
  expect(active().resolveOutbound({ name: "not_an_omp_tool" })).toBeUndefined();
});

test("schemas expose documented hook keys and conservative required arrays", () => {
  expect(Object.keys(propsOf(ruleFor("view_file")))).toEqual(
    expect.arrayContaining(["AbsolutePath", "StartLine", "EndLine", "IsSkillFile"]),
  );
  expect(requiredOf(ruleFor("view_file"))).toEqual(["AbsolutePath"]);

  expect(Object.keys(propsOf(ruleFor("write_to_file")))).toEqual(
    expect.arrayContaining([
      "TargetFile",
      "Overwrite",
      "CodeContent",
      "Description",
      "IsArtifact",
      "ArtifactMetadata",
    ]),
  );
  expect(requiredOf(ruleFor("write_to_file"))).toEqual(["TargetFile", "CodeContent"]);

  expect(Object.keys(propsOf(ruleFor("replace_file_content")))).toEqual(
    expect.arrayContaining([
      "TargetFile",
      "Instruction",
      "Description",
      "AllowMultiple",
      "TargetContent",
      "ReplacementContent",
      "StartLine",
      "EndLine",
      "TargetLintErrorIds",
    ]),
  );
  expect(requiredOf(ruleFor("replace_file_content"))).toEqual([
    "TargetFile",
    "TargetContent",
    "ReplacementContent",
  ]);

  expect(Object.keys(propsOf(ruleFor("grep_search")))).toEqual(
    expect.arrayContaining([
      "SearchPath",
      "Query",
      "IsRegex",
      "CaseInsensitive",
      "Includes",
      "MatchPerLine",
    ]),
  );
  expect(propsOf(ruleFor("grep_search")).IsRegex?.const).toBe(true);
  expect(requiredOf(ruleFor("grep_search"))).toEqual(["SearchPath", "Query", "IsRegex"]);

  expect(Object.keys(propsOf(ruleFor("find_by_name")))).toEqual(
    expect.arrayContaining([
      "SearchDirectory",
      "Pattern",
      "Type",
      "Excludes",
      "Extensions",
      "FullPath",
      "MaxDepth",
    ]),
  );
  expect(requiredOf(ruleFor("find_by_name"))).toEqual(["Pattern"]);

  expect(Object.keys(propsOf(ruleFor("run_command")))).toEqual(
    expect.arrayContaining(["CommandLine", "Cwd", "WaitMsBeforeAsync"]),
  );
  expect(propsOf(ruleFor("run_command")).WaitMsBeforeAsync?.default).toBe(5000);
  expect(requiredOf(ruleFor("run_command"))).toEqual(["CommandLine", "Cwd"]);
});

test("inbound view_file maps AbsolutePath only and drops native-only StartLine", () => {
  const rel = "relative/dir/file.txt";
  expect(
    active().resolveInbound("view_file", {
      AbsolutePath: rel,
      StartLine: 4,
      EndLine: 9,
      Extra: "drop me",
    }),
  ).toEqual({ toolName: "read", args: { path: resolveAbsolute(rel) } });
});

test("inbound write_to_file maps path/content and drops Overwrite/Description", () => {
  const rel = "relative/out.txt";
  expect(
    active().resolveInbound("write_to_file", {
      TargetFile: rel,
      CodeContent: "hello",
      Overwrite: true,
      Description: "d",
      IsArtifact: true,
    }),
  ).toEqual({
    toolName: "write",
    args: { path: resolveAbsolute(rel), content: "hello" },
  });
});

test("inbound replace_file_content maps edit args and resolves TargetFile", () => {
  const rel = "relative/f.ts";
  expect(
    active().resolveInbound("replace_file_content", {
      TargetFile: rel,
      TargetContent: "a",
      ReplacementContent: "b",
      Instruction: "i",
      AllowMultiple: false,
    }),
  ).toEqual({
    toolName: "edit",
    args: { path: resolveAbsolute(rel), old_string: "a", new_string: "b" },
  });
});

test("inbound grep_search maps Query/SearchPath without path resolution and drops constants", () => {
  const rel = "relative/dir";
  expect(
    active().resolveInbound("grep_search", {
      Query: "foo",
      SearchPath: rel,
      IsRegex: true,
      CaseInsensitive: true,
    }),
  ).toEqual({ toolName: "grep", args: { pattern: "foo", path: rel } });
});

test("inbound find_by_name folds Pattern into the glob path selector", () => {
  expect(
    active().resolveInbound("find_by_name", {
      Pattern: "*.ts",
      SearchDirectory: "relative/dir",
      Type: "file",
    }),
  ).toEqual({ toolName: "glob", args: { path: "*.ts" } });
});

test("inbound run_command maps command/cwd and drops WaitMsBeforeAsync", () => {
  const provider = active();
  expect(
    provider.resolveInbound("run_command", {
      CommandLine: "ls",
      Cwd: "/tmp",
      WaitMsBeforeAsync: 1200,
    }),
  ).toEqual({ toolName: "bash", args: { command: "ls", cwd: "/tmp" } });
  expect(provider.resolveInbound("run_command", { CommandLine: "ls", Cwd: "/tmp" })).toEqual({
    toolName: "bash",
    args: { command: "ls", cwd: "/tmp" },
  });
});

test("inbound canonical args pass installed omp 18.22.2 schema validation", () => {
  const provider = active();
  const aliasArgs: Record<string, Record<string, unknown>> = {
    view_file: { AbsolutePath: "/tmp/f.txt", StartLine: 4 },
    write_to_file: {
      TargetFile: "/tmp/f.txt",
      CodeContent: "x",
      Overwrite: true,
      Description: "d",
    },
    replace_file_content: {
      TargetFile: "/tmp/f.ts",
      TargetContent: "a",
      ReplacementContent: "b",
    },
    grep_search: { Query: "foo", SearchPath: "relative/dir" },
    find_by_name: { Pattern: "*.ts", SearchDirectory: "relative/dir" },
    run_command: { CommandLine: "ls", Cwd: "/tmp", WaitMsBeforeAsync: 1200 },
  };
  for (const rule of ALIAS_RULES) {
    const mapped = provider.resolveInbound(rule.aliasName, aliasArgs[rule.aliasName]);
    if (!mapped) throw new Error(`${rule.aliasName} did not map`);
    expect(mapped.toolName).toBe(rule.toolName);
    const schema = installedSchema(rule.toolName);
    const validation = validateJsonSchemaValue(schema, mapped.args);
    expect(
      validation.success,
      `${rule.aliasName} -> ${rule.toolName}: ${JSON.stringify(validation.issues)}`,
    ).toBe(true);
    const declared = Object.keys((schema.properties ?? {}) as Record<string, unknown>);
    for (const key of Object.keys(mapped.args as Record<string, unknown>)) {
      expect(declared, `${rule.aliasName} emitted undeclared canonical key ${key}`).toContain(key);
    }
  }
});

test("old alias-shaped canonical keys are rejected by installed schemas", () => {
  expect(
    validateJsonSchemaValue(installedSchema("write"), {
      path: "/x",
      content: "y",
      overwrite: true,
    }).success,
  ).toBe(false);
  expect(
    validateJsonSchemaValue(installedSchema("glob"), { path: "/tmp", pattern: "*.ts" }).success,
  ).toBe(false);
  expect(
    validateJsonSchemaValue(installedSchema("bash"), {
      command: "ls",
      cwd: "/tmp",
      waitMsBeforeAsync: 1200,
    }).success,
  ).toBe(false);
});

test("inbound rejects unknown aliases and non-object args without throwing", () => {
  const provider = active();
  expect(provider.resolveInbound("not_an_alias", {})).toBeUndefined();
  expect(provider.resolveInbound("view_file", "not-an-object")).toEqual({
    toolName: "read",
    args: {},
  });
});

test("every required schema key has a declared argument mapping (round trip)", () => {
  const provider = active();
  for (const rule of ALIAS_RULES) {
    const aliasArgs: Record<string, unknown> = {};
    const expectedCanonical: Record<string, unknown> = {};
    for (const mapping of rule.argumentMap) {
      if (mapping.kind === "constant") {
        aliasArgs[mapping.target] = mapping.value;
        continue;
      }
      aliasArgs[mapping.target] = "SENTINEL";
      expectedCanonical[mapping.source] =
        "resolveAbsolute" in mapping && mapping.resolveAbsolute === true
          ? resolveAbsolute("SENTINEL")
          : "SENTINEL";
    }
    for (const key of requiredOf(rule)) {
      expect(aliasArgs[key], `${rule.aliasName} lacks mapping for required ${key}`).toBeDefined();
    }
    expect(provider.resolveInbound(rule.aliasName, aliasArgs)).toEqual({
      toolName: rule.toolName,
      args: expectedCanonical,
    });
  }
});

test("resolveResult wraps plain strings and preserves other results by identity", () => {
  const provider = active();
  expect(provider.resolveResult("view_file", "hello")).toEqual({
    content: [{ type: "text", text: "hello" }],
  });
  const output = { content: [{ type: "text", text: "x" }], isError: false };
  expect(provider.resolveResult("view_file", output)).toBe(output);
  expect(provider.resolveResult("run_command", undefined)).toBeUndefined();
});

test("duplicate alias detection fails validation", () => {
  expect(() => validateAliasRules([baseRule(), baseRule()])).toThrow(/duplicate/i);
});

test("missing required argument mapping fails validation", () => {
  const broken: AliasRule = {
    ...baseRule(),
    inputSchema: {
      type: "object",
      properties: { AbsolutePath: { type: "string" } },
      required: ["AbsolutePath", "NotMapped"],
    },
  };
  expect(() => validateAliasRules([broken])).toThrow(/NotMapped/);
  expect(() => validateAliasRules(ALIAS_RULES)).not.toThrow();
});

test("disabled toggle returns undefined from every resolver", () => {
  const provider = createToolAliasProvider({ enabled: () => false, mode: () => "generic" });
  expect(provider.resolveOutbound({ name: "read" })).toBeUndefined();
  expect(provider.resolveInbound("view_file", { AbsolutePath: "/x" })).toBeUndefined();
  expect(provider.resolveResult("view_file", "x")).toBeUndefined();
});

test("native mode returns undefined from every resolver", () => {
  const provider = createToolAliasProvider({ enabled: () => true, mode: () => "native" });
  expect(provider.resolveOutbound({ name: "read" })).toBeUndefined();
  expect(provider.resolveInbound("view_file", { AbsolutePath: "/x" })).toBeUndefined();
  expect(provider.resolveResult("view_file", "x")).toBeUndefined();
});
