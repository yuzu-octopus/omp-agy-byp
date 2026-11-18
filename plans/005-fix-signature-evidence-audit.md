# Plan 005: Make signature-mapping evidence claims match the sources they cite

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If anything in the "STOP conditions" section occurs, stop and report — do not improvise. This is a **documentation-only** plan: edit exactly the six Markdown files in "Scope" and nothing else. Do **not** create or update `plans/README.md` — the coordinator maintains the index. Do not edit the design spec, the implementation plan, `AGENTS.md`, any code/config/test file, or any file outside the six in-scope paths. Do not add or remove source-line citations except where a step explicitly says to.
>
> **Drift check (run first)**: `git diff --stat 1faaac3..HEAD -- docs/research/omp-antigravity-signature-mapping/ docs/research/omp-antigravity-investigation/F-source-google.md` → exit 0. At planning time the signature-mapping directory is untracked and `F-source-google.md` has no committed drift since `1faaac3`, so an empty stat is expected; the real drift gate is the excerpt comparison in "Current state" below. If any quoted excerpt differs from the live file, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none
- **Category**: docs
- **Planned at**: commit `1faaac3`, 2026-11-18
- **Issue**: none

## Why this matters

The four-file signature-mapping research package is the evidence base for the design spec and implementation plan, but a 2026-11-18 audit found nine places where its confidence labels and wording contradict the very sources it cites: it calls prompt-based client detection "unproven" while a cited first-party relay documents an A/B proving it for other clients; it treats a 2.26.0 header constant as historical when the installed build still contains it; it calls internal 429 behavior unanswerable when the official changelog describes it; and it gives opposite answers about header rewrites in two files. A reader following the citation trail gets a wrong confidence score, a stale line anchor, or a contradictory instruction. These are wording-and-anchor corrections only — every conclusion stays; the goal is that each claim is scoped to exactly what its source supports.

## Current state

All paths are relative to the repo root. There are five files in `docs/research/omp-antigravity-signature-mapping/` (all in scope) plus one file in `docs/research/omp-antigravity-investigation/` (in scope). In-scope files and roles:

- `docs/research/omp-antigravity-signature-mapping/REPORT.md` — four-question synthesis; the headline Answer/Confidence sections are the most-read text.
- `docs/research/omp-antigravity-signature-mapping/F-signature-map.md` — omp→agy mapping, R1–R9 illustrative rewrites, hard-preserve contracts, risks/open questions.
- `docs/research/omp-antigravity-signature-mapping/F-header-tls.md` — header/TLS source verification for ACP and direct CCA paths.
- `docs/research/omp-antigravity-signature-mapping/F-quota-rotation.md` — 429/quota/rotation/ban findings A–E with source table S1–S17.
- `docs/research/omp-antigravity-signature-mapping/F-antigravity-latest.md` — latest CLI docs/changelog and genuine-client identity surfaces.
- `docs/research/omp-antigravity-investigation/F-source-google.md` — historical 18.18.6 source snapshot; carries the version-skew banner and open question 1.

Repo conventions: findings are neutral, cited, and confidence-tagged (`High` = vendor doc / first-party source or direct source line; `Medium` = first-hand practitioner artifact or supported inference; `Low`/`speculative` = inference without source tie). Never quote secret values — OAuth identifiers are already abbreviated in these files and the client secret value is never reproduced. Preserve every identity string verbatim (`skill://<name>`, `xd://<tool>`, `mcp_ide-tools_<name>`, `_meta` keys, tool ids, scheme strings). Preserve the existing `High`/`Medium`/`Low` labels elsewhere in the files; only the claims named in this plan are reworded.

Prior baseline to record, not to "fix": at planning time `git status --short` shows two modified `docs/superpowers/...` files (owned by other plans), the untracked signature-mapping directory, and other `plans/0*.md` files. Add no path outside the six in-scope files.

### Verified facts to inline (already re-checked; do not re-litigate them)

1. **S10 relay A/B (from `F-quota-rotation.md` source S10, OmniProxy `GOOGLE_SUBSCRIPTION.md`, fetched 2026-11-18):** a 2026-11-12 real-account A/B in which Claude Code billing lines, Claude Agent SDK identity lines, Codex GPT-5 identity lines, and Hermes Agent persona lines in the system prompt trigger upstream `Resource has been exhausted`/`400 prompt_turned_away`; zero-width-space rewriting of those exact lines returns `200` (raw prompt → 400; scattered → 200; deleting the two lines → 200). This is **first-party relay evidence, not a Google publication**, and it did **not** test omp's role line, markers, or tool names. Keep that nuance in every edit.
2. **Installed 18.22.2 header constants (re-read directly in the installed `pi-catalog@18.22.2` `src/wire/gemini-headers.ts`):** line 39 = `export const DEFAULT_ANTIGRAVITY_VERSION = "2.26.0";`; line 53 = `getAntigravityVersion()` resolving `PI_AI_ANTIGRAVITY_VERSION` → discovered → pinned; line 79 = `export function ensureAntigravityVersion(...)`; line 141 = `const cl = process.env.PI_AI_ANTIGRAVITY_CL || "1005016104";`; line 155 = `export function getAntigravityHeaders(...)`. The 2.26.0 fallback and `cl` default are **current in 18.22.2**, not merely 18.18.6 history. The manifest URL and Go-vs-Bun comments are unchanged.
3. **Official changelog 1.5.10 (`F-antigravity-latest.md` source P7):** "when the model API asks the CLI to wait before retrying, the CLI now waits and retries for delays of up to 4 minutes instead of stopping the turn when the delay is longer than 30 seconds, so per-minute rate and capacity limits no longer end your turn". The "instead of" wording implies the earlier (1.5.9) build stopped a turn when the requested delay exceeded 30 s. This describes **CLI turns**, not an instrumented `agy acp` ACP trace; the installed 1.5.9 ACP path remains **untested**.
4. **Model removal:** official model docs (`F-antigravity-latest.md` P5) mark Claude Sonnet/Opus 4.6 and GPT-OSS-120b with footnote `*` "Will be removed on November 18, 2026"; Claude 5.5 carries a separate `**` trial-plans footnote. omp's 1.5.9 roster (`F-antigravity-latest.md` F6) pins `gpt-oss-120b-medium` (one of seven) and `claude-opus-5-5` / `claude-sonnet-5-5`. So the roster is **partially affected**, not "unaffected".
5. **Conversation-id keys:** official changelog (P7) uses `antigravity.google/root_conversation_id` on MCP `tools/call`; omp reads `_meta["antigravity.google/conversation_id"]` in the ACP bridge session, corroborated at `docs/research/omp-antigravity-investigation/F-antigravity-cli-source.md:59,75`. They are **distinct strings at different protocol points**; whether they map to the same conversation is **unverified** and must not be asserted either way.
6. **429 scope:** gcli2api rotates `(OAuth credential, GCP project)` units on `401/403/429/5xx` with no exponential backoff (C1). OmniProxy switches accounts **only** on subscription capacity-exhausted 429; ordinary API-key 429 stays project-shared and does not iterate accounts (C3). agy2api applies **model-family cooldown** on 429 with `RETRY_429_ENABLED` default true and credential-select modes `random`/`cache`/`sticky` (C2) — **not** 429-triggered key failover. C4 is carried via companion evidence F7 and was not re-fetched, so it is not part of the directly-confirmed set.
7. **Live 18.22.2 system-prompt template (`pi-coding-agent@18.22.2` `src/prompts/system/system-prompt.md`):** Tool I/O uses `{{#if intentTracing}}- Most tools take \`{{intentField}}\`: ...{{/if}}` (renders as `i` in the installed session); Specialized Tools renders `{{toolRefs.read}}`, `{{toolRefs.lsp}}`, `{{toolRefs.find}}` behind `{{#has tools "..."}}` guards; Exploration reads "NEVER open guessed files.{{#has tools "find"}} Read `{{toolRefs.find}}` hits only.{{/has}}...". `find` **is** a real built-in tool in installed 18.22.2 (`BUILTIN_TOOL_NAMES`), as are `lsp`, `ast_grep`, `ast_edit`. The R6 drift is literal/template drift, not a non-existent tool.

### Exact stale excerpts as they exist today (drift anchors)

- `REPORT.md:11` — "It is **confirmed by primary first-party repository docs that proxies rotate/fail over to other keys or accounts on 429** (gcli2api, agy2api, OmniProxy)."
- `REPORT.md:15` — "Detection of clients from prompt text or tool names is **unproven** — no public evidence ties those content surfaces to subscription enforcement — so the mapping establishes *reachability*, not *efficacy*."
- `REPORT.md:19` — "the direct CCA path clones headers but not TLS; proxies rotate on 429 (first-party repo docs);"
- `REPORT.md:21` — "... any detector efficacy for prompt/tool scrubbing; closed-CLI internals (whether `agy acp` itself retries on 429)."
- `REPORT.md:22` — "**low** for \"rotation is the detected pattern that triggers the ban\" and for \"prompt/tool scrubbing changes detection.\""
- `REPORT.md:35` — "gcli2api rotates `(OAuth credential, GCP project)` units on `401/403/429/5xx` with **no exponential backoff** (C1); agy2api uses model-family cooldown on 429 with `RETRY_429_ENABLED` default true and credential-select modes `random`/`cache`/`sticky` (C2); OmniProxy rests a quota-exhausted account for the reset window and switches accounts when alternatives exist, in contrast to ordinary API-key 429 which stays project-shared (C3)."
- `REPORT.md:52` — "**Efficacy unproven:** no evidence that Antigravity/Google inspects prompt text or tool names for client identification; scrubbing omp markers is speculative mitigation and the map establishes reachability, not detection impact (Risks/Q1–Q2)."
- `REPORT.md:56` — "... would resolve the ACP-path fingerprint question and the internal-429-retry question."
- `REPORT.md:58` — "**Empirical detector probing**: evidence that prompt text or tool names influence upstream model access, or that a system-prompt rewrite changes observed behavior, would move the signature map from reachability to efficacy."
- `REPORT.md:66` — "Rejected as a claim: detection via those content surfaces is unproven; the work is best-effort only (Risks/Q1–Q2)."
- `REPORT.md:76` — "Does `agy acp` itself internally retry, back off, or rotate on 429? Not observable from omp source."
- `F-signature-map.md:9` — Sources line ending "... pi-ai/src/providers/antigravity-cli/agent.md (installed 18.22.2)."
- `F-signature-map.md:33` — row 19 "Hard preserve - fixed in installed source | High".
- `F-signature-map.md:37` — row 23 "Hard preserve / no-op on CLI; on the HTTP fallback the payload hook can rewrite body fields but never headers | High".
- `F-signature-map.md:44` — "Each pair below is a literal documentation string to paste into a `before_agent_start` handler returning `{ systemPrompt: string[] }`. Preserve array structure and section order; change only the quoted text. Keep tool ids and schemes verbatim."
- `F-signature-map.md:60` — "R2 - Skills & Rules (system-prompt.md:40-48). Confidence High. Relabel only; keep the scheme and MUST-read contract so skill dispatch still works."
- `F-signature-map.md:75` — "For a listed capability, open its `skill://<name>` reference before using it."
- `F-signature-map.md:126` — "R6 - Tool Policy, condensed representative excerpt (system-prompt.md:95-158). Confidence High. Keep the tool ids named in the policy."
- `F-signature-map.md:129-139` (R6 Before code fence) and `:141-149` (R6 After code fence) and `:150` loop-safety line — as reproduced verbatim in Step 9 below.
- `F-signature-map.md:201` — "ACP meta keys `_meta.antigravity.systemPrompt.append` and `_meta[\"antigravity.google/conversation_id\"]`; client identity bridge / Host tool bridge / v1; MCP server tools / v1; ACP protocolVersion 1 (F-source §4/§7/§9)."
- `F-signature-map.md:204` — "... On the HTTP fallback, before_provider_request may rewrite body fields but never headers, and must preserve valid CCA schema and tool-call ids (F-signature F8/Rewritable 4)."
- `F-signature-map.md:210` — "Efficacy is unverified. No evidence that Antigravity/Google inspects prompt text or tool names for client identification; scrubbing omp markers is speculative mitigation (F-signature O5; F-hooks Q2). Label any efficacy claim Low/speculative."
- `F-signature-map.md:222-223` — Q1/Q2 open questions as quoted in Step 1 below.
- `F-header-tls.md:24` — "  - version: `PI_AI_ANTIGRAVITY_VERSION` → manifest-discovered (`ensureAntigravityVersion`, gemini-headers.ts:79-118, fetching the electron-builder manifest at `https://antigravity-hub-auto-updater-974169037036.us-central1.run.app/manifest/latest-arm64-mac.yml`) → pinned `DEFAULT_ANTIGRAVITY_VERSION = \"2.26.0\"` (gemini-headers.ts:39, 52-57)."
- `F-header-tls.md:51` — "| 5 | packages/catalog/src/wire/gemini-headers.ts:9-18, 39, 52-57, 79-118, 121-134, 136-168 | Native-clone UA/header builders, manifest version discovery, OS/arch build map, all five env overrides, Go-vs-Bun comments | high |"
- `F-quota-rotation.md:39` (D6) — "... (a) proxies that retry other keys on 429 - CONFIRMED by C1-C4; ..."
- `F-quota-rotation.md:47` (E5) — "- E5. Unverified: whether `agy acp` itself internally retries, backsoff, or rotates on 429. The CLI is a black box reached over ACP; omp source cannot answer this. Confidence: unverified."
- `F-quota-rotation.md:101` — "- Does the installed `agy acp` binary internally retry or switch anything on 429? Not observable from omp source; needs instrumented black-box testing."
- `F-antigravity-latest.md:38` (F4) — "... Official changelog `_meta` keys: `antigravity.google/root_conversation_id` on MCP `tools/call` (line 328), `antigravity/alwaysLoad` in a server's `tools/list` (line 439) (P7). omp bridge: ..."
- `F-antigravity-latest.md:65` (G8) — "| G8 | MCP bridge | `--ide-mcp-port` + `nc`; `mcp_<server>_<tool>`; `_meta` `antigravity.google/root_conversation_id`, `antigravity/alwaysLoad` | P2,P4,P7,P12 |"
- `F-antigravity-latest.md:80` (Q5) — "- Q5. Effect of the 2026-11-18 removal of Claude 4.6 / GPT-OSS-120b on ACP catalog and on omp's 1.5.9 roster (which pins Claude 5.5 / GPT-OSS 120B, unaffected by that note)."
- `F-source-google.md:151` — "1. **Version skew (resolved/historical).** The 18.18.1 pin is historical; the current verification target is the installed 18.22.2 build (`F-antigravity-cli-source.md`). This snapshot's constants — the `disabled` pause, the 2.26.0 UA/version-manifest lookup, and `retrieveUserQuotaSummary` — are 18.18.6 facts and are not re-asserted for 18.22.2 without a fresh source read."

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Drift check | `git diff --stat 1faaac3..HEAD -- docs/research/omp-antigravity-signature-mapping/ docs/research/omp-antigravity-investigation/F-source-google.md` | exit 0; empty stat (signature-mapping dir untracked at plan time) |
| Baseline scope | `git status --short` | only the planned six in-scope files change; the two `docs/superpowers/...` modifications and other `plans/...` files remain as-is |
| Stale-claim scan | `rg -n "Detection of clients from prompt text or tool names is \*\*unproven\*\*\|no public evidence ties those content surfaces\|No evidence that Antigravity/Google inspects prompt text or tool names\|No public evidence found tying prompt text\|detection via those content surfaces is unproven\|For a listed capability\|literal documentation string to paste\|Most tools take .intent.\|Read .find. hits only\|can rewrite body fields but never headers\|may rewrite body fields but never headers\|not spoofable from an extension" docs/research/omp-antigravity-signature-mapping/REPORT.md docs/research/omp-antigravity-signature-mapping/F-signature-map.md` | exit 1 (no matches) |
| Stale-429/version scan | `rg -n "rotate/fail over to other keys or accounts on 429 \(gcli2api, agy2api, OmniProxy\)\|proxies rotate on 429 \(first-party repo docs\)\|CONFIRMED by C1-C4\|not re-asserted for 18\.22\.2 without a fresh source read\|Not observable from omp source\|unaffected by that note" docs/research/omp-antigravity-signature-mapping/ docs/research/omp-antigravity-investigation/F-source-google.md` | exit 1 (no matches) |
| Positive-content scan | `rg -n "first-party relay A/B\|4 minutes\|capacity-exhausted\|model-family cooldown\|39, 53, 79, 141, 155\|MUST read .skill://<name>. first\|options\.headers\|root_conversation_id\|illustrative template\|BUILTIN_TOOL_NAMES\|Partially affected" docs/research/omp-antigravity-signature-mapping/ docs/research/omp-antigravity-investigation/F-source-google.md` | exit 0; matches in the relevant files |
| Whitespace (untracked docs) | `rg -n "[ \t]+$" docs/research/omp-antigravity-signature-mapping/ docs/research/omp-antigravity-investigation/F-source-google.md` | exit 1 (no matches; clean at baseline) |
| Secret scan | `rg -n "GOCSPX-[A-Za-z0-9_-]{6,}\|AIza[0-9A-Za-z_-]{10,}\|-----BEGIN [A-Z ]*PRIVATE KEY" docs/research/omp-antigravity-signature-mapping/ docs/research/omp-antigravity-investigation/F-source-google.md` | exit 1 (no matches; clean at baseline) |
| Diff hygiene | `git diff --check` | exit 0, no output |

Note: `rg` exits 1 when there are no matches — that is success for the negative scans. `git diff --check` covers tracked modifications only; the `rg` whitespace command is the gate for the untracked research directory. Do not run `git add` to force untracked files into the diff.

## Suggested executor toolkit

- No skills, installs, builds, typechecks, linters, or tests apply to this plan. All evidence needed is inlined above.
- Optional cross-check while editing: the installed 18.22.2 `pi-catalog/src/wire/gemini-headers.ts` and `pi-coding-agent/src/prompts/system/system-prompt.md` in the host package cache (read-only; find them with a glob if desired). Do not copy absolute cache paths into the docs.

## Scope

**In scope** (the only files you may modify):

- `docs/research/omp-antigravity-signature-mapping/REPORT.md`
- `docs/research/omp-antigravity-signature-mapping/F-signature-map.md`
- `docs/research/omp-antigravity-signature-mapping/F-header-tls.md`
- `docs/research/omp-antigravity-signature-mapping/F-quota-rotation.md`
- `docs/research/omp-antigravity-signature-mapping/F-antigravity-latest.md`
- `docs/research/omp-antigravity-investigation/F-source-google.md`

**Out of scope** (do NOT touch, even though related):

- `docs/superpowers/specs/2026-11-18-google-ai-subscription-provider-design.md` and `docs/superpowers/plans/2026-11-18-google-ai-subscription-provider.md` — owned by other plans; already modified at baseline.
- `AGENTS.md`, `plans/README.md`, and all other `plans/0*.md` — coordinator/other plans own them.
- Every other research file, including `docs/research/omp-antigravity-investigation/F-antigravity-cli-source.md` and `F-antigravity-cli-hooks.md` — reference only. Their `file:line` anchors are cited but not edited.
- Any source, config, test, or implementation file. No plugin code is in scope.

## Git workflow

- Branch at planning time: `main`. Do not switch branches.
- Commit message style is conventional (`docs: …`); HEAD is `1faaac3 docs: finalize antigravity-cli design and audit fixes`. If asked to commit, use `docs: align signature-mapping evidence claims with cited sources`.
- Do not push or open a PR unless explicitly instructed.

## Steps

### Step 0: Record baseline and confirm excerpts

Run the drift check, `git status --short`, the whitespace scan, and the secret scan. Confirm every excerpt in "Current state" appears in the live file at the listed anchor. Both scans must already be clean.

**Verify**: drift check → exit 0, empty stat; whitespace and secret scans → no matches; all nine stale-claim anchors present.

### Step 1: DOCS-01 — scope prompt-detection claims to the S10 relay A/B (`REPORT.md`, `F-signature-map.md`)

Do all of the following; keep the "relay-reported, not Google, omp markers untested" nuance in each.

1. `REPORT.md:15`: replace the sentence "Detection of clients from prompt text or tool names is **unproven** — no public evidence ties those content surfaces to subscription enforcement — so the mapping establishes *reachability*, not *efficacy*." with:
   "Detection from specific system-prompt identity lines is **documented by a first-party relay A/B (S10)**: Claude Code billing lines, Claude Agent SDK identity lines, Codex GPT-5 identity lines and Hermes Agent persona lines in the system prompt trigger upstream `400 prompt_turned_away`/`Resource has been exhausted`, and rewriting those lines returns `200`. That is relay-reported evidence, not a Google publication, and it did not test omp's own markers or tool names; omp-specific scrubbing remains untested. The mapping therefore establishes *reachability* for omp's markers, not omp-specific *efficacy*."
2. `REPORT.md:21`: replace "any detector efficacy for prompt/tool scrubbing;" with "efficacy of scrubbing omp's own markers/tool names (S10 tested other clients' identity lines, not omp's);". Leave the rest of that bullet for Step 3.
3. `REPORT.md:22`: replace the clause "and for \"prompt/tool scrubbing changes detection.\"" with "and for \"scrubbing omp's own markers/tool names changes detection\"; the S10 relay A/B raises confidence for detection from the specific system-prompt identity lines it tested, but it is not a Google publication and does not cover omp markers."
4. `REPORT.md:52`: replace "no evidence that Antigravity/Google inspects prompt text or tool names for client identification; scrubbing omp markers is speculative mitigation and the map establishes reachability, not detection impact (Risks/Q1–Q2)." with "a first-party relay A/B (S10) documents upstream identification of specific system-prompt identity lines in other clients and an outcome change when those lines are rewritten; there is no Google publication and no A/B covering omp's own markers or tool names, so scrubbing those remains speculative mitigation. The map establishes reachability and carries the S10 signal only by analogy, not omp-specific efficacy (Risks/Q1–Q2)."
5. `REPORT.md:58`: replace the whole bullet with "- **Empirical detector probing on omp's own markers**: the S10 relay A/B already demonstrates this for other clients' system-prompt identity lines; a controlled A/B on omp's role line, tool names and `mcp_ide-tools_` prefix would move the signature map from borrowed evidence to omp-specific efficacy."
6. `REPORT.md:66`: replace "Rejected as a claim: detection via those content surfaces is unproven; the work is best-effort only (Risks/Q1–Q2)." with "Rejected as a claim: detection from those content surfaces is documented only by a first-party relay A/B for specific other-client identity lines (S10), not by a Google publication, and not for omp's markers or tool names; the work is best-effort only (Risks/Q1–Q2)."
7. `F-signature-map.md:9`: append to the Sources line: "; `F-quota-rotation.md` (S10 / OmniProxy `GOOGLE_SUBSCRIPTION.md`, first-party relay A/B)".
8. `F-signature-map.md:210`: replace the bullet with "- Efficacy for omp's own markers is unverified. A first-party relay A/B (S10, cited in `F-quota-rotation.md`) documents upstream identification of specific system-prompt identity lines in Claude Code / Claude Agent SDK / Codex GPT-5 / Hermes Agent and a `400`→`200` outcome change when those exact lines are rewritten; it is relay-reported, not a Google publication, and did not test omp markers or tool names. Scrubbing omp markers remains speculative mitigation (F-signature O5; F-hooks Q2). Label any omp-specific efficacy claim Low/speculative."
9. `F-signature-map.md:222-223`: replace Q1 with "- Q1 (Low/speculative). What measurable detector signal, if any, is affected by prompt-only scrubbing on the CLI path? The S10 relay A/B shows an effect for other clients' identity lines; this map establishes reachability for omp's markers, not omp-specific efficacy (F-hooks Q2; F-signature O5)." Replace Q2 with "- Q2 (speculative). Does upstream identify clients from content surfaces at all, versus transport/telemetry fingerprint? A first-party relay A/B (S10) shows yes for specific system-prompt identity lines in other clients; no Google publication and no A/B covers omp's own markers or tool names."

**Verify**: `rg -n "first-party relay A/B|S10" REPORT.md F-signature-map.md` → exit 0, at least six matches across the two files; the stale-claim scan from the commands table → no matches for the DOCS-01 phrases.

### Step 2: DOCS-02 — publish the verified 18.22.2 header anchors (`F-header-tls.md`, `F-source-google.md`)

1. `F-header-tls.md:24`: replace the whole version bullet with:
   "  - version: `PI_AI_ANTIGRAVITY_VERSION` → manifest-discovered (`ensureAntigravityVersion`) → pinned fallback `DEFAULT_ANTIGRAVITY_VERSION = \"2.26.0\"`. Re-read directly in the installed 18.22.2 `packages/catalog/src/wire/gemini-headers.ts`: line 39 declares `DEFAULT_ANTIGRAVITY_VERSION = \"2.26.0\"`, line 53 `getAntigravityVersion()` applies env → discovered → pinned, line 79 `ensureAntigravityVersion()` (manifest at `https://antigravity-hub-auto-updater-974169037036.us-central1.run.app/manifest/latest-arm64-mac.yml`), line 141 `const cl = process.env.PI_AI_ANTIGRAVITY_CL || \"1005016104\"`, line 155 `getAntigravityHeaders()`. These constants are current in 18.22.2, not 18.18.6 history."
2. `F-header-tls.md:51`: replace evidence-table row 5 with:
   "| 5 | packages/catalog/src/wire/gemini-headers.ts (installed 18.22.2):9-18, 39, 53, 79, 141, 155 | Native-clone UA/header builders; 2.26.0 fallback (`:39`), env→discovered→pinned resolution (`:53`), `ensureAntigravityVersion` (`:79`), `cl` fallback `1005016104` (`:141`), `getAntigravityHeaders` (`:155`), Go-vs-Bun comments | high |"
3. `F-source-google.md:151`: replace "This snapshot's constants — the `disabled` pause, the 2.26.0 UA/version-manifest lookup, and `retrieveUserQuotaSummary` — are 18.18.6 facts and are not re-asserted for 18.22.2 without a fresh source read." with "The `disabled` pause and `retrieveUserQuotaSummary` remain 18.18.6 facts and are not re-asserted for 18.22.2. The 2.26.0 UA / version-manifest constants are the verified exception: they were re-read in installed 18.22.2 at `gemini-headers.ts:39,53,79,141,155` and are current (see `F-header-tls.md` F4 and Evidence row 5). The older 18.18.6 line ranges at lines 63–64 of this file are historical anchors only."
4. Do **not** change `REPORT.md:19` for this finding — "the direct CCA path clones headers but not TLS" is now supported by the verified anchors. Do not change the `gemini-headers.ts:22-52`/`:54-108` anchors at `F-source-google.md:63-64`; the new note in item 3 explains the skew.

**Verify**: `rg -n "39, 53, 79, 141, 155" F-header-tls.md F-source-google.md` → exit 0, at least one match in each file; `rg -n "not re-asserted for 18\.22\.2 without a fresh source read" F-source-google.md` → exit 1 (no matches).

### Step 3: DOCS-03 — cite the 1.5.10 changelog for wait-and-retry, keep 1.5.9 ACP untested (`F-quota-rotation.md`, `REPORT.md`)

1. `F-quota-rotation.md:47` (E5): replace the whole bullet with:
   "- E5. Partially answered by first-party changelog. The official `antigravity-cli` CHANGELOG 1.5.10 (P7 in `F-antigravity-latest.md`) states: \"when the model API asks the CLI to wait before retrying, the CLI now waits and retries for delays of up to 4 minutes instead of stopping the turn when the delay is longer than 30 seconds, so per-minute rate and capacity limits no longer end your turn\". The \"instead of\" wording implies the 1.5.9 build pinned by omp stopped a turn when the delay exceeded 30 s, but the installed 1.5.9 ACP path is untested. This describes CLI turns, not an instrumented `agy acp` ACP trace, and says nothing about key rotation. Confidence: high for the changelog assertion; unverified for the installed 1.5.9 ACP path."
2. `F-quota-rotation.md:101`: replace the open question with:
   "- Does the installed `agy acp` (1.5.9) binary internally retry or switch anything on 429? Partially answered: CHANGELOG 1.5.10 documents wait-and-retry up to 4 min on per-minute rate/capacity limits and, by its \"instead of\" wording, implies a >30 s stop in 1.5.9; an instrumented ACP trace on the installed 1.5.9 build is still needed to confirm actual behavior. This cannot be settled from omp source alone."
3. `REPORT.md:21` (already touched in Step 1): replace "closed-CLI internals (whether `agy acp` itself retries on 429)." with "closed-CLI ACP internals on the installed 1.5.9 build: CHANGELOG 1.5.10 documents wait-and-retry up to 4 min on per-minute rate/capacity limits (implying a >30 s stop in 1.5.9), but the 1.5.9 ACP path is untested (F-quota-rotation.md E5)."
4. `REPORT.md:56`: replace "would resolve the ACP-path fingerprint question and the internal-429-retry question." with "would resolve the ACP-path fingerprint question and confirm the 1.5.9 internal-429-retry behavior that CHANGELOG 1.5.10 only implies (F-quota-rotation.md E5)."
5. `REPORT.md:76`: replace the open question with "Does the installed `agy acp` 1.5.9 internally retry, back off, or rotate on 429? CHANGELOG 1.5.10 documents wait-and-retry up to 4 min on per-minute rate/capacity limits and implies a >30 s stop in 1.5.9; the 1.5.9 ACP path is untested and cannot be settled from omp source (F-quota-rotation.md E5)."

**Verify**: `rg -n "4 minutes|30 s|30 seconds|1\.5\.10" F-quota-rotation.md REPORT.md` → exit 0, matches in both files; `rg -n "Not observable from omp source|unanswerable from primary sources|Unverified: whether .agy acp. itself internally retries" REPORT.md F-quota-rotation.md` → exit 1 (no matches).

### Step 4: DOCS-04 — split the GPT-OSS-120b removal answer (`F-antigravity-latest.md`)

Replace `F-antigravity-latest.md:80` (Q5) with:
"- Q5. Effect of the 2026-11-18 removal of Claude 4.6 / GPT-OSS-120b on ACP catalog and on omp's 1.5.9 roster. **Partially affected**: `gpt-oss-120b-medium` is one of omp's seven pinned models (F6) and is the named model in the removal footnote (`*` \"Will be removed on November 18, 2026\", P5); Claude Sonnet/Opus 4.6 carries that same footnote but is not in omp's roster. Claude 5.5 (`claude-opus-5-5`, `claude-sonnet-5-5`) is genuinely unaffected — it carries a separate `**` trial-plans footnote. Verify post-removal ACP catalog behavior (whether requests to `gpt-oss-120b-medium` fail, fall back, or are silently rerouted) before treating the 1.5.9 roster as current."

Do not change F6 at line 42; it already states the removal note.

**Verify**: `rg -n "Partially affected|separate .\*\*. trial-plans footnote" F-antigravity-latest.md` → exit 0, both matches; `rg -n "unaffected by that note" F-antigravity-latest.md` → exit 1 (no matches).

### Step 5: DOCS-05 — keep the MUST-read contract verbatim in R2 (`F-signature-map.md`)

In the R2 **After** code fence, replace line 75 ("For a listed capability, open its `skill://<name>` reference before using it.") with the exact Before text:
"Matching skill → MUST read `skill://<name>` first."

Leave the R2 header (`:60`), the Before fence, row 4 at `:18`, and the Hard preserves bullet at `:197` unchanged — they already require the MUST-read-first rule.

**Verify**: `rg -n "Matching skill → MUST read .skill://<name>. first" F-signature-map.md` → exit 0, at least two matches (Before and After); `rg -n "For a listed capability" F-signature-map.md` → exit 1 (no matches).

### Step 6: DOCS-06 — distinguish payload hooks from `options.headers` (`F-signature-map.md`)

1. `F-signature-map.md:37` (row 23, last cell): replace "Hard preserve / no-op on CLI; on the HTTP fallback the payload hook can rewrite body fields but never headers" with "Hard preserve / no-op on CLI; on the HTTP fallback `before_provider_request` cannot rewrite headers, but a caller can supply `options.headers`, spread last in request assembly, which overrides any built-in field (`F-header-tls.md` F4/F6)".
2. `F-signature-map.md:204` (Hard preserves bullet): replace "On the HTTP fallback, before_provider_request may rewrite body fields but never headers, and must preserve valid CCA schema and tool-call ids (F-signature F8/Rewritable 4)." with "On the HTTP fallback, `before_provider_request`/`after_provider_response` cannot rewrite headers; callers can pass `options.headers`, spread last in request assembly, which overrides any built-in header field (`F-header-tls.md` F4/F6). Payload hooks may still rewrite body fields but must preserve valid CCA schema and tool-call ids (F-signature F8/Rewritable 4)."
3. Leave the ACP-path conclusion in the same bullet ("owned by agy; no extension surface") untouched — the contradiction is only about the HTTP fallback.

**Verify**: `rg -n "options\.headers" F-signature-map.md` → exit 0, at least two matches; `rg -n "can rewrite body fields but never headers|may rewrite body fields but never headers|not spoofable from an extension" F-signature-map.md` → exit 1 (no matches).

### Step 7: DOCS-07 — reconcile the two conversation-id keys (`F-signature-map.md`, `F-antigravity-latest.md`)

Treat the keys as **distinct and unverified-equivalent**; do not assert a mapping in either direction and do not change any code.

1. `F-antigravity-latest.md:38` (F4): after the sentence ending "(P7)." that lists `_meta` keys, insert: "Reconciliation: `antigravity.google/root_conversation_id` is the genuine client's MCP `tools/call` key; omp instead reads `_meta[\"antigravity.google/conversation_id\"]` in the ACP bridge session (`F-antigravity-cli-source.md:59,75`; P12). Whether these are distinct keys at different protocol points or the same concept under different names is unverified; do not assume they are interchangeable."
2. `F-antigravity-latest.md:65` (G8): replace the row with:
   "| G8 | MCP bridge | `--ide-mcp-port` + `nc`; `mcp_<server>_<tool>`; genuine-client `_meta` `antigravity.google/root_conversation_id` (MCP `tools/call`), `antigravity/alwaysLoad`; omp reads `_meta[\"antigravity.google/conversation_id\"]` in the ACP session — relationship unverified | P2,P4,P7,P12,F-antigravity-cli-source.md:59,75 |"
3. `F-signature-map.md:33` (row 19, Hard preserve cell): replace "Hard preserve - fixed in installed source" with "Hard preserve - fixed in installed source. The genuine-client changelog uses `antigravity.google/root_conversation_id` on MCP `tools/call`; omp's `conversation_id` is a distinct string at a different protocol point, and whether they map to the same conversation is unverified (`F-antigravity-latest.md` F4/G8)."
4. `F-signature-map.md:201` (Hard preserves bullet): append: " The genuine-client `antigravity.google/root_conversation_id` (MCP `tools/call`, official changelog) is a different key; treat the two as distinct and unverified-equivalent, not interchangeable (`F-antigravity-latest.md` F4/G8; `F-antigravity-cli-source.md:59,75`)."
5. Append one new open question after `F-signature-map.md:230`:
   "- Q10 (Medium). Are `antigravity.google/root_conversation_id` (genuine client, MCP `tools/call`) and `_meta[\"antigravity.google/conversation_id\"]` (omp ACP bridge) related keys? Both strings are sourced, but the relationship is unverified; needs a source trace or traffic capture. Do not change omp's key from docs alone."

**Verify**: `rg -n "root_conversation_id" F-signature-map.md F-antigravity-latest.md` → exit 0, at least five matches; `rg -n "unverified" F-signature-map.md F-antigravity-latest.md` → matches including the new reconciliation/Q10 lines.

### Step 8: DOCS-08 — scope the 429 rotation headline (`REPORT.md`, `F-quota-rotation.md`)

1. `REPORT.md:11`: replace "It is **confirmed by primary first-party repository docs that proxies rotate/fail over to other keys or accounts on 429** (gcli2api, agy2api, OmniProxy)." with "It is **confirmed by primary first-party repository docs that some proxies rotate/fail over to other keys or accounts on 429**: gcli2api rotates `(OAuth credential, GCP project)` units on `401/403/429/5xx`; OmniProxy switches accounts only on subscription **capacity-exhausted** 429 (ordinary API-key 429 stays project-shared and does not iterate accounts). **agy2api is different**: it applies model-family cooldown on 429 with configurable credential selection modes (`random`/`cache`/`sticky`), not 429-triggered key failover (`F-quota-rotation.md` C1–C3)."
2. `REPORT.md:19`: replace "proxies rotate on 429 (first-party repo docs);" with "gcli2api and OmniProxy rotate identities on 429, agy2api uses cooldown plus configured credential selection (first-party repo docs);".
3. `REPORT.md:35`: replace the first three proxy clauses (from "gcli2api rotates ..." through "(C3).") with "gcli2api rotates `(OAuth credential, GCP project)` units on `401/403/429/5xx` with **no exponential backoff** (C1); OmniProxy rests a **subscription capacity-exhausted** account for the reset window and switches accounts when alternatives exist, while ordinary API-key 429 stays project-shared and does **not** iterate accounts (C3); agy2api applies **model-family cooldown** on 429 with `RETRY_429_ENABLED` default true and credential-select modes `random`/`cache`/`sticky` — it is not 429-triggered key failover (C2)." Keep the following C5 sentence unchanged.
4. `F-quota-rotation.md:39` (D6): replace "(a) proxies that retry other keys on 429 - CONFIRMED by C1-C4;" with "(a) gcli2api and OmniProxy (capacity-exhausted subscription 429) rotate identities on 429 - CONFIRMED by C1 and C3; agy2api (C2) uses cooldown plus configured credential selection, not 429 key failover; C4 is carried via F7 and was not re-fetched, so it is not part of the directly-confirmed set;". Keep the rest of D6, including the "Do not upgrade D5 to fact" sentence, unchanged.

**Verify**: `rg -n "capacity-exhausted|model-family cooldown" REPORT.md F-quota-rotation.md` → exit 0, matches in both; `rg -n "rotate/fail over to other keys or accounts on 429 \(gcli2api, agy2api, OmniProxy\)|proxies rotate on 429 \(first-party repo docs\)|CONFIRMED by C1-C4" REPORT.md F-quota-rotation.md` → exit 1 (no matches).

### Step 9: DOCS-09 — make R6 illustrative and re-derive it from the live 18.22.2 template (`F-signature-map.md`)

`find`, `lsp`, `ast_grep`, `ast_edit` are real advertised tools in installed 18.22.2 — keep them. The defect is that R6 is presented as literal paste-ready text while its `Before` block is abbreviated from a drifted prompt.

1. `F-signature-map.md:44`: replace with:
   "Each pair below is an **illustrative template**, not a literal string to paste. The `Before` blocks are abbreviated from the system-prompt template: placeholders such as `{{intentField}}` and `{{toolRefs.find}}` render to the session's actual field and tool ids (e.g. `i` and `find` in installed 18.22.2). Before applying any rewrite, verify the `Before` text against the live rendered prompt for that session — a mismatch means the rewrite is a no-op. Preserve array structure, section order, tool ids and schemes verbatim."
2. `F-signature-map.md:126`: replace the R6 header with:
   "R6 - Tool Policy, condensed illustrative excerpt of the installed 18.22.2 template (system-prompt.md:98-139). Confidence High for the placeholder shapes; illustrative, not paste-ready. Keep `find`, `lsp`, `ast_grep`, `ast_edit` and every other advertised tool id."
3. Replace the entire R6 **Before** code fence (lines 129–139) with exactly:
   ```text
   ⁂ Tool Policy
   # General
   Every turn costs seconds: batch all independent reads/searches/checks into one turn. Once the change is verified, stop and report; no extra audits, broad suites, or repo-wide checks unless asked. SHOULD resolve prerequisites, parallelize independent calls. Retry empty/partial/narrow results differently; NEVER settle for plausibility when another call reduces uncertainty.

   # Tool I/O
   - Prefer relative paths.
   {{#if intentTracing}}- Most tools take `{{intentField}}`: capitalized 2–6-word present-participle intent (e.g. "Reading model role settings").{{/if}}

   # Specialized Tools
   {{#has tools "read"}}- File/directory reads: `{{toolRefs.read}}` (directory lists entries).{{/has}}
   {{#has tools "lsp"}}- Language server available: MUST use `{{toolRefs.lsp}}` for definitions, references, hover; code actions for refactors/imports/fixes. NEVER text-search/edit for code intelligence.{{/has}}
   {{#has tools "find"}}- Unknown behavior/location: descriptive `{{toolRefs.find}}` FIRST; NEVER guess `grep`/`glob` targets.{{/has}}

   # Exploration
   NEVER open guessed files.{{#has tools "find"}} Read `{{toolRefs.find}}` hits only.{{/has}}{{#has tools "read"}} Read small files whole; ranges only for large files. NEVER re-read content you already have.{{/has}}
   ```
4. Replace the R6 **After** code fence (lines 141–149) with exactly:
   ```text
   ⁂ Tool Policy
   # General
   Batch independent reads and checks; report once the change is verified. Use `task` subagents only when parallel work is explicitly requested.
   # Tool I/O
   Prefer relative paths. Most tools accept an intent label rendered from `{{intentField}}` (`i` in the installed 18.22.2 session).
   # Specialized tools
   Use `read`/`edit`/`write`/`grep`/`glob`/`find`/`bash`/`lsp`/`ast_grep`/`ast_edit` for their named roles; never shell `grep`/`sed`/`awk` for edits.
   ```
5. `F-signature-map.md:150`: replace the loop-safety line with:
   "Loop-safety: `find`, `lsp`, `ast_grep`, `ast_edit` are real advertised tools in installed 18.22.2 (`find` is in `BUILTIN_TOOL_NAMES`; the live template renders `{{toolRefs.find}}`); no id was removed or renamed. Keep the `xd://report_issue` line if that device is enabled. This is an illustrative rewrite — re-verify the Before block against the live rendered prompt or it is a no-op."

Do not regenerate R1–R5 or R7–R9; their line anchors remain the historical snapshot noted in the Sources line.

**Verify**: `rg -n "illustrative template|BUILTIN_TOOL_NAMES|\{\{intentField\}\}|\{\{toolRefs\.find\}\}" F-signature-map.md` → exit 0, matches in the R6 region; `rg -n "literal documentation string to paste|Most tools take .intent.|Read .find. hits only|every id in the After block is a real advertised tool" F-signature-map.md` → exit 1 (no matches). Confirm the After fence still contains `find`, `lsp`, `ast_grep`, `ast_edit`.

### Step 10: Final docs-only verification

Run every command in the "Commands you will need" table in order. Confirm exact exit statuses (`rg` negative scans must exit 1). Re-read the changed sections to confirm no valid conclusion was removed: the "header spoof impossible on ACP path" statement, all `High`/`Medium`/`Low` labels outside the nine findings, the S1–S17 source table, the R1–R9 rewrites (R2/R6 corrected), and the hard-preserve list (supplemented, not deleted) must all still be present.

**Verify**: all eight commands produce their expected results; `git diff --check` → exit 0; `git status --short` → no new path outside the six in-scope files.

## Test plan

No code tests apply. Verification is the command set above: two stale-phrase `rg` scans, a positive-content scan, a whitespace scan, a secret scan, `git diff --check`, drift/scope checks, and one positive plus one negative `rg` gate per step. There is nothing to build, typecheck, lint, or run.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `rg -n "Detection of clients from prompt text or tool names is \*\*unproven\*\*|no public evidence ties those content surfaces|No evidence that Antigravity/Google inspects prompt text or tool names|No public evidence found tying prompt text|detection via those content surfaces is unproven|For a listed capability|literal documentation string to paste|Most tools take .intent.|Read .find. hits only|can rewrite body fields but never headers|may rewrite body fields but never headers|not spoofable from an extension" docs/research/omp-antigravity-signature-mapping/REPORT.md docs/research/omp-antigravity-signature-mapping/F-signature-map.md` → no matches
- [ ] `rg -n "rotate/fail over to other keys or accounts on 429 \(gcli2api, agy2api, OmniProxy\)|proxies rotate on 429 \(first-party repo docs\)|CONFIRMED by C1-C4|not re-asserted for 18\.22\.2 without a fresh source read|Not observable from omp source|unaffected by that note" docs/research/omp-antigravity-signature-mapping/ docs/research/omp-antigravity-investigation/F-source-google.md` → no matches
- [ ] `rg -n "first-party relay A/B|4 minutes|capacity-exhausted|model-family cooldown|39, 53, 79, 141, 155|MUST read .skill://<name>. first|options\.headers|root_conversation_id|illustrative template|BUILTIN_TOOL_NAMES|Partially affected" docs/research/omp-antigravity-signature-mapping/ docs/research/omp-antigravity-investigation/F-source-google.md` → exit 0, matches in the relevant files
- [ ] The R6 After block still contains `find`, `lsp`, `ast_grep`, `ast_edit`, and the R2 After block still contains the verbatim "MUST read `skill://<name>` first" line
- [ ] `rg -n "[ \t]+$" docs/research/omp-antigravity-signature-mapping/ docs/research/omp-antigravity-investigation/F-source-google.md` → no matches
- [ ] `rg -n "GOCSPX-[A-Za-z0-9_-]{6,}|AIza[0-9A-Za-z_-]{10,}|-----BEGIN [A-Z ]*PRIVATE KEY" docs/research/omp-antigravity-signature-mapping/ docs/research/omp-antigravity-investigation/F-source-google.md` → no matches
- [ ] `git diff --check` → exit 0, no output
- [ ] `git status --short` → no new path outside the six in-scope files versus the Step 0 baseline
- [ ] No secret value or absolute host path was introduced into any doc

## STOP conditions

Stop and report back (do not improvise) if:

- Any `file:line` excerpt in "Current state" does not match the live document (drift since commit `1faaac3`).
- A re-read of the installed 18.22.2 `gemini-headers.ts` disagrees with the constants inlined in Verified fact 2 — the F-header-tls anchors would be wrong.
- The S10 relay A/B or the 1.5.10 changelog text cannot be located in the cited sources and the claim cannot be scoped from the facts inlined here.
- An edit appears to require touching the design spec, implementation plan, `AGENTS.md`, `plans/README.md`, a companion research file, or any code/config/test file — those are owned by other plans or out of scope.
- A negative `rg` check still returns matches after two correction passes.
- You find an actual secret value in a document. Do not echo it; stop and report the file and line only.

## Maintenance notes

- The S10 prompt-identity A/B is relay-reported. Do not upgrade it to a Google publication or extend it to omp's own markers without a controlled A/B on omp's role line/tool names; that distinction is now written into both `REPORT.md` and `F-signature-map.md`.
- Header constants were verified against installed 18.22.2 at explicit lines. If the host version moves past 18.22.2, re-read `gemini-headers.ts` before promoting those anchors again; the 18.18.6 anchors in `F-source-google.md:63-64` must stay labeled historical.
- The 1.5.10 wait-and-retry statement describes CLI turns. An instrumented `agy acp` 1.5.9 trace is the only thing that can settle the ACP-path question; do not infer that 1.5.9 rotates keys.
- The conversation-id reconciliation is deliberately "distinct/unverified". If a future source trace or traffic capture shows the two keys are the same concept, update `F-antigravity-latest.md` F4/G8 and `F-signature-map.md` row 19/Hard preserves together — never from docs alone.
- The 429 headline now distinguishes identity rotation (gcli2api, OmniProxy capacity-exhausted) from cooldown-plus-selection (agy2api). Preserve that split when editing the summary; C4 remains a companion-evidence item, not directly confirmed.
- R6 is illustrative by design. When the installed prompt template changes, re-derive its Before block from the live template; do not paste the abbreviated text into a handler without the guard check.
- Follow-up explicitly deferred to other plans: spec/plan signature scope (plans owned elsewhere) and implementation-plan readiness. This plan intentionally leaves all three untouched.
