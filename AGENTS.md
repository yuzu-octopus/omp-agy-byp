# Repository Guidelines

## Project Overview

This repo holds deep research on how AI vendors block consumption of a paid consumer subscription outside official clients, plus the design guidance for an omp plugin that uses a Google AI subscription inside omp. Today the tree holds research under `docs/research/`; no plugin code exists yet.

`REPORT.md` is a dated snapshot (2026-11-18, 127 sources). Claims are tagged primary, secondary, inference, or speculative. Enforcement changes fast: re-check primary sources before relying on any finding. Research scope explicitly includes blocks and bypasses and rejects a ToS/legal veto on the research itself.

The authoritative plugin design lives in `docs/superpowers/specs/2026-11-18-google-ai-subscription-provider-design.md` (final design) and `docs/superpowers/plans/2026-11-18-google-ai-subscription-provider.md` (implementation plan). Those two files are authoritative for the plugin design; this `AGENTS.md` is only a summary and must not contradict them. No plugin code is committed yet.

## Architecture & Data Flow

The plugin is one in-process omp extension. The host loads `src/index.ts` once per session tree and evaluates its single default-exported factory; that factory is the only wiring point. It registers exactly three hooks — `before_agent_start` (system-prompt array), `context` (messages), and `before_provider_request` (text parts of an HTTP-backed provider's payload only) — plus one `/agy-byp on|off|status` slash command (aliases `enable`/`disable`). It augments omp's built-in providers: it registers no provider and no OAuth handler, implements no token flow, spawns no CLI subprocess, carries no inference traffic through a custom gateway, and writes no config file. omp continues to own CLI execution, OAuth, credentials, native identity, and transport.

State starts OFF. At load the factory registers the hooks and command, reads config, and sets state to off; hooks are registered but inert — they return their inputs unchanged. Nothing is unpaused, no provider is enabled or disabled, and no network call is made at load. The command is the only state writer: `/agy-byp on` makes the hooks apply and requests unpause of the fallback provider through the host API (guarded by `OMP_AGY_BYP_UNPAUSE_FALLBACK`); `/agy-byp off` makes them inert again without re-pausing or deactivating anything; `/agy-byp status` reports state and emits no secret values.

Provider layering — the plugin does not route between providers; the user selects a model/provider in omp as usual:

- `antigravity-cli` — primary built-in path. omp (not the plugin) runs the signed-in `agy acp` CLI; `PI_AGY_PATH` selects an existing executable and `/login antigravity-cli` performs login. The OAuth grant is exported into omp's credential store and the CLI owns its native identity, headers, and user-agent. Its built-in transport id is `antigravity-acp`. The plugin leaves this path otherwise untouched, and it is never paused.
- `google-antigravity` — optional HTTP fallback, paused by default, unpaused only on the explicit `on` command via `setUnpausedProviders` from `@oh-my-pi/pi-ai/registry/oauth`.
- `google-gemini-cli` — legacy HTTP path.
- `google`, `google-vertex` — API-key/ADC lanes, out of scope; hooks pass them through untouched.

The payload hook never fires for `antigravity-cli`: that CLI transport ignores `onPayload`/`onResponse`, so `before_provider_request` (and `after_provider_response`) do not run for its inference — content shaping there happens only through the system-prompt and message hooks. Scrubbing is content-only: rewrite omp-specific identifying strings while preserving tool names, tool-call ids, labels, `sessionId`, `requestId`, headers, User-Agent, and section/array structure. Never rename or remove fields, tools, or sections.

Configuration is environment-only (`OMP_AGY_BYP_MODE`, `OMP_AGY_BYP_SCRUB_TOOL_DESCRIPTIONS`, `OMP_AGY_BYP_UNPAUSE_FALLBACK`), read from `process.env`: it tunes behavior, never activation. Keep per-session state in the factory closure or session context. Emit diagnostics through the host logger or stderr, never stdout, which the TUI owns.

## Key Directories

- `docs/research/<topic>/` — committed neutral research. Keep the `brief.md`, `REPORT.md`, `findings/F<N>.md` convention. Findings carry claim, source URL, fetch date, confidence.
- `docs/superpowers/specs/` — the authoritative final design, `2026-11-18-google-ai-subscription-provider-design.md`.
- `docs/superpowers/plans/` — the authoritative implementation plan, `2026-11-18-google-ai-subscription-provider.md`.
- `src/` — future extension source. `index.ts` is the single entry point and only wiring point; small modules sit alongside it: `version.ts`, `ids.ts`, `config.ts`, `providers.ts`, `patterns.ts`, `system-prompt.ts`, `payload.ts`. There are no dedicated provider, auth, or forwarding subdirectories — those seams were rejected; do not create them.
- `tests/` — future `*.test.ts` suite, including drift and host-contract tests.
- `HANDOFF.md` — repo root; records live checks only a human can perform, with exact steps.

## Development Commands

Run from the repo root or plugin directory. No plugin code is committed yet — these commands apply once the scaffold exists:

```sh
bun install
bunx --bun tsc --noEmit                    # authoritative typecheck; must exit 0
bunx --bun @biomejs/biome check src tests  # lint + format, report-only
bun test tests/                            # behavior suite
bun <script>.ts                            # one-shot helper, when scripts exist
omp plugin link <plugin-dir>               # symlink into the host plugin area
omp plugin doctor                          # verify install or link
omp models -e <absolute path to omp-agy-byp>/src/index.ts  # load check of the extension entry point
```

For the load check, `-e` must come after the subcommand; the flag before it is ignored. `--help` never loads extensions, and exit status is zero even on load failure — read stderr for `Failed to load extension`. No hot reload: source edits require a new session.

`package.json` `files` is exactly `["src", "README.md"]`, keeping research docs and helper scripts out of installs; there is no `skills` entry. Marketplace catalog entries live in a separate catalog repo, never edited from two checkouts at once.

## Code Conventions & Common Patterns

- Bun only. Use `bun`, `bunx --bun`. Never `node`, `npm`, or `npx`.
- Static imports only for host packages (`@oh-my-pi/*`). Dynamic imports of host specifiers fail in the extension loader.
- Never write to stdout from extension code. Diagnostics go to the host logger, stderr, or `ctx.ui.notify`.
- Use `ctx.setInterval`, `ctx.setTimeout`, `ctx.clearTimer`. Raw timers throw fatally in this host.
- Register exactly three hooks and the one `/agy-byp` command from the factory. Never call provider or OAuth registration APIs and never register tools.
- Keep scrub helpers pure; inject boundary functions only — unpause, pause-reason lookup, and clock — in tests.
- Pin the exact dev host version and assert it in a drift test. Warn on production drift; never gate production on the dev pin.
- Configuration is environment-only: `OMP_AGY_BYP_*` variables read from `process.env`. No config file is created, read, or edited. Env vars tune behavior, never activation.
- The plugin never handles, extracts, or stores tokens. omp owns OAuth credentials for the built-in providers; never log credential values.
- Coordinate with peer agents: claim a shared file through the room before editing, post conclusions to a named topic, use `agent://<id>` to steer exactly one peer, and block on wait tools instead of polling. The room log and IRC are the shared record.

## Important Files

- `docs/research/google-ai-subscription-blocks/REPORT.md` — cited synthesis; start here for enforcement and bypass context.
- `docs/research/google-ai-subscription-blocks/brief.md` — scope, assumptions, and the confidence-labeling rule.
- `docs/research/google-ai-subscription-blocks/findings/F1.md` through `F10.md` — per-angle evidence; preserve this naming for future topics.
- `docs/superpowers/specs/2026-11-18-google-ai-subscription-provider-design.md` — authoritative final design.
- `docs/superpowers/plans/2026-11-18-google-ai-subscription-provider.md` — authoritative implementation plan.
- `package.json` — future manifest: name `omp-agy-byp`, version, license, module type (`type: module`), `omp.extensions` pointing at `./src/index.ts`, `files: ["src", "README.md"]`, no `skills`.
- `src/index.ts` — the single wiring point. `src/version.ts` — the dev host pin and tracked host specifiers. `src/ids.ts` — primary/fallback/legacy provider ids and the toggle command name, not endpoint, OAuth, or identity constants.
- `LICENSE` — required before inviting installs. `README.md` — install, development, commands, human checks. `HANDOFF.md` — human-only live checks.
- `.omp/extensions/` — optional local shim, machine-local and not tracked. `.omp-plugin/marketplace.json` — catalog repo only.

## Runtime/Tooling Preferences

- Bun 1.4.4 or later; TypeScript in ESM modules. `type: module` in the manifest.
- Keep a dev dependency on the exact omp version developed against; pin TypeScript to Bun's bundled version for declaration emit if needed.
- `bun check` is a fast pre-filter only. Pick one typecheck script as the gate and do not require both to pass. Never name a script `check`; it shadows the builtin.
- Python helpers, if ever added, use `uv` with `ruff` then `ty`. There is no Python code today.
- Never install system-wide packages. Extensions are unsandboxed in-process modules loaded once per session.
- Runtime configuration is env-only (`OMP_AGY_BYP_*` from `process.env`) and cannot activate the plugin.

## Testing & QA

The gates below apply once the implementation scaffold exists; at this commit there is no runnable suite.

Gate order, run once by the main agent after changes land:

1. `bunx --bun tsc --noEmit` — type correctness across source and tests.
2. `bunx --bun @biomejs/biome check src tests` — lint and format. Use `--write` only on agent-edited files during implementation.
3. `bun test tests/` — behavior, including drift and host-contract tests.

File patterns: `tests/*.test.ts`, `tests/drift.test.ts` (dev host version and every deep host subpath), `tests/host-contract.test.ts` (semantics depended on, not just version). Test the real implementation; inject boundary functions instead of mocking. Never run full suites in parallel with other agents on this box. Split alphabetically into sequential halves if a run hangs while another omp session is live.

Live terminal probes, interactive login checks, and extension-load experiments are human-only. Record the exact steps in `HANDOFF.md`; agents gate on the commands above.
