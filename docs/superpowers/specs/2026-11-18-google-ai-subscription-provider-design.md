# Design: Google AI subscription provider for omp

**Date:** 2026-11-18

## Intent

Let an omp user run models against their own Google AI Pro/Ultra subscription through a first-party local CLI, without extracting tokens or reimplementing a retired backend. The plugin is a command-backed provider: omp owns the conversation and tool loop; `agy` owns authentication and the upstream request.

## Goals

- Register a custom omp provider backed by the `agy` CLI installed on the user's machine.
- Use the subscription already cached in the CLI's OS keyring; no in-plugin OAuth or token file parsing.
- Map the CLI's `stream-json` output into omp's `AssistantMessageEventStream`.
- Fail clearly when the binary is missing, unauthenticated, malformed, cancelled, or non-zero.

## Non-goals

- Direct HTTP relay to `cloudcode-pa.googleapis.com` or any other private endpoint.
- OAuth client IDs, client secrets, token storage, fingerprint spoofing, account rotation, or quota pooling.
- Changing detection behaviour or evading bans.
- Image input in v1; models are registered as text-only until a real image path exists.
- Dynamic model discovery in v1; use a reviewed static roster.

## Approaches

### A. Direct HTTP relay (rejected)

Copy the Gemini CLI OAuth client and call the private Cloud Code Assist endpoint. Rejected: consumer serving through that endpoint ended 2026-06-18, relays broke in dated practitioner reports, and it requires token handling and client impersonation.

### B. Hook the built-in Google provider's fetch (rejected)

Overwrite an existing provider's transport. Rejected: the authentication and billing path is still the retired consumer path, and the host extension API already has a first-class command-backed provider seam.

### C. Command-backed provider via `agy` (chosen)

Spawn the signed-in first-party CLI in print mode with `stream-json`, translate its NDJSON result into canonical events, and leave credentials inside the CLI's keyring. This follows the host's documented command-backed provider pattern.

## Decisions

- **Provider ID:** `agy-byp`. Unique, extension-owned. Do not use `google`, `google-gemini-cli`, or `antigravity`.
- **API ID:** `agy-byp-cli`. Extension-owned string passed as `api` to `pi.registerProvider`.
- **Binary:** resolved from `OMP_AGY_BYP_BINARY` or `Bun.which("agy")`; no hardcoded user-home paths in v1.
- **Argv:** `["-p", prompt, "--model", modelId, "--output-format", "stream-json"]` with `cwd` from stream options.
- **Environment:** strip `ANTIGRAVITY_API_KEY`, `GEMINI_API_KEY`, `GOOGLE_API_KEY`, `GOOGLE_GENAI_API_KEY`, `GOOGLE_APPLICATION_CREDENTIALS`, `GOOGLE_GENAI_USE_VERTEXAI`, `GOOGLE_GENAI_USE_GCA` before spawn so a stray environment variable cannot switch to paid API billing.
- **Timeout:** 300000 ms, clamped from `OMP_AGY_BYP_TIMEOUT_MS` to 1000..600000.
- **Stderr capture:** last 4096 bytes, clamped from `OMP_AGY_BYP_STDERR_CAPTURE_BYTES` to 1024..65536. Diagnostics go through `pi.logger`, never stdout.
- **Prompt:** text-only serialization of `systemPrompt` and `context.messages` with explicit role labels; host tool schemas are not forwarded because the child owns its tool loop.
- **Result mapping:** ignore `init` and `step_update` for content; use the authoritative `result.response` and `result.usage`. Emit a single text block, then `done`.
- **Failure mapping:** non-zero exit or no successful result becomes an `error` event; abort becomes an `aborted` event.
- **Model roster:** seven slash-free slugs from the public reference adapter, all cost zero, text input only.

## Data flow

1. Factory in `src/index.ts` calls `pi.registerProvider("agy-byp", config)`.
2. Host selects an `agy-byp` model and calls `streamSimple(model, context, options)`.
3. `streamSimple` creates an `AssistantMessageEventStream`, pushes `start`, then starts async work.
4. `buildPrompt(context)` serializes system/developer/user/assistant/tool-result text.
5. `resolveBinary(config, which)` finds `agy`; `subscriptionOnlyEnv(env)` removes API-key fallbacks.
6. `spawnAgy` launches the fixed argv with piped stdout/stderr, forwarding `options.signal`.
7. NDJSON lines are parsed; the `result` event supplies text and usage.
8. The adapter pushes `text_start`, `text_delta`, `text_end`, and `done` (or `error`/`aborted`).

## Interfaces

- `buildPrompt(context: Context): string`
- `parseAgyEvent(value: unknown): AgyEvent | undefined`
- `spawnAgy(options: SpawnAgyOptions): Promise<AgyRunResult>`
- `createStreamSimple(deps: StreamDeps): StreamSimple`
- `default export (pi: ExtensionAPI) => void`

## Risks

- `agy` output format is pre-release and may change; parser is isolated and fixture-tested.
- A CLI binary on PATH is trusted code; the plugin cannot sandbox it.
- Missing login surfaces only on the first request; `agy-byp-status` command gives a preflight.
- Model slugs may drift; static roster is easy to update.
