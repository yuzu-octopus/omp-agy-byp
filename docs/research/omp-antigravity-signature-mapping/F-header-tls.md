# F — Header and TLS spoofing status in omp's Antigravity paths

Scope: read-only source verification of (a) the built-in `antigravity-cli` ACP transport and (b) the direct Cloud Code Assist (CCA) providers `google-antigravity` and `google-gemini-cli`, cross-checked against two existing research docs. Confidence labels: **high** = source/doc directly observed; **medium** = inferred from adjacent code; **low/speculative** = not source-grounded. Path anchors are relative to the workspace root or to the `@oh-my-pi` package root (noted per anchor), matching the convention in the sibling source report.

## Findings

**F1 — ACP path (`antigravity-cli` / `antigravity-acp`) emits zero omp HTTP headers; the native CLI owns TLS, headers, User-Agent and identity. [high]**
- `streamAntigravityCli` (pi-ai/src/providers/antigravity-cli.ts:33-59) performs no HTTP at all: it stages a credential file, spawns `agy acp`, and communicates over stdio NDJSON plus a loopback MCP server. There is no `fetch`, no `RequestInit`, and no header construction anywhere in the CLI transport directory.
- The existing source investigation states this explicitly: "omp emits **no HTTP headers, User-Agent, or Authorization header at all** on this path — inference is entirely inside the CLI subprocess; upstream headers/TLS/identity are owned by `agy`" (docs/research/omp-antigravity-investigation/F-antigravity-cli-source.md, Finding 9).
- The generic `resolveHeaders`/`withResolvedHeaders` chain (pi-ai/src/utils/model-headers.ts:1-20, pi-ai/src/stream.ts:845-880) only resolves model metadata before dispatch. The `headers`/`authHeader` knobs in `registerProvider`/`models.yml` affect HTTP-backed providers, not `antigravity-acp`.
- `onPayload`/`onResponse` (the `before_provider_request`/`after_provider_response` seams) are placed in provider options at pi-ai/src/stream.ts:1875-1876 but are never read by `streamAntigravityCli`/`AgyHost`; CCA envelope/header/UA rewrite hooks therefore cannot reach this path (F-antigravity-cli-source.md Finding 9 and its seq-115 reconciliation; AgCliHookScout room seq 101).
- Consequence: whatever TLS/HTTP fingerprint the backend observes on the ACP path is the native `agy` binary's — neither Bun's nor omp's. omp cannot tune it from source.

**F2 — ACP-path env knobs are binary/state/auth only; no header or TLS overrides. [high]**
- `PI_AGY_PATH` replaces binary resolution verbatim (pi-ai/src/providers/antigravity-cli/binary.ts:29-34); `AGY_CLI_DISABLE_AUTO_UPDATE=1` and `SSH_TTY=omp-agy-file-auth` are the only injected env vars, and the full `Bun.env` is inherited with no stripping (registry/oauth/antigravity-cli.ts:185, host.ts:800; F-antigravity-cli-source.md Finding 6).
- There is no `PI_AI_ANTIGRAVITY_*` or `PI_AI_GEMINI_CLI_*` handling on the ACP path. os/arch/cl UA fields are not synthesized by omp here — the downloaded native binary reports its own `GOOS`/`GOARCH` from its build (darwin/arm64, linux/amd64, windows/amd64 installer keys; F-antigravity-cli-source.md Finding 3).
- **Credential hygiene:** the `agy` child inherits the full `Bun.env` with no stripping and reads its OAuth token exclusively from the staged token file, so keep unrelated secrets out of the spawn environment (or strip them before spawning where possible) — anything inherited is visible to the CLI subprocess.

**F3 — Direct CCA path: `google-antigravity` and `google-gemini-cli` share one stream, branched by `model.provider`. [high]**
- google-gemini-cli.ts:525: `const isAntigravity = model.provider === "google-antigravity"`.
- The `google-antigravity` catalog seeds `api="google-gemini-cli" base-url="https://daily-cloudcode-pa.googleapis.com"` (packages/catalog/src/compat/rules/providers/google-antigravity.kdl:16); `google-gemini-cli` uses `api="google-gemini-cli"` too. Both dispatch to `streamGoogleGeminiCli` (register-builtins.ts:256-258). So "direct google-antigravity/google-gemini-cli" is this single implementation.

**F4 — Direct CCA path DOES clone native HTTP headers (UA, Client-Metadata, Accept-Encoding) with env overrides. [high]**
- Antigravity branch: `getAntigravityHeaders()` (packages/catalog/src/wire/gemini-headers.ts:155-168) returns `User-Agent: antigravity/hub/<version> (aidev_client; os_type=<os>; arch=<arch>; cl=<cl>)` plus `Accept-Encoding: gzip`, with no `Accept` set deliberately because Bun adds `Accept: */*` itself.
  - version: `PI_AI_ANTIGRAVITY_VERSION` → manifest-discovered (`ensureAntigravityVersion`) → pinned fallback `DEFAULT_ANTIGRAVITY_VERSION = "2.26.0"`. Re-read directly in the installed 18.22.2 `packages/catalog/src/wire/gemini-headers.ts`: line 39 declares `DEFAULT_ANTIGRAVITY_VERSION = "2.26.0"`, line 53 `getAntigravityVersion()` applies env → discovered → pinned, line 79 `ensureAntigravityVersion()` (manifest at `https://antigravity-hub-auto-updater-974169037036.us-central1.run.app/manifest/latest-arm64-mac.yml`), line 141 `const cl = process.env.PI_AI_ANTIGRAVITY_CL || "1005016104"`, line 155 `getAntigravityHeaders()`. These constants are current in 18.22.2, not 18.18.6 history.
  - os/arch: `getAntigravityPlatform()` maps `process.platform` via `ANTIGRAVITY_BUILDS` (darwin→darwin/arm64, linux→linux/amd64, win32→windows/amd64, otherwise linux/amd64) at gemini-headers.ts:121-134; overridable by `PI_AI_ANTIGRAVITY_OS` / `PI_AI_ANTIGRAVITY_ARCH`.
  - cl: `PI_AI_ANTIGRAVITY_CL` or captured `1005016104`; source comment states the backend does not validate `cl` — only the version gates model access (gemini-headers.ts:140-150).
- Gemini CLI branch: `getGeminiCliHeaders(model.id)` (gemini-headers.ts:9-18) returns `User-Agent: GeminiCLI/<version>/<modelId> (<platform>; <arch>; terminal)` (version = `PI_AI_GEMINI_CLI_VERSION` or `0.46.0`) and `Client-Metadata: ideType=IDE_UNSPECIFIED,platform=PLATFORM_UNSPECIFIED,pluginType=GEMINI`; the CCA path also sets explicit `Accept: text/event-stream` (google-gemini-cli.ts:616).
- Assembly (google-gemini-cli.ts:613-622): `Authorization: Bearer <token>`, `Content-Type: application/json`, the branch headers above, an optional `anthropic-beta` for Claude thinking, then `...options?.headers` last (caller/extension can override any field).
- Routing: Antigravity → `daily-cloudcode-pa.googleapis.com` with sandbox fallbacks and auto-failover (google-gemini-cli.ts:322-325, 550-578); Gemini CLI → `cloudcode-pa.googleapis.com`.

**F5 — Direct CCA path uses Bun fetch/TLS, NOT Go `net/http`; no TLS/JA3/JA4/HTTP2 spoofing. [high]**
- `fetchWithRetry` defaults `fetch: fetchImpl = fetch` (packages/utils/src/fetch-retry.ts:332-340), and the runtime is explicitly Bun: the same file documents `timeout: false` as disabling "Bun's native ~300s fetch ceiling" (fetch-retry.ts:349-353). The CCA call passes `timeout: false` and `fetch: options?.fetch` (google-gemini-cli.ts:967-976); the empty-stream retry calls `(options?.fetch ?? fetch)` directly (google-gemini-cli.ts:1026).
- gemini-headers.ts:151-154 confirms the split is intentional-but-partial: "The native client is Go `net/http`, which offers `Accept-Encoding: gzip` and no `Accept`; pinning the encoding replaces the runtime's `gzip, deflate, br, zstd` (Bun still decompresses the gzip body). Bun always adds `Accept: */*` itself." Header strings mimic the Go client; the TLS ClientHello is still Bun's.
- A repo search of packages/ai/src found no JA3/JA4/uTLS/ClientHello/cipher spoofing in the Google/Antigravity path. The ai package does contain TLS-profile machinery (`anthropic-http-options.ts`, `cowork-fetch.ts`, `utils/proxy.ts`, `anthropic-client.ts` `tls.ciphers`) but it is scoped to Anthropic Claude Code / Foundry / Cowork / Cursor — not to google-gemini-cli.ts.
- Therefore JA3/JA4, ALPN/HTTP2 SETTINGS and pseudo-header order remain Bun's. Per docs/research/google-ai-subscription-blocks/findings/F3.md, Google's edge exposes `tls_ja3_fingerprint`/`tls_ja4_fingerprint` and Cloud Armor can key rules on them, so a TLS-fingerprint gate is the residual gap in the direct path. F3.md also bounds that risk: full-stack browser emulation yields Low/None protection and specialized ClientHello spoofing Medium; no public Google doc ties these signals to Gemini subscription enforcement (F3.md "Conflicting evidence" and "Gaps").

**F6 — Consolidated env / option overrides on the direct CCA path. [high]**
- `PI_AI_ANTIGRAVITY_VERSION`, `PI_AI_ANTIGRAVITY_CL`, `PI_AI_ANTIGRAVITY_OS`, `PI_AI_ANTIGRAVITY_ARCH` (gemini-headers.ts:52-57, 136-148).
- `PI_AI_GEMINI_CLI_VERSION` (gemini-headers.ts:10).
- `options?.fetch` substitutes the fetch implementation (which can change TLS); `options?.headers` overrides any header; `options?.antigravityEndpointMode` selects production/sandbox/auto (google-gemini-cli.ts:281, 550, 616, 620, 974).
- Version-manifest discovery is skipped entirely when `PI_AI_ANTIGRAVITY_VERSION` is set (gemini-headers.ts:80).

## Evidence

| # | Anchor (relative) | Observation | Confidence |
|---|---|---|---|
| 1 | pi-ai/src/providers/antigravity-cli.ts:33-59 (installed pi-ai) | `streamAntigravityCli` stages credentials and delegates to `AgyHost`; no HTTP/fetch/header code | high |
| 2 | docs/research/omp-antigravity-investigation/F-antigravity-cli-source.md, Findings 6 & 9; seq 115 | "no HTTP headers, User-Agent, or Authorization header at all"; only `SSH_TTY`/`AGY_CLI_DISABLE_AUTO_UPDATE` env overrides; native `GOOS`/`GOARCH` from build | high |
| 3 | pi-ai/src/stream.ts:1875-1876, 845-880 (installed pi-ai); F-antigravity-cli-source.md Finding 9 | `onPayload`/`onResponse` set but unreachable in CLI transport; `resolveHeaders` only resolves model metadata | high |
| 4 | packages/ai/src/providers/google-gemini-cli.ts:525, 613-622, 322-325, 550-578, 967-976, 1026 | `isAntigravity` branch; request header assembly incl. `...options.headers` last; endpoint routing; `fetchWithRetry` + direct fetch call sites | high |
| 5 | packages/catalog/src/wire/gemini-headers.ts (installed 18.22.2):9-18, 39, 53, 79, 141, 155 | Native-clone UA/header builders; 2.26.0 fallback (`:39`), env→discovered→pinned resolution (`:53`), `ensureAntigravityVersion` (`:79`), `cl` fallback `1005016104` (`:141`), `getAntigravityHeaders` (`:155`), Go-vs-Bun comments | high |
| 6 | packages/utils/src/fetch-retry.ts:332-353 | `fetchImpl = fetch` default; `timeout: false` explicitly tied to "Bun's native ~300s fetch ceiling" | high |
| 7 | packages/catalog/src/compat/rules/providers/google-antigravity.kdl:16; packages/ai/src/providers/register-builtins.ts:256-258 | Both providers share `api="google-gemini-cli"` and `streamGoogleGeminiCli` | high |
| 8 | packages/ai/src (repo grep: anthropic-http-options.ts, cowork-fetch.ts, utils/proxy.ts, anthropic-client.ts:61-70) | TLS-profile/cipher machinery exists but is Anthropic/Cursor-scoped, absent from google-gemini-cli.ts | high |
| 9 | docs/research/google-ai-subscription-blocks/findings/F3.md (TLS/JA3/JA4, HTTP2/header-order, Conflicting evidence, Gaps) | Google edge can compute JA3/JA4; efficacy bounded; no documented Gemini-subscription enforcement | high (doc), inference labeled |

## Verdict

**ACP path (`antigravity-cli`): omp does not spoof anything at the HTTP/TLS layer.** It emits no headers, UA, or Authorization header; it never touches TLS. The native `agy` subprocess owns the entire upstream request and its fingerprint. omp's only influences are local: credential file staging, argv, ACP/MCP payloads, and process environment (`PI_AGY_PATH`, `SSH_TTY`, `AGY_CLI_DISABLE_AUTO_UPDATE`). Header/UA/TLS knobs and `before_provider_request`/`after_provider_response` hooks are unreachable here.

**Direct CCA path (`google-antigravity` and `google-gemini-cli`): omp partially spoofs at the HTTP-header layer only.** It clones the native clients' User-Agent, Client-Metadata, Accept-Encoding, and Accept strings with version/os/arch/cl env overrides and live manifest version discovery, and adds the real OAuth Bearer token. It does **not** spoof TLS: requests go through Bun's global `fetch`, so the JA3/JA4 fingerprint, ALPN/HTTP2 behavior and pseudo-header order are Bun's, not Go's or the native CLI's. There is no uTLS/ClientHello machinery in this path.

**Net answer:** omp already spoofs native-looking headers on the direct CCA path and inherits a genuine native fingerprint on the ACP path, but it does not spoof TLS anywhere in the Antigravity flows. The residual, source-confirmed gap is TLS/transport fingerprinting on the direct CCA path; whether Google actually gates on it for Gemini subscription traffic is unproven (F3.md).

## Open questions

- Does the closed `agy` binary on the ACP path present the exact TLS/HTTP2 fingerprint of Google's first-party CLI, and does the backend bind entitlement to it? Not derivable from omp source — needs binary/traffic capture. (Also F-antigravity-cli-source.md Open questions.)
- Would a TLS/transport gate at Google's edge actually reject Bun's fingerprint on the direct CCA path? F3.md shows the capability exists at the edge but no public evidence of subscription enforcement; the curl_cffi 429 report is unconfirmed.
- Does `options?.fetch` get set by any omp caller in practice (changing the direct path's TLS)? Default is global `fetch`; a custom impl would alter the fingerprint.
- Does the manifest-discovered version (`ensureAntigravityVersion`) stay in sync with the installed `agy` binary version used by the ACP path? They are independent discovery paths (electron-builder manifest vs CLI auto-updater manifest).
- Does the `cl` value matter for any future backend check? Source says it is currently unvalidated; this is a live-behavior claim, not a guarantee.
- Are the `Sec-CH-UA`/`Accept-Language`/header-order signals described in F3.md applicable to these non-browser CLI endpoints at all? Likely not, but not verified for Cloud Code Assist.
