## Angle

Cross-reference approved round-2 alias-adapter design + plan against LATEST official Antigravity docs. Scope: version assumptions, six Task-2 argument maps, MCP/ACP/SDK naming, safe-subset membership, description/schema fidelity. No code, no plan/spec edits. All fetches 2026-11-18. Tags: [P] owner source; [I] inference; [S] secondary. Context7 IDs used as given by Main.

## Claims

### 1. Versions and model surface

1. FACT: https://antigravity.google/docs/overview renders "Antigravity CLI 1.2.14" in a UI mockup and a model roster: Gemini 4 Carbon/Argon/Hydrogen, Orchestrator (Carbon/Argon), Gemini 3.8 Flash, Claude Sonnet 5.5, Claude Opus 5.5, GPT-OSS 120B. — SOURCE: https://antigravity.google/docs/overview — 2026-11-18 — [P]. CAVEAT: mockup string, not a release channel.
2. FACT: Owner CLI CHANGELOG top entry is 1.5.11; 1.5.10, 1.5.9 follow. 1.5.9 added `run_workflow` "for everyone" (bundled Python); 1.5.8 added Gemini 4 Hydrogen/Carbon to `/model` + context-window updates to `agy acp`; 1.5.4 added Auto mode to `agy acp` and `hookEventName`, `cwd`, `toolCall.id` to hook input; 1.5.1 made every account model available to every ACP client; 1.5.0 added `acp` to `agy --help`. — SOURCE: https://raw.githubusercontent.com/google-antigravity/antigravity-cli/main/CHANGELOG.md — 2026-11-18 — [P].
3. FACT: CLI reference itself cites mode availability in `v1.3.5+`, `v1.4.4+`, `v1.5.7+` and `agentMode` default `"auto"` in `v1.5.7+`, so doc text is current well past 1.2.14. — SOURCE: https://antigravity.google/docs/cli/reference — 2026-11-18 — [P]. INFERENCE: overview's 1.2.14 is stale illustrative text; owner changelog 1.5.11 is the release authority. [I]
4. FACT: Plan's catalog target agy 1.5.9 is two releases behind owner changelog top 1.5.11. Diff 1.5.9→1.5.11 contains no rename/addition to the six planned aliases; only `run_workflow` (added at 1.5.9) is a new tool and it is agy-internal, not an omp tool. — SOURCE: CHANGELOG.md (above) + installed `BUILTIN_TOOL_NAMES` (claim 19) — 2026-11-18 — [P]+[I].
5. FACT: omp host pin 18.22.2 is untouched by Antigravity owner docs; no official page names an omp version. Host pin stays as-is. — SOURCE: absence across pages in claim list + spec constraints — 2026-11-18 — [I].

### 2. Hooks tool names / argument keys — Task 2 verification

6. FACT: Live hooks page "Supported tools" lists, with exact names and argument keys: `view_file` (AbsolutePath, StartLine?, EndLine?, IsSkillFile?), `write_to_file` (TargetFile, Overwrite, CodeContent, Description, IsArtifact?, ArtifactMetadata?), `replace_file_content` (TargetFile, Instruction, Description, AllowMultiple, TargetContent, ReplacementContent, StartLine, EndLine, TargetLintErrorIds?), `multi_replace_file_content` (TargetFile, Instruction, Description, ReplacementChunks[], TargetLintErrorIds?, ArtifactMetadata?), `list_dir` (DirectoryPath), `find_by_name` (SearchDirectory, Pattern, Type?, Excludes?, Extensions?, FullPath?, MaxDepth?), `grep_search` (SearchPath, Query, IsRegex?, CaseInsensitive?, Includes?, MatchPerLine?), `search_web` (query, domain?), `read_url_content` (Url), `run_command` (CommandLine, Cwd, WaitMsBeforeAsync, RunPersistent?, RequestedTerminalID?), `manage_task`, `schedule`, `list_permissions`, `ask_permission`, `invoke_subagent`, `define_subagent`, `send_message`, `manage_subagents`, `ask_question`, `generate_image`. Matches F1 exactly; no renames. — SOURCE: https://antigravity.google/docs/hooks + context7 `/websites/antigravity_google` — 2026-11-18 — [P].
7. FACT: Six planned alias names all appear verbatim in the hooks supported-tools list; no official rename affecting them. — SOURCE: hooks page (claim 6) — 2026-11-18 — [P].
8. FACT: `view_file` plan map `path→AbsolutePath`, `offset→StartLine`: keys correct. Optional `EndLine`, `IsSkillFile` omitted — allowed. — SOURCE: hooks page — 2026-11-18 — [P]. INFERENCE: "AbsolutePath" implies absolute path; omp `read.path` may be relative → resolve before projection. `StartLine` 0-vs-1 base not stated anywhere owner-side. [I / unverified]
9. FACT: `write_to_file` plan map `path→TargetFile`, `content→CodeContent`, `overwrite→Overwrite`: keys correct. `Description` is documented WITHOUT optional marker; plan omits it. — SOURCE: hooks page — 2026-11-18 — [P]+[I].
10. FACT: `replace_file_content` plan map `path→TargetFile`, `old_string→TargetContent`, `new_string→ReplacementContent`: keys correct. `Instruction`, `Description`, `AllowMultiple`, `StartLine`, `EndLine` documented WITHOUT optional marker; plan omits all five. — SOURCE: hooks page — 2026-11-18 — [P]+[I].
11. FACT: `grep_search` plan map `pattern→Query`, `path→SearchPath`: keys correct; `IsRegex`, `CaseInsensitive`, `Includes`, `MatchPerLine` optional. — SOURCE: hooks page — 2026-11-18 — [P]. INFERENCE: omp `grep` is regex-based; projecting constant `IsRegex: true` improves fidelity. [I]
12. FACT: `find_by_name` plan map `pattern→Pattern`, `path→SearchDirectory`: keys correct; `Type`, `Excludes`, `Extensions`, `FullPath`, `MaxDepth` optional. — SOURCE: hooks page — 2026-11-18 — [P].
13. FACT: `run_command` plan map `command→CommandLine`, `cwd→Cwd`: keys correct BUT `WaitMsBeforeAsync` is documented WITHOUT optional marker and plan omits it. Hooks `PreToolUse` example passes `{"CommandLine":"npm test","Cwd":"/workspace/project","WaitMsBeforeAsync":5000}`. — SOURCE: https://antigravity.google/docs/hooks (PreToolUse input/output contract, example) — 2026-11-18 — [P]. This is the single clearest Task-2 gap.
14. FACT: CLI headless streaming example shows real tool step `tool_info.parameters = {"CommandLine":"echo hello_headless_demo"}`, `tool_name:"run_command"` — independent primary confirmation of PascalCase key casing in use. — SOURCE: context7 `/websites/antigravity_google_cli` → https://antigravity.google/docs/cli/headless — 2026-11-18 — [P].
15. FACT: Custom-agent docs: `tools:` frontmatter must contain exact tool names (`view_file`, `grep_search`, `run_command`); unmapped/misspelled names may hang the subagent process. Confirms exact-name sensitivity, though it applies to agent frontmatter, not MCP projection. — SOURCE: context7 `/websites/antigravity_google_cli` → https://antigravity.google/docs/subagents?tab=cli — 2026-11-18 — [P].
16. FACT: Official one-line descriptions available verbatim: view_file "View the contents of a file."; write_to_file "Create new files."; replace_file_content "Edit a single contiguous block of text in a file."; grep_search "Run fast text searches within specific paths."; find_by_name "Search for files and directories using glob patterns."; run_command "Propose a Bash command to run." — SOURCE: hooks page — 2026-11-18 — [P].

### 3. MCP / ACP / SDK naming

17. FACT: MCP naming unchanged: eager tools register as `mcp_<serverName>_<toolName>`; lazy (default) tools are cached to `<app-data-dir>/mcp/<serverName>/<toolName>.json` and invoked via built-in `call_mcp_tool` with `ServerName`, `ToolName`, `Arguments`. CLI cache path `~/.gemini/antigravity-cli/mcp/<serverName>/`. — SOURCE: https://antigravity.google/docs/mcp — 2026-11-18 — [P].
18. FACT: NEW vs F1 — `mcp_config.json` per-tool setting `tools.<toolName>.background` = `"off"|"always"` (background execution control). Also `enabledTools`/`disabledTools` selectors and `timeoutSeconds` (default 180 s per call, 300 s connect). — SOURCE: https://antigravity.google/docs/mcp — 2026-11-18 — [P]. omp's bridge passes `mcpServers: []`, so this config does not directly govern the loopback server (installed-source fact from F1). [I]
19. FACT: Lazy is default. Spec/plan phrase "agy calls `mcp_ide-tools_<alias>`" describes only the eager path. Under default lazy loading the model calls `call_mcp_tool(ServerName="ide-tools", ToolName="<alias>", ...)`; omp still receives bare `<alias>` in `tools/call` either way. Adapter seam unchanged; spec wording imprecise. — SOURCE: https://antigravity.google/docs/mcp + F1 installed bridge facts — 2026-11-18 — [P]+[I].
20. FACT: Owner changelog: subagents with `enable_mcp_tools=true` use an "MCP dispatcher meta-tool" — confirms on-demand discovery/dispatcher pattern, not direct MCP tool IDs in agent tool lists. — SOURCE: CHANGELOG.md — 2026-11-18 — [P].
21. FACT: `agy acp` flags unchanged from F1: `--agent`, `--add-dir`, `--sandbox`, `--dangerously-skip-permissions`, `--process-per-session`, `--ide-mcp-port` ("Port of the editor's MCP server to expose its tools to the agent. Requires `nc` on `PATH`."), `--login`, `--log-file`, `--disable-telemetry`. ACP v1 over stdio, "Antigravity ACP Server". — SOURCE: https://antigravity.google/docs/ide/extensions/acp + https://antigravity.google/docs/cli/acp — 2026-11-18 — [P]. No ACP tool-definition schema published → tool shaping stays an MCP-layer concern. [I]
22. FACT: SDK docs page lists 13 identifiers including `start_subagent`; owner `types.py` and SDK changelog v0.1.22 standardize `BuiltinTools.INVOKE_SUBAGENT`, deprecate `START_SUBAGENT`, enable `RUN_WORKFLOW` by default, add `force_all_tools_eager`, `mcp_max_output_bytes`, and `call_id` on tool hooks. Docs lag source. SDK vocabulary remains separate from hooks vocabulary — no transplant. — SOURCE: https://antigravity.google/docs/sdk/tools + context7 `/google-antigravity/antigravity-sdk-python` → https://antigravity.google/docs/changelog/ and types.py — 2026-11-18 — [P].
23. FACT: `run_workflow` is in CLI changelog 1.5.9 but absent from hooks "Supported tools" list — owner-side doc lag, and a second instance of docs-vs-changelog drift. — SOURCE: CHANGELOG.md + hooks page — 2026-11-18 — [P].

### 4. Safe subset and exclusions

24. FACT: omp builtins include `read`, `bash`, `edit`, `glob`, `grep`, `find`, `web_search`, `write`, `ast_grep`, `ast_edit`, `lsp`, `debug`, `eval`, `task`, etc. — SOURCE: installed omp 18.22.2 `pi-coding-agent/src/tools/builtin-names.ts:3-33` — 2026-11-18 — [P] (omp owner source).
25. INFERENCE: Keep exactly six aliases. No additions: `ast_grep`/`ast_edit`/`lsp`/`debug`/`eval` have no hooks-doc equivalents; `find` collides with `glob→find_by_name` (unique alias invariant); `web_search→search_web` is defensible but network-facing and unnecessary for this goal. No removals: all six map to official hook tools and installed omp builtins. — SOURCE: claim 24 + hooks page + spec invariants — 2026-11-18 — [I].
26. FACT: `manage_task`, `schedule`, `list_permissions`, `ask_permission`, `invoke_subagent`, `define_subagent`, `send_message`, `manage_subagents`, `ask_question`, `generate_image` are official hook/agent capabilities but not omp tools; `run_workflow` (1.5.9) is the same class. agy-internal exclusions stay right; add `run_workflow` to the excluded list explicitly. — SOURCE: hooks page + CHANGELOG.md + F1 installed bridge facts — 2026-11-18 — [P]+[I].

### 5. What remains unverifiable

27. UNVERIFIED: full JSON Schema (`type`, `required`, enums, descriptions) agy sends for the six native tools — hooks docs publish key names only, not schemas. Owner binary is closed (F1).
28. UNVERIFIED: whether unmarked keys (`Overwrite`, `Description`, `Instruction`, `AllowMultiple`, `StartLine`, `EndLine`, `WaitMsBeforeAsync`) are truly `required` in the model-facing schema vs merely non-optional in hook docs prose.
29. UNVERIFIED: `StartLine`/`offset` base (0- vs 1-indexed); `AbsolutePath` enforcement; whether agy accepts a relative `TargetFile`/`SearchDirectory`.
30. UNVERIFIED: literal Google-side server name `ide-tools`; `tool_call.title` vs `name` byte shape; exact native tool-call id format (F1 unchanged).

## Searches

- context7 `/websites/antigravity_google`: "Current Antigravity CLI version and built-in tool names with their argument keys (view_file, write_to_file, replace_file_content, grep_search, find_by_name, run_command) in hooks and tools documentation"
- context7 `/websites/antigravity_google`: "MCP tool naming mcp_server_tool call_mcp_tool lazy eager loading and ACP tool definitions, tool additions or renames"
- context7 `/websites/antigravity_google_cli`: "Latest Antigravity CLI version number, CLI reference manual built-in tools list, and tool naming shown in docs"
- context7 `/websites/antigravity_google_cli`: "current CLI version number shown in official docs and latest release version; agent tool names in CLI reference"
- context7 `/google-antigravity/antigravity-cli`: "Latest CHANGELOG version entries and any tool additions, renames, or ACP changes after 1.5.9"
- context7 `/google-antigravity/antigravity-sdk-python`: "BuiltinTools enum members and MCP tool naming conventions call_mcp_tool mcp_ prefix lazy eager loading"
- Direct reads: https://antigravity.google/docs/overview; /docs/hooks; /docs/mcp; /docs/cli/acp; /docs/cli/reference; /docs/ide/extensions/acp; /docs/sdk/tools; /docs/changelog/; https://raw.githubusercontent.com/google-antigravity/antigravity-cli/main/CHANGELOG.md; installed `pi-coding-agent/src/tools/builtin-names.ts`.

## Conflicts

- Overview UI shows CLI 1.2.14; owner changelog top 1.5.11; CLI reference cites v1.5.7+ features. Resolve: overview string is stale mockup; 1.5.11 is current release. Both [P], different artifact classes.
- Context7 `/websites/antigravity_google` index contains an eager-fallback note ("If Antigravity is unable to write a server's tool schema files to disk during initialization, it automatically falls back to eagerly loading all enabled tools for that server"). Live https://antigravity.google/docs/mcp fetched 2026-11-18 does NOT contain it (verified by text search). Resolve: live page wins; index stale. Do not use note as authority.
- SDK docs page lists `start_subagent`; owner source + SDK changelog v0.1.22 say `INVOKE_SUBAGENT` canonical. Resolve: source/changelog wins (F1 already established source>docs).
- ACP docs still say third-party models only for JetBrains/Android Studio/Zed/Xcode; changelog 1.5.1 says all models to every ACP client. Unresolved doc lag; do not rely on editor allowlist.
- Hooks docs omit `run_workflow` though changelog 1.5.9 added it. Doc lag; no alias impact.

## Gaps

- Exact native JSON schemas / required arrays / description strings for the six tools — closed binary; unverified.
- Index base for `StartLine` vs omp `offset`; absolute-path enforcement on `AbsolutePath`/`TargetFile`/`SearchDirectory`.
- Whether agy's bridge actually marks omp's loopback MCP tools eager or lazy — no owner config published; both paths reach omp identically.
- Full agy-internal tool set active under omp's `tools: []` bridge agent; MCP resource tool names.
- Google semantics of `_meta` keys used by omp; native `toolCallId` format. Unchanged from F1.

## Recommended plan/spec edits

Concrete list only; no edits performed.

1. Spec "Constraints" and plan "Global Constraints": replace "catalog targets agy 1.5.9" with "owner changelog top 1.5.11; 1.5.9 is the historical baseline; no six-alias rename through 1.5.11". Keep omp host pin 18.22.2 unchanged.
2. Note in spec/plan that the overview's "CLI 1.2.14" is a stale UI mockup, not the release version; do not use it to re-pin.
3. Plan Task 2 alias table: annotate each map with documented key status — required-looking keys: `view_file.AbsolutePath`, `write_to_file.{TargetFile,Overwrite,CodeContent,Description}`, `replace_file_content.{TargetFile,Instruction,Description,AllowMultiple,TargetContent,ReplacementContent,StartLine,EndLine}`, `grep_search.{SearchPath,Query}`, `find_by_name.{SearchDirectory,Pattern}`, `run_command.{CommandLine,Cwd,WaitMsBeforeAsync}`.
4. Plan Task 2 Step 2: add `WaitMsBeforeAsync` to projected `run_command` schema, optional with a documented default (hook example uses 5000). This is the most important Task-2 correction.
5. Plan Task 2 Step 2: add `Description` to `write_to_file` and `Instruction`/`Description`/`AllowMultiple`/`StartLine`/`EndLine` to `replace_file_content` as optional or derived-from-omp-context fields, so the projected schema mirrors the official key vocabulary.
6. Plan Task 2 Step 2: project constant `IsRegex: true` for `grep_search` (omp grep is regex), and resolve relative paths to absolute for `AbsolutePath`/`TargetFile`/`SearchDirectory` before projection.
7. Plan Task 2 Step 2 / descriptions: use the official one-line descriptions verbatim from hooks docs (claim 16) instead of ad-hoc phrasing.
8. Spec "Data flow" step 3: change "agy calls `mcp_ide-tools_<alias>`" to "model calls either eager `mcp_ide-tools_<alias>` or, by default, `call_mcp_tool` with `ToolName=<alias>`; omp receives the bare alias via `tools/call` in both cases".
9. Spec "Rollout"/docs: explicitly list excluded agy-internal tools including `run_workflow` (changelog 1.5.9), `manage_task`, permissions, MCP resources, subagents; state NO alias additions in v1 and record the rejection reasons from claim 25.
10. Spec "Non-goals"/"Open questions": carry forward the unverifiable list (claims 27-30) verbatim; do not imply schema fidelity beyond hook-doc key names.
11. Optional context note (no behavior change): MCP `tools.<tool>.background` and `timeoutSeconds` defaults exist in official docs but do not govern omp's loopback bridge (`mcpServers: []`).
