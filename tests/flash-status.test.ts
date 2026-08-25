import { describe, expect, it } from "vitest";

import { flashStatusFromState } from "../src/flash-status";

describe("installer status messages", () => {
  it("reports a completed recovery", () => {
    expect(flashStatusFromState({ state: "finished" })).toMatchObject({
      tone: "success",
      title: "Recovery image installed",
    });
  });

  it("distinguishes a canceled serial chooser", () => {
    expect(
      flashStatusFromState({
        state: "error",
        details: new DOMException("No port selected by the user", "NotFoundError"),
      }),
    ).toMatchObject({ tone: "warning", title: "Installation canceled" });
  });

  it("distinguishes a busy serial port", () => {
    expect(
      flashStatusFromState({
        state: "error",
        details: "NetworkError: The port is already open",
      }),
    ).toMatchObject({ tone: "error", title: "Serial port is busy" });
  });

  it("provides a controlled retry for other failures", () => {
    expect(
      flashStatusFromState({ state: "error", details: "write failed" }),
    ).toMatchObject({ tone: "error", title: "Recovery did not complete" });
  });
});
