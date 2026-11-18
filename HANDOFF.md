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
