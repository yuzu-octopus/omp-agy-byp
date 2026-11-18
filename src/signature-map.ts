import type { MarkerRule } from "./patterns";

// Literal pairs from docs/research/omp-antigravity-signature-mapping/F-signature-map.md
// § Safe rewrites. Text-only: tool ids, URL schemes and ACP/meta keys are hard preserves.
export const SIGNATURE_RULES: readonly MarkerRule[] = [
  {
    from: "⁂ Role\nYou are omp's trusted coding assistant.",
    to: "⁂ Role\nYou are the coding assistant for this Antigravity bridge session. Work inside the user's workspace and use the tools available in this session to complete the request.",
  },
  {
    from: "⁂ Runtime\n# Skills & Rules\nMatching skill → MUST read `skill://<name>` first.\n<skills>\n- <name>: <description>\n</skills>",
    to: "⁂ Runtime\n# Capabilities & Rules\nMatching skill → MUST read `skill://<name>` first.\n<skills>\n- <name>: <description>\n</skills>",
  },
  {
    from: "# Internal URLs\nMost FS/bash tools resolve these; path selectors: `read` docs.\n- omp:// ...\n- local:// ...",
    to: "# Resource references\nThe host resolves these reference schemes; consult `read` docs for path selectors.\n- omp:// ...\n- local:// ...",
  },
  {
    from: "# xd:// Tool Devices\nWrite JSON args as `content` to `xd://<tool>` via `write`. Invalid args return schema in error → fix/retry.",
    to: "# Device endpoints\nPass JSON arguments as `content` to `xd://<tool>` through `write`; invalid input returns a schema error - correct and retry.",
  },
  {
    from: "# Tool Inventory\n- read: `read`\n- bash: `bash`",
    to: "# Available tools\n- read: `read`\n- bash: `bash`",
  },
  {
    from: "⁂ Tool Policy\n# General\nEvery turn costs seconds: batch all independent reads/searches/checks into one turn. Once the change is verified, stop and report; no extra audits, broad suites, or repo-wide checks unless asked. SHOULD resolve prerequisites, parallelize independent calls. Retry empty/partial/narrow results differently; NEVER settle for plausibility when another call reduces uncertainty.\n\n# Tool I/O\n- Prefer relative paths.\n{{#if intentTracing}}- Most tools take `{{intentField}}`: capitalized 2–6-word present-participle intent (e.g. \"Reading model role settings\").{{/if}}\n\n# Specialized Tools\n{{#has tools \"read\"}}- File/directory reads: `{{toolRefs.read}}` (directory lists entries).{{/has}}\n{{#has tools \"lsp\"}}- Language server available: MUST use `{{toolRefs.lsp}}` for definitions, references, hover; code actions for refactors/imports/fixes. NEVER text-search/edit for code intelligence.{{/has}}\n{{#has tools \"find\"}}- Unknown behavior/location: descriptive `{{toolRefs.find}}` FIRST; NEVER guess `grep`/`glob` targets.{{/has}}\n\n# Exploration\nNEVER open guessed files.{{#has tools \"find\"}} Read `{{toolRefs.find}}` hits only.{{/has}}{{#has tools \"read\"}} Read small files whole; ranges only for large files. NEVER re-read content you already have.{{/has}}",
    to: "⁂ Tool Policy\n# General\nBatch independent reads and checks; report once the change is verified. Use `task` subagents only when parallel work is explicitly requested.\n# Tool I/O\nPrefer relative paths. Most tools accept an intent label rendered from `{{intentField}}` (`i` in the installed 18.22.2 session).\n# Specialized tools\nUse `read`/`edit`/`write`/`grep`/`glob`/`find`/`bash`/`lsp`/`ast_grep`/`ast_edit` for their named roles; never shell `grep`/`sed`/`awk` for edits.",
  },
  {
    from: "## Identity\n- **Ponytail**: full — lazy senior dev. YAGNI, stdlib first, shortest diff. Non-negotiable default.\n- **Caveman:** default lite. Non-negotiable default; see Caveman Policy section.",
    to: "## Working style\n- Prefer the smallest correct change. Keep changes boring and maintainable.\n- Be direct and concise in responses.",
  },
  {
    from: "- use-superpowers: At conversation start, check skills before responding, even clarifying questions.",
    to: "",
  },
  {
    from: "# Delegation\nDelegation preferred. Once design settles, SHOULD fan substantial work to `task`; multi-file changes, refactors, features, tests, investigations strong candidates.\n## Delegation gates\n- Before spawning, map slices/shared contracts; user-enumerated 2+ self-contained runnable slices exempt.",
    to: "# Coordination\nUse `task` subagents only for explicitly requested parallel work or genuinely independent slices; keep other work inline.",
  },
];

export function scrubSignatureText(text: string): string {
  let result = text;
  for (const rule of SIGNATURE_RULES) result = result.replaceAll(rule.from, rule.to);
  return result;
}
