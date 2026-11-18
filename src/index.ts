import type { ExtensionAPI, ExtensionCommandContext } from "@oh-my-pi/pi-coding-agent";
import { providerPauseReason, setUnpausedProviders } from "@oh-my-pi/pi-ai/registry/oauth";
import { loadConfig, type PluginConfig } from "./config";
import { FALLBACK_PROVIDER_ID, LEGACY_PROVIDER_ID, PRIMARY_PROVIDER_ID, TOGGLE_COMMAND } from "./ids";
import { scrubContextMessages, scrubPayload, type Msg } from "./payload";
import { scrubSystemPrompt } from "./system-prompt";

export type ToggleState = { enabled: boolean };

export type ExtensionDeps = {
  unpause: (ids: string[]) => void;
  pauseReason: (provider: string) => string | undefined;
  config: PluginConfig;
  state: ToggleState;
};

export function createExtension({ unpause, pauseReason, config, state }: ExtensionDeps) {
  return (pi: ExtensionAPI): void => {
    pi.setLabel("Google AI Subscription (Antigravity CLI)");

    pi.on("before_agent_start", event => {
      if (!state.enabled || !Array.isArray(event.systemPrompt)) return undefined;
      return { systemPrompt: scrubSystemPrompt(event.systemPrompt, config) };
    });

    pi.on("context", event => {
      if (!state.enabled || !Array.isArray(event.messages)) return undefined;
      return {
        messages: scrubContextMessages(event.messages as unknown as readonly Msg[], config) as unknown as typeof event.messages,
      };
    });

    pi.on("before_provider_request", (event, ctx) => {
      if (!state.enabled) return undefined;
      const provider = ctx.model?.provider;
      if (provider !== FALLBACK_PROVIDER_ID && provider !== LEGACY_PROVIDER_ID) return undefined;
      return scrubPayload(event.payload as Record<string, unknown>, config);
    });

    pi.registerCommand(TOGGLE_COMMAND, {
      description: "Toggle Antigravity prompt scrubbing: /agy-byp on|off|status",
      handler: async (args: string, ctx: ExtensionCommandContext) => {
        const action = args.trim().toLowerCase().split(/\s+/, 1)[0] ?? "";

        if (action === "on") {
          state.enabled = true;
          if (config.unpauseFallback) unpause([FALLBACK_PROVIDER_ID]);
          ctx.ui.notify(`agy-byp: scrubbing on (mode=${config.mode}, unpauseFallback=${config.unpauseFallback}).`);
          return;
        }

        if (action === "off") {
          state.enabled = false;
          ctx.ui.notify("agy-byp: scrubbing off (no pause or provider changes made).");
          return;
        }

        if (action !== "" && action !== "status") {
          ctx.ui.notify("Usage: /agy-byp on|off|status");
          return;
        }

        ctx.ui.notify(
          `agy-byp: ${state.enabled ? "on" : "off"} | providers: ${PRIMARY_PROVIDER_ID} (primary), ${FALLBACK_PROVIDER_ID} (fallback), ${LEGACY_PROVIDER_ID} (legacy) | mode=${config.mode} scrubToolDescriptions=${config.scrubToolDescriptions} unpauseFallback=${config.unpauseFallback} | ${FALLBACK_PROVIDER_ID} pause reason: ${pauseReason(FALLBACK_PROVIDER_ID) ?? "not paused"} | To allow the fallback, add ${FALLBACK_PROVIDER_ID} to auth.unpausedProviders in an operator config layer (user/global), never a project layer. No tokens or credentials are shown.`,
        );
      },
    });
  };
}

export default createExtension({
  unpause: setUnpausedProviders,
  pauseReason: providerPauseReason,
  config: loadConfig(process.env),
  state: { enabled: false },
});
