# F — Latest public Antigravity CLI docs/source + identity surfaces (as of 2026-11-18)

Scope: public first-party docs, official repo/changelog/issues, ACP spec, installed omp source (18.22.2; source paths relative to `@oh-my-pi` package root), plus clearly-labelled practitioner artifacts. No secrets reproduced. OAuth client id abbreviated; client secret value never quoted.

## Sources

### Primary — official / first-party (fetched 2026-11-18 unless noted)

- **P1** Official ACP CLI docs — `https://antigravity.google/docs/cli/acp`. `agy acp` = ACP server, JSON-RPC over stdio; protocol v1; editor launches as subprocess; sign-in/tools/settings from CLI. High.
- **P2** Official "Other editors (ACP)" guide — `https://antigravity.google/docs/ide/extensions/acp`. Server "speaks ACP protocol version 1 over stdio and identifies itself as `Antigravity ACP Server`"; full flag table; auth-method table; thinking levels; session load/resume/list/close. High.
- **P3** Official CLI reference — `https://antigravity.google/docs/cli/reference`. Flags, `settings.json` keys, `modelProvider: "gemini"`, `GEMINI_API_KEY`, `useG1Credits`, telemetry. High.
- **P4** Official MCP docs — `https://antigravity.google/docs/mcp`. `mcp_config.json` paths; eager tools registered as `mcp_<serverName>_<toolName>`; `call_mcp_tool`; system prompt carries exact schema-dir path; CLI dir `~/.gemini/antigravity-cli/mcp/<serverName>/`. High.
- **P5** Official model docs — `https://antigravity.google/docs/models`. Plan-based model table; `agy models` = per-account catalog; thinking levels Low/Medium/High/Extra (`xhigh`); 2026-11-18 removal note for Claude 4.6 / GPT-OSS-120b. High.
- **P6** Official repo README — `https://raw.githubusercontent.com/google-antigravity/antigravity-cli/main/README.md`. Keyring auth, SSH detection, enterprise GCP. High.
- **P7** Official repo CHANGELOG — `https://raw.githubusercontent.com/google-antigravity/antigravity-cli/main/CHANGELOG.md`. 1.5.10 at top; env knobs; `_meta` keys; model-list change in 1.5.1; ACP changes. High.
- **P8** Official repo tree API — `https://api.github.com/repos/google-antigravity/antigravity-cli/git/trees/main?recursive=1`. Repo contains only README, CHANGELOG, examples, gif, issue templates. **No CLI source published.** High.
- **P9** Official releases API — `https://api.github.com/repos/google-antigravity/antigravity-cli/releases/latest`. 1.5.10 published 2026-11-17T05:41Z. High.
- **P10** Official issue #1318 — `https://github.com/google-antigravity/antigravity-cli/issues/1318`. Open; opened 2026-10-22; first-party tracker acknowledgement of `clientInfo.name` allowlist in 1.3.0/1.4.1. High that issue exists; code snippet inside is practitioner-supplied.
- **P11** ACP spec initialization — `https://agentclientprotocol.com/protocol/initialization`. `clientInfo`/`agentInfo` name/title/version are SHOULD; custom capabilities via `_meta`. High.
- **P12** Installed omp source + docs (read directly): `pi-ai/src/providers/antigravity-cli/host.ts`, `mcp-bridge.ts`, `credentials.ts`, `agent.md`, `pi-catalog/src/compat/rules/providers/antigravity-cli.kdl`, `pi-ai/src/registry/oauth/antigravity-cli.ts`, `omp://providers.md`. High for what omp sends.
- **P13** Companion source-derived findings: `docs/research/omp-antigravity-investigation/F-antigravity-cli-source.md`, `F-antigravity-cli-hooks.md`; `docs/research/omp-antigravity-signature-mapping/F-header-tls.md`. High for source facts.

### Practitioner artifacts — NOT first-party (kept separate; confidence medium/low)

- **A1** t3code issue #16489 — `https://github.com/pingdotgg/t3code/issues/16489`. 2026-10-06; `clientInfo.name` changed 11→18 models on ACP 1.3.0. Medium (controlled repro, third-party).
- **A2** tiezbro/paseo-agy-acp model-catalog investigation — `https://raw.githubusercontent.com/tiezbro/paseo-agy-acp/main/docs/research/google-antigravity-acp-model-catalog-investigation.md`. 2026-08-28; unpacked RC01 Python source + local probes. Medium (source quotes unverified here).
- **A3** phuryn/grok-build-vscode ACP research — `https://raw.githubusercontent.com/phuryn/grok-build-vscode/main/research/antigravity-acp.md`. Measured 1.4.0 (2026-10-14/15) and 2026-11-11; unpacked source + live probes. Medium.
- **A4** Leads only, search snippets, not fetched: `https://pypi.org/project/agy-acp` (0.2.2 ACP adapter), `https://github.com/qwe840608/agy-skill`. Low.

## Findings

**F1. Version timeline.** Latest public CLI = **1.5.10**, published 2026-11-17 (P9). Repo publishes docs/changelog/examples only — binary closed-source (P8). Installed omp 18.22.2 hard-codes agy 1.5.9 roster (`pi-ai/src/providers/antigravity-cli/credentials.ts:2`, `pi-catalog/src/compat/rules/providers/antigravity-cli.kdl:12,70`; P12); one release behind. High.

**F2. Official `agy acp` surface.** Server over stdio, JSON-RPC NDJSON, protocol v1; self-identifies as `Antigravity ACP Server` (P1,P2). Flags: `--add-dir`, `--agent`, `--sandbox`, `--dangerously-skip-permissions`, `--process-per-session`, `--ide-mcp-port` (requires `nc`), `--login`, `--log-file`, `--disable-telemetry` (P2). Supports session load/resume/list/close; multi-root folders; images/embedded resources; elicitation forms; steering; cancel (P2). Logs `~/.gemini/antigravity-cli/log/acp-*.log` (P2). High.

**F3. clientInfo / serverInfo.** ACP `initialize` carries `clientInfo {name,title,version}` + `clientCapabilities`; response carries `agentInfo {name,title,version}` — both SHOULD, not MUST; `_meta` = extension channel (P11). Practitioner probes of the standalone registry server report `agentInfo {name:"antigravity-acp", title:"Google Antigravity", version:"…RC01"}` (A2). Official docs give human string `Antigravity ACP Server` (P2). **Gating:** official issue #1318 says pre-1.5.1 server offers Claude/GPT-OSS only to allowlisted `clientInfo.name` (jetbrains, android-studio, zed, xcode); `t3-code` got 11 Gemini models, `zed` got 18 (P10,A1). Changelog 1.5.1: "offer every model available to your account to every ACP client, where previously only a fixed list of editors were offered models other than Gemini" (P7). Reconciliation: docs page still describes old editor allowlist (P2) → stale; 1.5.1 changelog is later and authoritative for model catalog. Issue #1318 left open; no explicit close note. High for both facts, medium for "fully removed".

**F4. MCP tool bridge.** Official `--ide-mcp-port` = editor MCP server port exposed to agent; requires `nc` on PATH (P2). Official MCP naming rule: eager tools = `mcp_<serverName>_<toolName>`; lazy tools via `call_mcp_tool` + on-disk schema cache (P4). Practitioner 1.4.0 notes: client advertises `_meta.antigravity.systemPrompt.append` and no fs/terminal; `mcpServers: []` (A3). Official changelog `_meta` keys: `antigravity.google/root_conversation_id` on MCP `tools/call` (line 328), `antigravity/alwaysLoad` in a server's `tools/list` (line 439) (P7). Reconciliation: `antigravity.google/root_conversation_id` is the genuine client's MCP `tools/call` key; omp instead reads `_meta["antigravity.google/conversation_id"]` in the ACP bridge session (`F-antigravity-cli-source.md:59,75`; P12). Whether these are distinct keys at different protocol points or the same concept under different names is unverified; do not assume they are interchangeable. omp bridge: loopback `127.0.0.1:<ephemeral>` NDJSON MCP, protocol `2025-06-18`, `serverInfo {name:"tools",version:"1.0.0"}`, one socket, 32 MB frame cap; tools projected as `{name,description,inputSchema}`; tool ids `agy_<uuid>`; conversation id from `_meta["antigravity.google/conversation_id"]` (P12). `mcp_ide-tools_<name>` is agy's view; omp docs confirm (P12). High.

**F5. System prompt / `_meta`.** omp sends joined system prompt as `_meta: {antigravity: {systemPrompt: {append: system}}}` on `session/new` and `session/load` — not as prompt text (`host.ts:281,491-496,845-847`; P12). Practitioner 1.4.0 sees the same key advertised in client capabilities (A3). No first-party doc/changelog entry for this key found (P3,P4,P7) → protocol-extension behavior, not publicly documented. High for omp side; medium for server semantics.

**F6. Model list.** Official catalog varies by plan and auth method; `agy models` is authoritative per account (P5). omp seeds 7 for agy 1.5.9: `gemini-4-carbon` (default), `gemini-4-argon`, `gemini-4-hydrogen`, `gemini-3.8-flash`, `claude-opus-5-5`, `claude-sonnet-5-5`, `gpt-oss-120b-medium`; orchestrators omitted; effort ladders low/medium/high (+ xhigh hydrogen) (P5,P12). 1.5.10 adds Orchestrator for Gemini Enterprise / `AGY_ADC_AUTH` (P7). Official docs mark Claude 4.6 + GPT-OSS-120b "Will be removed on November 18, 2026" (P5) — today. High.

**F7. Env knobs.** First-party changelog (P7): `AGY_ADC_AUTH`, `AGY_LLM_GATEWAY_MODELS`, `ANTIGRAVITY_DISABLE_EMBEDDED_RIPGREP`, `AGY_CLI_MAC_OPTION_AS_ALT`, `AGY_CLI_OSC7501`, `AGY_CLI_OSC7501_MESSAGES`, `AGY_CLI_HIDE_LOGO`, `AGY_CLI_DISABLE_ESCAPE_SEQUENCE_OPTIMIZATIONS`, `AGY_CLI_CMD_OUTPUT_PERCENTAGE`, `AGY_CLI_DISABLE_LATEX`, `AGY_CLI_HIDE_ACCOUNT_INFO` (hides email/plan tier), `PLUGIN_ROOT`, `PLUGIN_DATA`, `PYTHONUTF8` (auto-set), `GOOGLE_GEMINI_BASE_URL`, `GEMINI_API_KEY`, `GOOGLE_CLOUD_PROJECT`, `GOOGLE_CLOUD_LOCATION`, `XDG_CONFIG_HOME`. Practitioner-only ACP-server knobs: `AGY_ACP_ENABLE_GATEWAY_AUTH`, `AGY_ACP_FORCE_FILE_STORAGE`, `GEMINI_HOME`, `AGY_DEFAULT_CONTEXT_WINDOW`, `AGY_ACP_DEFAULT_MODEL` (A2,A3) — unverified in first-party docs. omp-side: `PI_AGY_PATH` selects binary without SHA check; forced child env `SSH_TTY=omp-agy-file-auth` and `AGY_CLI_DISABLE_AUTO_UPDATE=1`; all other `Bun.env` inherited (`host.ts:800`, `binary.ts:29-34`, `registry/oauth/antigravity-cli.ts:185`; P12,P13). No official evidence for `CODE_ASSIST_ENDPOINT` / `SURFACE` / UA overrides in the CLI docs or changelog (P7) — those remain speculative.
**Credential-hygiene note (F7 env inheritance).** omp's `agy` child inherits the full `Bun.env` with no stripping and reads its OAuth token exclusively from the staged token file; keep unrelated secrets out of the spawn environment, or strip them before spawning where possible, so they are not handed to the CLI subprocess.

**F8. Auth / client identity.** Auth methods: `oauth-personal`, `oauth-business`, `gemini-api-key` (reads `GEMINI_API_KEY` from agent env), `agent-platform` (ADC / `gcp.project`,`gcp.location`), `terminal-login` (P2). No credentials → `-32000 Authentication required` (P2,A3). Keyring with SSH fallback (P6). omp login spawns `agy acp --login --gemini-dir … --app-data-dir …` (P12). OAuth client: public installed-app id `1071006060591-…apps.googleusercontent.com`; secret stored base64 in source — **value not reproduced**; refresh via `oauth2.googleapis.com/token`; ID-token email/sub used as identity metadata only (`credentials.ts:20-23,47-61,205-283`; P12). omp stages native consumer grant into private account-scoped token file; `SSH_TTY` forces file-only storage (P12,P13). Practitioner: ACP RC01 copied CLI OAuth client constants but used separate keychain account `antigravity-acp`; source comment said final client id "decision pending" (A2) — historical, not current. High.

**F9. omp argv and bridge identity.** Inference argv hard-coded: `<agy> acp --agent bridge --gemini-dir <dir> --ide-mcp-port <port> --dangerously-skip-permissions`; stderr ignored; cwd = request cwd; `nc` required (`host.ts:42,777,783-802`; P12). `bridge` agent definition written to `<geminiDir>/config/agents/bridge.md`: `name: bridge`, `mainAgent: true`, `tools: []`, `inheritCustomizations: false`, `excludeDefaultComponents: true` (P12). ACP clientInfo: `{name:"bridge", title:"Host tool bridge", version:"1"}`; clientCapabilities fs false / terminal false; requestPermission → cancelled (`host.ts:445-449,823`; P12). No extension API for argv/env; `before_provider_request`/`after_provider_response` ignored on this transport (P13).

**F10. Transport/header boundary.** Official CLI owns socket, TLS, headers, UA; no first-party doc exposes them (P1–P9). Practitioner UA forms: standalone ACP RC01 `antigravity/acp/{version} (… host_path={client_surface}/{surface_version}; …)` (A2); direct CCA paths separately documented in `F-header-tls.md` (P13). Official changelog acknowledges DPI firewalls resetting TLS connections (line 1213, P7) but publishes no fingerprint/UA spec. omp emits zero HTTP headers/UA/Auth on this path (P12,P13). High.

## Genuine-client surfaces

What a genuine client presents or accepts, with source:

| # | Surface | Value / rule | Source |
|---|---|---|---|
| G1 | Protocol | ACP v1 over stdio NDJSON; JSON-RPC 2.0 | P1,P2,P11 |
| G2 | Server identity | `Antigravity ACP Server` (docs); `agentInfo.name=antigravity-acp` (probe) | P2,A2 |
| G3 | Client identity | `clientInfo {name,title,version}` SHOULD; `_meta` extensions | P11 |
| G4 | Gating (≤1.4.x) | third-party models only for allowlisted client names; `zed`/jetbrains/android-studio/xcode | P10,A1 |
| G5 | Gating (≥1.5.1) | all account-available models to every ACP client | P7 |
| G6 | Capabilities | client may omit fs/terminal; server advertises loadSession, prompt capabilities, mcpCapabilities, auth/logout | P2,P11,A3 |
| G7 | System prompt | `_meta.antigravity.systemPrompt.append`; also advertised as client capability by third-party client | P12,A3 |
| G8 | MCP bridge | `--ide-mcp-port` + `nc`; `mcp_<server>_<tool>`; genuine-client `_meta` `antigravity.google/root_conversation_id` (MCP `tools/call`), `antigravity/alwaysLoad`; omp reads `_meta["antigravity.google/conversation_id"]` in the ACP session — relationship unverified | P2,P4,P7,P12,F-antigravity-cli-source.md:59,75 |
| G9 | Model/thinking | `configOptions` model + `thought_level`; effort Low/Medium/High/Extra(xhigh); `agy models` per account | P2,P5,P12 |
| G10 | Auth | five methods above; `-32000` when unauthenticated; keyring + SSH paste | P2,P6 |
| G11 | Account/plan | model entitlement by plan; `AGY_CLI_HIDE_ACCOUNT_INFO` hides email/tier | P5,P7 |
| G12 | Credentials | public installed-app OAuth client; private native token file; no token in argv; no secret quoted here | P6,P12 |
| G13 | Env | `GEMINI_API_KEY`, `GOOGLE_CLOUD_*`, `AGY_ADC_AUTH`, `AGY_CLI_*` set above; child inherits env | P2,P3,P7,P12 |
| G14 | UA/TLS | owned by closed CLI; no public spec; DPI reset acknowledged | P7,P8,P13 |
| G15 | omp client (not Google) | `clientInfo.name="bridge"`, agent `bridge`, tool prefix `mcp_ide-tools_`, argv fixed | P12 |

## Open questions

- Q1. Did 1.5.1 fully remove the `clientInfo.name` allowlist, or only widen model catalog while other per-client handling remains? Official issue #1318 still open; no closing commit note found.
- Q2. Exact wire semantics of `_meta.antigravity.systemPrompt.append` (append vs replace, loadSession vs newSession precedence) — no first-party doc. Practitioner + omp source only.
- Q3. Genuine upstream HTTP headers/User-Agent/TLS fingerprint of `agy` 1.5.10 — closed binary; no public spec. Practitioner UA strings are historical (RC01/1.4.0) and unverified against 1.5.10.
- Q4. Whether `SURFACE`, `CODE_ASSIST_ENDPOINT`, or other env knobs affect current agy identity — no first-party evidence in docs/changelog.
- Q5. Effect of the 2026-11-18 removal of Claude 4.6 / GPT-OSS-120b on ACP catalog and on omp's 1.5.9 roster. **Partially affected**: `gpt-oss-120b-medium` is one of omp's seven pinned models (F6) and is the named model in the removal footnote (`*` "Will be removed on November 18, 2026", P5); Claude Sonnet/Opus 4.6 carries that same footnote but is not in omp's roster. Claude 5.5 (`claude-opus-5-5`, `claude-sonnet-5-5`) is genuinely unaffected — it carries a separate `**` trial-plans footnote. Verify post-removal ACP catalog behavior (whether requests to `gpt-oss-120b-medium` fail, fall back, or are silently rerouted) before treating the 1.5.9 roster as current.
- Q6. `ag-acp` PyPI adapter and `agy-skill` repo not fetched; may contain further practitioner protocol detail (A4, low).
- Q7. Installed omp targets agy 1.5.9; whether 1.5.10 changed ACP `_meta`, tool naming, or auth methods is untested.
