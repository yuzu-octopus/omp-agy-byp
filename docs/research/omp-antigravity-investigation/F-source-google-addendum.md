## Addendum — unpause mechanism discrepancy (RESOLVED 2026-11-18)

Status: RESOLVED. The discrepancy was a version skew, not a contradiction between sources.

The original grep result (no `unpausedProviders` anywhere under `packages/`) stands for the 18.18.6 monorepo snapshot only. That snapshot predates the setting.

The installed/host-verified build is 18.22.2. In that build `unpausedProviders` / `setUnpausedProviders` exist at `pi-ai/src/registry/oauth/index.ts:36-37,62-64,98`, `pi-coding-agent/src/config/model-settings.ts:75,92`, and `auth-broker-config.ts:153`; CHANGELOG entries confirm the addition. (`F-antigravity-cli-source.md:106`.)

`omp://settings.md` § "Paused providers" documents `auth.unpausedProviders`: it is accepted through global config, `--config` files and runtime overrides only (a project `.omp/config.yml` cannot unpause), takes effect live in a running session, and the auth-broker host must set it too because the broker drops paused credentials. Cross-reference `F-omp-docs.md:14,58,82` and `F-antigravity-cli-source.md:106`.

Conclusion: `auth.unpausedProviders` is a valid operator-layer toggle in the installed 18.22.2 build; `google-antigravity` remains paused by default. The former "Open question for Main" and the warning against asserting the toggle are superseded and withdrawn. Extension reclaim of a paused provider id remains a distinct surface documented at `F-source-google.md:22,90`. No secret values are quoted here.
