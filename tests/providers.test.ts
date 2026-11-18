// tests/providers.test.ts
import { expect, test } from "bun:test";
import {
  EXCLUDED_PROVIDER_IDS,
  isSubscriptionProvider,
  SUBSCRIPTION_PROVIDER_IDS,
} from "../src/providers";

test("roster has CLI primary, direct fallback, and legacy OAuth provider only", () => {
  expect(SUBSCRIPTION_PROVIDER_IDS).toEqual([
    "antigravity-cli",
    "google-antigravity",
    "google-gemini-cli",
  ]);
  expect(EXCLUDED_PROVIDER_IDS).toEqual(["google", "google-vertex"]);
});

test("isSubscriptionProvider excludes API-key and ADC providers", () => {
  for (const id of SUBSCRIPTION_PROVIDER_IDS) expect(isSubscriptionProvider(id)).toBe(true);
  expect(isSubscriptionProvider("google")).toBe(false);
  expect(isSubscriptionProvider("google-vertex")).toBe(false);
  expect(isSubscriptionProvider(undefined)).toBe(false);
});
