import type { ExtensionAPI, ExtensionCommandContext } from "@oh-my-pi/pi-coding-agent";
import { providerPauseReason, setUnpausedProviders } from "@oh-my-pi/pi-ai/registry/oauth";
import { loadConfig, type PluginConfig } from "./config";
import {
  FALLBACK_PROVIDER_ID,
  LEGACY_PROVIDER_ID,
  PRIMARY_PROVIDER_ID,
  TOGGLE_COMMAND,
} from "./ids";
import { checkRuntimeHostPatch, type HostPatchResult } from "./patch-status";
import { scrubContextMessages, scrubPayload, type Msg } from "./payload";
import { isSubscriptionProvider } from "./providers";
import { scrubSystemPrompt } from "./system-prompt";
import { createToolAliasProvider, type ToolAliasProvider } from "./tool-alias";

export type ToggleState = { enabled: boolean; aliasPending?: boolean };

export type ExtensionDeps = {
  unpause: (ids: string[]) => void;
  pauseReason: (provider: string) => string | undefined;
  config: PluginConfig;
  state: ToggleState;
  checkPatch?: () => HostPatchResult;
};

type HostAliasSetter = (provider: ToolAliasProvider) => void;
type GlobalWithAliasHook = typeof globalThis & {
  __ompAgBypSetToolAliasProvider?: HostAliasSetter;
};
type AliasStatus = "active" | "pending" | "off";

export function createExtension({
  unpause,
  pauseReason,
  config,
  state,
  checkPatch = checkRuntimeHostPatch,
}: ExtensionDeps) {
  return (pi: ExtensionAPI): void => {
    pi.setLabel("Google AI Subscription (Antigravity CLI)");

    let patch: HostPatchResult;
    try {
      patch = checkPatch();
    } catch {
      patch = { status: "missing" };
    }

    // Text scrubbing follows the toggle immediately; tool shape is deferred to the
    // next prompt boundary, which is the nearest hook 18.22.2 exposes.
    let aliasActive = state.enabled;

    const setAliasProvider = (globalThis as GlobalWithAliasHook).__ompAgBypSetToolAliasProvider;
    if (typeof setAliasProvider === "function") {
      setAliasProvider(
        createToolAliasProvider({
          enabled: () => aliasActive && patch.status === "ok",
          mode: () => config.mode,
        }),
      );
    }

    const aliasStatus = (): AliasStatus => {
      if (state.aliasPending) return "pending";
      return aliasActive && patch.status === "ok" && config.mode !== "native" ? "active" : "off";
    };

    pi.on("before_agent_start", (event, ctx) => {
      aliasActive = state.enabled;
      state.aliasPending = false;
      if (!state.enabled || !isSubscriptionProvider(ctx.model?.provider)) return undefined;
      if (!Array.isArray(event.systemPrompt)) return undefined;
      return { systemPrompt: scrubSystemPrompt(event.systemPrompt, config) };
    });

    pi.on("context", (event, ctx) => {
      if (!state.enabled || !isSubscriptionProvider(ctx.model?.provider)) return undefined;
      if (!Array.isArray(event.messages)) return undefined;
      return {
        messages: scrubContextMessages(
          event.messages as unknown as readonly Msg[],
          config,
        ) as unknown as typeof event.messages,
      };
    });

    pi.on("before_provider_request", (event, ctx) => {
      if (!state.enabled || !isSubscriptionProvider(ctx.model?.provider)) return undefined;
      return scrubPayload(event.payload as Record<string, unknown>, config);
    });

    pi.registerCommand(TOGGLE_COMMAND, {
      description: "Toggle Antigravity prompt scrubbing: /agy-byp on|off|status",
      handler: async (args: string, ctx: ExtensionCommandContext) => {
        const action = args.trim().toLowerCase().split(/\s+/, 1)[0] ?? "";

        if (action === "on") {
          if (!state.enabled) {
            state.enabled = true;
            if (patch.status === "ok" && config.mode !== "native") state.aliasPending = true;
          }
          if (config.unpauseFallback) unpause([FALLBACK_PROVIDER_ID]);
          ctx.ui.notify(
            `agy-byp: scrubbing on (mode=${config.mode}, unpauseFallback=${config.unpauseFallback}).`,
          );
          return;
        }

        if (action === "off") {
          if (state.enabled) {
            state.enabled = false;
            if (patch.status === "ok" && config.mode !== "native") state.aliasPending = true;
          }
          ctx.ui.notify("agy-byp: scrubbing off (no pause or provider changes made).");
          return;
        }

        if (action !== "" && action !== "status") {
          ctx.ui.notify("Usage: /agy-byp on|off|status");
          return;
        }

        ctx.ui.notify(
          [
            `agy-byp: ${state.enabled ? "on" : "off"} | mode=${config.mode} scrubToolDescriptions=${config.scrubToolDescriptions} unpauseFallback=${config.unpauseFallback} | patch: ${patch.status} | alias: ${aliasStatus()}`,
            `providers: ${PRIMARY_PROVIDER_ID} (primary), ${FALLBACK_PROVIDER_ID} (fallback), ${LEGACY_PROVIDER_ID} (legacy)`,
            `${FALLBACK_PROVIDER_ID} pause reason: ${pauseReason(FALLBACK_PROVIDER_ID) ?? "not paused"} | To allow the fallback, add ${FALLBACK_PROVIDER_ID} to auth.unpausedProviders in an operator config layer (user/global), never a project layer. No tokens or credentials are shown.`,
            ...(state.aliasPending
              ? ["alias changes take effect at the next prompt (before_agent_start)."]
              : []),
          ].join("\n"),
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
