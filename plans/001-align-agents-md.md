# Plan 001: Make AGENTS.md describe the chosen built-in-provider architecture

> **Executor instructions**: Follow this plan step by step. Run every verification
> command and confirm the expected result before moving to the next step. If
> anything in the "STOP conditions" section occurs, stop and report — do not
> improvise. This is a **documentation-only** change: you must modify exactly one
> file, `AGENTS.md`. Do not create `plans/README.md` (it does not exist at the
> planned-at SHA and is owned by the main agent); do not touch any source,
> manifest, test, spec, plan, or research file.
>
> **Drift check (run first)**: `git diff --stat 1e75876..HEAD -- AGENTS.md`
> Expected: no output. If `AGENTS.md` changed since that SHA, compare the
> "Current state" excerpts against the live file before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: docs (direction alignment)
- **Planned at**: commit `1e75876`, 2026-11-18
- **Issue**: omit

## Why this matters

`AGENTS.md` is the first file an AI assistant reads in this repo, so it acts as
executable guidance. It currently prescribes an architecture that the final
design explicitly rejected: a custom provider plus OAuth registration, a custom
`streamSimple` transport, a Cloud Code Assist forwarding layer, a config file,
a `skills` directory in the package, and a `dist/index.js` load check. The
authoritative design has since pivoted to augmenting omp's built-in
`antigravity-cli` provider with default-off content hooks behind a single
`/agy-byp` toggle, driven only by environment variables and shipped as
`files: ["src", "README.md"]`. Leaving the old text in place makes every future
assistant implement the wrong plugin. Rewriting it aligns the repo's own guidance
with the spec and implementation plan and removes the contradiction at its
source.

## Current state

**The only in-scope file**:
- `AGENTS.md` (repo root) — repo guidance read by AI assistants; committed at
  `1e75876` and currently unmodified. It is the only file you may edit.

**Authoritative inputs — READ ONLY, never edit**:
- `docs/superpowers/specs/2026-11-18-google-ai-subscription-provider-design.md`
  — final design; Approach C (built-in augmentation) is chosen, Approaches A/B
  are rejected.
- `docs/superpowers/plans/2026-11-18-google-ai-subscription-provider.md` —
  implementation plan; the concrete file list, env vars, hook set, and command
  semantics live here.
- Both documents are already edited in the working tree relative to `1e75876`;
  treat their **current working-tree content** as authoritative. Do not stage,
  revert, or reformat them.

**Verbatim stale excerpts in `AGENTS.md` as read at `1e75876`** (snapshot
`6F6F`). Every one of these is contradicted by the spec/plan and must go:

- `AGENTS.md:5` — "...plus the design guidance for an omp plugin that would use
  a Google AI subscription inside omp. Today the tree contains only committed
  research under `docs/research/google-ai-subscription-blocks/`; no plugin code
  exists yet." (Missing the authoritative spec/plan paths.)
- `AGENTS.md:11` — "that factory is the only wiring point and registers the
  provider, OAuth provider, commands, flags, and a host-drift warning."
- `AGENTS.md:15` — "The login flow obtains a consumer subscription OAuth grant
  and stores it in the host auth storage."
- `AGENTS.md:16` — "A request enters the extension-owned provider's
  `streamSimple`, which returns an event stream immediately and does async work
  behind it."
- `AGENTS.md:17` — "The auth adapter supplies the bearer token; the entitlement
  module resolves paid tier, project, and quota snapshots."
- `AGENTS.md:18` — "The relay builds the JSON body and streams from the Cloud
  Code Assist endpoint, then translates server-sent events into canonical
  assistant-message events."
- `AGENTS.md:19` — "Authentication and entitlement failures trigger
  re-authentication or entitlement recheck; rate limits are normalized..."
- `AGENTS.md:23` — "A command-backed provider that delegates to the current
  official CLI is the more robust variant; verify the live endpoint before
  assuming the older relay still works." (The built-in CLI provider *is* that
  robust variant now; no second wrapper or forwarding layer is wanted.)
- `AGENTS.md:28` — "`src/` — future extension source. One entry (`index.ts`),
  `version.ts`, `ids.ts`, then thin seams under `provider/`, `auth/`, and
  `relay/`."
- `AGENTS.md:30` — "`skills/<name>/SKILL.md` — one-level skills discovered by
  convention; the manifest has no skills field."
- `AGENTS.md:46` — "`omp models -e <absolute path to dist/index.js>  # quick
  load check of a built plugin`"
- `AGENTS.md:51` — "Keep `package.json` `files` tight (`src`, `skills`,
  `README.md`) so research docs and helper scripts stay out of installs."
- `AGENTS.md:59` — "Register tools, commands, and hooks from the one factory.
  Tool execute takes five arguments and returns a result with `content` and
  `details`; failures are results, not throws."
- `AGENTS.md:62` — "Own configuration in a real config file surfaced through a
  command; clamp every numeric value, since a zero cap can disable the plugin
  for everyone."
- `AGENTS.md:63` — "Store subscription credentials in the host auth storage,
  file mode restricted; never log tokens."
- `AGENTS.md:71` — "`package.json` — future manifest: ... Point `omp.extensions`
  at the file that actually loads (`src/index.ts` unbundled, `dist/index.js`
  bundled)."
- `AGENTS.md:72` — "`src/ids.ts` — provider id, endpoint constants, OAuth and
  identity constants."

**Authoritative facts to inline into the rewritten `AGENTS.md`** (quoted from
the current working-tree spec/plan — copy these meanings, do not re-derive them):

- Design spec line 7: "It never registers a provider, never handles tokens,
  never relays traffic, and never changes transport identity." — Paraphrase
  this without using the banned literal `relay` (see "Must not contain" below).
- Design spec line 16: "Stay **inert by default (OFF)**: no hook runs, no
  provider state is requested, and nothing is unpaused until the user flips the
  manual toggle."
- Design spec line 17: "Expose an explicit `/agy-byp on|off|status` slash
  command (aliases `enable`/`disable`) as the only manual toggle".
- Design spec line 23 (non-goal): "Registering or overriding a provider, taking
  over login, reimplementing OAuth, extracting or storing tokens, editing config
  files, or relaying requests through a gateway."
- Design spec line 40: "C. Augment the built-in providers with opt-in content
  hooks (chosen)"; lines 32 and 36 mark the custom-provider and custom-CCA
  approaches as rejected.
- Design spec lines 55–56: primary `antigravity-cli` (auth id and provider id;
  built-in API `antigravity-acp`); fallback `google-antigravity`; legacy
  `google-gemini-cli`; `google` and `google-vertex` explicitly excluded. "The
  plugin does not route between them — the user selects a model/provider in omp
  as usual".
- Design spec line 57: "at load the factory registers hooks and the command,
  loads config, and sets state to off." Nothing is unpaused, no config file is
  written, no network call at load.
- Design spec line 59: three hooks — `before_agent_start` (system prompt),
  `context` (messages), `before_provider_request` (CCA payload). "the CLI stream
  ignores `onPayload`/`onResponse`, so neither `before_provider_request` nor
  `after_provider_response` runs for its inference."
- Design spec line 64: "Config tunes behaviour, not activation:
  `OMP_AGY_BYP_MODE=generic|native`, default `generic` ...;
  `OMP_AGY_BYP_SCRUB_TOOL_DESCRIPTIONS=1` ...;
  `OMP_AGY_BYP_UNPAUSE_FALLBACK` ... Neither variable can turn the plugin on or
  request unpause." (The spec and plan differ on the tool-description flag's
  default: spec says enabled, plan Task 2 uses `false`. Do **not** assert a
  default value in `AGENTS.md`; name the variable and defer exact semantics to
  the spec/plan.)
- Plan line 5: goal is to shape omp's outgoing content "off by default and
  enabled only by an explicit `/agy-byp on` command — while leaving the built-in
  `antigravity-cli` provider and its locally managed `agy acp`, OAuth grant, and
  native client identity untouched."
- Plan line 7: "`antigravity-cli` is **primary** (local `agy acp`,
  `/login antigravity-cli`, `PI_AGY_PATH`, OAuth grant exported into omp's
  credential store, native identity/headers/UA owned by the CLI)".
- Plan line 19: "The plugin registers **no** provider, **no** OAuth flow,
  **no** CLI subprocess, and **no** HTTP relay." (Reproduced verbatim here;
  the rewritten `AGENTS.md` must use "gateway"/"custom transport" wording
  instead of this literal — see "Must not contain" below.)
- Plan line 20: "**Default OFF, explicit toggle only.** ... `state.enabled`
  starts `false`; hooks return `undefined` while off. The only state change is
  the user's `/agy-byp on|off|status` command."
- Plan line 21: unpause of the fallback happens **only** inside the explicit
  `on` command via `setUnpausedProviders` from
  `@oh-my-pi/pi-ai/registry/oauth`, and is guarded by
  `OMP_AGY_BYP_UNPAUSE_FALLBACK=0`; `off` never re-pauses or deactivates.
- Plan line 22: "Register exactly three hooks — `before_agent_start`, `context`,
  `before_provider_request` — and one command `/agy-byp` accepting
  `on|off|status`, from one default-exported factory in `src/index.ts`."
- Plan line 23: `before_provider_request` is unreachable on `antigravity-cli`;
  gate it to the HTTP-backed `google-antigravity` and `google-gemini-cli`
  providers only; never emit a header/UA rewrite.
- Plan line 25: "Scrub **content only**. Never change tool names, tool-call ids,
  labels, `sessionId`, `requestId`, `userAgent`, headers, or User-Agent. Never
  add, remove, or rename payload/message fields."
- Plan line 30: "Keep `package.json` `files` to `["src", "README.md"]`; keep
  `docs/` out of installs."
- Plan line 634 (HANDOFF block): `omp models -e /absolute/path/to/omp-agy-byp/src/index.ts`
  — the load check targets `src/index.ts`, not a bundled output.
- Plan line 637: `-e` must follow the subcommand, `--help` never loads
  extensions, exit status is zero on load failure, and stderr must be read for
  `Failed to load extension`.

**Repo conventions that remain valid and should be kept**: Bun-only commands
(`bun`, `bunx --bun`, never `node`/`npm`/`npx`); static imports of host packages
because dynamic host-specifier imports fail in the loader; never write to stdout
from extension code; use `ctx.setInterval`/`setTimeout`/`clearTimer` rather than
raw timers; pin the exact dev host version and assert it in a drift test; keep
test helpers as pure functions with injected boundary functions; coordinate
with peer agents through the room. Keep the research convention
`docs/research/<topic>/` with `brief.md`, `REPORT.md`, and
`findings/F<N>.md`, and the claim-label rule in `brief.md` (primary, secondary,
inference, speculative).

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Drift check | `git diff --stat 1e75876..HEAD -- AGENTS.md` | no output |
| Stale-term scan | `rg -n 'registerOAuthProvider\|streamSimple\|relay\|provider/\|auth/\|dist/index\.js' AGENTS.md` | no matches; exit 1 |
| Whitespace check | `git diff --check -- AGENTS.md` | exit 0, no output |
| Scope check | `git status --short` | only ` M AGENTS.md` is new; the pre-existing spec/plan edits and untracked `docs/research/omp-antigravity-investigation/` are unchanged |

(The stale-term scan above is written with escaped `\|` only for display inside
this markdown table. Run the real single-quoted alternation form:
`rg -n 'registerOAuthProvider|streamSimple|relay|provider/|auth/|dist/index\.js' AGENTS.md`.)

All commands are docs-only. Do **not** run `bun install`, typecheck, lint, or
tests: no plugin code exists at the planned-at SHA.

## Scope

**In scope** (the only file you should modify):
- `AGENTS.md`

**Out of scope** (do NOT touch, even though they look related):
- `docs/superpowers/specs/2026-11-18-google-ai-subscription-provider-design.md`
  and `docs/superpowers/plans/2026-11-18-google-ai-subscription-provider.md` —
  authoritative inputs; read them, never edit them.
- `docs/research/**` — committed research, including the untracked
  `docs/research/omp-antigravity-investigation/` directory.
- `plans/README.md` — does not exist at `1e75876`; creating it is out of scope.
- Any implementation artifact: `src/`, `tests/`, `package.json`, `tsconfig.json`,
  `biome.json`, `README.md`, `HANDOFF.md`, `LICENSE`, `.gitignore`, `scripts/`.
  The user explicitly deferred all plugin implementation.

## Steps

### Step 1: Confirm drift and read the authoritative pair

1. Run `git diff --stat 1e75876..HEAD -- AGENTS.md`. Expected: no output.
2. Read `AGENTS.md` in full and confirm the stale excerpts in "Current state"
   are present.
3. Read both authoritative documents named above. They define the chosen
   architecture; `AGENTS.md` is only a summary of them.

**Verify**: drift command produced no output, and every quoted stale excerpt
was located in the live `AGENTS.md`. If not, STOP.

### Step 2: Rewrite `AGENTS.md` in place

Keep all nine existing top-level headings, in this order, and replace their
bodies:

1. `# Repository Guidelines`
2. `## Project Overview`
3. `## Architecture & Data Flow`
4. `## Key Directories`
5. `## Development Commands`
6. `## Code Conventions & Common Patterns`
7. `## Important Files`
8. `## Runtime/Tooling Preferences`
9. `## Testing & QA`

Use these section-by-section instructions. They are exhaustive — do not add
other architecture claims from memory.

- **Project Overview**: keep the research-snapshot paragraph (dated
  `REPORT.md`, 127 sources, claim labels, research scope includes blocks and
  bypasses). Add that the tree now also holds the design spec and implementation
  plan under `docs/superpowers/`, and that those two files are **authoritative**
  for the plugin design while `AGENTS.md` is a summary that must not contradict
  them. State plainly that no plugin code exists yet.
- **Architecture & Data Flow**: replace the entire section. Describe one
  in-process extension whose single default-exported factory in `src/index.ts`
  is the only wiring point. It registers exactly three hooks —
  `before_agent_start` (system prompt), `context` (messages), and
  `before_provider_request` (HTTP-provider payload text only) — and one
  `/agy-byp on|off|status` command. It augments built-in providers; it does not
  register a provider or an OAuth handler, does not implement a token flow,
  does not spawn a CLI, does not carry inference traffic through a custom
  gateway, and does not write a config file. Start state OFF; hooks are inert
  until the explicit toggle; nothing is unpaused at load. Include the provider
  layering: `antigravity-cli` primary built-in (`agy acp`, `/login
  antigravity-cli`, `PI_AGY_PATH`, omp-managed credentials, CLI-owned native
  identity, built-in API `antigravity-acp`); `google-antigravity` optional
  HTTP fallback that is paused until the `on` command requests unpause;
  `google-gemini-cli` legacy; `google` and `google-vertex` out of scope. Explain
  that the payload hook never fires for `antigravity-cli` because that transport
  ignores `onPayload`, and that scrubbing is content-only: rewrite omp-specific
  strings while preserving tool names, tool-call ids, labels, `sessionId`,
  `requestId`, headers, User-Agent, and section/array structure. Keep the rule
  that diagnostics go to the host logger or stderr, never stdout.
- **Key Directories**: keep the `docs/research/<topic>/` convention. Add
  `docs/superpowers/specs/` and `docs/superpowers/plans/` as the authoritative
  design pair. Describe `src/` as future extension source with `index.ts` as
  the single entry point plus small modules (`version.ts`, `ids.ts`,
  `config.ts`, `providers.ts`, `patterns.ts`, `system-prompt.ts`, `payload.ts`);
  explicitly say there are no dedicated provider, auth, or forwarding
  subdirectories — those seams were rejected. Keep `tests/` as the future
  `*.test.ts` suite, and `HANDOFF.md` for human-only checks. Delete the
  `skills/<name>/SKILL.md` bullet and the speculative `scripts/` bullet.
- **Development Commands**: keep the Bun commands (`bun install`, the
  `tsc`/`biome`/`bun test` lines, `omp plugin link`, `omp plugin doctor`) but
  label them as applying once the scaffold exists, since no plugin code is
  committed yet. Replace the `dist/index.js` load-check line with
  `omp models -e <absolute path to omp-agy-byp>/src/index.ts`. Keep the
  caveats: `-e` follows the subcommand, `--help` never loads extensions, exit
  code is zero on load failure, read stderr for the load error, and no hot
  reload. Replace the `files` sentence with: `package.json` `files` is exactly
  `["src", "README.md"]`, keeping research docs and helper scripts out of
  installs; no `skills` entry. Note that marketplace catalog entries live in a
  separate catalog repo.
- **Code Conventions & Common Patterns**: keep the still-valid bullets
  (Bun-only; static host imports; no stdout; `ctx` timers; pure helpers with
  injected boundaries; pin the host version and assert it in a drift test;
  peer-agent coordination through the room). Replace "Register tools, commands,
  and hooks from the one factory..." with: register exactly three hooks and the
  one `/agy-byp` command from the factory; never call provider or OAuth
  registration APIs and never register tools. Replace "Own configuration in a
  real config file..." with: configuration is environment-only via
  `OMP_AGY_BYP_*` variables read from `process.env`; no config file is created,
  read, or edited; env vars tune behavior, never activation. Replace "Store
  subscription credentials in the host auth storage..." with: the plugin never
  handles, extracts, or stores tokens; omp owns OAuth credentials for the
  built-in providers; never log credential values. Add that scrub helpers must
  be pure and that only boundary functions (unpause, pause-reason lookup, clock)
  may be injected in tests.
- **Important Files**: keep the three research-doc bullets. Add the two
  `docs/superpowers/` authoritative paths. Rewrite the `package.json` bullet:
  name/version/license/module type, `omp.extensions` pointing at
  `./src/index.ts`, `files: ["src", "README.md"]`, no `skills`. Rewrite the
  `src/index.ts` / `src/version.ts` / `src/ids.ts` bullet: `index.ts` is the
  single wiring point; `version.ts` holds the host pin and tracked host
  specifiers; `ids.ts` holds the primary/fallback/legacy provider ids and the
  toggle command name — not endpoint/OAuth/identity constants. Keep `LICENSE`,
  `README.md`, and `HANDOFF.md`; keep `.omp/extensions/` as a machine-local
  shim. Remove every mention of a bundled `dist/index.js`.
- **Runtime/Tooling Preferences**: keep the existing bullets (Bun 1.4.4+,
  TypeScript ESM, `type: module`, pinned dev host, `bun check` as pre-filter
  only, no script named `check`, `uv`/`ruff`/`ty` if Python is ever added, no
  system-wide installs, extensions loaded once per session). Add that runtime
  configuration is env-only and cannot activate the plugin.
- **Testing & QA**: keep the gate order (`tsc`, `biome`, `bun test`) and the
  "run once by the main agent after changes land" rule, and the note that
  live terminal probes and interactive login checks are human-only and belong
  in `HANDOFF.md`. Add a leading sentence that the gates apply once the
  implementation scaffold exists — at this commit there is no runnable suite.

**Must state somewhere in the rewritten file**:
- The spec and plan paths are authoritative; `AGENTS.md` must not contradict
  them.
- `antigravity-cli` is the primary built-in path and is left untouched by the
  plugin.
- Default OFF; hooks inert until `/agy-byp on`; no auto-activation and no
  unpause at load.
- `/agy-byp on|off|status` (aliases `enable`/`disable`) is the only state
  writer; `on` requests fallback unpause via the host API, `off` does not
  re-pause or deactivate, `status` emits no secrets.
- Exactly three hooks and one command, registered from one factory in
  `src/index.ts`; the payload hook never fires on `antigravity-cli`.
- Configuration is environment-only (`OMP_AGY_BYP_MODE`,
  `OMP_AGY_BYP_SCRUB_TOOL_DESCRIPTIONS`, `OMP_AGY_BYP_UNPAUSE_FALLBACK`), read
  from `process.env`; it tunes behavior, never activation; do not assert the
  tool-description flag's default because spec and plan differ.
- `files: ["src", "README.md"]`; `docs/` and `skills` are not shipped.
- Load check uses `src/index.ts`, with the four caveats listed above.

**Must not contain — literal tokens checked by `rg`**:
`registerOAuthProvider`, `streamSimple`, `relay` (any case, including inside
words), `provider/`, `auth/`, `dist/index.js`. In particular, do **not** write
"no relay", "the relay", "provider/auth seams with a slash", or "bundled dist
output" using those literals. Say "gateway", "custom transport", "dedicated
provider and auth subdirectories", and "`src/index.ts`" instead. Also do not
claim that the plugin registers a provider, implements OAuth, stores tokens,
spawns `agy`, writes a config file, or ships `skills`.

**Verify**: run the stale-term scan from "Commands you will need". Expected:
no matches, exit 1.

### Step 3: Docs-only verification

1. `rg -n 'registerOAuthProvider|streamSimple|relay|provider/|auth/|dist/index\.js' AGENTS.md` → no output, exit 1.
2. `git diff --check -- AGENTS.md` → exit 0, no output.
3. `git status --short` → ` M AGENTS.md` is the only new change; the
   pre-existing ` M docs/superpowers/plans/...`, ` M docs/superpowers/specs/...`,
   and `?? docs/research/omp-antigravity-investigation/` entries must be
   untouched.

**Verify**: all three commands produced the expected results.

## Test plan

No tests apply — this is a documentation-only plan. Do not create or run test
files. The gate is the stale-term `rg` scan plus `git diff --check` and
`git status --short` above.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `rg -n 'registerOAuthProvider|streamSimple|relay|provider/|auth/|dist/index\.js' AGENTS.md` returns no matches (exit 1).
- [ ] `git diff --check -- AGENTS.md` exits 0.
- [ ] `git status --short` shows `AGENTS.md` as the only newly modified file; the spec/plan edits and untracked research directory are unchanged.
- [ ] All nine headings listed in Step 2 are still present, in order.
- [ ] The rewritten file states every "Must state" item above.
- [ ] No file other than `AGENTS.md` was written.

## STOP conditions

Stop and report back (do not improvise) if:

- `git diff --stat 1e75876..HEAD -- AGENTS.md` shows drift, or the quoted
  excerpts do not match the live `AGENTS.md`.
- Either authoritative document is missing, or its current content describes a
  different architecture than the facts inlined here (for example a newer
  pivot). Reporting that discrepancy is the correct outcome — do not pick a
  side or guess.
- The stale-term scan still finds a match after one complete rewrite pass.
- Carrying out the rewrite appears to require changing any file other than
  `AGENTS.md`.
- You are asked to create `plans/README.md`, run an implementation gate, or
  write plugin code; all are out of scope.

## Maintenance notes

- `AGENTS.md` is a summary of the spec and plan. When either authoritative
  document changes, update `AGENTS.md` in the same change so they cannot drift
  again.
- The `files` list and the load-check path are coupled: if the entry point ever
  moves, update both the manifest description and the `omp models -e` command
  together.
- The tool-description env flag's default differs between the current spec and
  plan. `AGENTS.md` deliberately omits that default; whoever resolves the
  discrepancy should update both authoritative documents first, then decide
  whether the summary needs the value.
- At the planned-at SHA there is no plugin code. When the implementation scaffold
  lands, revisit "Development Commands" and "Testing & QA" so they describe
  real, runnable commands rather than anticipated ones.
