// tests/payload.test.ts
import { describe, expect, test } from "bun:test";
import { DEFAULT_CONFIG } from "../src/config";
import { scrubContextMessages, scrubPayload } from "../src/payload";
type Part = {
  text?: string;
  functionCall?: { id: string; name: string; args: Record<string, unknown> };
  functionResponse?: { id: string; name: string; response: Record<string, unknown> };
};

type ContentPart = { type: string; text?: string };

function ccaPayload() {
  return {
    project: "proj",
    requestId: "agent/a/1/t/1",
    userAgent: "antigravity",
    request: {
      sessionId: "-123",
      labels: { cascade_id: "a", model_enum: "gemini-3.1-pro", request_id: "t-0", trajectory_id: "t" },
      systemInstruction: { role: "user", parts: [{ text: "⁂ Role\nYou are omp's trusted coding assistant." }] as Part[] },
      contents: [
        {
          role: "user",
          parts: [
            { text: "# Internal URLs\nMost FS/bash tools resolve these; path selectors: `read` docs.\n- omp:// ...\n- local:// ...\nhello" },
            { functionCall: { id: "call-1", name: "read", args: { path: "x" } } },
          ] as Part[],
        },
        {
          role: "functionResponse",
          parts: [{ functionResponse: { id: "call-1", name: "read", response: { output: "ok" } } }] as Part[],
        },
      ],
      tools: [{ functionDeclarations: [{ name: "read", description: "⁂ Role\nYou are omp's trusted coding assistant. — read a file" }] }],
      toolConfig: { functionCallingConfig: { mode: "VALIDATED" } },
      generationConfig: { maxOutputTokens: 64000 },
    },
  };
}

test("generic mode scrubs systemInstruction and contents text", () => {
  const before = ccaPayload();
  const after = scrubPayload(before, { ...DEFAULT_CONFIG, mode: "generic" });
  expect(after.request.systemInstruction.parts[0].text).toBe("⁂ Role\nYou are the coding assistant for this Antigravity bridge session. Work inside the user's workspace and use the tools available in this session to complete the request.");
  expect(after.request.contents[0].parts[0].text).toBe("# Resource references\nThe host resolves these reference schemes; consult `read` docs for path selectors.\n- omp:// ...\n- local:// ...\nhello");
  expect(before.request.contents[0].parts[0].text).toBe("# Internal URLs\nMost FS/bash tools resolve these; path selectors: `read` docs.\n- omp:// ...\n- local:// ...\nhello");
});

test("preserves tool names, tool-call ids, labels, sessionId, requestId, userAgent and structure", () => {
  const before = ccaPayload();
  const after = scrubPayload(before, { ...DEFAULT_CONFIG, mode: "generic", scrubToolDescriptions: true });
  expect(after.request.labels).toEqual(before.request.labels);
  expect(after.request.sessionId).toBe(before.request.sessionId);
  expect(after.requestId).toBe(before.requestId);
  expect(after.userAgent).toBe(before.userAgent);
  expect(after.project).toBe(before.project);
  expect(after.request.contents[0].parts[1].functionCall).toEqual(before.request.contents[0].parts[1].functionCall);
  expect(after.request.contents[1].parts[0].functionResponse).toEqual(before.request.contents[1].parts[0].functionResponse);
  expect(after.request.tools[0].functionDeclarations[0].name).toBe("read");
  expect(after.request.toolConfig).toEqual(before.request.toolConfig);
  expect(Object.keys(after).sort()).toEqual(Object.keys(before).sort());
  expect(Object.keys(after.request).sort()).toEqual(Object.keys(before.request).sort());
});

test("tool descriptions are scrubbed only with the opt-in", () => {
  const before = ccaPayload();
  const off = scrubPayload(before, { ...DEFAULT_CONFIG, mode: "generic" });
  expect(off.request.tools[0].functionDeclarations[0].description).toBe(
    before.request.tools[0].functionDeclarations[0].description,
  );
  const on = scrubPayload(before, { ...DEFAULT_CONFIG, mode: "generic", scrubToolDescriptions: true });
  expect(on.request.tools[0].functionDeclarations[0].description).toBe(
    "⁂ Role\nYou are the coding assistant for this Antigravity bridge session. Work inside the user's workspace and use the tools available in this session to complete the request. — read a file",
  );
});

test("native mode leaves the payload value-identical", () => {
  const before = ccaPayload();
  const after = scrubPayload(before, { ...DEFAULT_CONFIG, mode: "native", scrubToolDescriptions: true });
  expect(after).toEqual(before);
});

test("context messages scrub text but keep tool-call ids and names", () => {
  const messages = [
    { role: "user", content: [{ type: "text", text: "⁂ Role\nYou are omp's trusted coding assistant.\nhi" }], timestamp: 1 },
    {
      role: "toolResult",
      toolCallId: "call-9",
      toolName: "read",
      content: [{ type: "text", text: "# Internal URLs\nMost FS/bash tools resolve these; path selectors: `read` docs.\n- omp:// ...\n- local:// ...\nok" }],
      isError: false,
      timestamp: 2,
    },
  ];
  const out = scrubContextMessages(messages, { ...DEFAULT_CONFIG, mode: "generic" });
  const firstPart = (out[0].content as ContentPart[])[0];
  const secondPart = (out[1].content as ContentPart[])[0];
  expect(firstPart.text).toBe("⁂ Role\nYou are the coding assistant for this Antigravity bridge session. Work inside the user's workspace and use the tools available in this session to complete the request.\nhi");
  expect(secondPart.text).toBe("# Resource references\nThe host resolves these reference schemes; consult `read` docs for path selectors.\n- omp:// ...\n- local:// ...\nok");
  expect(out[1].toolCallId).toBe("call-9");
  expect(out[1].toolName).toBe("read");
});

test("context messages with string content are scrubbed without losing fields", () => {
  const messages = [{ role: "user", content: "# Internal URLs\nMost FS/bash tools resolve these; path selectors: `read` docs.\n- omp:// ...\n- local:// ...\nhello", timestamp: 3 }];
  const out = scrubContextMessages(messages, { ...DEFAULT_CONFIG, mode: "generic" });
  expect(out[0].content).toBe("# Resource references\nThe host resolves these reference schemes; consult `read` docs for path selectors.\n- omp:// ...\n- local:// ...\nhello");
  expect(out[0].role).toBe("user");
  expect(out[0].timestamp).toBe(3);
});
