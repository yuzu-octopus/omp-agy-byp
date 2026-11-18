// tests/drift.test.ts
import { describe, expect, test } from "bun:test";
import { VERSION } from "@oh-my-pi/pi-coding-agent";
import { providerPauseReason, setUnpausedProviders } from "@oh-my-pi/pi-ai/registry/oauth";
import { HOST_SPECIFIERS, HOST_VERSION_PIN } from "../src/version";

describe("host drift", () => {
  test("installed host matches dev pin", () => {
    expect(VERSION).toBe(HOST_VERSION_PIN);
  });

  test("every deep host specifier is tracked", () => {
    expect(HOST_SPECIFIERS).toContain("@oh-my-pi/pi-ai/registry/oauth");
  });

  test("unpause and pause-reason APIs exist on the installed host", () => {
    expect(typeof setUnpausedProviders).toBe("function");
    expect(typeof providerPauseReason).toBe("function");
  });
});
