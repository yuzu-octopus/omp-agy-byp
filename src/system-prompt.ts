import type { PluginConfig } from "./config";
import { scrubSignatureText } from "./signature-map";

export function scrubSystemPrompt(systemPrompt: string[], config: PluginConfig): string[] {
  if (config.mode === "native") return [...systemPrompt];
  return systemPrompt.map(scrubSignatureText);
}
