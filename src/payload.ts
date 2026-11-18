import type { PluginConfig } from "./config";
import { scrubSignatureText } from "./signature-map";

export type Msg = {
  role: string;
  content: string | { type: string; text?: string }[];
  timestamp: number;
  toolCallId?: string;
  toolName?: string;
  [key: string]: unknown;
};

function scrubParts(parts: unknown): void {
  if (!Array.isArray(parts)) return;
  for (const part of parts) {
    if (
      typeof part === "object" &&
      part !== null &&
      "text" in part &&
      typeof part.text === "string"
    ) {
      part.text = scrubSignatureText(part.text);
    }
  }
}

export function scrubPayload<T extends Record<string, unknown>>(
  payload: T,
  config: PluginConfig,
): T {
  const clone = structuredClone(payload);
  if (config.mode === "native") return clone;

  const request = clone.request;
  if (typeof request !== "object" || request === null || Array.isArray(request)) return clone;

  if ("systemInstruction" in request) {
    const instruction = request.systemInstruction;
    if (typeof instruction === "object" && instruction !== null && "parts" in instruction) {
      scrubParts(instruction.parts);
    }
  }

  if ("contents" in request && Array.isArray(request.contents)) {
    for (const content of request.contents) {
      if (typeof content === "object" && content !== null && "parts" in content)
        scrubParts(content.parts);
    }
  }

  if (config.scrubToolDescriptions && "tools" in request && Array.isArray(request.tools)) {
    for (const tool of request.tools) {
      if (typeof tool !== "object" || tool === null || !("functionDeclarations" in tool)) continue;
      if (!Array.isArray(tool.functionDeclarations)) continue;
      for (const declaration of tool.functionDeclarations) {
        if (
          typeof declaration === "object" &&
          declaration !== null &&
          "description" in declaration &&
          typeof declaration.description === "string"
        ) {
          declaration.description = scrubSignatureText(declaration.description);
        }
      }
    }
  }

  return clone;
}

export function scrubContextMessages(messages: readonly Msg[], config: PluginConfig): Msg[] {
  const clones: Msg[] = messages.map((message) => structuredClone(message));
  if (config.mode === "native") return clones;

  for (const message of clones) {
    if (typeof message.content === "string") {
      message.content = scrubSignatureText(message.content);
    } else if (Array.isArray(message.content)) {
      for (const part of message.content) {
        if (typeof part.text === "string") part.text = scrubSignatureText(part.text);
      }
    }
  }

  return clones;
}
