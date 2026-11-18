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
