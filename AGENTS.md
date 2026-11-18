# Repository Guidelines

## Project Overview

This repo holds deep research on how AI vendors block consumption of a paid consumer subscription outside official clients, plus the design guidance for an omp plugin that would use a Google AI subscription inside omp. Today the tree contains only committed research under `docs/research/google-ai-subscription-blocks/`; no plugin code exists yet.

`REPORT.md` is a dated snapshot (2026-11-18, 127 sources). Claims are tagged primary, secondary, inference, or speculative. Enforcement changes fast: re-check primary sources before relying on any finding. Research scope explicitly includes blocks and bypasses and rejects a ToS/legal veto on the research itself.

## Architecture & Data Flow

The intended plugin is one in-process omp extension. The host loads `src/index.ts` once per session tree and evaluates a single default-export factory; that factory is the only wiring point and registers the provider, OAuth provider, commands, flags, and a host-drift warning. Actions run only inside events, commands, or streams — not at load time.

Data flow:

1. The login flow obtains a consumer subscription OAuth grant and stores it in the host auth storage. An API key is a separate credential lane and must never stand in for the subscription grant.
2. A request enters the extension-owned provider's `streamSimple`, which returns an event stream immediately and does async work behind it.
3. The auth adapter supplies the bearer token; the entitlement module resolves paid tier, project, and quota snapshots. A cached snapshot is never treated as current entitlement.
4. The relay builds the JSON body and streams from the Cloud Code Assist endpoint, then translates server-sent events into canonical assistant-message events.
5. Errors become terminal stream events. Authentication and entitlement failures trigger re-authentication or entitlement recheck; rate limits are normalized without inventing retry headers.

Keep per-session mutable state (entitlement snapshot, session id, client) in the factory closure or session context. Durable tokens belong in the host auth storage only. Keep request building, response mapping, and error classification as pure functions with injected fetch and timers; that seam is the test surface. Emit diagnostics through the host logger or stderr, never stdout, which the TUI owns.

Caveat from the research: consumer serving through the old Gemini CLI path ended 2026-06-18. A command-backed provider that delegates to the current official CLI is the more robust variant; verify the live endpoint before assuming the older relay still works.

## Key Directories

- `docs/research/<topic>/` — committed neutral research. Keep the `brief.md`, `REPORT.md`, `findings/F<N>.md` convention. Findings carry claim, source URL, fetch date, confidence.
- `src/` — future extension source. One entry (`index.ts`), `version.ts`, `ids.ts`, then thin seams under `provider/`, `auth/`, and `relay/`.
- `tests/` — future `*.test.ts` suite, including drift and host-contract tests.
- `skills/<name>/SKILL.md` — one-level skills discovered by convention; the manifest has no skills field.
- `scripts/` — optional Bun-run one-shot operational helpers only, never test logic. Do not create it speculatively.
- `HANDOFF.md` — repo root; records live checks only a human can perform, with exact steps.

## Development Commands

Run from the repo root or plugin directory:

```sh
bun install
bunx --bun tsc --noEmit                    # authoritative typecheck; must exit 0
bunx --bun @biomejs/biome check src tests  # lint + format, report-only
bun test tests/                            # behavior suite
bun <script>.ts                            # one-shot helper, when scripts exist
omp plugin link <plugin-dir>               # symlink into the host plugin area
omp plugin doctor                          # verify install or link
omp models -e <absolute path to dist/index.js>  # quick load check of a built plugin
```

For the load check, `-e` must come after the subcommand; the flag before it is ignored. The host help command never loads extensions, and exit status is zero even on load failure — read stderr for the load error. No hot reload: source edits require a new session.

Keep `package.json` `files` tight (`src`, `skills`, `README.md`) so research docs and helper scripts stay out of installs. Marketplace catalog entries live in a separate catalog repo, never edited from two checkouts at once.

## Code Conventions & Common Patterns

- Bun only. Use `bun`, `bunx --bun`. Never `node`, `npm`, or `npx`.
- Static imports only for host packages. Dynamic imports of host specifiers fail in the extension loader.
- Never write to stdout from extension code. Diagnostics go to the host logger and log files.
- Use `ctx.setInterval`, `ctx.setTimeout`, `ctx.clearTimer`. Raw timers throw fatally in this host.
- Register tools, commands, and hooks from the one factory. Tool execute takes five arguments and returns a result with `content` and `details`; failures are results, not throws.
- Inject fetch and timer functions; keep request building, response mapping, and error classification pure. Prefer a small interface over many shallow helpers.
- Pin the exact dev host version and assert it in a drift test. Warn on production drift; never gate production on the dev pin.
- Own configuration in a real config file surfaced through a command; clamp every numeric value, since a zero cap can disable the plugin for everyone.
- Store subscription credentials in the host auth storage, file mode restricted; never log tokens.
- Coordinate with peer agents: claim a shared file through the room before editing, post conclusions to a named topic, use `agent://<id>` to steer exactly one peer, and block on wait tools instead of polling. The room log and IRC are the shared record.

## Important Files

- `docs/research/google-ai-subscription-blocks/REPORT.md` — cited synthesis; start here for enforcement and bypass context.
- `docs/research/google-ai-subscription-blocks/brief.md` — scope, assumptions, and the confidence-labeling rule.
- `docs/research/google-ai-subscription-blocks/findings/F1.md` through `F10.md` — per-angle evidence; preserve this naming for future topics.
- `package.json` — future manifest: name, version, license, module type, `omp.extensions`, `engines.bun >= 1.4.4`, tight `files`. Point `omp.extensions` at the file that actually loads (`src/index.ts` unbundled, `dist/index.js` bundled).
- `src/index.ts` — future single wiring point. `src/version.ts` — host pin and imported host specifiers. `src/ids.ts` — provider id, endpoint constants, OAuth and identity constants.
- `LICENSE` — required before inviting installs. `README.md` — install, development, commands, human checks. `HANDOFF.md` — human-only live checks.
- `.omp/extensions/` — optional local shim, machine-local and not tracked. `.omp-plugin/marketplace.json` — catalog repo only.

## Runtime/Tooling Preferences

- Bun 1.4.4 or later; TypeScript in ESM modules. `type: module` in the manifest.
- Keep a dev dependency on the exact omp version developed against; pin TypeScript to Bun's bundled version for declaration emit if needed.
- `bun check` is a fast pre-filter only. Pick one typecheck script as the gate and do not require both to pass. Never name a script `check`; it shadows the builtin.
- Python helpers, if ever added, use `uv` with `ruff` then `ty`. There is no Python code today.
- Never install system-wide packages. Extensions are unsandboxed in-process modules loaded once per session.

## Testing & QA

Gate order, run once by the main agent after changes land:

1. `bunx --bun tsc --noEmit` — type correctness across source and tests.
2. `bunx --bun @biomejs/biome check src tests` — lint and format. Use `--write` only on agent-edited files during implementation.
3. `bun test tests/` — behavior, including drift and host-contract tests.

File patterns: `tests/*.test.ts`, `tests/drift.test.ts` (dev host version and every deep host subpath), `tests/host-contract.test.ts` (semantics depended on, not just version). Test the real implementation; inject boundary functions instead of mocking. Never run full suites in parallel with other agents on this box. Split alphabetically into sequential halves if a run hangs while another omp session is live.

Live terminal probes, interactive login checks, and extension-load experiments are human-only. Record the exact steps in `HANDOFF.md`; agents gate on the commands above.
