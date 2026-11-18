# F — Google provider source (omp monorepo, v18.18.6 snapshot)

Scope: read-only source investigation of the built-in Google Cloud Code Assist (CCA) providers in `/home/yuzu/projects/oh-my-pi` (the omp monorepo that the chatroom plugin pins at 18.18.1). Every claim below is grounded in a source path + line and tagged with confidence. No source files were edited.

> Version banner (2026-11-18): this is a source snapshot of the omp monorepo at 18.18.6 (the earlier plugin pin was 18.18.1). The host verified by the CLI slices is 18.22.2; the findings below describe 18.18.6. 18.22.2 still pauses `google-antigravity` by default, but with a stronger stated reason (terms violation, account suspensions, issue #18341) plus an explicit login-warning. Treat 18.18.6-only constants as historical until re-read against the installed build.

Sources covered: the two OAuth provisioning modules, the shared CCA streaming provider, `google-shared.ts`, the compiled auth rules (KDL + `rules.json`), `gemini-headers.ts` / `auth.ts` in `pi-catalog`, the Antigravity usage/quota module, and the `model-registry.ts` wiring/extension seams.

---

## Findings

### F1. Two built-in providers, one shared streaming transport (confidence: high)
`google-gemini-cli` and `google-antigravity` are both served by `streamGoogleGeminiCli()` in `packages/ai/src/providers/google-gemini-cli.ts`. A single boolean `isAntigravity = model.provider === "google-antigravity"` selects the endpoint set, the header set, the request envelope (sessionId/labels) and the per-SKU model wire profile. `google-shared.ts` supplies message/tool conversion, thinking-part handling, thought-signature retention, stop-reason/usage mapping and empty-stream retry constants used by both. The Antigravity provider is therefore not a separate implementation — it is a profile of the Gemini-CLI CCA client. (paths: `providers/google-gemini-cli.ts:1-6,525`, `providers/google-shared.ts:1-60`)

### F2. CRITICAL — `google-antigravity` is DISABLED by default in this source snapshot (confidence: high)
`packages/catalog/src/compat/rules/auth/google-antigravity.kdl:3` contains:
`disabled "Google may restrict accounts that use Antigravity outside its own apps, so this provider is paused for now."`

Per the compiled-rule semantics (`packages/catalog/src/compat/rules/README.md:413,421`), `disabled "<reason>"` turns the provider off without deleting its code or stored credentials: it is removed from the built-in `/login` roster, login and token refresh refuse it, usage probes skip it, and **no key source** (runtime, `models.yml`, stored, broker, env) resolves for it, so nothing calls the provider; a request names the reason instead.

Enforcement in code:
- `packages/ai/src/registry/oauth/index.ts:22-25` filters disabled providers out of `builtInOAuthProviders`.
- `packages/ai/src/registry/oauth/index.ts:57-64` — `providerPauseReason(provider)` returns `undefined` when an extension has registered a custom OAuth provider under the same id; `assertProviderEnabled()` throws `AIError.ProviderDisabledError(provider, reason)` otherwise. The README states explicitly: "An extension that registers its own OAuth login under the paused id takes the id back, since that is the end user's choice."
- `packages/catalog/src/compat/auth.ts:22-24` exposes `providerDisabledReason()` over the compiled `rules.json` auth stratum.
- `model-registry.ts:3603-3610` applies the separate `disabledProviders` *settings* switch (distinct from the auth-rule pause).

So in this snapshot the built-in Antigravity login path is inert by default; only the compiled auth rule (or an extension reclaiming the id) re-enables it. (paths: `auth/google-antigravity.kdl:3`, `oauth/index.ts:22-25,57-64`, `compat/auth.ts:22-24`, `README.md:413,421`)

### F3. OAuth — declarative installed-app authorization-code flow (confidence: high)
Both providers are defined declaratively in `packages/catalog/src/compat/rules/auth/*.kdl` and compiled into `compat/rules.json`; the engines that interpret them live in `ai/src/registry/engine/oauth-code.ts` and `refresh.ts`. Exact parameters:

| | google-gemini-cli | google-antigravity |
|---|---|---|
| Display name | Google Cloud Code Assist (Gemini CLI) | Google Antigravity (Gemini, Claude, GPT-OSS) |
| client-id | base64 `NjgxMjU1ODA5Mzk1LW9vOGZ0Mm9wcmRybnA5ZTNhcWY2YXYzaG1kaWIxMzVqLmFwcHMuZ29vZ2xldXNlcmNvbnRlbnQuY29t` → `681255809395-oo8ft2oprdrnp9e3aqf6av3hmdib135j.apps.googleusercontent.com` | base64 `MTA3MTAwNjA2MDU5MS10bWhzc2luMmgyMWxjcmUyMzV2dG9sb2poNGc0MDNlcC5hcHBzLmdvb2dsZXVzZXJjb250ZW50LmNvbQ==` → `1071006060591-tmhssin2h21lcre235vtolojh4g403ep.apps.googleusercontent.com` |
| client-secret | base64-encoded `GOCSPX-…` installed-app secret (value intentionally not reproduced here; see file:line) | base64-encoded `GOCSPX-…` installed-app secret (not reproduced) |
| authorize-url | `https://accounts.google.com/o/oauth2/v2/auth` | same |
| token | `https://oauth2.googleapis.com/token`, `body="form"` | same |
| userinfo | `https://www.googleapis.com/oauth2/v1/userinfo?alt=json`, email=`email` | same |
| scopes | `cloud-platform`, `userinfo.email`, `userinfo.profile` | `cloud-platform`, `userinfo.email`, `userinfo.profile`, **`cclog`, `experimentsandconfigs`, `aicode`** |
| PKCE | not requested | **`pkce #true` — S256** (docs note confirms S256 like native client) |
| authorize params | `access_type=offline`, `prompt=consent` | same |
| callback | `127.0.0.1:8085` `/oauth2callback` | `127.0.0.1:51121` `/oauth-callback` (rules.json: portFallback true, manualOnly false, nativeScheme false; paste-code flow supported) |
| credential mapping | `access_token`/`refresh_token`, `expires_in` seconds, skew-ms 300000 | same |
| api-key-format | `structured` (JSON credential string used as the apiKey) | same |
| hooks | `after-exchange: google-gemini-cli-project`; refresh `require projectId`, `after-refresh` same hook | `google-antigravity-project` equivalents |

The published client IDs are the real Gemini CLI / Antigravity installed-app OAuth clients (the secrets are the well-known `GOCSPX-…` values shipped with those CLIs). The two provider modules import `oauthFetch`/`throwIfLoginCancelled` from `google-oauth-shared.ts`, which imposes a 30s per-request timeout on the post-callback provisioning phase, maps abort to `LoginCancelledError` and timeout to `OAuthError{kind:"timeout"}`, and tracks validation-URL extraction for the "validation required" user message. Project-discovery hooks preserve `projectId` across refresh responses and reject a login with no refresh token. (paths: `auth/google-gemini-cli.kdl:1-27`, `auth/google-antigravity.kdl:1-32`, `oauth/google-oauth-shared.ts:1-70`, `oauth/google-gemini-cli.ts:223-265`, `oauth/google-antigravity.ts:301-331`, `docs/provider-quirks.md:330`)

### F4. Streaming request construction — endpoint, method, body (confidence: high)
- **Method/URL:** `POST ${endpoint}/v1internal:streamGenerateContent?alt=sse` (SSE stream). (`google-gemini-cli.ts:967`)
- **Gemini CLI endpoint:** `DEFAULT_ENDPOINT = https://cloudcode-pa.googleapis.com`, overridable by `model.baseUrl`. (`google-gemini-cli.ts:322,584`)
- **Antigravity endpoints:** `https://daily-cloudcode-pa.googleapis.com` and `https://daily-cloudcode-pa.sandbox.googleapis.com` as an ordered failover pair in `auto` mode; the last working endpoint is remembered per provider-session (`lastGoodEndpoint`) and tried first. `antigravityEndpointMode: "production" | "sandbox"` pins one; a custom `baseUrl` is used verbatim unless it equals one of the two known endpoints. (`google-gemini-cli.ts:323-325,550-584,1080-1090`)
- **Retry/failover:** `fetchWithRetry` with `MAX_RETRIES=3`, exponential backoff `BASE_DELAY_MS=1000` (capped by a 5-minute `RATE_LIMIT_BUDGET_MS`), one attempt per endpoint until failover; failover only while no stream event has started. A pre-response watchdog (`DEFAULT_FIRST_EVENT_TIMEOUT_MS=300_000`, model-compat override) lets a silent first event fail over to the other endpoint. (`google-gemini-cli.ts:329-337,965-978,1087-1090`)
- **Body shape** (`CloudCodeAssistRequest`): `{ project, model: <wireModelId>, request: { contents, sessionId?, systemInstruction?, generationConfig?, tools?, toolConfig?, labels? }, requestId?, userAgent? }`. `contents` come from `convertMessages()` in `google-shared.ts`; `systemInstruction` is an object with `parts` (Antigravity tags it `role: "user"`); tool schemas are normalized for CCA. Wire model id = `options.requestModelId ?? model.requestModelId ?? model.id`. (`google-gemini-cli.ts:417-460,1287-1472`, `google-shared.ts:200-300`)
- **Payload hook:** `options.onPayload(requestBody, model)` can replace the entire outbound body before serialization. (`google-gemini-cli.ts:610-612`)

### F5. Headers, User-Agent and client metadata (confidence: high)
Common to both: `Authorization: Bearer <access_token>`, `Content-Type: application/json`. Final spread order means `...options?.headers` is **last** and can override any of the built-in headers. (`google-gemini-cli.ts:615-630`)

- **Gemini CLI:** `Accept: text/event-stream`; `User-Agent: GeminiCLI/<version>/<modelId> (<platform>; <arch>; terminal)` with version from `PI_AI_GEMINI_CLI_VERSION` (default `0.46.0`) and platform/arch from the host; `Client-Metadata: ideType=IDE_UNSPECIFIED,platform=PLATFORM_UNSPECIFIED,pluginType=GEMINI`. (`catalog/wire/gemini-headers.ts:7-20`)
- **Antigravity:** `getAntigravityHeaders()` returns only `User-Agent` and `Accept-Encoding: gzip` — deliberately **no explicit `Accept`** (native Go `net/http` offers gzip and no Accept; Bun adds `Accept: */*` itself). UA format captured from the real 2.26.0 `antigravity/hub` client: `antigravity/hub/<version> (aidev_client; os_type=<os>; arch=<arch>; cl=<cl>)`. Defaults: version `2.26.0`, `cl=1005016104`; OS/arch map darwin→arm64, linux→amd64, win32→amd64 (unknown OS falls back to linux/amd64). Overrides: `PI_AI_ANTIGRAVITY_VERSION`, `_CL`, `_OS`, `_ARCH`. A source comment records that the backend does **not** validate `cl` (only the version gates model access). (`catalog/wire/gemini-headers.ts:22-52,110-160`)
- **Version discovery:** before each Antigravity request (when not already resolved) `ensureAntigravityVersion()` fetches `https://antigravity-hub-auto-updater-974169037036.us-central1.run.app/manifest/latest-arm64-mac.yml` with `Cache-Control: no-cache`, `User-Agent: electron-builder`, 5s timeout; parses a `version:` line, caches for the process, and suppresses failed lookups for 10 minutes (silent fallback to 2.26.0). (`catalog/wire/gemini-headers.ts:54-108`)
- **Client metadata in body:** Antigravity provisioning sends `metadata: { ideType: "ANTIGRAVITY" }` (`ANTIGRAVITY_LOAD_CODE_ASSIST_METADATA`); Gemini CLI sends `{ ideType: "IDE_UNSPECIFIED", platform: "PLATFORM_UNSPECIFIED", pluginType: "GEMINI", duetProject?: <envProjectId> }`. (`oauth/google-antigravity.ts:20-22`, `oauth/google-gemini-cli.ts:118-130`)
- **Claude beta header:** `anthropic-beta: interleaved-thinking-2025-05-14` is added only when `model.compat.claudeThinkingBetaHeader && model.identity.class === "anthropic" && model.reasoning`. (`google-gemini-cli.ts:339,624-628`)

### F6. Session/trajectory IDs and labels (Antigravity only) (confidence: high)
`buildAntigravityRequestEnvelope()` mirrors the native `antigravity/hub` client:
- `sessionId`: a **negative signed-int63 decimal string** (`-<n>`), derived deterministically from the first 8 SHA-256 bytes of the first user message text when no session state exists, otherwise a random bounded value `< 9e18`; persisted in `AntigravityProviderSessionState`.
- `requestId`: `agent/<agentId>/<Date.now()>/<trajectoryId>/<step>`, where `agentId`/`trajectoryId` are UUIDs and `step = max(contextMessages.length, previous+1)` (monotonic, so compaction cannot rewind it; first request step 1, after one tool round trip step 3).
- `labels` (inserted in alphabetical key order): `cascade_id=<agentId>`, `last_execution_id=<prior response id>`, `last_step_index=<step-1>`, `model_enum=<wire profile token>`, `request_id=<trajectoryId>-<n>`, `root_cascade_id=<agentId>`, `trajectory_id=<trajectoryId>`, `used_claude`, `used_claude_conservative`, `used_non_gemini_model`.
- `userAgent: "antigravity"` on the envelope; per-SKU `maxOutputTokens` / `model_enum` / thinking constants come from discovered profiles with an offline fallback table keyed by wire id.
- Gemini CLI requests carry **no** sessionId or labels. (`google-gemini-cli.ts:283-300,1153-1217,1245-1290,1400-1450`, `catalog/wire/gemini-headers.ts:162-200`)

### F7. Tier / entitlement checks at login/provisioning (confidence: high)
- **Antigravity** (`oauth/google-antigravity.ts:224-299`): POST `https://daily-cloudcode-pa.googleapis.com/v1internal:loadCodeAssist` with the ANTIGRAVITY metadata; a second call including `cloudaicompanionProject` is made when `paidTier` is absent. `assertFreeTierEligible()` throws an `OAuthError` carrying the backend `ineligibleTiers[free-tier].reasonMessage` plus `validationUrl` when the free tier is not allowed. If `currentTier` is missing, POST `v1internal:onboardUser` with `{ tierId: "free-tier", metadata: {...} }`, then poll `GET https://daily-cloudcode-pa.googleapis.com/v1internal/<operationName>` every 1s with a 30s deadline; done-but-error or missing response raises a provisioning error. A final `loadCodeAssist` supplies `cloudaicompanionProject`; all failures are wrapped as `OAuthError` with kinds `provisioning`/`discovery`/`timeout`.
- **Gemini CLI** (`oauth/google-gemini-cli.ts:99-221`): POST `https://cloudcode-pa.googleapis.com/v1internal:loadCodeAssist` with `cloudaicompanionProject: <GOOGLE_CLOUD_PROJECT|GOOGLE_CLOUD_PROJECT_ID>` and GEMINI metadata. VPC-SC-affected users are detected via `error.details[].reason === "SECURITY_POLICY_VIOLATED"` and synthesised as `standard-tier`. With `currentTier`, returns the returned project (or env id, else a configuration error linking `goo.gle/gemini-cli-auth-docs#workspace-gca`). Otherwise the default tier comes from `allowedTiers` (`legacy-tier` fallback); non-free tiers require an env project id. `v1internal:onboardUser` starts an LRO polled at 5s intervals for at most 24 attempts (120s); the resulting `response.cloudaicompanionProject.id` is stored. Validation-URL-bearing errors are rewritten into the user-facing "sign in again" message.
- **Token expiry:** 60s refresh skew for both providers; `AuthStorage` is the sole single-flighted broker-aware refresh authority. The stream provider bails on a credential already past `expiresAt` rather than POSTing a stale token. (`google-gemini-cli.ts:336-337,530-545`)

### F8. Quota / entitlement at usage time (confidence: high)
`packages/ai/src/usage/google-antigravity.ts` implements `antigravityUsageProvider` (`id: "google-antigravity"`). `fetchAntigravityUsage()` requires a stored `projectId` and a non-expired access token; it POSTs `{ project: <projectId> }` first to `/v1internal:retrieveUserQuotaSummary` (the endpoint Antigravity's own quota UI uses — reports 5-hour and weekly buckets even before exhaustion), falling back to `/v1internal:fetchAvailableModels` for older CCA deployments. Endpoints: configured `baseUrl` or `[daily-cloudcode-pa.googleapis.com, daily-cloudcode-pa.sandbox.googleapis.com]`; headers are the same `Authorization` + `Content-Type` + `getAntigravityHeaders()` set. Quota buckets/groups are parsed into per-counter limits (`google`/`anthropic`/`openai`, daily/5h/weekly inferred from reset times), sorted by remaining fraction. `antigravityRankingStrategy` scopes limits by the active model's backend counter key (`quotaTierFor("google-antigravity", modelId)`), blocks per counter on exhaustion and heals blocks when later quota fetches recover — there is no separate entitlement check beyond the returned quota state. (paths: `usage/google-antigravity.ts:85-87,336-520,640-740`)

### F9. Error handling (confidence: high)
- Provisioning: typed `OAuthError` kinds `provisioning`, `discovery`, `timeout`, `polling`, `configuration`, `validation`; non-200 responses include status/statusText/body; a 30s `oauthFetch` timeout and cancellation checks around every provisioning round trip. (`oauth/google-oauth-shared.ts:1-70`, both OAuth provider modules)
- Streaming: `GeminiCliApiError` on non-2xx (carrying response headers); transient statuses trigger endpoint failover before the final retry budget; validation URLs in error bodies are rewritten into a "you must sign in again" message; in-band JSON `error` events, empty-stream retries, thought-only responses, missing finish reason, and aborts all produce typed errors; final errors pass through `AIError.finalize()` with a `rawRequestDump` for inspection. (`google-gemini-cli.ts:980-1152`)

### F10. Built-in vs extension override (confidence: medium-high)
**Built-in, not overridable by config:** endpoint constants, `getAntigravityHeaders()`/UA and version discovery, `buildRequest()` envelope/labels, OAuth client credentials/scopes and provisioning hooks, quota parsing. These are compiled into omp packages.

**Extension seams that can override behavior:**
- `ModelRegistry.registerProvider(name, config, sourceId)` (`model-registry.ts:3904-3990`): registers a custom `api` + `streamSimple` via `registerCustomApi`, a custom `oauth` via `registerOAuthProvider`, optional `baseUrl`/`headers`/`apiKey`, and a custom `usage` provider. Registering OAuth under the **paused** `google-antigravity` id clears its pause (`oauth/index.ts:57-64`) — this is the documented way an extension reclaims the disabled provider. A new `sourceId` taking over an existing provider name clears the previous provider's runtime state.
- Per-request options on the built-in stream function: `headers` (spread last), `fetch`, `onPayload` (whole-body replacement), `antigravityEndpointMode`, `model.baseUrl`, `requestModelId`, `providerSessionState`, `streamFirstEventTimeoutMs`.
- `models.yml`/config provider overrides (`baseUrl`, `apiKey`, `headers`, transport) and the `disabledProviders` settings switch (`model-registry.ts:2020-2091,3603-3610`). The auth-rule `disabled` pause itself cannot be cleared by config — only by editing the compiled rule or registering an extension OAuth login.

**Bottom line for bypass analysis:** the fingerprinting surface (UA, `Accept-Encoding`, client metadata, session/label envelope) is entirely built-in and hard-coded to imitate the native Antigravity/Gemini CLI clients. An extension cannot tweak individual pieces of that envelope through configuration; it must either replace the whole stream path with its own `api`/`streamSimple`, supply per-request `headers`/`onPayload`, or re-register the provider/OAuth under the same id.

---

## Evidence (file:line)

All paths relative to `/home/yuzu/projects/oh-my-pi` unless noted.

- `packages/ai/src/registry/oauth/google-antigravity.ts:13-22` — CCA endpoint `daily-cloudcode-pa.googleapis.com`, load/onboard/operations URLs, `free-tier`, `ANTIGRAVITY_LOAD_CODE_ASSIST_METADATA = { ideType: "ANTIGRAVITY" }`.
- `packages/ai/src/registry/oauth/google-antigravity.ts:24-120` — response schemas, free-tier eligibility check (`ineligibleTiers`, `validationUrl`), typed `OAuthError`.
- `packages/ai/src/registry/oauth/google-antigravity.ts:122-222` — `requestCloudCodeAssist`, two-stage `loadCodeAssist`, `onboardUser` LRO (30s timeout, 1s poll).
- `packages/ai/src/registry/oauth/google-antigravity.ts:224-299` — `discoverProject` with ANTIGRAVITY headers and full error wrapping.
- `packages/ai/src/registry/oauth/google-antigravity.ts:301-331` — `googleAntigravityProjectHook` (refresh preserves stored projectId; validation-URL message).
- `packages/ai/src/registry/oauth/google-gemini-cli.ts:12-60` — `cloudcode-pa.googleapis.com`, tier constants, VPC-SC detection, `POLL_INTERVAL_MS=5000`, `POLL_MAX_ATTEMPTS=24`.
- `packages/ai/src/registry/oauth/google-gemini-cli.ts:62-98` — `pollOperation()` LRO GET with timeout/abort handling.
- `packages/ai/src/registry/oauth/google-gemini-cli.ts:100-221` — `discoverProject` with env project id, GEMINI metadata, load/onboard/poll and error cases.
- `packages/ai/src/registry/oauth/google-gemini-cli.ts:223-265` — `googleGeminiCliProjectHook`.
- `packages/ai/src/registry/oauth/google-oauth-shared.ts:1-70` — 30s provisioning timeout, `throwIfLoginCancelled`, `oauthFetch`.
- `packages/ai/src/registry/oauth/index.ts:22-25,36-40,57-64` — disabled filter, custom OAuth registration, `providerPauseReason`, `assertProviderEnabled`.
- `packages/ai/src/registry/hooks/oauth-code.ts:12-13` — lazy hooks `google-gemini-cli-project` / `google-antigravity-project`.
- `packages/ai/src/registry/engine/oauth-code.ts:95-203` — OAuth code/token exchange mechanics (client id/secret, code, redirect_uri).
- `packages/ai/src/registry/engine/refresh.ts:60-85` — refresh grant with client id/secret.
- `packages/catalog/src/compat/rules/auth/google-antigravity.kdl:1-32` — full Antigravity login rule incl. `disabled`, PKCE, scopes, callback 51121, base64 client credentials, after-exchange hook.
- `packages/catalog/src/compat/rules/auth/google-gemini-cli.kdl:1-27` — full Gemini CLI login rule, callback 8085, scopes, credentials.
- `packages/catalog/src/compat/rules.json:1` — compiled auth stratum (callback portFallback/paste-code; base64 client id/secret for both providers).
- `packages/catalog/src/compat/rules/README.md:413,421` — documented semantics of `disabled` and extension reclaim.
- `packages/catalog/src/compat/auth.ts:22-24` — `providerDisabledReason()`.
- `packages/catalog/src/wire/gemini-headers.ts:7-20` — `getGeminiCliUserAgent()` / `getGeminiCliHeaders()` (UA, Client-Metadata).
- `packages/catalog/src/wire/gemini-headers.ts:22-108` — Antigravity UA docs, version manifest URL, `ensureAntigravityVersion()`.
- `packages/catalog/src/wire/gemini-headers.ts:110-160` — platform map, `getAntigravityUserAgent()`, `getAntigravityHeaders()`.
- `packages/catalog/src/wire/gemini-headers.ts:162-200` — offline wire-profile table / `getAntigravityModelWireProfile()`.
- `packages/ai/src/providers/google-gemini-cli.ts:1-50` — shared provider imports (crypto, headers, retry, onPayload, CCA schemas).
- `packages/ai/src/providers/google-gemini-cli.ts:283-337` — session-state interface, endpoint constants, retry/timeout constants.
- `packages/ai/src/providers/google-gemini-cli.ts:417-460` — `CloudCodeAssistRequest`/response chunk interfaces.
- `packages/ai/src/providers/google-gemini-cli.ts:525-630` — credentials parse, expiry check, endpoint selection, `buildRequest`, version ensure, header construction.
- `packages/ai/src/providers/google-gemini-cli.ts:965-978` — `POST /v1internal:streamGenerateContent?alt=sse` via `fetchWithRetry`.
- `packages/ai/src/providers/google-gemini-cli.ts:980-1055` — non-OK response handling, validation URL, in-band error events.
- `packages/ai/src/providers/google-gemini-cli.ts:1014-1152` — endpoint loop, empty-stream retries, failover, lastGoodEndpoint/lastExecutionId commit, final error finalize.
- `packages/ai/src/providers/google-gemini-cli.ts:1153-1217` — signed-decimal session id helpers.
- `packages/ai/src/providers/google-gemini-cli.ts:1239-1472` — `buildAntigravityRequestEnvelope()` and `buildRequest()`.
- `packages/ai/src/providers/google-shared.ts:1-60` — shared Google utilities / `GoogleApiType` union.
- `packages/ai/src/providers/google-shared.ts:200-300` — `convertMessages()` (role parts, thought signatures, tool calls).
- `packages/ai/src/providers/google-auth.ts:23-25,160-200` — Vertex ADC (separate from CCA): `oauth2.googleapis.com/token`, cloud-platform scope, JWT/refresh exchanges.
- `packages/ai/src/usage/google-antigravity.ts:85-87` — quota paths `v1internal:retrieveUserQuotaSummary` / `v1internal:fetchAvailableModels`.
- `packages/ai/src/usage/google-antigravity.ts:431-454` — `fetchAntigravityEndpoint()` (POST body/headers, endpoint failover).
- `packages/ai/src/usage/google-antigravity.ts:472-520` — `fetchAntigravityUsage()` (endpoints, summary-first, legacy fallback).
- `packages/ai/src/usage/google-antigravity.ts:640-740` — quota report, ranking strategy, counter scoping.
- `packages/coding-agent/src/config/model-registry.ts:2686-2722` — built-in Google model-manager options / discovery wiring.
- `packages/coding-agent/src/config/model-registry.ts:3603-3610` — `disabledProviders` settings check.
- `packages/coding-agent/src/config/model-registry.ts:3904-3990` — `registerProvider()` extension override path (`registerCustomApi`, `registerOAuthProvider`, usage override).
- `docs/provider-quirks.md:273,330` — official docs confirming ADC token URL and OAuth callback ports/scopes/PKCE.
- `/home/yuzu/projects/omp-agy-byp/docs/research/google-ai-subscription-blocks/findings/F6.md` (peer finding, context only) — community relays reuse these same client credentials and CCA endpoints.

## Open questions

1. **Version skew (resolved/historical).** The 18.18.1 pin is historical; the current verification target is the installed 18.22.2 build (`F-antigravity-cli-source.md`). This snapshot's constants — the `disabled` pause, the 2.26.0 UA/version-manifest lookup, and `retrieveUserQuotaSummary` — are 18.18.6 facts and are not re-asserted for 18.22.2 without a fresh source read.
2. **Compiled rule authority.** `rules.json` is a generated artifact of the KDL files. I did not verify whether the published package regenerates it at build/install time or ships the frozen compiled copy; the `disabled` flag exists in both here, but confirm for the pinned version.
3. **`cl` header validation.** The source comment claims the backend ignores a stale/zero/absent `cl` and only gates on version. I did not independently test this against the live endpoint.
4. **Why the pause.** The `disabled` reason is generic ("may restrict accounts … outside its own apps"); no source comment ties it to a specific enforcement event. Timeline context lives in the peer finding `F8.md` (Google's Feb 2026 Antigravity ban wave), but causation is not established in code. In 18.22.2 the pause reason is stated more strongly (terms violation, account suspensions, issue #18341) with an explicit login-warning (see version banner above); causation is still not established in code.
5. **Extension header precedence for built-in provider.** `options.headers` is spread last in the request headers (so a caller can override Authorization/UA per request), but I did not test whether a `registerProvider()` config with `headers` only is merged into the built-in stream at the same precedence or only affects model-level headers.
6. **`Client-Metadata` on Antigravity.** Gemini CLI sends `Client-Metadata: ideType=…,pluginType=GEMINI`; Antigravity headers omit it. Whether the backend requires an equivalent metadata header on `streamGenerateContent` (as opposed to provisioning) is not answered by source alone.
