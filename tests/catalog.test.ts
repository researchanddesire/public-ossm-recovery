import { describe, expect, it, vi } from "vitest";

import {
  CatalogError,
  loadProductionTarget,
  selectProductionTarget,
  validateCatalog,
  validateManifestUrl,
} from "../src/catalog";
import { catalogResponse, productionManifestUrl, validCatalog } from "./fixtures";

describe("firmware catalog", () => {
  it("accepts the expected production OSSM catalog", () => {
    const catalog = validateCatalog(validCatalog());
    expect(selectProductionTarget(catalog)).toMatchObject({
      channel: "production",
      version: "1.0.51",
      manifestUrl: productionManifestUrl,
    });
  });

  it("rejects manifests from an unexpected origin", () => {
    expect(() =>
      validateManifestUrl(
        "https://example.com/api/firmware/v1/web-flasher/manifest?deviceType=ossm&hardwareVariant=default&channel=production&releaseId=37fb2cce-11c5-4afb-8912-db02a4e0a84a",
      ),
    ).toThrow("unexpected location");
  });

  it("rejects malformed and non-production manifests", () => {
    expect(() => validateManifestUrl("not a URL")).toThrow("malformed");
    expect(() =>
      validateManifestUrl(productionManifestUrl.replace("production", "alpha")),
    ).toThrow("does not target production OSSM hardware");
  });

  it("rejects a catalog for another device", () => {
    expect(() =>
      validateCatalog({ ...validCatalog(), deviceType: "lkbx" }),
    ).toThrow("supported OSSM hardware");
  });

  it("rejects empty and ambiguous production selections", () => {
    expect(() =>
      selectProductionTarget({ ...validCatalog(), targets: [] }),
    ).toThrow("No approved production firmware");

    const target = validCatalog().targets[0]!;
    expect(() =>
      selectProductionTarget({
        ...validCatalog(),
        targets: [target, { ...target }],
      }),
    ).toThrow("more than one production target");
  });

  it("returns a clear network failure", async () => {
    const request = vi.fn().mockRejectedValue(new TypeError("offline"));
    await expect(
      loadProductionTarget(request as unknown as typeof fetch),
    ).rejects.toThrow("could not be reached");
  });

  it("returns a clear HTTP failure", async () => {
    const request = vi.fn().mockResolvedValue(new Response(null, { status: 503 }));
    await expect(
      loadProductionTarget(request as unknown as typeof fetch),
    ).rejects.toThrow("temporarily unavailable");
  });

  it("loads and validates the target through the public API", async () => {
    const request = vi.fn().mockResolvedValue(catalogResponse());
    await expect(
      loadProductionTarget(request as unknown as typeof fetch),
    ).resolves.toMatchObject({ version: "1.0.51" });
    expect(request).toHaveBeenCalledOnce();
  });

  it("uses a distinct catalog error type", () => {
    expect(() => validateCatalog(null)).toThrow(CatalogError);
  });
});
