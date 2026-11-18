# F-quota-rotation - 429 / out-of-limits, key rotation, ban exposure

Claim under test: "429/out-of-limits responses cause some proxies to retry other keys, which can expose patterns and get Google bans." All sources fetched 2026-11-18. No secret values, no credential paths, no tokens quoted.

## Findings

### A. 429 / RESOURCE_EXHAUSTED semantics (documented)

- A1. gRPC canonical code `RESOURCE_EXHAUSTED` = 8: "Some resource has been exhausted, perhaps a per-user quota, or perhaps the entire file system is out of space." `PERMISSION_DENIED` (7) must NOT be used for resource exhaustion; `UNAVAILABLE` (14) is the transient retry-with-backoff code. gRPC doc adds: "there is no fixed list of status codes on which it is appropriate to retry in all applications... individual applications must make their own determination as to which status codes should cause an RPC to be retried." Source S1. Primary. Confidence: high. Fetched 2026-11-18.
- A2. AIP-193 canonical Google error model: JSON error example maps `"code": 429` with `"status": "RESOURCE_EXHAUSTED"`, plus `ErrorInfo` (reason/domain/metadata), `LocalizedMessage`, `Help`. Source S2. Primary. Confidence: high. Fetched 2026-11-18.
- A3. Google's own retry guidance argues AGAINST blind 429 retry. AIP-194 lists `RESOURCE_EXHAUSTED` as "generally non-retryable": "This code may be a signal that quota is exhausted. Retries therefore may not be expected to work for several hours; meanwhile the retries may have billing implications. If `RESOURCE_EXHAUSTED` is used for other reasons than quota and the expected time for the resource to become available is much shorter, it may be retryable." Only `UNAVAILABLE` is universally retryable. Multi-key 429 failover is a deliberate override of this guidance. Source S3. Primary. Confidence: high. Fetched 2026-11-18.
- A4. Two distinct 429 causes: short-window rate limiting vs exhausted quota. Google Cloud Quotas known-issues: if an application exceeds a per-user rate limit, requests return HTTP 429 "even when aggregate project-level metrics on the Cloud Quotas page show that quota remains available." Diagnose by grouping `serviceruntime.googleapis.com/api/request_count` filtered to `response_code = 429` by `credential_id`, which is the OAuth 2.0 client ID. Source S5. Primary. Confidence: high. Fetched 2026-11-18.
- A5. Token-bucket mechanism is Google-documented: Cloud Console incident 19001 root cause states "Most Google services use a quota system for rate limiting user requests. The quota system implements a variant of the classic token bucket algorithm [1]." Incident dated 2019-03-11; general mechanism, not Antigravity-specific. Source S7. Primary. Confidence: high for the general claim, not transferable to consumer Antigravity endpoints. Fetched 2026-11-18.
- A6. Gemini API spend-based limits return `429 RESOURCE_EXHAUSTED`; evaluated on a rolling 10-minute window; tied to usage tier and account standing; "Specified rate limits are not guaranteed and actual capacity may vary"; tier upgrades can be denied "based on other factors identified during the review process." Source S4. Primary. Confidence: high for the paid Gemini Developer API / AI Studio. Scope note: this is NOT the consumer Antigravity subscription. Fetched 2026-11-18.
- A7. Relay-side 429 taxonomy confirms the same split on the consumer path: OmniProxy treats body "Your quota will reset after <duration>" as capacity exhaustion (`upstream_quota_exhausted`) and everything else as `rate_limited`; it notes `Retry-After` on the exhausted case is the upstream reset seconds. Source S10. Primary (first-party relay docs). Confidence: medium-high. Fetched 2026-11-18.

### B. Quota buckets and per-project / per-account keys (documented)

- B1. Gemini API limits measured in RPM, TPM, RPD (plus model-specific IPM/TPD). "Rate limits are applied per project, not per API key." RPD resets midnight Pacific. Source S4. Primary. Confidence: high. Fetched 2026-11-18.
- B2. Quota project: every Cloud API request is counted against a quota and "quotas are enforced by project." For client-based APIs the determination order is request-specified project, then the project associated with an API key, then gcloud shared project, then service-account project, then workforce-pool project; exposed on the wire as `x-goog-user-project` or `x-goog-api-key`. Source S6. Primary. Confidence: high. Fetched 2026-11-18.
- B3. Consumer Antigravity quota shape (relay-reported, not Google-published): a real subscription account returns two quota groups, "Gemini Models" and "Claude and GPT models", each with weekly and 5-hour windows. The relay deliberately refuses to sum groups or infer request/token counts from percentages, and states weekly/5h balances do not cover all instantaneous rate or model-capacity limits. Source S10. Primary (first-party docs) for the observation; Google has no equivalent consumer doc. Confidence: medium. Fetched 2026-11-18.
- B4. Consequence: quota is scoped at both project and credential/user level (S5, S6). Inference: rotating credentials that share one project or one OAuth client ID may not expand a per-user rate bucket. Marked inference; no Google doc addresses multi-credential rotation directly. Confidence: speculative. Fetched 2026-11-18.

### C. Proxy key rotation / pooling on 429 (primary first-party repo docs)

- C1. boltrunner/gcli2api rotates over (OAuth credential file, GCP project ID) units. On `401/403/429/5xx`, project-discovery failure, or common network errors it switches units immediately, "不做指数退避" (no exponential backoff). `requestMaxRetries` sets retries; total attempts = 1 + retries. Streaming may rotate only before the first event. Source S8. Primary. Confidence: high. Fetched 2026-11-18.
- C2. su-kaka/agy2api: model-family cooldown on 429 (image / argon / gemini / claude+gpt share cooldown groups); `RETRY_429_ENABLED` default true, `RETRY_429_MAX_RETRIES` default 5, `RETRY_429_INTERVAL` default 1 s; credential select modes `random`, `cache` (hash of model + system prompt + first two messages, to preserve upstream prompt cache), `sticky`; `AUTO_BAN` default off with `AUTO_BAN_ERROR_CODES` default 403. Sources S9 (429 lines verified directly) and F7 (config defaults). Primary. Confidence: high for behavior, medium for defaults carried via F7. Fetched 2026-11-18.
- C3. OmniProxy: a quota-exhausted 429 rests that account for the reset duration and "有其它候选时换号" (switches accounts when alternatives exist); single-account deployments return the 429. Other 429s stay `rate_limited` and are not account-switched. Content rejection maps to `400 prompt_turned_away` specifically because Anthropic/OpenAI SDKs auto-retry 429 about ten times. Ordinary API-key Google 429 does NOT iterate accounts ("项目共享额度" - project-shared quota); only subscription capacity-exhausted 429 does. Source S10. Primary. Confidence: high. Fetched 2026-11-18.
- C4. Further pooling implementations documented in F7: xwteam/gemini2api (round-robin/failover, per-account concurrency cap, `FAILOVER_COOLDOWN`, `SAME_ACCOUNT_5XX_RETRIES`), CLIProxyAPI (multi-account round-robin), Sub2API (sticky-session quota distribution), gemini2api-plugin (per-account browser keepalive). I did not re-fetch these; F7 is the evidence carrier with primary URLs. Confidence: medium-high. Fetched 2026-11-18 via F7.
- C5. Google itself lists "distribute workloads across distinct service accounts" as one resolution for per-user 429 (S5). Context: Cloud Quotas / service accounts, not consumer subscriptions. Evidence that multi-identity spreading is a known quota-management technique; not evidence that it evades abuse detection. Source S5. Primary. Confidence: high for the sentence, scope-limited. Fetched 2026-11-18.

### D. Documented vs inference on bans

- D1. Documented: Google maintainer announcement 2026-02-27 - a series of Antigravity bans addressed ToS violations, "specifically the use of 3rd party tools or proxies to access Antigravity resources and quotas"; because abuse prevention sits in a shared backend, Antigravity bans also blocked Gemini CLI and Gemini Code Assist; system-wide automated unban; recertification must acknowledge that "bypassing system measures or circumventing usage limits is prohibited"; a second violation means permanent ban. Source S11. Primary, fetched directly. Confidence: high. Fetched 2026-11-18.
- D2. Documented: Google maintainer 2026-03-18 - "Abuse Detection: We're implementing more robust detection for policy-violating use cases (e.g. using Gemini CLI oAuth with third-party software)"; from 2026-03-25 traffic routing gives "higher priority given to accounts based on license type and account standing." Source S12. Primary, fetched directly. Confidence: high. Fetched 2026-11-18.
- D3. Documented: Antigravity Additional ToS clause 6 - "Using third party software, tools, or services to access the Service (e.g. using OpenClaw with Antigravity OAuth) is a breach of this Agreement. Such actions may be grounds for suspension or termination of your Antigravity and/or Gemini CLI accounts." Clauses 3 and 5 document collection of interaction data and metadata, including when telemetry is toggled off. Source S13. Primary, fetched directly. Confidence: high. Fetched 2026-11-18.
- D4. Documented observability substrate: Google can attribute a 429 to a specific credential (`credential_id` = OAuth client ID, S5), to a quota project (S6), and can see the project/key identifiers in request headers (S6). The infrastructure to distinguish identities and correlate them exists. Source S5 + S6. Primary. Confidence: high. Fetched 2026-11-18.
- D5. NOT documented: no Google source states that rotating keys on 429 is itself a detection trigger, nor that any specific anomaly (switch cadence, IP/ASN change, reused prompt-cache prefix, header/TLS mismatch, concurrent sessions) is scored for consumer Antigravity. The closest vendor-adjacent statement is an Anthropic engineer's "unusual traffic patterns without any of the usual telemetry that the Claude Code harness provides" (S14, secondary, different vendor). The detection-signal inventory in F7 claim 63 (many parallel sessions, IP/ASN spread, unrelated prompt mix, extreme input/output ratios, max usage from day one, shared payment details; 37.1% of 636 reseller endpoint pairs sharing an upstream prompt cache) comes from secondary vendor research, not Google. Confidence: speculative. Fetched 2026-11-18.
- D6. Verdict on the claim. Half confirmed, half unproven: (a) gcli2api and OmniProxy (capacity-exhausted subscription 429) rotate identities on 429 - CONFIRMED by C1 and C3; agy2api (C2) uses cooldown plus configured credential selection, not 429 key failover; C4 is carried via F7 and was not re-fetched, so it is not part of the directly-confirmed set; (b) that this exposes patterns which get Google bans - plausible and consistent with D1-D4, but no primary source establishes a rotation-to-ban rule or names the signal. What IS documented is the broader prohibition: third-party proxies and circumvention of usage limits are banned, enforcement is shared across services, detection was publicly strengthened in March 2026, and traffic is prioritized by account standing. Do not upgrade D5 to fact. Confidence: high for (a), low for the specific causal mechanism in (b). Fetched 2026-11-18.

### E. Implications for omp antigravity-cli (single keyring session)

- E1. omp's built-in `antigravity-cli` provider holds ONE structured credential envelope per account - `{token, refreshToken, expiresAt, email, accountId}` - in the encrypted credential store; login spawns `agy acp --login`, parses the native consumer grant, and refresh posts to the token endpoint with an account-identity check that the account does not change. Source S16 (internal source-code evidence file). Internal-primary. Confidence: high. Read 2026-11-18.
- E2. Per stream, `stageAgyCredentials()` writes a single native `antigravity-oauth-token` file (0700 directory, 0600 file, atomic write-and-verify) that the child CLI reads exclusively; an `SSH_TTY` marker forces file-only auth; no token in argv or environment. One process per account/session, keyed `antigravity-acp:<account>:<sessionId>`. Source S16. Internal-primary. Confidence: high. Read 2026-11-18.
- **E2-hygiene. Credential hygiene:** the `agy` child inherits the full `Bun.env` with no stripping and reads its OAuth token exclusively from the staged token file (E2), so keep unrelated secrets out of the spawn environment or strip them before spawning where possible — anything inherited is visible to the CLI subprocess.
- E3. No key pool exists in this provider. A `agyCredentialVersion()` change (token refresh) restarts the host to drop the CLI's cached token source; it does NOT switch accounts. Switching accounts requires a separate login and a new credential envelope. Therefore the rotation-correlated anomaly vector in the claim is structurally absent from the omp `antigravity-cli` path: on 429 there is no second key to fail over to, so no rotation cadence is emitted. Sources S16 + C1-C4. Internal-primary plus inference. Confidence: medium-high. Read 2026-11-18.
- E4. Trade-off. Single key avoids rotation-correlated anomalies but makes quota exhaustion a hard stop surfaced to the caller as 429/RESOURCE_EXHAUSTED. Native CLI headers, User-Agent, TLS, and ACP `_meta` keys are fixed in the installed source and not reachable by extension hooks (S16), so omp adds no spoofing layer; the request shape is the CLI's own. Inference: this lowers a header/TLS-mismatch signal relative to a hand-rolled proxy, but does not address account-standing enforcement or third-party-tool policy. Confidence: medium. Read 2026-11-18.
- E5. Partially answered by first-party changelog. The official `antigravity-cli` CHANGELOG 1.5.10 (P7 in `F-antigravity-latest.md`) states: "when the model API asks the CLI to wait before retrying, the CLI now waits and retries for delays of up to 4 minutes instead of stopping the turn when the delay is longer than 30 seconds, so per-minute rate and capacity limits no longer end your turn". The "instead of" wording implies the 1.5.9 build pinned by omp stopped a turn when the delay exceeded 30 s, but the installed 1.5.9 ACP path is untested. This describes CLI turns, not an instrumented `agy acp` ACP trace, and says nothing about key rotation. Confidence: high for the changelog assertion; unverified for the installed 1.5.9 ACP path.

## Evidence

| ID | Source | Type | Fetched | Supports |
|----|--------|------|---------|----------|
| S1 | https://raw.githubusercontent.com/grpc/grpc/master/doc/statuscodes.md | primary (spec) | 2026-11-18 | A1 |
| S2 | https://google.aip.dev/193 | primary (spec) | 2026-11-18 | A2 |
| S3 | https://google.aip.dev/194 | primary (spec) | 2026-11-18 | A3 |
| S4 | https://ai.google.dev/gemini-api/docs/rate-limits | primary (official docs) | 2026-11-18 | A6, B1 |
| S5 | https://docs.cloud.google.com/docs/quotas/known-issues | primary (official docs) | 2026-11-18 | A4, B4, C5, D4 |
| S6 | https://docs.cloud.google.com/docs/quotas/quota-project | primary (official docs) | 2026-11-18 | B2, D4 |
| S7 | https://status.cloud.google.com/incident/developers-console/19001 | primary (incident post, 2019-03-11) | 2026-11-18 | A5 |
| S8 | https://raw.githubusercontent.com/boltrunner/gcli2api/master/README.md | primary (first-party repo) | 2026-11-18 | C1 |
| S9 | https://raw.githubusercontent.com/su-kaka/agy2api/master/README.md | primary (first-party repo) | 2026-11-18 | C2 |
| S10 | https://raw.githubusercontent.com/mibgb65-cloud/OmniProxy/main/docs/product/GOOGLE_SUBSCRIPTION.md | primary (first-party repo) | 2026-11-18 | A7, B3, C3 |
| S11 | https://github.com/google-gemini/gemini-cli/discussions/20632 | primary (Google maintainer, 2026-02-27) | 2026-11-18 | D1 |
| S12 | https://github.com/google-gemini/gemini-cli/discussions/22970 | primary (Google maintainer, 2026-03-18) | 2026-11-18 | D2 |
| S13 | https://antigravity.google/terms | primary (official ToS) | 2026-11-18 | D3 |
| S14 | The Register quoting Anthropic engineer (via F8 claim 15) | secondary | 2026-11-18 | D5 |
| S15 | https://noresponse.org/guides/api-relays/ (via F7 claims 38, 63) | secondary | 2026-11-18 | D5 |
| S16 | docs/research/omp-antigravity-investigation/F-antigravity-cli-source.md | internal source-code evidence | 2026-11-18 | E1-E4 |
| S17 | docs/research/google-ai-subscription-blocks/findings/F7.md and F8.md | internal evidence carrier | 2026-11-18 | C2, C4, D5, S14, S15 |

## Detection signals

### Observable substrate (documented, primary)
- Identity attribution: per-user rate limits are grouped by `credential_id`, described as the OAuth 2.0 client ID of the service account or user credential (S5).
- Project attribution: quotas enforced per project; API-key and quota-project identifiers appear as `x-goog-api-key` and `x-goog-user-project` (S6).
- Divergence signal: per-user 429 can occur while project-level quota looks healthy (S5) - an internal inconsistency an operator can see and, in principle, an observer can score.
- Quantized resets: documented daily resets at midnight Pacific (S4) and relay-reported weekly / 5h windows (S10) give fixed boundaries; bursts clustered at those boundaries are structurally observable.
- Policy context: Google announced stronger abuse detection for third-party OAuth use (S12) and prohibits circumvention of usage limits (S11, S13). This makes scrutiny of abnormal quota behavior plausible, but is not a signal specification.

### Inferred anomaly candidates (speculative; no Google confirmation)
- Rapid identity switching immediately after a 429, especially with no backoff (C1, C2) - a cadence pattern.
- Same prompt-cache prefix (identical model + system prompt + first messages, C2 `cache` mode) appearing under multiple accounts; secondary research reports shared upstream prompt caches across reseller endpoints (S15).
- Credential churn paired with IP/ASN changes, many parallel sessions, unrelated prompt mix, extreme input/output ratios, or max usage from day one (S15, secondary).
- Header/TLS/User-Agent mismatch when a hand-rolled proxy impersonates the client (F7 section A); omp's CLI path does not add this layer (S16).
- No Google document ties any of these to a consumer Antigravity ban. Treat as hypotheses only.

### Explicitly not evidenced
- No verified rotation-to-ban rule, detector name, threshold, score, or detection latency for consumer Antigravity.
- No verified ban count or ban rate attributable to key rotation.
- No proof that a single-key session is safe from enforcement; absence of rotation only removes one candidate signal.

## Confidence

- High: 429/RESOURCE_EXHAUSTED semantics and retry guidance (S1-S3); per-project quota and quota-project determination (S5, S6); token-bucket mechanism for Google services generally (S7); proxy rotation-on-429 behavior (S8-S10); Google enforcement and ToS text (S11-S13); omp antigravity-cli single-credential architecture (S16). Each rests on a primary source fetched directly.
- Medium: consumer Antigravity quota-group shape from relay docs (S10) - first-party to the relay, not Google; inference that single-key reduces mismatch signal (E4); C4 defaults carried via F7.
- Low / speculative: the claim that rotation patterns specifically cause bans (D5), all inferred anomaly signals, and B4. No primary source supports a causal rotation-to-ban link.
- Overall verdict confidence: high for "proxies rotate on 429" and "Google bans third-party proxy quota access"; low for "rotation is the detected pattern that triggers the ban."

## Open questions

- Does the installed `agy acp` (1.5.9) binary internally retry or switch anything on 429? Partially answered: CHANGELOG 1.5.10 documents wait-and-retry up to 4 min on per-minute rate/capacity limits and, by its "instead of" wording, implies a >30 s stop in 1.5.9; an instrumented ACP trace on the installed 1.5.9 build is still needed to confirm actual behavior. This cannot be settled from omp source alone.
- Does Google score cross-account prompt-cache reuse or 429-triggered identity switching on consumer Antigravity endpoints? No public documentation; unanswerable from primary sources today.
- Do multiple subscription accounts sharing one OAuth client ID or one quota project actually expand usable quota, or only shuffle denials? Google docs cover per-project and per-user quota separately but not relay-style rotation.
- What is the detection latency and threshold for consumer-subscription abuse flags? Google publishes remediation/cutover intervals, not detection times.
- Are the relay-reported weekly / 5h quota groups and their reset boundaries documented by Google anywhere? No consumer-side quota doc located.
- If a second account is added to omp, would separate credential envelopes produce distinguishable request identity beyond the account ID, and would that matter? Requires source trace plus empirical check.
