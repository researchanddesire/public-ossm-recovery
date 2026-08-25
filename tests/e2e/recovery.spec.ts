import { expect, test } from "@playwright/test";

const catalog = {
  protocolVersion: 1,
  deviceType: "ossm",
  hardwareVariant: "default",
  targets: [
    {
      channel: "production",
      version: "1.0.51",
      releaseId: "37fb2cce-11c5-4afb-8912-db02a4e0a84a",
      buildSha: "fb6f6d616b67528b41445f1dabdab6e6a4a605a8",
      manifestUrl:
        "https://dashboard.researchanddesire.com/api/firmware/v1/web-flasher/manifest?deviceType=ossm&hardwareVariant=default&channel=production&releaseId=37fb2cce-11c5-4afb-8912-db02a4e0a84a",
    },
  ],
};

test("Chrome renders the approved installer and safety gate", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "serial", {
      configurable: true,
      value: {},
    });
  });
  await page.route("**/api/firmware/v1/web-flasher/catalog?**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(catalog) }),
  );

  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Bring the control board back." }),
  ).toBeVisible();
  await expect(page.getByText("Stable OSSM v1.0.51")).toBeVisible();
  const installer = page.locator("esp-web-install-button");
  await expect(installer).toHaveAttribute("manifest", /channel=production/);
  const recover = page.getByRole("button", { name: "Connect + recover" });
  await expect(recover).toBeDisabled();
  await page.getByRole("checkbox").check();
  await expect(recover).toBeEnabled();
});

test("unsupported browsers cannot create an installer", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "serial", {
      configurable: true,
      value: undefined,
    });
  });
  await page.route("**/api/firmware/v1/web-flasher/catalog?**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(catalog) }),
  );

  await page.goto("/");
  await expect(page.getByText("This browser cannot connect over USB")).toBeVisible();
  await expect(page.locator("esp-web-install-button")).toHaveCount(0);
});

test("catalog failure exposes a working retry", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "serial", {
      configurable: true,
      value: {},
    });
  });
  let attempts = 0;
  await page.route("**/api/firmware/v1/web-flasher/catalog?**", (route) => {
    attempts += 1;
    return attempts === 1
      ? route.fulfill({ status: 503 })
      : route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(catalog) });
  });

  await page.goto("/");
  await expect(page.getByText("Firmware unavailable")).toBeVisible();
  await page.getByRole("button", { name: "Retry catalog" }).click();
  await expect(page.getByText("Stable OSSM v1.0.51")).toBeVisible();
});
