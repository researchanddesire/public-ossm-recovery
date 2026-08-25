import type { FirmwareCatalog } from "../src/catalog";

export const productionManifestUrl =
  "https://dashboard.researchanddesire.com/api/firmware/v1/web-flasher/manifest?deviceType=ossm&hardwareVariant=default&channel=production&releaseId=37fb2cce-11c5-4afb-8912-db02a4e0a84a";

export const validCatalog = (): FirmwareCatalog => ({
  protocolVersion: 1,
  deviceType: "ossm",
  hardwareVariant: "default",
  targets: [
    {
      channel: "production",
      version: "1.0.51",
      releaseId: "37fb2cce-11c5-4afb-8912-db02a4e0a84a",
      buildSha: "fb6f6d616b67528b41445f1dabdab6e6a4a605a8",
      manifestUrl: productionManifestUrl,
    },
  ],
});

export const catalogResponse = (catalog: unknown = validCatalog()) =>
  new Response(JSON.stringify(catalog), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
