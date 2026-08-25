import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { mountRecoveryApp } from "../src/app";
import { catalogResponse } from "./fixtures";

describe("recovery application", () => {
  let root: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>';
    root = document.querySelector<HTMLElement>("#app")!;
  });

  afterEach(() => {
    document.body.replaceChildren();
  });

  it("shows approved firmware and creates an installer in a supported browser", async () => {
    const request = vi.fn().mockResolvedValue(catalogResponse());
    mountRecoveryApp(root, {
      request: request as unknown as typeof fetch,
      serialSupported: true,
    });

    await vi.waitFor(() => {
      expect(root.textContent).toContain("Stable OSSM v1.0.51");
    });
    const installer = root.querySelector("esp-web-install-button");
    expect(installer).not.toBeNull();
    expect(installer?.getAttribute("manifest")).toContain(
      "channel=production",
    );

    const button = installer?.querySelector<HTMLButtonElement>("button");
    expect(button?.disabled).toBe(true);
    const confirmation = root.querySelector<HTMLInputElement>(
      "#safety-confirmation",
    )!;
    confirmation.click();
    expect(button?.disabled).toBe(false);
  });

  it("blocks the installer in an unsupported browser", async () => {
    const request = vi.fn().mockResolvedValue(catalogResponse());
    mountRecoveryApp(root, {
      request: request as unknown as typeof fetch,
      serialSupported: false,
    });

    await vi.waitFor(() => {
      expect(root.textContent).toContain("Stable OSSM v1.0.51");
    });
    expect(root.textContent).toContain("cannot connect over USB");
    expect(root.querySelector("esp-web-install-button")).toBeNull();
    expect(
      root.querySelector<HTMLInputElement>("#safety-confirmation")?.disabled,
    ).toBe(true);
  });

  it("shows an API error and successfully retries", async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(catalogResponse());
    mountRecoveryApp(root, {
      request: request as unknown as typeof fetch,
      serialSupported: true,
    });

    await vi.waitFor(() => {
      expect(root.textContent).toContain("Firmware unavailable");
    });
    root.querySelector<HTMLButtonElement>(".retry-button")?.click();
    await vi.waitFor(() => {
      expect(root.textContent).toContain("Stable OSSM v1.0.51");
    });
    expect(request).toHaveBeenCalledTimes(2);
  });

  it("renders serial-port-busy feedback from the installer", async () => {
    const request = vi.fn().mockResolvedValue(catalogResponse());
    mountRecoveryApp(root, {
      request: request as unknown as typeof fetch,
      serialSupported: true,
    });

    await vi.waitFor(() => {
      expect(root.querySelector("esp-web-install-button")).not.toBeNull();
    });
    root.querySelector("esp-web-install-button")?.dispatchEvent(
      new CustomEvent("state-changed", {
        detail: {
          state: "error",
          details: "NetworkError: serial port is already open",
        },
      }),
    );
    expect(root.textContent).toContain("Serial port is busy");
  });
});
