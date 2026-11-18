export type ScrubMode = "generic" | "native";

export type PluginConfig = {
  mode: ScrubMode;
  scrubToolDescriptions: boolean;
  unpauseFallback: boolean;
};

export const DEFAULT_CONFIG: PluginConfig = {
  mode: "generic",
  scrubToolDescriptions: false,
  unpauseFallback: true,
};

// Activation is runtime-only; this function only resolves configuration values.
export function loadConfig(env: NodeJS.ProcessEnv): PluginConfig {
  return {
    mode: env.OMP_AGY_BYP_MODE === "native" ? "native" : "generic",
    scrubToolDescriptions: env.OMP_AGY_BYP_SCRUB_TOOL_DESCRIPTIONS === "1",
    unpauseFallback: env.OMP_AGY_BYP_UNPAUSE_FALLBACK !== "0",
  };
}
