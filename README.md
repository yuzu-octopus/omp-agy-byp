# Antigravity CLI in omp

Use omp's built-in `antigravity-cli` provider. It launches Google's `agy acp` locally and talks to it over the Agent Client Protocol (ACP). omp added the provider in [18.20.2](https://github.com/can1357/oh-my-pi/releases/tag/v18.20.2); this guide references the installed 18.22.2 build. **There is no plugin to install.** This repository contains research and a deferred extension draft, not an extension.

## Get started

1. Review the [Google Antigravity terms](https://antigravity.google/terms/) and any policy that applies to your account before signing in. Google's terms restrict third-party access and warn of possible account suspension. Google documents ACP; that does not mean it endorses omp. No plan or model eligibility is guaranteed.
2. Make sure `nc` (netcat) is on `PATH` where omp runs; the tool bridge needs it. Prefer omp's managed `agy` binary: omp downloads it from Google's release manifests and verifies its checksum. You don't need a separate `agy` installation or to start `agy acp` yourself.
3. In an interactive omp session, run `/login antigravity-cli`. Follow the Google sign-in prompts and paste the authorization code or callback URL into omp when prompted.
4. Run `/model` and choose an available model under `antigravity-cli`. Availability depends on the signed-in account and Google's current restrictions.

## Which provider?

`antigravity-cli` is separate from `google-antigravity`, omp's paused direct-OAuth provider. `google` is the Gemini API-key provider; `google-vertex` uses a Google Cloud API key or Application Default Credentials (ADC). None of those providers are needed for this setup.

## References

- [Operator handoff](HANDOFF.md) — live checks for the person running omp.
- [omp provider docs](https://github.com/can1357/oh-my-pi/blob/main/docs/providers.md#antigravity-cli) and [Google's ACP docs](https://antigravity.google/docs/cli/acp/) — setup and protocol reference, respectively.
- [Historical provider notes](docs/research/omp-antigravity-investigation/F-omp-docs.md) and [transport research](docs/research/omp-antigravity-signature-mapping/REPORT.md) — dated evidence, not setup instructions or a support matrix.

## Optional plugin: default-off prompt scrubbing

`src/index.ts` is an optional omp extension that rephrases omp-owned prompt strings before they reach subscription-backed providers. **It is off by default** — loading it changes nothing until you run `/agy-byp on`. Use `/agy-byp off` to make the hooks inert again, or `/agy-byp status` to report the toggle, provider roster, mode/flags, the fallback's pause reason, and guidance on `auth.unpausedProviders` (operator config layers only — user/global, never a project layer). The command never prints tokens or credentials. The plugin does not register providers, OAuth handlers, or tools, does not spawn a CLI or open a socket, and does not change headers, user agents, or TLS.

### Prerequisites

- Review the [Google Antigravity terms](https://antigravity.google/terms/) and your account policy first; Google warns that third-party access may lead to suspension.
- Run `/login antigravity-cli` in an interactive omp session; paste the authorization code or callback URL only into omp's sign-in prompt. Never paste an access token into `--api-key`.
- Let omp download and SHA-512-verify `agy` itself. Prefer leaving `PI_AGY_PATH` unset: the plugin never sets it. A custom path bypasses omp's managed verification and exposes the staged OAuth token file to the spawned child, so use a custom binary only if you fully trust it.
- Keep `nc` (netcat) on `PATH` where omp runs; the IDE tool bridge needs it.

### Provider scope

| Provider | Role | Plugin hooks |
| --- | --- | --- |
| `antigravity-cli` | Primary built-in `agy acp` transport | `before_agent_start`, `context` |
| `google-antigravity` | Optional direct-OAuth fallback (usually paused) | `before_agent_start`, `context`, `before_provider_request` |
| `google-gemini-cli` | Legacy HTTP-backed lane | `before_agent_start`, `context`, `before_provider_request` |
| `google`, `google-vertex` | Excluded API-key / ADC lanes | None |

`before_agent_start` and `context` run for all three subscription providers. `before_provider_request` runs only for the HTTP-backed `google-antigravity` and `google-gemini-cli` lanes: the built-in `antigravity-cli` transport never consumes `onPayload`, and `google`/`google-vertex` are not subscription lanes.

### Environment

| Variable | Values | Effect |
| --- | --- | --- |
| `OMP_AGY_BYP_MODE` | `generic` (default), `native` | `generic` rephrases omp-owned strings; `native` leaves them unchanged (useful for comparison). |
| `OMP_AGY_BYP_SCRUB_TOOL_DESCRIPTIONS` | `1` enables; anything else disables (default) | Scrubs tool descriptions in the HTTP payload seam only. Tool descriptions are not re-registered on the CLI path: that changes `toolsKey` and can abandon a parked turn. |
| `OMP_AGY_BYP_UNPAUSE_FALLBACK` | unset/`1` enables (default), `0` disables | With this on, `/agy-byp on` unpauses `google-antigravity`. `/agy-byp off` never pauses or deactivates anything. |

### Honest limitations

Scrubbing only rephrases omp's own content strings. It cannot change `agy`-owned headers or user agents, or the fixed `agy acp` argv. There is no guarantee that any upstream detector reads prompt text at all. Treat this as an experiment, not a way to guarantee access or avoid enforcement; see [the handoff](HANDOFF.md) for live checks.
