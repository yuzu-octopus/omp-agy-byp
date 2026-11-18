# Human handoff: Antigravity CLI smoke test

**Status: not run.** This is a manual check of omp's built-in `antigravity-cli` provider, which runs Google's managed `agy` over the Agent Client Protocol (ACP). No repository plugin is needed. The steps are based on the installed omp 18.22.2 docs and source, not a live session.

## Prepare

- Run `omp --version` and record the version. Run `command -v nc` in the same shell; it must resolve an `nc` executable on `PATH` for the IDE tool bridge. Record only whether it was found.
- Let omp download and SHA-512-verify Google's `agy` release in its own data directory. Make sure `PI_AGY_PATH` is unset in the effective environment; the managed path does not require a separate `agy` on `PATH` or a separate `agy` login. Google's ACP instructions explain the protocol; use omp's setup below rather than configuring the ACP subprocess yourself.
- Use a new omp session in an empty, disposable directory, with no project files or secrets. The `agy` child inherits omp's environment, including variables omp loads from `.env` files. Use a clean launch environment and keep unrelated credentials out of both exported variables and any `.env` files omp will load. Do not dump the environment to check it. Use a session that will not switch to another provider automatically.

## Run

1. Start `omp` in the disposable directory and enter `/login antigravity-cli`. Read the account-policy warning before completing sign-in. Proceed only if this use is permitted for your account and organization. Complete Google's sign-in for the intended account, then paste the authorization code or callback URL **only** into omp's interactive sign-in prompt. Do not capture the sign-in screen or put credentials in command-line arguments (including `--api-key`).
2. After login completes, open `/model`. Select one `antigravity-cli/<model-id>` that your account is eligible to use. The bundled picker is not proof of entitlement. If no eligible model is available, stop and record that.
3. Confirm the selected provider is `antigravity-cli` and send one prompt: `Reply with exactly: ACP smoke OK. Do not use tools or modify files.` **Pass:** the selected model finishes and returns `ACP smoke OK.` without a tool call or workspace change. An error, unfinished turn, wrong reply, unexpected action, or reply served by a different provider does not pass. Cancel any unexpected action.
4. **Optional — read-only tool round trip.** After the text check passes, create `smoke.txt` yourself in the disposable directory with one made-up, non-sensitive line. Do not include the line in your prompt. Ask: `Use the read tool to read smoke.txt and return its only line exactly. Do not edit files or run commands.` If asked to approve a tool call, allow only the read of `smoke.txt`. **Pass:** omp shows a successful read of that file, the final reply matches its contents, and the workspace is unchanged since you created the file. A reply without a visible read is not proof of a tool round trip. Record `skipped` if you omit this step.

## If blocked

| Symptom | What to do |
| --- | --- |
| Provider or model missing | Check the omp version, whether `antigravity-cli` is disabled by local or organization configuration, and whether sign-in completed. If the provider is present but no eligible model appears after login, check your subscription or ask the account administrator; do not assume access from a model name in the docs. |
| Sign-in fails | Confirm you are in the `antigravity-cli` interactive flow and use the fresh code or callback from that attempt. If the account or organization denies access, stop and seek guidance from the administrator or Google support. |
| `nc` missing | Make an approved netcat installation available on `PATH` in the shell that starts omp. Confirm `command -v nc` there before starting a new session. |
| Temporary rate limit | Stop this run. If the service explicitly gives a retry time, wait until it has passed before considering a new run. Do not send repeated attempts. |
| Exhausted quota | Stop this run. A short wait is not a quota reset. Check the account's official usage or plan information and wait for the normal reset or resolve the quota issue through official support. |
| Ambiguous `429` or access denial | Stop and record the observed status. A `429` alone does not distinguish temporary throttling from exhausted quota. Use official account information or support rather than sending more requests to classify the denial. |

## Record a sanitized result

Report the UTC timestamp, OS, omp version, whether `nc` was found, whether the managed `agy` setup and login completed, the selected `antigravity-cli/<model-id>` (if any), and separate outcomes for text and optional read (`pass`, `fail`, `blocked`, or `skipped`). For a failure or block, name the step and give the visible error code or a short redacted summary. Do not attach raw logs, transcripts, or screenshots. Omit account identifiers, authorization and callback URLs, codes, tokens, keys, environment values, and private paths.

Primary references: [omp: Antigravity CLI provider](https://github.com/can1357/oh-my-pi/blob/main/docs/providers.md#antigravity-cli) · [Google Antigravity: ACP](https://antigravity.google/docs/ide/extensions/acp/).

## Optional plugin live checks (not run)

These are live checks of the optional extension in `src/index.ts`. They are separate from the built-in-provider smoke test above and have not been run. Do them only where the built-in smoke test is permitted for your account. Report outcomes sanitized, with no tokens, codes, URLs, keys, environment values, or private paths.

Load and inspect the extension from a clean shell:

```sh
omp plugin link /absolute/path/to/omp-agy-byp
omp plugin doctor
omp models -e /absolute/path/to/omp-agy-byp/src/index.ts
```

`-e` must follow the subcommand (`omp -e ...` is not the same). `--help` never loads extensions, so it cannot verify loading. Exit code is zero even on load failure: read stderr for `Failed to load extension` rather than relying on the exit status.

1. In a fresh omp session, run `/login antigravity-cli` and complete the account-approved sign-in. Paste the code or callback only into omp's prompt, never into `--api-key` or another command line.
2. Run `/agy-byp status`. **Pass:** it reports `off`, the provider roster (`antigravity-cli`, `google-antigravity`, `google-gemini-cli`), the mode/flags, the fallback pause reason (or `not paused`), and `auth.unpausedProviders` guidance. No credential or token value appears.
3. Run `/agy-byp on`. **Pass:** it confirms scrubbing is on; with the default `OMP_AGY_BYP_UNPAUSE_FALLBACK` it also unpauses `google-antigravity` once. It must not print any token.
4. Run `/model`, select an eligible `antigravity-cli/<model-id>`, and send one short prompt that does not use tools or modify files. **Pass:** one normal response completes. Record the observed system prompt summary as shown by omp, if available; a failed or different-provider turn is not a pass.
5. Compare with `OMP_AGY_BYP_MODE=native` in a separate session: with `native`, the scrub hooks return copies without rewriting omp's strings, so any reported system prompt should match the unmodified omp text. Record the difference or its absence; do not claim a detector outcome from it.
6. Run `/agy-byp off`, then `/agy-byp status`. **Pass:** status reports `off`, and no pause, deactivation, or unpause action is reported. Leave the session in the off state.

## Round 2: host patch and alias round trip (human-only)

Every step below is for the person running omp. Agents do not perform a live Google login, do not access an account, and do not apply a patch to a real install. Never share tokens, codes, callback URLs or credentials with an agent. Report outcomes sanitized, with no raw logs, transcripts, screenshots, keys, environment values or private paths.

### 1. Prepare a disposable host copy

Use a copy of the omp host installation you can modify and discard — never the install you rely on. The patch targets `pi-ai/src/providers/antigravity-cli/host.ts` under the host root and is pinned to `18.22.2`. Copy the whole host root (the directory containing `pi-ai/`, or the `@oh-my-pi/pi-ai` package directory) to a disposable directory, and run omp from that copy so the patched file is the one actually loaded. Run from this repository root:

```sh
# Check first — writes nothing. Expect: {"action":"checked","status":"missing",...}
bun scripts/apply-host-patch.ts --check --host /absolute/path/to/disposable-host-root

# Apply only to the disposable copy. Expect: {"action":"applied","status":"ok",...}
bun scripts/apply-host-patch.ts --host /absolute/path/to/disposable-host-root
```

Apply writes `<host-root>/pi-ai/src/providers/antigravity-cli/host.ts.orig` once. Re-running apply reports `already-applied`; a drifted or wrong-version host is refused with no write.

### 2. Load the extension and inspect status

From a clean shell, link this repository's extension and verify loading (exit code is zero even on load failure — read stderr for `Failed to load extension`):

```sh
omp plugin link /absolute/path/to/omp-agy-byp-tool-alias
omp plugin doctor
omp models -e /absolute/path/to/omp-agy-byp-tool-alias/src/index.ts
```

Start a fresh omp session from the disposable host copy. Complete your own account-approved `/login antigravity-cli` if needed — paste codes only into omp's prompt, never into `--api-key` or another command line. Then run `/agy-byp status`.

**Pass:** it reports `off`, the three provider ids, mode/flags, `patch: ok`, and `alias: off`. No credential or token value appears. If patch reports `missing` or `drifted`, the extension still loaded and text scrubbing still works; stop this alias check and review the patch steps. Patch status is sampled when the extension loads, so reload omp after patching or reverting.

### 3. Flip on and run one tool round trip

1. Run `/agy-byp on`. **Pass:** scrubbing is on; status now reports `patch: ok` and `alias: pending`, with the note that alias changes take effect at the next prompt.
2. Create a small, non-sensitive `alias-smoke.txt` yourself in the disposable directory with one made-up line. Do not put that line in your prompt.
3. Send one prompt that needs exactly one tool call: `Use the read tool to read alias-smoke.txt and return its only line exactly. Do not edit files or run commands.`
4. **Pass:** omp shows one successful tool call whose outgoing name is the official alias `view_file` with Antigravity-style keys such as `AbsolutePath`; the final reply matches the file's line; and the workspace is unchanged. A reply with no visible tool call is not a pass. If asked to approve the call, allow only that read. Cancel anything unexpected.
5. Run `/agy-byp status` again. **Pass:** `alias: active` (no longer pending) after the prompt boundary. Record any difference; do not infer a detector outcome from it.

Optional control: in a separate session with `OMP_AGY_BYP_MODE=native`, repeat the round trip. **Pass:** the tool uses omp's native `read` name and canonical keys, and status reports `alias: off` even with the toggle on and patch ok.

### 4. Revert

Restore the original host file from its backup and confirm the patch is gone:

```sh
cp /absolute/path/to/disposable-host-root/pi-ai/src/providers/antigravity-cli/host.ts.orig \
   /absolute/path/to/disposable-host-root/pi-ai/src/providers/antigravity-cli/host.ts
bun scripts/apply-host-patch.ts --check --host /absolute/path/to/disposable-host-root
# Expect: {"action":"checked","status":"missing",...}
```

Then discard the disposable copy and run `/agy-byp off` in the session before closing it. If a real install was patched by mistake, restore its `.orig` the same way and reload omp: a running session keeps reporting the old patch status until reload.

Record sanitized outcomes (`pass`, `fail`, `blocked` or `skipped`) for the check, status, round trip and revert. Rate-limit, quota, access-denial and ambiguous-`429` conditions from the table above remain stop conditions here too.
