# Plan 003: Clean the Antigravity evidence docs so they describe the chosen built-in-CLI design

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If anything in the "STOP conditions" section occurs, stop and report — do not improvise. This is a **documentation-only** plan: edit Markdown in `docs/research/omp-antigravity-investigation/` and nothing else. Do **not** create or update `plans/README.md` — the coordinator maintains the index. Do not create source, config, or test files.
>
> **Drift check (run first)**: `git diff --stat 1e75876..HEAD -- docs/research/omp-antigravity-investigation/` → exit 0. At planning time this directory is untracked, so an empty stat is expected; the drift check is therefore the excerpt comparison in "Current state" below. If any excerpt has changed, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none
- **Category**: docs
- **Planned at**: commit `1e75876`, 2026-11-18
- **Issue**: none

## Why this matters

The design spec cites these research files as evidence in nine places, but three of them still describe a provider architecture that the spec explicitly rejected (Approach A, a custom `agy-byp` provider) and a source snapshot that is not the installed host. The consequence is concrete: an implementer following the citation trail is told to build a provider-registration/token-handling design the spec forbids, is told an env-stripping control exists when it does not, and is told a payload hook fires on the primary path when the CLI transport ignores it. One addendum also leaves an "open question" whose answer is already verified in a sibling report. Cleaning these five documents removes contradictory instructions while preserving every architecture-independent conclusion (above all: `agy` owns tokens/TLS/headers, so header spoofing is impossible) and every properly qualified speculative label. No behavior ships from this plan; it restores trust in the evidence base.

## Current state

All paths are relative to the repo root. There are seven files in `docs/research/omp-antigravity-investigation/`; five are in scope. Two (`F-antigravity-cli-source.md`, `F-antigravity-cli-hooks.md`) were written against the installed 18.22.2 host after the pivot, are internally consistent, and are **read-only references** here.

In-scope files and their role:

- `docs/research/omp-antigravity-investigation/F-evasion-map.md` — technique-to-hook feasibility map; still anchored to the rejected custom provider.
- `docs/research/omp-antigravity-investigation/F-signature.md` — six-surface fingerprint/rewrite analysis; HTTP-CCA-centric, with a partial scope note only.
- `docs/research/omp-antigravity-investigation/F-source-google-addendum.md` — unpause discrepancy; unresolved despite a verified answer.
- `docs/research/omp-antigravity-investigation/F-source-google.md` — 18.18.6 CCA source findings; version skew unlabeled.
- `docs/research/omp-antigravity-investigation/F-omp-docs.md` — published-docs findings; no build stamp, "High" unqualified.

Repo conventions that apply: findings are neutral, cited, and confidence-tagged (`High` = vendor doc / first-party source; `Medium` = first-hand practitioner artifact; `Low` = inference; `Speculative` = no source tie). Never quote secret values. The installed-app client IDs already present are public identifiers and must be left as they are. The design authority is `docs/superpowers/specs/2026-11-18-google-ai-subscription-provider-design.md`; its Approach C (lines 40–49) is the chosen architecture, and its Approach A (lines 32–34) is rejected.

Chosen-design excerpts the rewrite must match (spec `docs/superpowers/specs/2026-11-18-google-ai-subscription-provider-design.md`):

- `:7` — "It never registers a provider, never handles tokens, never relays traffic, and never changes transport identity."
- `:9` — "`antigravity-cli` is the primary path … On the primary path omp issues no HTTP headers, user-agent or authorization header at all — inference lives inside the `agy acp` subprocess, whose built-in transport id is `antigravity-acp`."
- `:32-34` — Approach A "Custom command-backed `agy` provider (rejected)".
- `:40-48` — Approach C chosen; primary `antigravity-cli`, fallback `google-antigravity`, legacy `google-gemini-cli`.
- `:59` — "`scrubPayload()` is strictly scoped to the CCA fallback and legacy HTTP paths, never to `antigravity-cli`."

Verified facts from the two in-scope-excluded CLI reports (quote only the location, not installed absolute paths):

- `F-antigravity-cli-source.md:52` — "There is **no stripping**: both spawn sites inherit all of `Bun.env`. Only three overrides are applied" (`SSH_TTY`, `AGY_CLI_DISABLE_AUTO_UPDATE`, plus the login pair).
- `F-antigravity-cli-source.md:77` — omp emits no HTTP headers, User-Agent or Authorization header on the CLI path.
- `F-antigravity-cli-source.md:106` — `setUnpausedProviders([...])` / `auth.unpausedProviders` re-enables `google-antigravity` in 18.22.2; `antigravity-cli` is not paused.
- `F-antigravity-cli-source.md:115` — upstream HTTP request shape is inside the closed `agy` binary; not derivable from omp source; requires traffic capture.
- `F-antigravity-cli-hooks.md:7,11,12,55` — `before_agent_start` and `context` fire; `before_provider_request` and `after_provider_response` are wired into options but ignored by the CLI transport; CCA payload hooks do not apply.
- `F-antigravity-cli-hooks.md:38-41` — inference argv is fixed; tool shape flows through a loopback MCP bridge as `mcp_ide-tools_<name>`.

Stale excerpts as they exist today (exact `file:line` anchors):

- `F-evasion-map.md:1` — `# F-evasion-map — concrete bypass methods mapped to a command-backed \`agy\` provider`
- `F-evasion-map.md:5-7` — `## Scope and anchor` followed by two blank lines; the heading is empty.
- `F-evasion-map.md:10` — pivot addendum already states the built-in CLI anchor and adds speculative S9.
- `F-evasion-map.md:13` — "Implementation anchor: the chosen design … One omp extension factory registers provider `agy-byp` / API `agy-byp-cli` … `buildPrompt` … `OMP_AGY_BYP_BINARY` … `subscriptionOnlyEnv` (strips seven API-key/Vertex fallback keys) …"
- `F-evasion-map.md:18` — "**Plugin hook vocabulary:** `prompt rewrite` = `buildPrompt` output string (argv[1]); `env strip/inject` = child env object; … `binary choice` = `OMP_AGY_BYP_BINARY` / `Bun.which` …"
- `F-evasion-map.md:43` — Matrix row 18: "**env strip** — already implemented; reliability/billing isolation, not evasion"
- `F-evasion-map.md:51` — "Confidence High that the shape is authentic; unknown whether any detector scores it."
- `F-evasion-map.md:53` — "**Env strip — subscription-lane isolation.** `subscriptionOnlyEnv` already deletes [seven keys] … High confidence …"
- `F-evasion-map.md:55` — "**Fresh subprocess per request.** ... the plugin never caches or reuses tokens."
- `F-evasion-map.md:83` — "… binary choice … prompt rewrite … env strip (credential-lane isolation, not evasion), and argv model selection …"
- `F-signature.md:3` — "Read-only investigation of `<monorepo checkout>` (monorepo v18.18.6; the chatroom plugin pins 18.18.1) …" — the source excerpt contains an absolute monorepo path; the rewrite must use a relative/host-neutral description.
- `F-signature.md:5` — partial scope note covering only F8/F9 and rewritable items 4 and 6.
- `F-signature.md:9` — "Any 'signature scrub' must treat all six" (six surfaces including transport headers).
- `F-signature.md:13-18` — F3 header/UA/envelope imitation analysis, unlabeled HTTP-only.
- `F-signature.md:30` — F9 "Every main-session provider request is already routed through extension payload hooks … the single broadest rewrite surface."
- `F-signature.md:60` — item 4 "… it is the session `onPayload` for all chat requests".
- `F-signature.md:64` — item 6 "… `before_provider_request` can replace `metadata.user_id` in the Anthropic body".
- `F-signature.md:70` — "the practical extension lever is the payload hook + prompt rewrite".
- `F-signature.md:74` — O1 still open about which requests fire `before_provider_request`.
- `F-signature.md:82-84` — `## Delivery note`: "This file is staged at `local://F-signature.md` because a subagent's `write` cannot touch the working tree. Main must materialize it …"
- `F-source-google-addendum.md:3,5,11` — "I could not corroborate …"; "zero occurrences of `unpausedProviders`"; "Open question for Main: reconcile … Do not assert `auth.unpausedProviders` as a working toggle …"
- `F-source-google.md:1,3` — "v18.18.6 snapshot" / "the chatroom plugin pins at 18.18.1".
- `F-source-google.md:149` — Open question 1 checks only 18.18.1 and says "I did not verify" the installed build.
- `F-source-google.md:152` — Open question 4 says no source ties the pause to an enforcement event.
- `F-omp-docs.md:3` — "read-only investigation of omp's published docs (2026-11-18)" with no version stamp.
- `F-omp-docs.md:90` — "Confidence: high for every doc-sourced statement above".
- `F-omp-docs.md:97` — Open question 4 asks whether config `apiKey` can bypass the pause.

At planning time `git status --short` already shows unrelated work by other agents (two modified `docs/superpowers/...` files and the untracked research directory). Record that as the baseline; the executor must add no new path outside the five in-scope files.

## Evidence matrix

| Finding | Target `file:line` | Stale text (exact) | Replacement (intent) | Verify |
|---|---|---|---|---|
| Evasion map anchored to rejected provider | `F-evasion-map.md:1,5-7,13,18,49-55,83` | "command-backed `agy` provider"; "Implementation anchor … `agy-byp` / `agy-byp-cli` … `subscriptionOnlyEnv`" | Built-in `antigravity-cli` / `antigravity-acp`, Approach C; delete the rejected anchor line; re-map hook vocabulary and Feasible list | `rg` check A |
| Env strip claimed implemented | `F-evasion-map.md:43,53` | "**env strip** — already implemented"; "`subscriptionOnlyEnv` already deletes …" | No env-strip hook on built-in path; `Bun.env` inherited with two forced overrides; stripping belonged to rejected Approach A | `rg` check A |
| Native-shape overclaim | `F-evasion-map.md:51` | "Confidence High that the shape is authentic" | High only for using the genuine signed binary; Low for upstream header/TLS shape; needs traffic capture | `rg` check A |
| Payload hook not scoped | `F-signature.md:3,5,9,13-18,26,28,30,60,64,70,74` | "Every main-session provider request …"; "all chat requests"; "payload hook + prompt rewrite" | HTTP CCA paths only; CLI path ignores `onPayload`/`onResponse`; split F1 into HTTP vs CLI surface counts; reconcile O1 | `rg` check B |
| Unpause discrepancy unresolved | `F-source-google-addendum.md:1-11` | "Open question for Main: reconcile …"; "Do not assert …" | Mark RESOLVED: 18.18.6 lacked the symbol; installed 18.22.2 has `auth.unpausedProviders` / `setUnpausedProviders`; docs confirm operator-layer-only, live, broker host too | `rg` check B + positive check |
| Version skew | `F-source-google.md:1,3,14-26,149,152`; `F-signature.md:3`; `F-omp-docs.md:3,90,97` | "chatroom plugin pins 18.18.1"; no version stamp; unqualified "High" | Version banners; 18.22.2 pause still default with stronger reason; doc-assert vs build-verified legend; close open questions | `rg` check B + positive check |
| Staging notes / empty Scope | `F-signature.md:82-84`; `F-evasion-map.md:5-7` | "staged at `local://F-signature.md` … Main must materialize it"; empty `## Scope and anchor` | Delete Delivery note; fill Scope with current anchor | `rg` checks B, C |

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Drift check | `git diff --stat 1e75876..HEAD -- docs/research/omp-antigravity-investigation/` | exit 0; empty stat (directory untracked at plan time) |
| Stale phrase scan A | `rg -n "agy-byp-cli\|OMP_AGY_BYP_BINARY\|subscriptionOnlyEnv\|already implemented\|Confidence High that the shape is authentic\|command-backed .agy. provider" docs/research/omp-antigravity-investigation/` | exit 1 (no matches) |
| Stale phrase scan B | `rg -n "chatroom plugin pins 18\.18\.1\|I could not corroborate\|Open question for Main: reconcile\|staged at .local://F-signature\|^## Delivery note$" docs/research/omp-antigravity-investigation/` | exit 1 (no matches) |
| Empty heading scan C | `rg -n -U "## Scope and anchor\n\n\n" docs/research/omp-antigravity-investigation/` | exit 1 (no matches) |
| Whitespace (untracked docs) | `rg -n "[ \t]+$" docs/research/omp-antigravity-investigation/` | exit 1 (no matches) |
| Secret scan | `rg -n "GOCSPX-[A-Za-z0-9_-]{6,}\|AIza[0-9A-Za-z_-]{10,}\|-----BEGIN [A-Z ]*PRIVATE KEY" docs/research/omp-antigravity-investigation/` | exit 1 (no matches; baseline is clean) |
| Diff hygiene | `git diff --check` | exit 0, no output |
| Scope | `git status --short` | no new path outside the five in-scope files versus baseline |

Notes: `git diff --check` covers tracked modifications only; the `rg` trailing-whitespace command is the gate for the untracked research directory. Do not run `git add` to force the untracked files into the diff.

## Suggested executor toolkit

- Read `F-antigravity-cli-source.md` and `F-antigravity-cli-hooks.md` first; they are the correct post-pivot reference for every replacement below.
- Read the spec's Intent/Approaches/Decisions sections (lines 5–65) before rewriting the evasion map anchor.
- No skills or installs are needed; no build, typecheck, lint, or test command applies to this plan.

## Scope

**In scope** (the only files you may modify):

- `docs/research/omp-antigravity-investigation/F-evasion-map.md`
- `docs/research/omp-antigravity-investigation/F-signature.md`
- `docs/research/omp-antigravity-investigation/F-source-google-addendum.md`
- `docs/research/omp-antigravity-investigation/F-source-google.md`
- `docs/research/omp-antigravity-investigation/F-omp-docs.md`

**Out of scope** (do NOT touch, even though related):

- `docs/research/omp-antigravity-investigation/F-antigravity-cli-source.md` and `F-antigravity-cli-hooks.md` — correct post-pivot evidence; reference only.
- `docs/superpowers/specs/2026-11-18-google-ai-subscription-provider-design.md` and `docs/superpowers/plans/2026-11-18-google-ai-subscription-provider.md` — owned by other plans; already modified at baseline.
- `AGENTS.md` — owned by another plan.
- `plans/README.md` — the coordinator maintains the index; do not create or edit it.
- Any source, config, test, or implementation file. No plugin code is in scope.

## Git workflow

- Branch at planning time: `main`. Do not switch branches.
- Commit message style is conventional (`docs: …`, e.g. the current HEAD `docs: plan command-backed Google subscription provider`); if you are asked to commit, use `docs: clean Antigravity evidence docs after provider pivot`.
- Do not push or open a PR unless explicitly instructed.

## Steps

### Step 0: Record the baseline and confirm the excerpts

Run the drift check, `git status --short`, and the secret/trailing-whitespace scans from the commands table. Confirm the stale excerpts in "Current state" appear at the listed lines. The secret and whitespace scans must already be clean.

**Verify**: `git diff --stat 1e75876..HEAD -- docs/research/omp-antigravity-investigation/` → exit 0, empty stat; `git status --short` → matches the baseline described above; both scan commands → no matches.

### Step 1: Re-anchor `F-evasion-map.md` (title, Scope, stale anchor)

1. Replace line 1 with: `# F-evasion-map — bypass techniques mapped to omp's built-in \`antigravity-cli\` path`
2. Replace the empty `## Scope and anchor` block (lines 5–7) with a real paragraph. It must state: the chosen design is Approach C in `docs/superpowers/specs/2026-11-18-google-ai-subscription-provider-design.md` and the plan in `docs/superpowers/plans/2026-11-18-google-ai-subscription-provider.md`; the extension registers no provider and handles no tokens; primary provider is built-in `antigravity-cli` (API `antigravity-acp`) driving local `agy acp`, with `google-antigravity` the paused HTTP fallback and `google-gemini-cli` legacy; reachable hooks are `before_agent_start`, `context`/`input`, `registerTool`/`setActiveTools`, `tool_call`/`tool_result`, and `PI_AGY_PATH`/inherited env before first spawn. Cross-link the existing pivot addendum and state that the "header spoofing is impossible" conclusion survives unchanged.
3. Delete the stale "Implementation anchor" paragraph at line 13 entirely. Do not preserve any literal rejected identifier (`agy-byp`, `agy-byp-cli`, `buildPrompt`, `OMP_AGY_BYP_BINARY`, `subscriptionOnlyEnv`). If historical context is wanted, say only "the rejected custom-provider approach (Approach A in the design spec)".
4. Replace the "Plugin hook vocabulary" bullet at line 18 with built-in CLI semantics: `prompt rewrite` = `before_agent_start`/`context` output shipped to ACP `_meta.antigravity.systemPrompt.append` and ACP input, never argv; `env` = inherited `Bun.env` with only `SSH_TTY=omp-agy-file-auth` and `AGY_CLI_DISABLE_AUTO_UPDATE=1` forced, no per-request injection API; `argv` = fixed `agy acp --agent bridge --gemini-dir … --ide-mcp-port … --dangerously-skip-permissions`, no argv hook; `binary choice` = `PI_AGY_PATH` or managed SHA-512-verified binary; `tool shaping` = `registerTool`/`setActiveTools`/`tool_call`/`tool_result` under `mcp_ide-tools_<name>`; `header spoof` = not reachable — `agy` owns sockets/TLS/headers and omp emits no HTTP headers on this path. Keep the existing MITM-rejection sentence.

**Verify**: `rg -n "agy-byp|OMP_AGY_BYP_BINARY|subscriptionOnlyEnv|command-backed .agy. provider" docs/research/omp-antigravity-investigation/F-evasion-map.md` → no matches; `rg -n -U "## Scope and anchor\n\n\n" docs/research/omp-antigravity-investigation/F-evasion-map.md` → no matches; `rg -n "^## Scope and anchor$" -A2 docs/research/omp-antigravity-investigation/F-evasion-map.md` → shows the new paragraph.

### Step 2: Re-map the evasion map matrix, Feasible list, and bottom line

1. Rewrite only the "Plugin hook" cells of these Matrix rows; leave the mechanism/practitioner/confidence columns and rows 4, 6, 10–14, 16, 19 untouched:
   - Row 1 → "`binary choice` (`PI_AGY_PATH` / managed verified binary): must be the real signed binary; an override skips SHA-512 verification and is a trust boundary, not a spoofing feature"
   - Row 2 → "`binary choice`: select `antigravity-cli` / `agy`, never `gemini`"
   - Row 3 → "`none` — the child inherits `Bun.env` (two forced overrides); the plugin has no env control"
   - Row 5 → "`no extension hook` — `agy` may read such env, but the plugin cannot inject per-request env on the built-in path; see Rejected R1"
   - Row 7 → "`prompt rewrite` (`before_agent_start`/`context`) — reachable; efficacy for `agy` unverified (Speculative S5)"
   - Row 8 → "`no extension hook` — speculative S1; neither `agy` support nor an injection surface is verified"
   - Row 9 → "`no extension hook` — speculative S2"
   - Row 15 → "`no extension hook` — speculative S3"
   - Row 17 → "model/effort selection via omp model config and `reasoning`; no `--model` argv hook on the built-in path; avoids 400/410, does not escalate"
   - Row 18 → "`none` — no env-strip hook exists on the built-in path; the child inherits `Bun.env` except the two forced overrides (`F-antigravity-cli-source.md:52`). Seven-key stripping belonged to the rejected Approach A; historical context only"
   - Row 20 → "`binary choice` via `PI_AGY_PATH`/managed binary; still third-party orchestration, no guarantee (Speculative S6)"
2. Rewrite the Feasible list at lines 49–55 so every item names a real built-in-path seam:
   - Item 1: replace the `OMP_AGY_BYP_BINARY` sentence with "`PI_AGY_PATH` is a plain env override that skips the managed SHA-512 verification; it is a trust boundary, not an impersonation switch." Then apply the confidence downgrade in step 3.
   - Item 2: replace the `buildPrompt(context)`/`-p` argv claim with "`before_agent_start` and `context` rewrite the system-prompt blocks and messages omp supplies to the ACP session; the text is not an argv string."
   - Item 3 ("Env strip — subscription-lane isolation"): replace with a short "Not reachable on the built-in path" paragraph — no env-strip hook exists, the child inherits `Bun.env` with only the two forced overrides, and the seven-key stripping is a historical Approach A idea (`F-antigravity-cli-source.md:52`).
   - Item 4: replace "`--model` is the one variable payload token" with model/effort selection through omp's model config and `reasoning`; no access escalation.
   - Item 5: replace "Fresh subprocess per request" with "Managed process per account/session" — omp keeps one `agy` process per account/session and restarts it on tools/cwd/credential change; token refresh is owned by omp/agy credential staging and the plugin caches nothing (`F-antigravity-cli-source.md:41`).
3. Downgrade the native-shape claim at line 51. Replace "Confidence High that the shape is authentic; unknown whether any detector scores it." with: "Confidence: High only that the selected binary is omp's genuine signed CLI process; **Low** for the claim that its upstream header/TLS shape matches the native client — the HTTP request shape is inside the closed `agy` binary and is not derivable from omp source (`F-antigravity-cli-source.md:115`); no traffic capture was performed. Whether any detector scores the shape remains unknown." Keep the separate, well-founded statement that header spoofing is structurally impossible.
4. At line 57, add one clause: on the built-in path there is no per-request env injection either, so the `CODE_ASSIST_ENDPOINT` gateway idea belongs to the rejected architecture, not to a reachable hook.
5. Replace the bottom line at line 83 so it lists only built-in-path hooks (binary choice via `PI_AGY_PATH`/managed signed binary; prompt/message rewrite via `before_agent_start`/`context`/`input`; tool shaping via `registerTool`/`setActiveTools`/`tool_call`/`tool_result`; model/effort selection via omp config), states there is no env-strip or argv hook, and keeps "Header spoofing is impossible with a CLI subprocess" with the reason that omp opens no socket on this path.

**Verify**: `rg -n "already implemented|Confidence High that the shape is authentic|argv model selection|subscriptionOnlyEnv" docs/research/omp-antigravity-investigation/F-evasion-map.md` → no matches; `rg -n "no env-strip hook|Low. for the claim|before_agent_start" docs/research/omp-antigravity-investigation/F-evasion-map.md` → at least three matches.

### Step 3: Scope `F-signature.md` to HTTP CCA vs CLI and drop the staging note

1. Replace the scope line at `:3` with a version-stamped version (see Step 5.2) that describes "the omp monorepo at the 18.18.6 snapshot (historical; the installed/host-verified build is 18.22.2 — see `F-antigravity-cli-source.md`)" instead of an absolute monorepo path and the 18.18.1 pin.
2. Expand the partial correction at `:5` into a full scoping paragraph: F3, F7–F9, rewritable items 4–6 and the Net paragraph describe the **HTTP CCA** providers (`google-antigravity`, `google-gemini-cli`); on the primary `antigravity-cli` path (`antigravity-acp`) omp emits no HTTP headers/UA/Authorization (`F-antigravity-cli-source.md:77`), `onPayload`/`onResponse` are set in options but never read, so `before_provider_request` and `after_provider_response` do not fire (`F-antigravity-cli-hooks.md:7,11,55`); only `before_agent_start`, `context`/`input` and tool definitions/events are reachable there.
3. Retitle F1 at `:9`: "**F1. The visible surface count depends on the transport.**" Keep the six-surface list as the HTTP-CCA case, and add that on `antigravity-cli` there is no omp-controlled transport surface, so only prompt, tool schemas and messages are reachable for content shaping. Remove "Any 'signature scrub' must treat all six" as an unqualified instruction.
4. Prefix F3 (`:13-18`) with "(HTTP CCA fallback/legacy only.)". Add to F7 (`:26`) that the CLI transport sets but ignores `onPayload`/`onResponse`. Prefix F8 (`:28`) with "(HTTP CCA providers only.)".
5. Rewrite F9 (`:30`) so the "every main-session request"/"single broadest rewrite surface" claim is explicitly limited to HTTP CCA paths, and add a sentence that on `antigravity-cli` the hook is wired into options but ignored by the transport and is therefore not a rewrite surface there.
6. Add "(HTTP CCA paths only; does not fire for `antigravity-cli`)" to rewritable item 4 (`:60`) and "(HTTP CCA paths only)" to item 6 (`:64`). Keep their loop-risk and envelope-preservation warnings unchanged.
7. Rewrite the Net paragraph (`:70`): the payload-hook lever applies to HTTP CCA paths; on the primary CLI path the reachable loop-safe set is {system prompt, messages, tool descriptions}, and header/envelope imitation is owned by `agy`.
8. Close O1 (`:74`): on `antigravity-cli` the answer is no — `before_provider_request` does not fire; on HTTP side requests (compaction, direct `google-antigravity`, judges) it remains unverified for image generation. Preserve the other open questions O2–O7 verbatim.
9. Delete the whole `## Delivery note` section (`:82-84`) — the file is already materialized in the working tree.

**Verify**: `rg -n "Every main-session provider request|all chat requests|payload hook \+ prompt rewrite|staged at .local://F-signature|^## Delivery note$|chatroom plugin pins 18\.18\.1|Any .signature scrub. must treat all six" docs/research/omp-antigravity-investigation/F-signature.md` → no matches; `rg -n "HTTP CCA|ignored by the CLI transport|does not fire" docs/research/omp-antigravity-investigation/F-signature.md` → at least five matches.

### Step 4: Resolve `F-source-google-addendum.md`

Replace the file body (keep a single `## Addendum — unpause mechanism discrepancy (RESOLVED 2026-11-18)` heading) with a resolution note containing exactly these facts, in prose:

- Status RESOLVED: the discrepancy was a version skew, not a contradiction.
- The original grep result (no `unpausedProviders`) stands for the 18.18.6 monorepo snapshot only.
- The installed/host-verified build is 18.22.2. In that build `unpausedProviders` / `setUnpausedProviders` exist at `pi-ai/src/registry/oauth/index.ts:36-37,62-64,98`, `pi-coding-agent/src/config/model-settings.ts:75,92`, and `auth-broker-config.ts:153`; CHANGELOG entries confirm the addition.
- `omp://settings.md` § "Paused providers" documents `auth.unpausedProviders`: global config, `--config` files and runtime overrides only (a project `.omp/config.yml` cannot unpause), effective live in a running session, and the auth-broker host must set it too. Cross-reference `F-omp-docs.md:14,58,82` and `F-antigravity-cli-source.md:106`.
- Conclusion: `auth.unpausedProviders` is a valid operator-layer toggle in the installed 18.22.2 build; `google-antigravity` remains paused by default. The old "Open question for Main" and the warning against asserting the toggle are superseded. Extension reclaim of a paused provider id remains a distinct surface documented at `F-source-google.md:22,90`.
- Replace the `local://F-omp-docs.md` peer-artifact pointer with the in-repo path `F-omp-docs.md`. No secret values.

**Verify**: `rg -n "I could not corroborate|Open question for Main: reconcile|Do not assert|local://F-omp-docs" docs/research/omp-antigravity-investigation/F-source-google-addendum.md` → no matches; `rg -n "RESOLVED 2026-11-18|auth.unpausedProviders|setUnpausedProviders" docs/research/omp-antigravity-investigation/F-source-google-addendum.md` → at least three matches.

### Step 5: Add version banners and close version-skew open questions

1. In `F-source-google.md`, after the scope line at `:3`, insert a banner: this is a source snapshot of the omp monorepo at 18.18.6 (the earlier plugin pin was 18.18.1); the host verified by the CLI slices is 18.22.2; findings below describe 18.18.6; 18.22.2 still pauses `google-antigravity` by default but with a stronger stated reason (terms violation, account suspensions, issue #18341) plus an explicit login-warning; treat 18.18.6-only constants as historical until re-read against the installed build. Do not change any source `file:line` citation in the Evidence list.
2. In `F-signature.md`, apply the scope line from Step 3.1 (this completes its version banner).
3. In `F-source-google.md:149`, replace Open question 1 with a resolved/historical note: the 18.18.1 pin is historical; the current verification target is the installed 18.22.2 build (`F-antigravity-cli-source.md`); the snapshot's constants (pause, 2.26.0 UA lookup, `retrieveUserQuotaSummary`) are 18.18.6 facts and are not re-asserted for 18.22.2 without a fresh source read.
4. In `F-source-google.md:152`, append to Open question 4: 18.22.2 adds a stronger pause reason and an explicit login-warning (see banner); causation is still not established in code.
5. In `F-omp-docs.md:3`, replace the scope line with: "Scope: read-only investigation of omp's published docs from the installed 18.22.2 host (2026-11-18). No repository source was edited. 'High' below means high confidence in what the docs assert; claims corroborated in installed source are cross-referenced to `F-antigravity-cli-source.md` / `F-source-google-addendum.md`."
6. In `F-omp-docs.md:90`, replace the bare "Confidence: high for every doc-sourced statement above" with a split legend: "High = an explicit assertion in the installed 18.22.2 doc set, not independent runtime verification. Where a claim is corroborated in installed source it is cross-referenced (e.g. the unpause result in `F-source-google-addendum.md`); otherwise it remains doc-only."
7. In `F-omp-docs.md:97`, replace Open question 4 with a resolved note: `omp://settings.md` (Paused providers) and `pi-catalog/src/compat/rules/README.md:424` confirm the operator-layer-only `auth.unpausedProviders` seam; a config `apiKey` does not bypass the pause; see `F-source-google-addendum.md`. Keep open questions 1–3 and 5–10 verbatim.

**Verify**: `rg -n "chatroom plugin pins 18\.18\.1|Confidence: high for every doc-sourced statement above" docs/research/omp-antigravity-investigation/` → no matches; `rg -n "18\.22\.2" docs/research/omp-antigravity-investigation/F-source-google.md docs/research/omp-antigravity-investigation/F-signature.md docs/research/omp-antigravity-investigation/F-omp-docs.md` → at least one match in each file.

### Step 6: Final docs-only verification

Run every command in the "Commands you will need" table, in that order. Confirm the exact expected exit status for each (note: `rg` exits 1 when there are no matches — that is success for the negative checks). Then re-read the five changed files' headings and the two CLI references to confirm no valid conclusion was removed: the "header spoof impossible" statement must still appear in `F-evasion-map.md` and `F-antigravity-cli-hooks.md`; the HTTP CCA analysis in `F-signature.md` must remain intact, only labeled; the Speculative S1–S8 labels in `F-evasion-map.md` must remain; the peer-finding citations in `F-evasion-map.md:11` and `F-signature.md` Evidence table must resolve.

**Verify**: all ten commands produce their expected results; `git diff --check` → exit 0; `git status --short` → no new path outside the five in-scope files.

## Test plan

No code tests apply. The verification is the command set above: three stale-phrase `rg` scans, an empty-heading scan, a whitespace scan, a secret scan, a positive-content check per rewritten claim, `git diff --check`, and a scope check. There is nothing to build or type-check.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `rg -n "agy-byp-cli\|OMP_AGY_BYP_BINARY\|subscriptionOnlyEnv\|already implemented\|Confidence High that the shape is authentic\|command-backed .agy. provider" docs/research/omp-antigravity-investigation/` → no matches
- [ ] `rg -n "chatroom plugin pins 18\.18\.1\|I could not corroborate\|Open question for Main: reconcile\|staged at .local://F-signature\|^## Delivery note$" docs/research/omp-antigravity-investigation/` → no matches
- [ ] `rg -n -U "## Scope and anchor\n\n\n" docs/research/omp-antigravity-investigation/` → no matches
- [ ] `rg -n "[ \t]+$" docs/research/omp-antigravity-investigation/` → no matches
- [ ] `rg -n "GOCSPX-[A-Za-z0-9_-]{6,}\|AIza[0-9A-Za-z_-]{10,}\|-----BEGIN [A-Z ]*PRIVATE KEY" docs/research/omp-antigravity-investigation/` → no matches
- [ ] `rg -n "18\.22\.2" docs/research/omp-antigravity-investigation/F-source-google.md docs/research/omp-antigravity-investigation/F-signature.md docs/research/omp-antigravity-investigation/F-omp-docs.md` → at least one match in each of the three files
- [ ] `rg -n "RESOLVED 2026-11-18" docs/research/omp-antigravity-investigation/F-source-google-addendum.md` → one match
- [ ] `git diff --check` → exit 0, no output
- [ ] `git status --short` → no new path outside the five in-scope files versus the Step 0 baseline
- [ ] The architecture-independent conclusion "header spoofing is impossible" survives in `F-evasion-map.md`, and no Speculative/Rejected label was deleted

## STOP conditions

Stop and report back (do not improvise) if:

- The design spec no longer names Approach C as chosen and `antigravity-cli` as primary at the lines quoted in "Current state" — the anchor would be unknown.
- Any `file:line` excerpt in "Current state" does not match the live document (drift since commit `1e75876`).
- A correction appears to require editing `AGENTS.md`, the spec, the implementation plan, `plans/README.md`, or either CLI reference document — those are owned by other agents/plans.
- The addendum's 18.22.2 symbol locations or the 18.22.2 pause-reason details cannot be reconciled with a source you can read, and the change goes beyond the facts inlined here.
- A negative `rg` check still returns matches after two correction passes.
- You find an actual secret value in a document. Do not echo it; stop and report the file and line only.

## Maintenance notes

- The "header spoof impossible with a CLI subprocess" conclusion is architecture-grounded and cross-checked in three reports; keep it even if the technique matrix is later reshaped.
- The unpause reconciliation now lives in `F-source-google-addendum.md`. Do not re-open it without new source evidence; if the host version changes, re-check `pi-ai/src/registry/oauth/index.ts` and the `omp://settings.md` Paused providers section.
- Version banners are deliberately snapshot-specific. When the pinned host moves past 18.22.2, re-verify the pause reason, UA/version manifest lookup and quota endpoint before promoting any 18.18.6 constant to a current claim.
- Follow-up explicitly deferred to other plans: `AGENTS.md` architecture rewrite, spec/plan signature/default/alias alignment, and implementation-plan readiness. This plan intentionally leaves all three untouched.
