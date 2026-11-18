# How AI vendors block consumer-subscription use outside official clients

**Answer:** Google has no single published "official-clients-only" spec. Its boundary is assembled from a closed enumeration of "Gemini Apps", plan-gated per-product quotas, a robots.txt-conditioned ToS automation clause, and — for CLI/Antigravity — a private OAuth → Cloud Code Assist entitlement path whose client ID, secret and headers are public in shipped source [4,9][primary][29,30][primary]. Enforcement is documented and dated (Feb 2026 ban wave with shared-backend collateral, Mar 2026 "more robust detection", 18 Jun 2026 consumer CLI sunset, permanent ban on second violation) [45,46][primary][43][primary], but Google has never named the detection signals; practitioner relays reuse the published client identity and hardcode the same headers, and fail through 403/429/410/expiry events rather than a disclosed detector [88,89,90][primary artifact][92,99][primary artifact]. Other vendors converge on the same architecture, with Anthropic the only one that explicitly bans third-party credential intermediation and describes anti-spoofing enforcement [64,69][primary], while OpenAI and GitHub Copilot carve out pure-OSS/partner clients [76][primary][87][primary].

**Confidence:** medium-high overall. High for documented contract/entitlement mechanics and the dated enforcement chronology (2+ independent primary sources). Medium for the cross-vendor comparison (official docs are clear; detection internals are not). Low for *which* signal drives any given consumer ban — no vendor confirms it, so every signal-specific claim below is marked `[inference]`. Numbers appear only where a source states them.

## Why

The boundary is contractual, architectural and temporal — not a single technical switch.

1. **The contract defines who is in.** Google's current policy stack is the Google ToS + Generative AI Prohibited Use Policy; no standalone "Gemini Apps ToS" exists in the live index [1,2,3][primary]. "Gemini Apps" is a *closed, enumerated* list of official surfaces, introduced with "include only" [4][primary]. The API side states the inverse: Google AI Studio and Gemini API are "for developers ... for professional or business purposes, not for consumer use" [13][primary], AI-plan benefits are "AI Studio UI only", and API keys are billed separately through Cloud [14,15][primary]. The subscription is a personal-account Google One SKU; Workspace has a separate add-on [10,11][primary]. Automated access is prohibited *conditionally* — "in violation of the machine-readable instructions on our web pages" — and gemini.google.com/robots.txt disallows `/chat/` and `/app/` for all user agents (`Allow: /app/download` is the carve-out) [1][primary][19][primary]. A community claim that *all* automation is banned regardless of plan is practitioner interpretation, not the published wording [116][secondary].

2. **The credential path distinguishes subscription from API.** The shipped `gemini-cli` source embeds a fixed installed-app OAuth client ID and secret, requests `cloud-platform`/`userinfo` scopes, caches tokens at `~/.gemini/oauth_creds.json` (0600; optional OS keychain), and resolves entitlement server-side through `loadCodeAssist` → `paidTier`/`currentTier` on the private `cloudcode-pa.googleapis.com/v1internal` endpoint [29,30,31,34][primary]. API-key mode never enters that path and sends `x-goog-api-key` instead [32][primary]. Every subscription request carries `project`, `session_id` and client metadata; ineligible tiers carry reasons such as `RESTRICTED_NETWORK`, `UNKNOWN_LOCATION`, `VALIDATION_REQUIRED` [31,33,35][primary]. Preview-model access comes from server quota buckets, not a client constant [119,120][primary]. No JA3/JA4, hardware ID or attestation code exists in the reviewed client path — the only stable local identifier is a random `installation_id` [29,32][primary, single source for the code observation].

3. **Google's enforcement record is public even though its detectors are not.** A Google maintainer announced a Feb 2026 Antigravity ban wave targeting "3rd party tools or proxies", with collateral blocks across Gemini CLI and Code Assist because abuse prevention sits at a shared backend; a system-wide automated unban followed, and a second violation means permanent bans [45][primary]. On 18 Mar 2026 Google announced "more robust detection for policy-violating use cases (e.g. using Gemini CLI oAuth with third-party software)" and, from 25 Mar, traffic prioritisation by "license type and account standing" [46][primary]. On 19 May it announced the 18 Jun 2026 end of consumer serving via Gemini CLI/Code Assist, moving consumers to Antigravity CLI [43][primary][41][primary]. Antigravity ToS clause 6 names third-party software/proxies and scopes the penalty to Antigravity and/or Gemini CLI accounts [42][primary]. Practitioner reports of whole-Google-account disablement are first-hand but unverified and partly self-contradicting; the general Google ToS independently permits account termination for scraping/abuse, so a broad action is possible but not documented as applied here [111,112,113][secondary][1][primary].

4. **Quota and telemetry are documented; consumer risk scoring is not.** API limits are per-project and shared across keys; spend tiers depend on billing history and "account standing" [20][primary]. Consumer limits are plan-multiplier based (2×/4×/5× etc.) and capacity-based, changeable without notice [6,7][primary]. Cloud abuse monitoring uses safety classifiers, logs prompts up to 30 days (90 for human review on suspicion) and escalates to suspension [23][primary]. reCAPTCHA publishes a 0.0–1.0 score with reason codes but no signal mapping [24][primary]. `[inference]` A consumer abuse score, if one exists, most plausibly mirrors these documented mechanisms; no Google doc links them to Gemini subscription enforcement.

## What would change this

- A Google-published detection specification naming the signals used against consumer OAuth replay (User-Agent, binary signature, TLS/JA3/JA4, egress/IP, hardware ID, OAuth client ID). None exists in the sources reviewed; the only vendor admission is the undetailed "more robust detection" statement [46][primary].
- First-party evidence that Google revoked a token *because* of relay/bypass use rather than expiry, endpoint sunset or a client bug — the single largest evidentiary hole [45,46][primary][110][primary artifact].
- A dated changelog explaining Anthropic's Feb→current legal-page rewording and OpenAI's definition of "pure OSS"/partner, which would firm up the cross-vendor boundary [114][secondary][76][primary].
- Independent measurement of which spoofed signals (jitter, header order, IP isolation) actually extend a session, and measured ban/false-positive rates [99][primary artifact][95][primary].
- A published absolute numeric AI Pro consumer limit; currently only multipliers and Workspace "up to" tables exist [6,7][primary].

## Considered and rejected

- **"Google has no technical blocking."** Rejected: the ban wave, detection announcement, endpoint sunset and account-standing prioritisation are dated primary statements [45,46,43][primary]. Absence of a published spec is not absence of enforcement.
- **"API keys and subscription OAuth are the same credential."** Rejected: distinct endpoints, headers, billing and entitlement resolution [29,30,32][primary][15][primary].
- **"TLS/JA3 fingerprinting is the primary control."** Rejected as unsupported: Google exposes JA3/JA4 at its edge and bot-management layer, and academic work shows fingerprints are usable, but no source ties any fingerprint to consumer-subscription enforcement; fingerprinting also degrades under full browser emulation [50,51][primary][57,58][primary]. Held as `[inference]` only.
- **"Bans are whole-account by policy."** Rejected: the product clause scopes to Antigravity/Gemini CLI; broad reports are secondary, and one first-hand report explicitly says no other services were affected [42][primary][111][secondary].
- **Legal/ToS veto as a reason to stop.** Explicitly out of scope per the assignment; the report records enforcement mechanisms neutrally.

## Findings

### 1. Detection and enforcement mechanisms (Google)

**Entitlement boundary.** Three official props hold the line: the closed "include only" client enumeration [4][primary]; the API ToS "not for consumer use" line plus "AI Studio UI only" limitation [13,15][primary]; and per-product, plan-keyed limits rather than one portable quota [6,9][primary]. Paid API status is created by an active Cloud billing account, not by the Google AI subscription [14,16][primary]. From 28 May 2026 new AI Studio keys default to service-account-bound authorization keys, and from 19 Jun unrestricted standard keys are rejected — an API-side anti-leak adaptation that must not be conflated with consumer OAuth enforcement [18,28][primary].

**Auth/device/header signals that actually exist.** Client identity is on the wire: `GeminiCLI/<version>/<model> (os; arch; surface)`, `X-Goog-Api-Client`, structured client metadata (`ideName`, `pluginType`, `ideVersion`, `platform`, release channel), `session_id`, `project`, `installation.id` and `user.email` telemetry [32,33][primary][29][primary]. Login is loopback-redirect with CSRF state; headless flow uses PKCE S256 [29][primary]. Server-side eligibility can demand phone/identity verification (`VALIDATION_REQUIRED`) [35][primary]. The privacy notice documents collection of browser/device identifiers and subscription information for fraud, abuse and ToS investigation [4][primary]. Google's edge and Cloud Armor expose JA3/JA4 and protocol attributes as first-class match fields; reCAPTCHA, Play Integrity and Device Bound Session Credentials supply risk/device signals — but DBSC is explicitly *not* a device fingerprint and none of these is documented for Gemini consumer entitlement [50,51,52,53,54,55][primary]. `[inference]` Server-side use of these signals is plausible; no source confirms it.

**Usage anomalies and bans.** Documented escalation: signal → throttle/429/`RESOURCE_EXHAUSTED` → capacity or plan-based limits → suspension with appeal → permanent ban on second violation [20,45][primary][26][primary]. Cloud ToS §3.3 prohibits creating multiple accounts/projects to circumvent quotas, §4.1 gives a 24-hour cure window, and Gen-AI Service terms allow immediate suspension on *suspected* violation [21,22][primary]. Practitioner artefacts show ghost `cloudaicompanionProject` bindings producing 403 despite an active paid plan, `limit: 0` on paid keys, and missing `Retry-After` — all first-hand, cause unverified [109,121,122][primary artifact].

**What Google actually did (chronology).** 2026-02-27 ban wave + automated unban + recertification + second-strike permanence [45][primary]; 2026-03-18 "more robust detection" and 2026-03-25 license/standing prioritisation [46][primary]; 2026-05-19 announce and 2026-06-18 execute consumer CLI/Code Assist sunset [43][primary][44][primary]; 2026-05-28 auth-key default and 2026-06-19 unrestricted-key rejection on the API side [18,28][primary]. `[inference, synthesis of dated primary announcements]` The observable strategy is to move enforcement up the stack — account/client-level bans → shared-backend scoping → removal of the consumer endpoint → prioritisation by standing. Google never describes this as one campaign.

### 2. Other vendors' equivalent blocks

| Vendor | Subscription credential | Official developer route | Documented boundary | Mechanism |
|---|---|---|---|---|
| Anthropic | claude.ai OAuth; subscription limits | Console API key; Console-org linked billing | Third-party developers may not offer Claude.ai login, route requests through consumer credentials, or collect/store/intermediate tokens; sign-in must complete in Anthropic's flow. End user may drive the **unmodified** Claude Code binary [64][primary]. Staff: accounts were banned for third-party harness traffic, then anti-spoofing tightened; "unusual traffic patterns without the usual telemetry" [69][primary][114][secondary]. | Contract + staff-enforced anti-spoofing + billing reclassification (Apr 2026 extra-usage move; later paused for Agent SDK) [66,67,68][primary] |
| OpenAI | Sign in With ChatGPT; included plan credits | Platform API key; Pro/Business API credits | Two documented sign-ins; API key uses standard rates. Generic anti-automation ToS [71,72,73][primary]. Jan 2026 endorsed Codex subs in OpenCode; 8 Sep 2026 ad-hoc third-party use "not an approved use" except pure OSS/partners [75,76][primary]. No third-party OAuth/header contract [78][primary artifact]. | Permission/partnership gate; separate host/billing; no published detector |
| xAI | X/Grok subscription first-party weekly pool | Console API keys, prepaid/invoice; `grok` CLI with device-auth | Account shared, billing split, pool is "first-party usage only"; third-party models at API list price; credential-revocation safety advisory [79,80,81][primary]. Ships its own harness [82][primary]. | Billing/pool scoping; no documented harness block `[inference]` |
| Microsoft | Copilot/M365 consumer entitlement | Copilot APIs under Entra registration + separate Copilot licence | Two billing planes (USL vs UBB credits); API ToU bans circumvention and non-human-directed apps; no consumer-token reuse path documented [83,84,85][primary]. | Licensing/architecture + API-ToU; no consumer-token detector documented |
| GitHub Copilot | Copilot Pro/Pro+/Business/Enterprise via GitHub OAuth | Copilot SDK auth incl. OAuth app tokens; BYOK | Explicitly *supports* subscription in SDK and in OpenCode — permissive, not a block [86,87][primary]. | Sanctioned third-party OAuth partnership |

Reconciliation applied: Anthropic's Feb 2026 absolute wording is a superseded snapshot and the 15 Jun 2026 "still draws from subscription limits" line is a billing-meter statement, not a permission grant — the current legal page governs [64,66][primary][114][secondary]. OpenAI's Jan and Sep statements are compatible: OpenCode is pure OSS and named as a partner, so only ad-hoc unaffiliated use was gated [75,76,77][primary].

### 3. Practitioner bypass methods and the arms race

**Token reuse.** The dominant pattern is to parse the official CLI's credential file or redirect its OAuth flow. `cpa-plugin-gemini-cli` normalises `access_token`/`refresh_token`/`project_id` from both `gemini` and `gemini-cli` auth files, hardcodes the *same* client ID, secret and scopes as Google's shipped source, uses PKCE S256 on `127.0.0.1`, and refreshes 5 minutes before expiry [88][primary][29][primary]. `antigravity-proxy` reads `~/.gemini/oauth_creds.json` or the Antigravity token file on every request; `antigravity-oauth-proxy` accepts manual token JSON [92,93][primary artifact]. A subprocess variant avoids exporting tokens entirely by spawning `agy -p` / `claude -p` with keyring-held credentials [123][primary artifact]. Claude-side analogues exchange `sk-ant-oat01-...` tokens for local API keys [124][primary artifact]. `[inference]` The identical constants show deliberate client impersonation; intent is not stated in code.

**Relays and client impersonation.** Gateways expose OpenAI-compatible endpoints over subscription logins, calling `cloudcode-pa.googleapis.com/v1internal` with injected `Authorization: Bearer`, `User-Agent` and `X-Goog-Api-Client`; the UA and API-client strings are hardcoded (`GeminiCLI/0.34.0`, `google-genai-sdk/1.41.0 gl-node/v22.19.0`) [90,91,89][primary artifact]. `CODE_ASSIST_ENDPOINT` redirects the *official CLI's own* traffic into a local gateway [125][primary artifact][126][primary]. Cross-vendor precedent: `new-api` defaults `originator: codex_cli_rs`, `chatgpt-account-id`, `OpenAI-Beta` and exact `Content-Type`/`Accept` [103][primary artifact]. One relay scrubs harness identity lines (`Claude Code`, `Anthropic`, `Nous Research`, `Hermes`) because "cloud code answers an opaque 429 to some of those markers" [92][primary artifact] — a direct observation of marker-based upstream rejection, though the rejecting signal is unconfirmed.

**Fingerprint/header spoofing.** `curl_cffi` impersonates TLS/JA3 and HTTP/2; its own FAQ warns fingerprints are "not comprehensive", custom JA3 strings are detectable, and JS fingerprints cannot be changed [94,95][primary]. `gemini2api` combines curl_cffi Chrome impersonation with ordered `Sec-Ch-Ua`/`Sec-Fetch-*` headers, 24-hour fingerprint re-sync and request jitter [96,97][primary artifact]. OmniProxy copies Antigravity's UA shape and version manifest, and zero-width-scatters billing/identity lines in system prompts to break upstream line matching (raw → `400 prompt_turned_away`, scattered → `200` in its own A/B) [99][primary artifact]. `[inference]` These tools evidence practitioner *belief* about what is scored, not a Google spec.

**Rotation and quota aggregation.** Pools key `(OAuth credential, GCP project)` units with round-robin/sticky/cache binding, 429 model-family cooldowns, 403 auto-ban, per-account concurrency caps and keepalive plugins requiring one isolated browser profile per account [100,101,96,102][primary artifact]. Commercial storefronts advertise 0.03×–0.35× of official rates and token-resale pools; a secondary synthesis reports large relay-server counts and CISA/NSA/FBI "transfer stations" terminology — scale figures are not independently verified here [102][primary artifact][115][secondary].

**Failure modes / arms race.** Observed: ~2 h cookie expiry on datacenter IPs; dual PSIDTS writers kicking accounts offline; hidden rejections inside HTTP 200; 403 `SUBSCRIPTION_REQUIRED`/`VALIDATION_REQUIRED`; 410 model exclusions; instant relay death at the 18 Jun 2026 sunset; OAuth tokens expiring ~60 min with silently swallowed refresh errors [96,98,92,93,127][primary artifact][99][primary artifact][106,107,108][primary artifact]. The arms race is visible in dated pairs: Google's Mar 2026 detection announcement [46][primary] ↔ relays' marker scrubbing [92][primary artifact]; Google's endpoint sunset [43][primary] ↔ relay projects removing Gemini CLI code and migrating to Antigravity [101][primary artifact]. Practitioner time-to-ban reports range from one day to near-instant; these are individual observations, not a measured distribution [111,112,113][secondary]. No vendor-published detection latency, false-positive rate or ban count was found, and claims of "thousands" of bans are marked unverified [115][secondary].

## Open questions

- Which signals, if any, Google actually scores for consumer-subscription OAuth replay; no vendor document names them [46][primary].
- Whether Google ever revoked a token *because* of bypass use, as opposed to expiry/sunset/client bug — no first-party evidence [45,46][primary][108][primary artifact].
- Detection latency, ban counts and false-positive rates; all published intervals are remediation or cutover windows, not detection times [45,43][primary].
- Antigravity CLI/App internals: the public repo ships no client source, so its OAuth client ID, credential path and entitlement RPCs cannot be inspected; `gemini-cli` remains the deepest public evidence and is historical for consumer scope [29][primary][41][primary].
- Exact current scope of enforcement (product accounts vs whole Google account); the product clause is narrow, general ToS is broad, and first-hand reports conflict [42,1][primary][111,113][secondary].
- Reddit and YouTube community bodies were unreachable (403/429 / missing tooling), so discourse coverage is HN + GitHub + official forums only [115][secondary].
- Whether the Feb 2026 ban wave's "no warning / still charged" reports reflect a notification rollout lag; unresolved [45][primary][112][secondary].

## Sources

All sources accessed 2026-11-18. Groups by evidentiary weight. `[primary]` = owner-published doc/source code/spec/original artifact; `[secondary]` = first-hand report or secondary reproduction; `[speculative]` = inference, never a source in its own right.

**Google — official policy, docs, ToS (primary)**
1. https://policies.google.com/terms — [primary]
2. https://policies.google.com/terms/service-specific?hl=en-US — [primary]
3. https://policies.google.com/terms/generative-ai/use-policy?hl=en-US — [primary]
4. https://support.google.com/gemini/answer/13594961?hl=en — [primary]
5. https://support.google.com/gemini/answer/18481641 — [primary]
6. https://support.google.com/gemini/answer/16275805?hl=en — [primary]
7. https://support.google.com/gemini/answer/14620100?hl=en — [primary]
8. https://support.google.com/gemini/answer/14517446?hl=en — [primary]
9. https://support.google.com/googleone/answer/14534406?hl=en — [primary]
10. https://support.google.com/googleone/answer/16476811?hl=en — [primary]
11. https://one.google.com/about/google-ai-plans/ — [primary]
12. https://one.google.com/terms-of-service — [primary]
13. https://ai.google.dev/gemini-api/terms?hl=en — [primary]
14. https://aistudio.google.com/docs/terms?hl=en — [primary]
15. https://aistudio.google.com/docs/google-ai-plans?hl=en — [primary]
16. https://aistudio.google.com/docs/billing?hl=en — [primary]
17. https://aistudio.google.com/docs/api-key — [primary]
18. https://ai.google.dev/gemini-api/docs/api-key — [primary]
19. https://gemini.google.com/robots.txt — [primary]
20. https://ai.google.dev/gemini-api/docs/rate-limits — [primary]
21. https://cloud.google.com/terms — [primary]
22. https://cloud.google.com/terms/service-terms — [primary]
23. https://cloud.google.com/vertex-ai/generative-ai/docs/learn/abuse-monitoring — [primary]
24. https://cloud.google.com/recaptcha-enterprise/docs/interpret-assessment-website — [primary]
25. https://cloud.google.com/docs/quotas/quotas — [primary]
26. https://support.google.com/accounts/answer/40695?hl=en — [primary]
27. https://cloud.google.com/blog/products/identity-security/bot-management-with-google-cloud — [primary]
28. https://discuss.ai.google.dev/t/action-required-restrict-gemini-api-keys-by-june-19-to-avoid-service-disruption/171786 — [primary]

**Google — first-party source code, product docs, enforcement posts (primary)**
29. https://github.com/google-gemini/gemini-cli/blob/main/packages/core/src/code_assist/oauth2.ts — [primary]
30. https://github.com/google-gemini/gemini-cli/blob/main/packages/core/src/code_assist/server.ts — [primary]
31. https://github.com/google-gemini/gemini-cli/blob/main/packages/core/src/code_assist/setup.ts — [primary]
32. https://github.com/google-gemini/gemini-cli/blob/main/packages/core/src/core/contentGenerator.ts — [primary]
33. https://github.com/google-gemini/gemini-cli/blob/main/packages/core/src/experiments/client_metadata.ts — [primary]
34. https://github.com/google-gemini/gemini-cli/blob/main/packages/core/src/config/storage.ts — [primary]
35. https://github.com/google-gemini/gemini-cli/blob/main/packages/core/src/code_assist/types.ts — [primary]
36. https://github.com/google-gemini/gemini-cli/blob/main/packages/core/src/billing/billing.ts — [primary]
37. https://geminicli.com/docs/resources/quota-and-pricing — [primary]
38. https://geminicli.com/docs/get-started/authentication/ — [primary]
39. https://geminicli.com/docs/resources/faq/ — [primary]
40. https://geminicli.com/docs/resources/tos-privacy — [primary]
41. https://antigravity.google/docs/install?tab=cli — [primary]
42. https://antigravity.google/terms — [primary]
43. https://developers.googleblog.com/an-important-update-transitioning-gemini-cli-to-antigravity-cli/ — [primary]
44. https://developers.google.com/gemini-code-assist/docs/deprecations/code-assist-individuals.md.txt — [primary]
45. https://github.com/google-gemini/gemini-cli/discussions/20632 — [primary]
46. https://github.com/google-gemini/gemini-cli/discussions/22970 — [primary]
109. https://github.com/google-gemini/gemini-cli/issues/25627 — [primary artifact]

**Fingerprinting specs, vendor docs, academic work (primary)**
47. https://raw.githubusercontent.com/salesforce/ja3/master/README.md — [primary]
48. https://raw.githubusercontent.com/FoxIO-LLC/ja4/main/technical_details/JA4.md — [primary]
49. https://raw.githubusercontent.com/FoxIO-LLC/ja4/main/technical_details/JA4H.md — [primary]
50. https://docs.cloud.google.com/load-balancing/docs/https/custom-headers-global.md.txt — [primary]
51. https://docs.cloud.google.com/armor/docs/rules-language-reference.md.txt — [primary]
52. https://docs.cloud.google.com/recaptcha/docs/interpret-assessment-website.md.txt — [primary]
53. https://docs.cloud.google.com/recaptcha/docs/disclosure-requirements-android.md.txt — [primary]
54. https://developer.android.com/google/play/integrity/overview — [primary]
55. https://blog.google/security/protecting-cookies-with-device-bound-session-credentials/ — [primary]
56. https://blackhat.com/docs/eu-17/materials/eu-17-Shuster-Passive-Fingerprinting-Of-HTTP2-Clients-wp.pdf — [primary]
57. https://arxiv.org/html/2602.09606 — [primary]
58. https://arxiv.org/html/2606.20910v1 — [primary]
59. https://arxiv.org/html/2403.15607 — [primary]
60. https://arxiv.org/html/2606.14525v1 — [primary]
61. https://developers.cloudflare.com/bots/additional-configurations/ja3-ja4-fingerprint/index.md — [primary]
62. https://cheatsheetseries.owasp.org/cheatsheets/Bot_Management_and_Anti-Automation_Cheat_Sheet.html — [primary]

**Other vendors — official docs, ToS, first-party staff posts (primary)**
63. https://www.anthropic.com/legal/consumer-terms — [primary]
64. https://code.claude.com/docs/en/legal-and-compliance — [primary]
65. https://code.claude.com/docs/en/authentication.md — [primary]
66. https://support.claude.com/en/articles/15036540-use-the-claude-agent-sdk-with-your-claude-plan — [primary]
67. https://support.claude.com/en/articles/17154008-monthly-api-credits-for-max-ultra-and-team-plans — [primary]
68. https://support.claude.com/en/articles/18467110-offer-linked-billing-in-your-platform — [primary]
69. https://x.com/trq212/status/2009689809875591565 — [primary]
70. https://x.com/bcherny/status/2040206441756471399 — [primary]
71. https://developers.openai.com/codex/auth.md — [primary]
72. https://developers.openai.com/api/docs/guides/chatgpt-api-credits.md — [primary]
73. https://openai.com/policies/row-terms-of-use/ — [primary]
74. https://help.openai.com/en/articles/11369540-using-codex-with-your-chatgpt-plan — [primary]
75. https://x.com/thsottiaux/status/2009742187484065881 — [primary]
76. https://x.com/thsottiaux/status/2097131394199896166 — [primary]
77. https://github.com/openai/codex/discussions/8338 — [primary]
78. https://github.com/openai/codex/issues/36886 — [primary artifact]
79. https://docs.x.ai/developers/faq/accounts.md — [primary]
80. https://docs.x.ai/x-subscription/usage-limits.md — [primary]
81. https://docs.x.ai/grok/faq.md — [primary]
82. https://docs.x.ai/build/cli/reference.md — [primary]
83. https://support.microsoft.com/en-us/microsoft-365-copilot/about-microsoft-copilot-pro — [primary]
84. https://learn.microsoft.com/en-us/microsoft-365/copilot/extensibility/copilot-apis-overview — [primary]
85. https://learn.microsoft.com/en-us/legal/m365-copilot-apis/terms-of-use — [primary]
86. https://docs.github.com/en/copilot/how-tos/copilot-sdk/auth/authenticate — [primary]
87. https://github.blog/changelog/2026-01-16-github-copilot-now-supports-opencode/ — [primary]

**Practitioner-authored code/issue artifacts (primary as artifacts of what the tools do, not vendor confirmation)**
88. https://raw.githubusercontent.com/router-for-me/cpa-plugin-gemini-cli/main/internal/auth/oauth.go — [primary artifact]
89. https://raw.githubusercontent.com/router-for-me/cpa-plugin-gemini-cli/main/internal/fingerprint/fingerprint.go — [primary artifact]
90. https://raw.githubusercontent.com/router-for-me/cpa-plugin-gemini-cli/main/internal/executor/executor.go — [primary artifact]
91. https://raw.githubusercontent.com/router-for-me/CLIProxyAPI/main/README.md — [primary artifact]
92. https://github.com/vlelyavin/antigravity-proxy — [primary artifact]
93. https://raw.githubusercontent.com/dvcrn/antigravity-oauth-proxy/main/README.md — [primary artifact]
94. https://raw.githubusercontent.com/lexiforest/curl_cffi/main/README.md — [primary]
95. https://curl-cffi.readthedocs.io/en/latest/impersonate/faq.html — [primary]
96. https://raw.githubusercontent.com/xwteam/gemini2api/main/README.md — [primary artifact]
97. https://raw.githubusercontent.com/xwteam/gemini2api/main/app/core/fingerprint/header_builder.py — [primary artifact]
98. https://raw.githubusercontent.com/xwteam/gemini2api-plugin/main/README.md — [primary artifact]
99. https://raw.githubusercontent.com/mibgb65-cloud/OmniProxy/main/docs/product/GOOGLE_SUBSCRIPTION.md — [primary artifact]
100. https://raw.githubusercontent.com/boltrunner/gcli2api/master/README.md — [primary artifact]
101. https://raw.githubusercontent.com/su-kaka/agy2api/master/README.md — [primary artifact]
102. https://raw.githubusercontent.com/Wei-Shaw/sub2api/main/README.md — [primary artifact]
103. https://raw.githubusercontent.com/QuantumNous/new-api/32e587406c6ebe891f18ab9aeb2f4a1f6b7b9e14/relay/channel/codex/adaptor.go — [primary artifact]
104. https://raw.githubusercontent.com/AmazingAng/auth2api/main/README.md — [primary artifact]
105. https://github.com/HanaokaYuzu/Gemini-API/issues/323 — [primary artifact]
106. https://github.com/HanaokaYuzu/Gemini-API/issues/261 — [primary artifact]
107. https://github.com/NousResearch/hermes-agent/issues/49701 — [primary artifact]
108. https://github.com/openclaw/openclaw/issues/42541 — [primary artifact]
110. https://github.com/router-for-me/CLIProxyAPI/issues/1508 — [primary artifact]

**Secondary — first-hand reports and reproductions**
111. https://discuss.ai.google.dev/t/account-restricted-without-warning-google-ai-ultra-oauth-via-openclaw/122778/66 — [secondary]
112. https://discuss.ai.google.dev/t/urgent-mass-403-tos-bans-on-gemini-api-antigravity-for-open-source-cli-users-paid-tier/124508 — [secondary]
113. https://news.ycombinator.com/item?id=47115805 — [secondary]
114. https://www.theregister.com/software/2026/02/20/anthropic-clarifies-ban-on-third-party-tool-access-to-claude/5014546 — [secondary]
115. https://noresponse.org/guides/api-relays/ — [secondary]
116. https://support.google.com/gemini/thread/474750546?hl=en — [secondary]
117. https://support.google.com/googleone/thread/406695374/legitimate-account-suspended-google-one-gemini-api-40-days-no-response?hl=en — [secondary]
118. https://news.ycombinator.com/item?id=48477326 — [secondary]

**Additional first-party source files and practitioner artifacts (primary)**
119. https://github.com/google-gemini/gemini-cli/blob/main/packages/core/src/config/config.ts — [primary]
120. https://github.com/google-gemini/gemini-cli/blob/main/packages/core/src/config/models.ts — [primary]
121. https://github.com/google-gemini/gemini-cli/issues/24396 — [primary artifact]
122. https://github.com/google-gemini/gemini-cli/issues/22648 — [primary artifact]
123. https://raw.githubusercontent.com/M3NT1/antigravity-provider-for-opencode/main/README.md — [primary artifact]
124. https://raw.githubusercontent.com/cabinlab/claude-code-api/main/README.md — [primary artifact]
125. https://github.com/router-for-me/CLIProxyAPI/issues/13 — [primary artifact]
126. https://www.nautili.ai/guides/gemini-cli-through-the-gateway — [primary]
127. https://github.com/Wei-Shaw/sub2api/issues/1515 — [primary artifact]
