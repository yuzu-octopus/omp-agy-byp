import type { PluginConfig } from "./config";
import { scrubText } from "./patterns";

export function scrubSystemPrompt(systemPrompt: string[], config: PluginConfig): string[] {
  if (config.mode === "native") return [...systemPrompt];
  return systemPrompt.map(scrubText);
}
