export type MarkerRule = { from: string; to: string };

export const OMP_MARKERS: readonly MarkerRule[] = [
  {
    from: "You are omp's trusted coding assistant.",
    to: "You are the coding assistant for this Antigravity bridge session. Work inside the user's workspace and use the tools available in this session to complete the request.",
  },
  {
    from: "# Skills & Rules",
    to: "# Capabilities & Rules",
  },
  {
    from: "# Internal URLs\nMost FS/bash tools resolve these; path selectors: `read` docs.",
    to: "# Resource references\nThe host resolves these reference schemes; consult `read` docs for path selectors.",
  },
  {
    from: "# xd:// Tool Devices\nWrite JSON args as `content` to `xd://<tool>` via `write`. Invalid args return schema in error → fix/retry.",
    to: "# Device endpoints\nPass JSON arguments as `content` to `xd://<tool>` through `write`; invalid input returns a schema error - correct and retry.",
  },
  {
    from: "# Tool Inventory",
    to: "# Available tools",
  },
];

export function scrubText(text: string): string {
  let result = text;
  for (const rule of OMP_MARKERS) result = result.replaceAll(rule.from, rule.to);
  return result;
}
