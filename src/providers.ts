export const SUBSCRIPTION_PROVIDER_IDS = [
  "antigravity-cli",
  "google-antigravity",
  "google-gemini-cli",
] as const;

export const EXCLUDED_PROVIDER_IDS = ["google", "google-vertex"] as const;

export function isSubscriptionProvider(provider: string | undefined): boolean {
  return SUBSCRIPTION_PROVIDER_IDS.some((id) => id === provider);
}
