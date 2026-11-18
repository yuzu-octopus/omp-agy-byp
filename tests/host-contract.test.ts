// tests/host-contract.test.ts
import { describe, expect, test } from "bun:test";
import { AssistantMessageEventStream, type AssistantMessage } from "@oh-my-pi/pi-ai";

describe("host contract", () => {
  test("canonical assistant stream settles with terminal result", async () => {
    const stream = new AssistantMessageEventStream();
    // Typed against the host interface: a shape change in 18.22.2 must fail typecheck,
    // not be silently absorbed by a blanket cast.
    const message: AssistantMessage = {
      role: "assistant",
      content: [{ type: "text", text: "ok" }],
      api: "antigravity-acp",
      provider: "antigravity-cli",
      model: "gemini-3.1-pro",
      usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0 },
      stopReason: "stop",
      timestamp: 1,
    };
    stream.push({ type: "start", partial: message });
    stream.push({ type: "done", reason: "stop", message });
    expect(await stream.result()).toBe(message);
  });
});
