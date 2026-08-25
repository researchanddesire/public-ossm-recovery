export const CATALOG_URL =
  "https://dashboard.researchanddesire.com/api/firmware/v1/web-flasher/catalog?deviceType=ossm&hardwareVariant=default";

const TRUSTED_ORIGIN = "https://dashboard.researchanddesire.com";
const MANIFEST_PATH = "/api/firmware/v1/web-flasher/manifest";
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const BUILD_SHA_PATTERN = /^[0-9a-f]{40}$/i;

export type FirmwareTarget = {
  channel: string;
  version: string;
  releaseId: string;
  buildSha: string;
  manifestUrl: string;
};

export type FirmwareCatalog = {
  protocolVersion: 1;
  deviceType: "ossm";
  hardwareVariant: "default";
  targets: FirmwareTarget[];
};

export class CatalogError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CatalogError";
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const requiredString = (
  record: Record<string, unknown>,
  key: string,
): string => {
  const value = record[key];
  if (typeof value !== "string" || value.trim() === "") {
    throw new CatalogError(`Firmware catalog field \"${key}\" is invalid.`);
  }
  return value;
};

export const validateManifestUrl = (value: string): string => {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new CatalogError("The approved firmware manifest URL is malformed.");
  }

  if (
    url.origin !== TRUSTED_ORIGIN ||
    url.pathname !== MANIFEST_PATH ||
    url.username !== "" ||
    url.password !== "" ||
    url.hash !== ""
  ) {
    throw new CatalogError(
      "The approved firmware manifest came from an unexpected location.",
    );
  }

  const expectedParameters = {
    deviceType: "ossm",
    hardwareVariant: "default",
    channel: "production",
  } as const;

  for (const [key, expected] of Object.entries(expectedParameters)) {
    const values = url.searchParams.getAll(key);
    if (values.length !== 1 || values[0] !== expected) {
      throw new CatalogError(
        "The approved firmware manifest does not target production OSSM hardware.",
      );
    }
  }

  const releaseIds = url.searchParams.getAll("releaseId");
  if (releaseIds.length !== 1 || !UUID_PATTERN.test(releaseIds[0] ?? "")) {
    throw new CatalogError(
      "The approved firmware manifest has an invalid release identifier.",
    );
  }

  return url.toString();
};

const validateTarget = (value: unknown): FirmwareTarget => {
  if (!isRecord(value)) {
    throw new CatalogError("The firmware catalog contains an invalid target.");
  }

  const channel = requiredString(value, "channel");
  const version = requiredString(value, "version");
  const releaseId = requiredString(value, "releaseId");
  const buildSha = requiredString(value, "buildSha");
  const rawManifestUrl = requiredString(value, "manifestUrl");

  if (!UUID_PATTERN.test(releaseId)) {
    throw new CatalogError("The firmware target release identifier is invalid.");
  }
  if (!BUILD_SHA_PATTERN.test(buildSha)) {
    throw new CatalogError("The firmware target build identifier is invalid.");
  }

  return {
    channel,
    version,
    releaseId,
    buildSha,
    manifestUrl:
      channel === "production"
        ? validateManifestUrl(rawManifestUrl)
        : rawManifestUrl,
  };
};

export const validateCatalog = (value: unknown): FirmwareCatalog => {
  if (!isRecord(value)) {
    throw new CatalogError("The firmware catalog response is invalid.");
  }
  if (
    value.protocolVersion !== 1 ||
    value.deviceType !== "ossm" ||
    value.hardwareVariant !== "default" ||
    !Array.isArray(value.targets)
  ) {
    throw new CatalogError(
      "The firmware catalog does not describe supported OSSM hardware.",
    );
  }

  const targets = value.targets.map(validateTarget);
  return {
    protocolVersion: 1,
    deviceType: "ossm",
    hardwareVariant: "default",
    targets,
  };
};

export const selectProductionTarget = (
  catalog: FirmwareCatalog,
): FirmwareTarget => {
  const productionTargets = catalog.targets.filter(
    (target) => target.channel === "production",
  );
  if (productionTargets.length !== 1) {
    throw new CatalogError(
      productionTargets.length === 0
        ? "No approved production firmware is currently available."
        : "The firmware catalog returned more than one production target.",
    );
  }
  return productionTargets[0]!;
};

export const loadProductionTarget = async (
  request: typeof fetch = fetch,
): Promise<FirmwareTarget> => {
  let response: Response;
  try {
    response = await request(CATALOG_URL, {
      headers: { Accept: "application/json" },
    });
  } catch {
    throw new CatalogError(
      "The approved firmware catalog could not be reached. Check your connection and retry.",
    );
  }

  if (!response.ok) {
    throw new CatalogError(
      "The approved firmware catalog is temporarily unavailable. Please retry shortly.",
    );
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new CatalogError("The firmware catalog returned unreadable data.");
  }

  return selectProductionTarget(validateCatalog(payload));
};
