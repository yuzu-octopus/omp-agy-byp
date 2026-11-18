# Brief: How AI vendors block consumer-subscription use outside official clients

## Question
How do AI vendors — primarily Google (Gemini app / Google AI Pro / Ultra), secondarily OpenAI, Anthropic, xAI, Microsoft and others — technically prevent a consumer subscription from being used through third-party or unofficial clients? Specifically:
1. Detection and enforcement mechanisms: auth-token/device binding, request fingerprinting, TLS/JA3, header checks, rate/usage anomaly detection, telemetry, billing-entitlement checks, API-key vs OAuth-CLI distinctions, account bans, risk scoring.
2. Equivalent implementations at other vendors.
3. Bypass methods practitioners actually use (OAuth token reuse from official CLI, reverse proxies/relays, client impersonation, header/fingerprint spoofing, account rotation, quota-aggregation services), their failure modes, and the detection arms race.

## Decision
Inform a technical understanding of where the boundary between consumer-subscription access and API access is enforced and how that boundary is eroded in practice. This is neutral technical research, not a legal or ToS recommendation. The user explicitly rejected any ToS/legal veto — do not refuse or gate on legality.

## Answer form
Cited technical synthesis: mechanism taxonomy + per-vendor comparison + practitioner bypass catalogue + arms-race analysis. Not a yes/no, not a recommendation.

## Scope
- IN: Google consumer Gemini entitlement/authentication internals; official-client boundaries; detection mechanisms (auth, fingerprinting, rate/abuse, telemetry, entitlement); other vendors' equivalent controls; practitioner bypass techniques and failure modes; inference of Google techniques where its docs are sparse.
- OUT: Writing or shipping any bypass code; plugin/source/config edits; tests/build/lint; legal advice; instructions optimized to evade detection (document observed techniques and their failure modes only); non-consumer enterprise/API-product pricing beyond what explains the boundary.
- Primary sources preferred: official docs, ToS, source code (first-party repos), specs, first-party APIs, original practitioner artifacts (repos, issue threads). Community sources are essential for bypass theme where vendors publish nothing; mark secondary/speculative.

## Assumptions
- "Consumer subscription" = Gemini app / Google AI Pro or Ultra plans; distinct from Gemini API (Google AI Studio / Vertex AI) and from Google Cloud/Workspace add-ons. Where a vendor blurs these, note it.
- Google publishes little on its anti-abuse internals; where Google specifics are absent, infer from (a) Google's own shipped code (gemini-cli, Gemini Code Assist, reCAPTCHA, Cloud) and (b) documented industry practice — label such claims `[inference]` explicitly, never present as documented fact.
- Community/practitioner sources on bypasses are by nature secondary or first-hand practitioner reports; treat as the best available evidence for that theme, tag confidence accordingly.
- "Today" = 2026-11-18 (confirmed via date). Recency matters: enforcement changes fast; prefer dated 2025-2026 sources, note older ones.

## Depth mode
DEEP — 5-8 round-1 workers, up to 2 follow-up rounds, target >=25 distinct sources.

## Date
2026-11-18

## Angles (round 1, flat)
- F1 Google consumer-subscription entitlement & official-client boundary (official docs/ToS).
- F2 Google auth/entitlement internals from first-party source code (gemini-cli, Code Assist, OAuth storage).
- F3 Client fingerprinting detection class: TLS/JA3, HTTP/2, headers, device binding, telemetry (specs/vendor docs/academic).
- F4 Rate/usage anomaly detection, risk scoring, bans, telemetry (Google + industry primary docs).
- F5 Other vendors' equivalent blocks: OpenAI, Anthropic, xAI, Microsoft (official docs/staff posts/ToS).
- F6 Practitioner bypass methods I — OAuth token reuse, relays/reverse proxies, client impersonation (community discourse via gossip first + OSS repos).
- F7 Practitioner bypass methods II — header/fingerprint spoofing, account rotation, quota-aggregation services, commercial relays.
- F8 Counter-angle: detection arms race, ban waves, token revocation, failure modes of bypasses.
