import { afterAll, beforeAll, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { ALIAS_RULES, createToolAliasProvider, type ToolAliasProvider } from "../src/tool-alias";

type PatchEdit = { id: string; replacement: string[] };
type ToolInput = { name: string; description?: string; inputSchema?: unknown };
type ToolDefinition = { name: string; description?: string; inputSchema: Record<string, unknown> };
type Output = { content: unknown[]; isError?: boolean };
type WriterEvent = { type: "toolCall"; id: string; name: string; arguments: unknown };
type ResultMessage = { content: { type: "text"; text: string }[]; isError?: boolean; toolName: string };
type FixtureHost = {
  writer: { toolCalls: WriterEvent[]; output: unknown[]; finishEvents: unknown[]; done: boolean };
  messages: readonly unknown[];
  lastDigest: string | undefined;
  lastSettledOutput: Output | undefined;
  pending: { id: string; canonicalName?: string } | undefined;
  finishEvents: unknown[];
  toolsKey(tools: readonly ToolDefinition[]): string;
  validate(schema: unknown, args: unknown): { success: boolean; issues: string[] };
  onToolCall(name: string, args: unknown): Promise<Output>;
  settleResult(plan: { toolResult: ResultMessage }): Output;
  projectRawResult(result: ResultMessage): Output;
};
type FixtureModule = {
  FixtureHost: new (advertised: readonly ToolDefinition[], messages: readonly unknown[]) => FixtureHost;
  projectTools(tools: readonly ToolInput[]): ToolDefinition[];
  stableStringifyJson(value: unknown): string;
  transcriptDigest(messages: readonly unknown[]): string;
  validationCalls: unknown[];
};
type GlobalHooks = typeof globalThis & {
  __ompAgBypSetToolAliasProvider?: (provider: ToolAliasProvider) => void;
  __ompAgBypToolAliasProvider?: unknown;
  __ompAgBypProjectTool?: unknown;
  __ompAgBypReverseToolCall?: unknown;
  __ompAgBypProjectResult?: unknown;
};

const HOOK_NAMES = [
  "__ompAgBypSetToolAliasProvider",
  "__ompAgBypToolAliasProvider",
  "__ompAgBypProjectTool",
  "__ompAgBypReverseToolCall",
  "__ompAgBypProjectResult",
] as const;
type HookName = (typeof HOOK_NAMES)[number];

const savedHooks = new Map<HookName, unknown>();
const calls = {
  outbound: [] as string[],
  inbound: [] as { name: string; args: unknown }[],
  result: [] as string[],
};
let tempRoot: string;
let fixture: FixtureModule;

function patchReplacements(): Map<string, string> {
  const patchPath = join(import.meta.dir, "..", "host-patch", "0001-tool-alias.patch");
  const patch = JSON.parse(readFileSync(patchPath, "utf8")) as { edits: PatchEdit[] };
  return new Map(patch.edits.map((edit) => [edit.id, edit.replacement.join("\n")]));
}

// An isolated host module built from the patch's own replacement lines: no live host is
// imported, the installed package is never patched, and the advertised tool map is real.
function hostFixtureSource(replacements: Map<string, string>): string {
  const required = (id: string): string => {
    const text = replacements.get(id);
    if (text === undefined) throw new Error(`patch edit ${id} is missing`);
    return text;
  };
  return [
    "type Tool = { name: string; description?: string; inputSchema?: unknown };",
    "type McpToolDefinition = { name: string; description?: string; inputSchema: Record<string, unknown> };",
    'type TextPart = { type: "text"; text: string };',
    'type ImagePart = { type: "image"; data: string; mimeType: string };',
    "type McpToolOutput = { content: (TextPart | ImagePart)[]; isError?: boolean };",
    "type ToolResultMessage = { content: (TextPart | ImagePart)[]; isError?: boolean; toolName: string };",
    "type StepWriter = {",
    '  toolCalls: { type: "toolCall"; id: string; name: string; arguments: unknown }[];',
    "  output: unknown[];",
    "  finishEvents: { kind: string; event: unknown }[];",
    "  done: boolean;",
    '  toolCall(event: { type: "toolCall"; id: string; name: string; arguments: unknown }): void;',
    "  usage(tokens: number): void;",
    "  finish(kind: string, event: unknown): void;",
    "};",
    "function isRecord(value: unknown): value is Record<string, unknown> {",
    '  return value !== null && typeof value === "object" && !Array.isArray(value);',
    "}",
    "function stableStringifyJson(value: unknown): string {",
    '  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "undefined";',
    '  if (Array.isArray(value)) return "[" + value.map(stableStringifyJson).join(",") + "]";',
    "  const record = value as Record<string, unknown>;",
    "  return (",
    '    "{" +',
    "    Object.keys(record)",
    "      .sort()",
    '      .map(key => JSON.stringify(key) + ":" + stableStringifyJson(record[key]))',
    '      .join(",") +',
    '    "}"',
    "  );",
    "}",
    "function transcriptDigest(messages: readonly unknown[]): string {",
    "  return stableStringifyJson(messages);",
    "}",
    "export const validationCalls: unknown[] = [];",
    "function validateJsonSchemaValue(schema: unknown, args: unknown): { success: boolean; issues: string[] } {",
    "  validationCalls.push(args);",
    '  if (!isRecord(schema)) return { success: false, issues: ["schema is not an object"] };',
    '  if (!isRecord(args)) return { success: false, issues: ["arguments are not an object"] };',
    "  const issues: string[] = [];",
    "  const properties = isRecord(schema.properties) ? schema.properties : {};",
    "  const required = Array.isArray(schema.required) ? schema.required : [];",
    "  for (const key of required) {",
    '    if (typeof key === "string" && !Object.hasOwn(args, key)) issues.push("missing " + key);',
    "  }",
    "  for (const [key, value] of Object.entries(args)) {",
    "    const spec = properties[key];",
    "    if (!isRecord(spec)) continue;",
    '    if (spec.type === "string" && typeof value !== "string") issues.push(key + " must be a string");',
    '    if (spec.type === "integer" && !Number.isInteger(value)) issues.push(key + " must be an integer");',
    '    if (spec.type === "boolean" && typeof value !== "boolean") issues.push(key + " must be a boolean");',
    '    if (Object.hasOwn(spec, "const") && value !== spec.const) issues.push(key + " has the wrong constant");',
    "  }",
    "  return { success: issues.length === 0, issues };",
    "}",
    "function normalizeSchemaForMCP(schema: unknown): unknown {",
    "  return schema;",
    "}",
    "function toolWireSchema(tool: Tool): unknown {",
    "  return tool.inputSchema;",
    "}",
    "function errorOutput(text: string): McpToolOutput {",
    '  return { content: [{ type: "text", text: text }], isError: true };',
    "}",
    "function describeToolArguments(tool: McpToolDefinition, args: unknown, validation?: { success: boolean; issues: string[] }): string {",
    "  return JSON.stringify({ name: tool.name, args: args, issues: validation?.issues ?? [] });",
    "}",
    required("seam-declarations"),
    "  const schema: unknown = normalizeSchemaForMCP(toolWireSchema(tool));",
    '  if (!isRecord(schema)) throw new Error("Invalid schema for Antigravity CLI tool " + tool.name);',
    required("outbound-projection"),
    "}",
    required("result-projection"),
    required("pending-canonical-field"),
    "}",
    "export function projectTools(tools: readonly Tool[]): McpToolDefinition[] {",
    "  return tools.map(toMcpTool);",
    "}",
    "export class FixtureHost {",
    "  readonly tools: Map<string, McpToolDefinition>;",
    "  readonly writer: StepWriter;",
    "  readonly messages: readonly unknown[];",
    "  lastDigest: string | undefined;",
    "  lastSettledOutput: McpToolOutput | undefined;",
    "  finishEvents: { kind: string; event: unknown }[] = [];",
    "  pending: PendingCall | undefined;",
    "  constructor(advertised: readonly McpToolDefinition[], messages: readonly unknown[]) {",
    "    this.tools = new Map(advertised.map(tool => [tool.name, tool]));",
    "    this.messages = messages;",
    "    const self = this;",
    "    this.writer = {",
    "      toolCalls: [],",
    "      output: [],",
    "      finishEvents: self.finishEvents,",
    "      done: false,",
    "      toolCall(event) {",
    "        this.toolCalls.push(event);",
    "        this.output.push(event);",
    "      },",
    "      usage(_tokens) {},",
    "      finish(kind, event) {",
    "        this.finishEvents.push({ kind: kind, event: event });",
    "        this.output.push(event);",
    "        this.done = true;",
    "      },",
    "    };",
    "  }",
    "  toolsKey(tools: readonly McpToolDefinition[]): string {",
    "    return stableStringifyJson(tools);",
    "  }",
    "  validate(schema: unknown, args: unknown): { success: boolean; issues: string[] } {",
    "    return validateJsonSchemaValue(schema, args);",
    "  }",
    "  async onToolCall(name: string, args: unknown): Promise<McpToolOutput> {",
    "    const agy = this;",
    required("inbound-reverse-map"),
    '    if (!tool) return errorOutput("Unknown tool: " + name);',
    "    const step = { writer: this.writer, messages: this.messages };",
    required("inbound-canonical-validation"),
    "    if (!validation.success) return errorOutput(describeToolArguments(tool, args, validation));",
    "    if (!isRecord(canonicalArgs)) return errorOutput(describeToolArguments(tool, canonicalArgs));",
    '    const id = "agy_" + crypto.randomUUID().replaceAll("-", "");',
    "    const result = Promise.withResolvers<McpToolOutput>();",
    "    const self = this;",
    "    const pending: PendingCall = {",
    required("inbound-pending-canonical"),
    "      settle(output) {",
    "        self.lastSettledOutput = output;",
    "        result.resolve(output);",
    "      },",
    "    };",
    "    this.pending = pending;",
    required("inbound-canonical-call-record"),
    "    step.writer.usage(0);",
    "    this.lastDigest = transcriptDigest(step.messages.concat(step.writer.output));",
    '    step.writer.finish("toolUse", { type: "antigravityCli", conversationId: "fixture", digest: this.lastDigest });',
    "    return result.promise;",
    "  }",
    "  #releasePending(): PendingCall | undefined {",
    "    const pending = this.pending;",
    "    this.pending = undefined;",
    "    return pending;",
    "  }",
    "  settleResult(plan: { toolResult: ToolResultMessage }): McpToolOutput {",
    required("result-canonical-call-site"),
    "    return this.lastSettledOutput as McpToolOutput;",
    "  }",
    "  projectRawResult(result: ToolResultMessage): McpToolOutput {",
    "    return toMcpOutput(result);",
    "  }",
    "}",
    "export { stableStringifyJson, transcriptDigest };",
  ].join("\n");
}

const CANONICAL_SCHEMAS: Record<string, Record<string, unknown>> = {
  read: { type: "object", properties: { path: { type: "string" } }, required: ["path"] },
  write: {
    type: "object",
    properties: { path: { type: "string" }, content: { type: "string" } },
    required: ["path", "content"],
  },
  edit: { type: "object", properties: { path: { type: "string" } }, required: ["path"] },
  grep: { type: "object", properties: { pattern: { type: "string" } }, required: ["pattern"] },
  glob: { type: "object", properties: { pattern: { type: "string" } }, required: ["pattern"] },
  bash: { type: "object", properties: { command: { type: "string" } }, required: ["command"] },
};
const ALIAS_ARGS = { AbsolutePath: "/tmp/alias-adapter-fixture.txt", StartLine: 4, Extra: "drop" };
const CANONICAL_ARGS = { path: "/tmp/alias-adapter-fixture.txt", offset: 4 };
const RESULT_TEXT = "canonical text";

function canonicalTools(): ToolInput[] {
  return ALIAS_RULES.map((rule) => ({
    name: rule.toolName,
    description: rule.description,
    inputSchema: CANONICAL_SCHEMAS[rule.toolName],
  }));
}

// The transport map must hold the definitions the patch actually advertises: alias names
// with alias schemas, never a hand-made alias-name/canonical-schema pairing.
function advertisedTools(): ToolDefinition[] {
  return fixture.projectTools(canonicalTools());
}

function newHost(): FixtureHost {
  return new fixture.FixtureHost(advertisedTools(), [{ role: "user", content: "fixture prompt" }]);
}

async function dispatch(host: FixtureHost, args: unknown, resultToolName = "view_file") {
  const call = host.onToolCall("view_file", args);
  const settled = host.settleResult({
    toolResult: {
      content: [{ type: "text", text: RESULT_TEXT }],
      isError: false,
      toolName: resultToolName,
    },
  });
  return { output: await call, settled };
}

beforeAll(async () => {
  tempRoot = mkdtempSync(join(tmpdir(), "ag-byp-alias-host-"));
  const hostFile = join(tempRoot, "host.ts");
  writeFileSync(hostFile, hostFixtureSource(patchReplacements()));
  for (const name of HOOK_NAMES) savedHooks.set(name, (globalThis as GlobalHooks)[name]);
  // The fixture path is generated from the shipped patch at runtime; a static import cannot name it.
  fixture = (await import(pathToFileURL(hostFile).href)) as FixtureModule;
  const setter = (globalThis as GlobalHooks).__ompAgBypSetToolAliasProvider;
  if (typeof setter !== "function") throw new Error("fixture did not install the alias provider setter");
  const delegate = createToolAliasProvider({ enabled: () => true, mode: () => "generic" });
  setter({
    resolveOutbound(tool) {
      calls.outbound.push(tool.name);
      return delegate.resolveOutbound(tool);
    },
    resolveInbound(name, args) {
      calls.inbound.push({ name, args });
      return delegate.resolveInbound(name, args);
    },
    resolveResult(toolName, result) {
      calls.result.push(toolName);
      return delegate.resolveResult(toolName, result);
    },
  });
});

afterAll(() => {
  const hooks = globalThis as GlobalHooks & Record<string, unknown>;
  for (const name of HOOK_NAMES) {
    const previous = savedHooks.get(name);
    if (previous === undefined) delete hooks[name];
    else hooks[name] = previous;
  }
  rmSync(tempRoot, { recursive: true, force: true });
});

test("toMcpTool(read) emits the view_file schema for the transport", () => {
  const projected = advertisedTools();
  const rule = ALIAS_RULES.find((candidate) => candidate.toolName === "read");
  expect(rule).toBeDefined();
  expect(projected).toHaveLength(6);
  expect(projected[0]).toEqual({
    name: "view_file",
    description: rule?.description,
    inputSchema: rule?.inputSchema,
  });
  expect((projected[0]?.inputSchema.required as string[])).toContain("AbsolutePath");
  expect(calls.outbound).toContain("read");
});

test("#onToolCall reverse maps before lookup and writes canonical name and args", async () => {
  const host = newHost();
  const { output } = await dispatch(host, ALIAS_ARGS);
  expect(output.isError).toBe(false);
  expect(host.writer.toolCalls).toHaveLength(1);
  expect(host.writer.toolCalls[0]?.name).toBe("read");
  expect(host.writer.toolCalls[0]?.arguments).toEqual(CANONICAL_ARGS);
  expect(JSON.stringify(host.writer.toolCalls[0])).not.toContain("AbsolutePath");
  expect(host.writer.toolCalls[0]?.id).toMatch(/^agy_[0-9a-f]{32}$/);
  expect(calls.inbound.at(-1)?.name).toBe("view_file");
});

test("canonical lookup validates canonical args against the canonical schema", async () => {
  const host = newHost();
  const aliasSchema = advertisedTools()[0]?.inputSchema;
  expect(host.validate(aliasSchema, CANONICAL_ARGS).success).toBe(false);
  expect(host.validate(CANONICAL_SCHEMAS.read, ALIAS_ARGS).success).toBe(false);
  fixture.validationCalls.length = 0;
  const { output } = await dispatch(host, ALIAS_ARGS);
  expect(output.isError).toBe(false);
  expect(fixture.validationCalls).toHaveLength(1);
  expect(fixture.validationCalls[0]).toEqual(CANONICAL_ARGS);
  expect(JSON.stringify(fixture.validationCalls[0])).not.toContain("AbsolutePath");
});

test("digest is computed from the canonical toolCall event", async () => {
  const host = newHost();
  await dispatch(host, ALIAS_ARGS);
  const event = host.writer.toolCalls[0];
  expect(event).toBeDefined();
  const canonicalDigest = fixture.transcriptDigest(host.messages.concat([event]));
  const aliasDigest = fixture.transcriptDigest(
    host.messages.concat([{ type: "toolCall", id: event?.id, name: "view_file", arguments: ALIAS_ARGS }]),
  );
  expect(host.lastDigest).toBe(canonicalDigest);
  expect(host.lastDigest).not.toBe(aliasDigest);
  expect(host.finishEvents[0]).toEqual({
    kind: "toolUse",
    event: { type: "antigravityCli", conversationId: "fixture", digest: canonicalDigest },
  });
});

test("result projection derives the canonical toolName from the pending call", async () => {
  const host = newHost();
  calls.result.length = 0;
  const { output, settled } = await dispatch(host, ALIAS_ARGS, "view_file");
  expect(output).toEqual({ content: [{ type: "text", text: RESULT_TEXT }], isError: false });
  expect(settled).toBe(output);
  expect(calls.result).toEqual(["read"]);
  expect(host.pending).toBeUndefined();
  calls.result.length = 0;
  const fallback = host.projectRawResult({
    content: [{ type: "text", text: RESULT_TEXT }],
    isError: false,
    toolName: "view_file",
  });
  expect(fallback).toEqual(output);
  expect(calls.result).toEqual(["view_file"]);
});

test("toolsKey is stable across repeated projections", () => {
  const host = newHost();
  const tools = canonicalTools();
  const first = host.toolsKey(fixture.projectTools(tools));
  const second = host.toolsKey(fixture.projectTools(tools));
  expect(second).toBe(first);
  expect(first).toBe(fixture.stableStringifyJson(advertisedTools()));
  expect(first).toContain("view_file");
});

test("unknown alias is rejected without emitting a toolCall", async () => {
  const host = newHost();
  const output = await host.onToolCall("not_an_alias", {});
  expect(output.isError).toBe(true);
  expect(JSON.stringify(output.content)).toContain("Unknown tool: not_an_alias");
  expect(host.writer.toolCalls).toHaveLength(0);
  expect(host.lastDigest).toBeUndefined();
});
