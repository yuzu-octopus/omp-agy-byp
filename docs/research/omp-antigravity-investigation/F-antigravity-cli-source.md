# F — `antigravity-cli` source investigation (installed 18.22.2)

Scope: the read-only installed source under the global Bun install. All evidence paths below are **relative to the `@oh-my-pi/` package root** (e.g. `pi-ai/src/...`, `pi-catalog/src/...`, `pi-coding-agent/src/...`, `pi-utils/src/...`) so this report stays portable. Five assigned files were read in full: `antigravity-cli.ts`, `antigravity-cli/binary.ts`, `antigravity-cli/conversation-store.ts`, `antigravity-cli/credentials.ts`, `registry/oauth/antigravity-cli.ts`; supporting modules (`host.ts`, `step-writer.ts`, `reconcile.ts`, `mcp-bridge.ts`, `agent.md`, replay templates) and registration/config files were read to close the data flow.

## Findings

### 1. Identities and registration

- **Auth id** = `antigravity-cli`. **Provider id** = `antigravity-cli`. **API/transport id** = `antigravity-acp`. These are three distinct surfaces: the auth rule and credential envelope use `antigravity-cli`, the stream dispatch and model `api` use `antigravity-acp`.
- The auth rule declares: display name "Antigravity CLI (Gemini, Claude, GPT-OSS)", a `login-warning` about Google's inconsistent guidance for third-party agents, `login "custom" hook="antigravity-cli"`, `refresh hook="antigravity-cli"`, and `api-key-format "structured"` — i.e. omp's encrypted credential store holds a JSON envelope, not a bare token. `pi-catalog/src/compat/rules/auth/antigravity-cli.kdl:5-11`
- The provider catalog seeds `api="antigravity-acp" base-url="https://antigravity.google" bundle="always"`, default model `gemini-4-carbon`, `requires-native-tools #true`, `preserves-max-output-tokens #false`, with 7 seeded models and per-model `thought_level` ladders (`low/medium/high`, plus `xhigh` for `gemini-4-hydrogen`). `pi-catalog/src/compat/rules/providers/antigravity-cli.kdl:4-82`
- `antigravity-acp` is a **built-in** API (`BUILTIN_API_IDS`), and `registerCustomApi` explicitly refuses built-in names — an extension cannot register a replacement stream under that id. `pi-ai/src/api-registry.ts:19-46,72-93`
- Wiring: lazy builtin stream export → `stream.ts` dispatch `case "antigravity-acp"` → `streamAntigravityCli`. Per-request options are mapped with `cwd` and validated `reasoning` (effort) forwarded; `antigravity-acp` is excluded from direct message transformation (`DIRECT_REPLAY_APIS[...] = false`). `pi-ai/src/providers/register-builtins.ts:314-318`, `pi-ai/src/stream.ts:1034-1039,2433-2440`, `pi-ai/src/providers/transform-messages.ts:573`
- Login/refresh hooks are registered in `CUSTOM_LOGIN_HOOKS` / `CUSTOM_REFRESH_HOOKS` under the same `antigravity-cli` key. `pi-ai/src/registry/hooks/custom.ts:8-24`
- `AntigravityCliPayload` (`type: "antigravityCli"`, `conversationId`, `digest`, optional `checkpoint`) is the provider payload attached to each assistant step so later steps can resume/rewind agy's conversation. `pi-ai/src/types.ts:1238-1267`

### 2. Login flow (`/login antigravity-cli`)

1. Requires `ctrl.onPrompt` or `ctrl.onManualCodeInput`; honours cancellation; emits progress. `registry/oauth/antigravity-cli.ts:153-157`
2. Resolves the binary with `ctrl.fetch ?? fetch` (a slow install does not consume the sign-in budget), bounded by a 60 s start timeout. A 10-minute overall deadline is combined with `ctrl.signal`. `registry/oauth/antigravity-cli.ts:157-161`
3. Creates mode-0700 `logins/login-*` temp dir under `agyGeminiDir()`; abandoned login dirs older than 24 h without a credential are renamed then removed (a dir with a credential is retained for export-failure recovery). `registry/oauth/antigravity-cli.ts:98-151,162-165`
4. Spawns **`agy acp --login --gemini-dir <dir> --app-data-dir <dir>/antigravity-cli`** with piped stdin/stdout/stderr and env `{...Bun.env, SSH_TTY:"omp-agy-file-auth", AGY_CLI_DISABLE_AUTO_UPDATE:"1"}`. `registry/oauth/antigravity-cli.ts:171-187`
5. `AgyAuthUrlParser` scans both stdout and stderr for an `https://accounts.google.com/...` URL, requires `client_id === AGY_OAUTH_CLIENT_ID`, caps buffered output at 64 KB, and calls `ctrl.onAuth({url, instructions})`; `ctrl.onManualCodeInput` or a secret `onPrompt` collects the code/callback URL (`agyAuthorizationCode` extracts `?code=`, rejects CRLF). The code plus newline is written to child stdin, stdin is ended, and exit is awaited with 60 s bounds. `registry/oauth/antigravity-cli.ts:20-74,192-241`
6. On exit 0, `exportAgyCredentials` reads `<dir>/antigravity-cli/antigravity-oauth-token` (≤1 MB) and parses the **native consumer grant** (not Gemini CLI's `oauth_creds.json`): requires `auth_method === "consumer"`, a non-empty `access_token`, a parseable `expiry`, a non-empty `refresh_token` that is not the broker remote-refresh sentinel; extracts `email`/`accountId` from the ID-token claims (or `id_token_email`). Account identity is mandatory. `registry/oauth/antigravity-cli.ts:243-254`, `credentials.ts:47-98`
7. Cleanup kills the child with SIGKILL; the temp dir is removed unless login succeeded but export failed (then it is intentionally kept private and recoverable). `registry/oauth/antigravity-cli.ts:269-275`
8. Refresh (`refreshAntigravityCli = refreshAgyCredentials`) POSTs `client_id`, `client_secret`, `grant_type=refresh_token`, `refresh_token` to `https://oauth2.googleapis.com/token` with a 30 s timeout; classifies only 400/401 `invalid_grant|invalid_client|unauthorized_client` as revocation, checks account identity does not change, and applies a ≤60 s expiry skew. Broker sentinel refreshes are refused. `credentials.ts:205-283`, `registry/oauth/antigravity-cli.ts:278`

### 3. Binary resolution and download

- `resolveAgyBinary()` returns **`PI_AGY_PATH` verbatim if set**; otherwise installs into `<managed dir>/bin`. `binary.ts:29-34`
- Managed root is `getAntigravityCliDir()` → `dirs.rootSubdir("antigravity-cli", "data")`: `~/.omp/antigravity-cli` for the default profile; `~/.omp/profiles/<name>/antigravity-cli` under `OMP_PROFILE`/`PI_PROFILE`; `$XDG_DATA_HOME/omp/antigravity-cli` on Linux/macOS when the default profile and an existing `$XDG_DATA_HOME/omp` are present (XDG is only honoured after `omp config init-xdg` migration). There is no dedicated agy-directory env var. Beneath it: `gemini/` for isolated CLI state and `bin/` for releases. `pi-utils/src/dirs.ts:815-818,361-404,441-454,115-123`, `binary.ts:24-27`
- `ensureAgyInstalled()` returns an existing versioned binary `<dir>/<version>/(agy|agy.exe)` and schedules a background update at most once per 24 h; failures log and retain the old release. Concurrent callers coalesce through an `operations` map. `binary.ts:36-49,74-85`
- `install()` takes a file lock (1800 × 100 ms retries), fetches Google's manifest `https://antigravity-cli-auto-updater-974169037036.us-central1.run.app/manifests/<platform>.json` with a 30 s timeout; validates version regex, SHA-512 (128 hex), requires the download URL to be `https:` on `storage.googleapis.com`; streams the download with a **60 s no-bytes stall timeout** (not a total deadline), verifies SHA-512, extracts the `antigravity` entry from `.tar.gz`, chmods 0755, renames atomically, and writes `install.json` atomically. `binary.ts:7-11,87-170,172-206`
- Platform key: `darwin_amd64|arm64`, `windows_*`, `android_*`, `linux_*` with `_musl` appended when `/lib/libc.musl-x86_64.so.1` or `...aarch64.so.1` exists; unsupported platforms throw. `binary.ts:51-72`

### 4. argv to `agy acp` and process setup

- **Inference argv**: `[binary, "acp", "--agent", "bridge", "--gemini-dir", <account dir>, "--ide-mcp-port", <ephemeral port>, "--dangerously-skip-permissions"]`, `cwd = options.cwd`, stdin/stdout piped, **stderr ignored**. `pi-ai/src/providers/antigravity-cli/host.ts:783-802`
- Requires `nc` (netcat) on PATH for agy's tool bridge. Writes `<geminiDir>/config/agents/bridge.md` from `agent.md` (frontmatter: name `bridge`, `mainAgent: true`, `tools: []`, `inheritCustomizations: false`, `excludeDefaultComponents: true`). `host.ts:42,777-779,839-843`, `agent.md:1-9`
- ACP `initialize`: `protocolVersion: 1`, `clientCapabilities {fs.readTextFile:false, writeTextFile:false, terminal:false}`, `clientInfo {name:"bridge", title:"Host tool bridge", version:"1"}`; `requestPermission` always returns `cancelled` because omp executes tools itself. `host.ts:821-827,444-450`
- One process is kept per account/session; a changed tools list, cwd, or credential version restarts it. `host.ts:222-249,244-249,374-451`

### 5. How auth reaches the child

- The structured api-key envelope `{token, refreshToken, expiresAt, email, accountId}` is decoded; `agyCredentialKey()` derives a stable namespace `sha256("email:"+lower(email))` (preferred) or `sha256("sub:"+accountId)`, so token rotation never changes conversation ownership. `credentials.ts:100-134`
- Per stream: `stageAgyCredentials()` writes `<geminiDir>/<account>/antigravity-cli/antigravity-oauth-token` atomically (dir 0700, file 0600, `wx` temp + rename) containing `{token:{access_token, token_type:"Bearer", refresh_token (omitted for broker sentinel), expiry ISO}, auth_method:"consumer", id_token_email}`, then re-reads and byte-verifies it. Expired credentials are rejected before any request. `credentials.ts:155-203`, `antigravity-cli.ts:55-64`
- `agyCredentialVersion()` = `sha256(JSON.stringify([access, refresh, expires]))`; when it changes (e.g. broker refresh) the host restarts so agy's cached token source is dropped. `credentials.ts:136-142`, `host.ts:232,246,379`
- The child sees credentials **only through that file**: `SSH_TTY="omp-agy-file-auth"` triggers agy's native `sshDetector` to select file-only storage for the process (the path is never opened by agy as a tty), preventing global keychain reads/writes. No token is passed in argv or env. `credentials.ts:144-153`

### 6. env stripping / overrides

- There is **no stripping**: both spawn sites inherit all of `Bun.env`. Only three overrides are applied: `SSH_TTY` (file-auth marker), `AGY_CLI_DISABLE_AUTO_UPDATE:"1"` (omp owns updates), and at login the same pair. `registry/oauth/antigravity-cli.ts:185`, `host.ts:800`
- `PI_AGY_PATH` overrides the binary; `nc` must be on PATH. The managed data dir follows omp's profile/XDG data root (see Finding 3); no dedicated agy-dir env var exists. No other agy env knobs are set by omp. `binary.ts:30-34`, `host.ts:777`, `pi-utils/src/dirs.ts:815-818,361-404,115-123`

### 7. Prompt / tool / context serialization

- **System prompt**: `(context.systemPrompt ?? []).join("\n\n")` is passed as `_meta: { antigravity: { systemPrompt: { append: system } } }` on `session/new` and `loadSession` — not as prompt text. `host.ts:224-225,281,491-496,845-847`
- **Tools**: each omp tool becomes `{name, description, inputSchema}` with unchanged name/description and `normalizeSchemaForMCP(toolWireSchema(tool))`; served by a loopback NDJSON MCP server on `127.0.0.1:<ephemeral>`, protocol `2025-06-18`, `serverInfo {name:"tools",version:"1.0.0"}`, `tools/list` returns the fixed list, single client socket, 32 MB frame cap. agy sees them as `mcp_ide-tools_<name>`; ACP `tool_call` titles are matched with `/\bmcp_ide-tools_(\S+)/` to gate tool execution. `host.ts:48,222-223,854-859`, `mcp-bridge.ts:9-23,40-115,142-195`
- Tool results map back to MCP `{content:[text|image], isError}`; invalid args return a bounded diagnostic instead of executing; the tool call id is `agy_<uuid>`; conversation id is read from `_meta["antigravity.google/conversation_id"]`. `host.ts:626-672,861-874,876-920`, `mcp-bridge.ts:172-177`
- **Context/messages**: `reconcile.planTurn()` chooses `resume` when the live ledger prefix matches `transcriptDigest` exactly; otherwise `restore` from a recorded checkpoint (SQLite `VACUUM INTO` fork, identity + prefix-fingerprint verified) or `fresh` replay. `reconcile.ts:38-73`, `conversation-store.ts:41-99`
- `replayPrompt()` serializes earlier turns as labelled blocks (`<user>`, `<assistant>`, `<tool_result id name error>`, `<tool_call id name>…</tool_call>`, `<thinking>`) inside a `<conversation-checkpoint>` template, with images as ACP image blocks preserving bytes; trailing user/developer messages are sent directly via `inputBlocks()` (text/image order preserved). `reconcile.ts:85-163`, `transcript.md:1-2`
- **Model/effort**: `setSessionConfigOption` with `configId:"model"` and `configId:"thought_level"`; effort comes from `options.reasoning` or agy's advertised default. `host.ts:506-530,849-852`
- A tool boundary parks the MCP request until the next omp stream delivers its `toolResult`; if omp's transcript diverges, agy's turn is cancelled and drained first, then `lateToolResultPrompt()` sends the actual result as a new ACP prompt. `host.ts:294-323,572-611`, `reconcile.ts:130-144`, `late-tool-result.md:1-2`

### 8. NDJSON / ACP output → `AssistantMessageEventStream`

- `ndJsonStream()` wraps a `WritableStream` over `child.stdin` and `child.stdout`; `ClientSideConnection` handlers are `requestPermission → cancelled` and `sessionUpdate → onUpdate`. `host.ts:812-827`
- `StepWriter` constructs one `AssistantMessage` per omp step and pushes: `start`; `text_start/text_delta/text_end` for `agent_message_chunk`; `thinking_start/thinking_delta/thinking_end` for `agent_thought_chunk`; `toolcall_start/toolcall_delta/toolcall_end` (one complete call) at a tool boundary; `usage` from `usage_update` + turn totals; terminal `done` with reason `stop`/`length`/`toolUse`, or `error` for aborted/cancelled/empty responses. `host.ts:694-718,720-759`, `step-writer.ts:9-155`
- `runStep()` catches any thrown error and calls `writer.fail("aborted"|"error", message)`. `antigravity-cli.ts:37-46`
- Turn end (`end_turn`) records a checkpoint from SQLite high-water marks (`steps`, `gen_metadata`, `executor_metadata`) bound to the transcript digest; the payload `{type:"antigravityCli", conversationId, digest, checkpoint?}` is retained on the assistant message. `host.ts:742-758`, `conversation-store.ts:19-39,186-198`

### 9. Identity / header / fingerprint surfaces

- **OAuth identity**: public installed-app `client_id` `1071006060591-…apps.googleusercontent.com` and a base64-held client secret used only for refresh; token endpoint `oauth2.googleapis.com/token`. ID-token `email`/`sub` are identity metadata only, never used to authenticate requests. `credentials.ts:20-23,47-61,205-283`
- **ACP/MCP identity**: client name `bridge` / "Host tool bridge" / v1; agent definition `bridge`; MCP server name `tools` / v1; tool prefix `mcp_ide-tools_`; `_meta.antigravity.systemPrompt.append`; `_meta["antigravity.google/conversation_id"]`; base URL `https://antigravity.google` in catalog metadata only. `host.ts:42,444-450,845-859`, `mcp-bridge.ts:143-157,172-177`, `pi-catalog/src/compat/rules/providers/antigravity-cli.kdl:17`
- **Fingerprints**: `transcriptDigest` = sha256 over model-visible ordered content (timestamps/usage/presentation excluded); checkpoint `prefixFingerprint` = sha256 over prefix rows of `steps`, `parent_references`, `gen_metadata`, `executor_metadata` (protobuf blobs hashed as bytes); conversation identity checked via `trajectory_meta.cascade_id`; `agyCredentialKey` and `agyCredentialVersion` as above. `reconcile.ts:75-83,165-193`, `conversation-store.ts:118-122,155-184`, `credentials.ts:122-142`
- **Headers**: omp emits **no HTTP headers, User-Agent, or Authorization header at all** on this path — inference is entirely inside the CLI subprocess; upstream headers/TLS/identity are owned by `agy`. A generic `resolveHeaders`/`withResolvedHeaders` chain exists but only resolves model metadata before dispatch and is irrelevant to this transport. The `headers`/`authHeader` knobs in `registerProvider` and `models.yml` affect HTTP-backed providers (e.g. the separate `google-antigravity` fallback), **not** `antigravity-acp`. `pi-ai/src/utils/model-headers.ts:1-20`, `pi-ai/src/stream.ts:845-880`, `pi-coding-agent/dist/types/extensibility/extensions/types.d.ts:1703-1748`

### 10. Session lifecycle

- With `providerSessionState`, hosts are keyed `antigravity-acp:<account>:<sessionId ?? "default">` and live in that map. SDK callers without a map use a module-local `implicitSessions` map: a supplied `sessionId` owns a host; otherwise the last assistant step's `antigravityCli.conversationId` locates the parked host. Hosts with a pending turn are retained and retired after `IDLE_MS = 5` minutes; otherwise disposed (owned conversations deleted). `antigravity-cli.ts:22-29,65-120`, `host.ts:189-197,339-356`

## Evidence(file:line)

- `pi-ai/src/providers/antigravity-cli.ts:1-120` — stream entry, credential staging, session maps, idle retirement.
- `pi-ai/src/providers/antigravity-cli/binary.ts:1-206` — manifest URL, platform keys, install/update, SHA-512, `PI_AGY_PATH`.
- `pi-ai/src/providers/antigravity-cli/conversation-store.ts:1-198` — UUID/digest validation, WAL-safe checkpoint, fork, fingerprint, identity check.
- `pi-ai/src/providers/antigravity-cli/credentials.ts:1-283` — client id/secret, native grant parse, account key/version, `SSH_TTY` file auth, staging, refresh.
- `pi-ai/src/registry/oauth/antigravity-cli.ts:1-278` — login flow, URL parser, argv, temp dirs, export, hooks.
- `pi-ai/src/providers/antigravity-cli/host.ts:1-942` — ACP host, argv, env, MCP gating, resume/restore/fresh, event mapping.
- `pi-ai/src/providers/antigravity-cli/step-writer.ts:1-156` — `AssistantMessageEventStream` events.
- `pi-ai/src/providers/antigravity-cli/reconcile.ts:1-193` — turn planning, digest, replay, late tool result.
- `pi-ai/src/providers/antigravity-cli/mcp-bridge.ts:1-195` — loopback NDJSON MCP server.
- `pi-ai/src/providers/antigravity-cli/agent.md:1-9`, `transcript.md:1-2`, `late-tool-result.md:1-2` — injected agent definition and replay templates.
- `pi-ai/src/api-registry.ts:19-46,64-118`, `pi-ai/src/stream.ts:845-880,1034-1039,2433-2440`, `pi-ai/src/providers/register-builtins.ts:314-318`, `pi-ai/src/providers/transform-messages.ts:573`, `pi-ai/src/types.ts:1238-1267` — registration and dispatch.
- `pi-ai/src/registry/hooks/custom.ts:8-24`, `pi-ai/src/registry/oauth/index.ts:34-115` — auth hook and pause/unpause surfaces.
- `pi-catalog/src/compat/rules/auth/antigravity-cli.kdl:1-11`, `pi-catalog/src/compat/rules/providers/antigravity-cli.kdl:1-82` — auth/provider catalog.
- `pi-utils/src/dirs.ts:815-818,361-404,441-454,115-123` — managed directory, profile and XDG data-root resolution.
- `pi-coding-agent/dist/types/extensibility/extensions/types.d.ts:898-902,1316-1359,1659-1748`, `pi-coding-agent/src/extensibility/extensions/runner.ts:2582-2617`, `pi-coding-agent/src/sdk.ts:4887-4889` — extension seams.

## Extension seams

1. **Binary / dir**: `PI_AGY_PATH` replaces binary resolution wholesale (no SHA check on the override). Managed state dir via `getAntigravityCliDir()` (omp data root). `nc` must be on PATH. Not extension-API-gated — plain env.
2. **Provider config** (`pi.registerProvider("antigravity-cli", …)` / `models.yml`): can override `baseUrl`, `headers`, `authHeader`, model roster, `api`, `usage`, `fetchDynamicModels`, and attach a custom `oauth` object. It **cannot** replace the built-in `antigravity-acp` stream (`registerCustomApi` rejects built-in API ids); a custom `streamSimple` only applies to a non-built-in API, i.e. a different provider. `types.d.ts:1659-1748`, `api-registry.ts:72-93`
3. **Auth takeover**: `registerOAuthProvider({id:"antigravity-cli", login, refreshToken, getApiKey})` or `pi.registerProvider({oauth})` under that id replaces login/refresh and also removes the paused-provider block for that id. `pi-ai/src/registry/oauth/index.ts:69-100`
4. **Paused providers**: `setUnpausedProviders([...])` / `auth.unpausedProviders` re-enables `google-antigravity` (HTTP fallback); a custom OAuth login under the paused id does the same. Does not affect `antigravity-cli`, which is not paused. `pi-ai/src/registry/oauth/index.ts:56-99`
5. **Prompt/context hooks**: `before_agent_start` can replace `message` and `systemPrompt`; `context` can replace `messages`; `assistant_message` rewrite, tool events, and `registerTool`/`registerCommand` can change tool names/descriptions/schemas that then flow to MCP `tools/list`. **`before_provider_request`/`onPayload` and `after_provider_response`/`onResponse` do NOT fire for this transport**: `stream.ts:1875-1876` places them in provider options, but `streamAntigravityCli`/`AgyHost` never reads them (no references anywhere in the CLI transport), so payload/metadata and response-metadata rewrite hooks are unreachable here — CCA envelope/header/UA hooks cannot touch this path. `types.d.ts:898-906,1316-1359`, `runner.ts:2582-2617`, `sdk.ts:4887-4889`, `pi-ai/src/stream.ts:1875-1876`
6. **Per-request options**: `cwd`, `reasoning`/effort, `sessionId`, `providerSessionState`, and `signal` are supplied by the caller; `reasoning` is validated against the model's `thinking` ladder before reaching `antigravity-acp`. `antigravity-cli.ts:17-20,59-66`, `stream.ts:2433-2440`
7. **Test/injection seams (not extension-facing)**: `AgyHostOptions` (`startTransport`, `holdLimitMs`, `cancelTimeoutMs`, `announcementTimeoutMs`, `startupTimeoutMs`, `schedule`), `AgyConnection`, `AgyTransport`, `CleanupLoginOptions.afterClaim`, and `fetchImpl` parameters. `host.ts:59-105`, `registry/oauth/antigravity-cli.ts:102-117`

Hard boundaries for a bypass plugin: extension hooks can rewrite prompt/systemPrompt/messages/tool schemas, but they cannot change the OAuth client id/secret, the `SSH_TTY` file-auth marker, the argv, the MCP tool prefix, the ACP `_meta` keys, the CLI's native headers/User-Agent/TLS, or the conversation/credential fingerprints — those are fixed in the installed source unless the CLI binary itself is replaced.

## Open questions

- Upstream HTTP request shape (headers, User-Agent, TLS fingerprint, routing) is inside the closed `agy` binary; not derivable from omp source. Requires binary/traffic inspection.
- Whether a future omp version wires `onPayload`/`onResponse` into `streamAntigravityCli`; in 18.22.2 both are set by stream dispatch but ignored by the CLI transport (`stream.ts:1875-1876`, no references under the CLI transport directory). This is a source-level fact, not a runtime uncertainty.
- `PI_AGY_PATH` is trusted without version or SHA-512 validation; implications of an attacker-controlled binary are obvious but out of scope for this report.
- Whether `$XDG_DATA_HOME/omp` exists on a given host decides the default-profile managed dir; `rootSubdir` caches the first result per subdir, so a mid-process XDG change is not observed. Source-resolved, not a runtime gap. `pi-utils/src/dirs.ts:386-404,447-454`
- Whether `--dangerously-skip-permissions` alters any upstream identity/signature (beyond local tool permissions) is CLI-internal.
- The separate `google-antigravity` HTTP fallback (pause/unpause, headers) is covered by other slices, not re-derived here.
