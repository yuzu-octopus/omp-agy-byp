import type { MarkerRule } from "./patterns";

// Narrow substrings verified against the rendered 18.22.2 system prompt
// (buildSystemPrompt from @oh-my-pi/pi-coding-agent). Text-only: tool ids, URL
// schemes, ACP/meta keys, call ids and transport fields are hard preserves.
export const SIGNATURE_RULES: readonly MarkerRule[] = [
  {
    from: "You are omp's trusted coding assistant.",
    to: "You are the coding assistant for this Antigravity bridge session. Work inside the user's workspace and use the tools available in this session to complete the request.",
  },
  {
    from: "# Skills & Rules",
    to: "# Capabilities & Rules",
  },
  {
    from: "Most FS/bash tools resolve these; path selectors: `read` docs.",
    to: "The host resolves these reference schemes; consult `read` docs for path selectors.",
  },
  {
    from: "Write JSON args as `content` to xd://<tool> via `write`. Invalid args return schema in error → fix/retry.",
    to: "Pass JSON arguments as `content` to xd://<tool> through `write`; invalid input returns a schema error - correct and retry.",
  },
  {
    from: "# Tool Inventory",
    to: "# Available tools",
  },
  {
    from: "Every turn costs seconds: batch all independent reads/searches/checks into one turn.",
    to: "Batch independent reads and checks.",
  },
  {
    from: "Default modes: Ponytail full, Caveman lite, Unslop always.",
    to: "Working style: smallest correct change, direct and concise replies.",
  },
  {
    from: "- using-superpowers: At conversation start, check skills before responding, even clarifying questions.\n",
    to: "",
  },
  {
    from: "# Delegation\nDelegation preferred. Once design settles, SHOULD fan substantial work to `task`; multi-file changes, refactors, features, tests, investigations strong candidates. Judge small single-file/interactive work.",
    to: "# Coordination\nUse `task` subagents only for explicitly requested parallel work or genuinely independent slices; keep other work inline. Use `wait` only when blocked.",
  },
];

export function scrubSignatureText(text: string): string {
  let result = text;
  for (const rule of SIGNATURE_RULES) result = result.replaceAll(rule.from, rule.to);
  return result;
}
