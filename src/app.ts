import {
  CatalogError,
  loadProductionTarget,
  type FirmwareTarget,
} from "./catalog";
import {
  flashStatusFromState,
  type EspFlashState,
  type RecoveryStatus,
} from "./flash-status";

type RecoveryAppOptions = {
  request?: typeof fetch;
  serialSupported?: boolean;
};

const pageMarkup = `
  <div class="page-shell">
    <header class="site-header">
      <a class="brand" href="https://researchanddesire.com" aria-label="Research and Desire home">
        <span class="brand-mark" aria-hidden="true">R+D</span>
        <span>Research + Desire</span>
      </a>
      <span class="utility-label">Public recovery utility</span>
    </header>

    <main>
      <section class="hero" aria-labelledby="page-title">
        <div class="eyebrow"><span></span> Awesome / OSSM</div>
        <h1 id="page-title">Bring the control board <em>back.</em></h1>
        <p class="hero-copy">
          Restore the ESP32 bootloader, partition table, and current stable
          Awesome firmware directly from Chrome or Edge.
        </p>
        <div class="hero-meta" aria-label="Recovery characteristics">
          <span>USB recovery</span><span>Stable firmware only</span><span>No account required</span>
        </div>
      </section>

      <section class="safety-panel" aria-labelledby="safety-title">
        <div class="safety-icon" aria-hidden="true">!</div>
        <div>
          <p class="section-kicker">Before USB</p>
          <h2 id="safety-title">Make the machine safe.</h2>
          <p>
            Stop all motion, move people and objects clear, disconnect the motor
            power supply, and connect only the Awesome control board by USB.
          </p>
        </div>
      </section>

      <div class="content-grid">
        <section class="recovery-card" aria-labelledby="recovery-title">
          <div class="card-number">01</div>
          <p class="section-kicker">Complete flash restore</p>
          <h2 id="recovery-title">Install approved stable firmware</h2>
          <p>
            The selected image includes every flash region needed to recover a
            damaged software bootloader. No placeholder firmware is required.
          </p>

          <div id="compatibility" class="notice" role="status"></div>
          <div id="catalog-status" class="firmware-status" aria-live="polite">
            <span class="spinner" aria-hidden="true"></span>
            <div>
              <strong>Loading approved firmware</strong>
              <span>Checking the Research + Desire production catalog…</span>
            </div>
          </div>

          <label class="safety-check">
            <input id="safety-confirmation" type="checkbox" />
            <span>
              Motor power is disconnected, the travel path is clear, and this
              computer is connected with a data-capable USB cable.
            </span>
          </label>

          <div id="installer-slot" class="installer-slot"></div>
          <div id="flash-status" class="flash-status" aria-live="assertive" hidden></div>

          <p class="erase-note">
            For bootloader recovery, approve the complete erase when the installer
            asks. Local Wi-Fi and device settings may need to be entered again.
          </p>
        </section>

        <aside class="steps-card" aria-labelledby="steps-title">
          <p class="section-kicker">Recovery pathway</p>
          <h2 id="steps-title">Four controlled steps</h2>
          <ol class="steps-list">
            <li><span>1</span><div><strong>Prepare</strong><p>Disconnect motor power and connect USB only.</p></div></li>
            <li><span>2</span><div><strong>Recover</strong><p>Choose the Awesome serial port and install the approved image.</p></div></li>
            <li><span>3</span><div><strong>Restart</strong><p>Wait for completion before disconnecting USB.</p></div></li>
            <li><span>4</span><div><strong>Verify</strong><p>Restore power with the path clear; test unloaded homing, minimum motion, and Stop.</p></div></li>
          </ol>
        </aside>
      </div>

      <section class="manual-panel" aria-labelledby="manual-title">
        <div>
          <p class="section-kicker">If the port will not connect</p>
          <h2 id="manual-title">Enter the ESP32 ROM loader manually.</h2>
        </div>
        <ol>
          <li>Keep motor power disconnected and leave USB connected.</li>
          <li>Press and hold the control board’s <strong>BOOT</strong> button.</li>
          <li>While holding BOOT, press and release <strong>RESET</strong>.</li>
          <li>Release BOOT, start recovery again, and select the serial port.</li>
        </ol>
        <p class="manual-note">
          The ROM loader is built into the ESP32 chip and remains available even
          when the flash bootloader is damaged. If accessing the buttons requires
          opening hardware you are not comfortable servicing, stop and contact support.
        </p>
      </section>

      <section class="verify-panel" aria-labelledby="verify-title">
        <p class="section-kicker">After installation</p>
        <h2 id="verify-title">Do not load-test immediately.</h2>
        <div class="verify-grid">
          <p><span>01</span>Confirm the installer reports completion before disconnecting USB.</p>
          <p><span>02</span>Reconnect normal power with the entire motion path empty.</p>
          <p><span>03</span>Confirm startup, unloaded homing, minimum motion, and Stop.</p>
          <p><span>04</span>Re-enter Wi-Fi or device settings only if requested.</p>
        </div>
      </section>
    </main>

    <footer>
      <span>Research + Desire</span>
      <p>One controlled retry only. Then email <a href="mailto:support@researchanddesire.com">support@researchanddesire.com</a>.</p>
    </footer>
  </div>
`;

const getElement = <T extends HTMLElement>(
  root: HTMLElement,
  id: string,
): T => {
  const element = root.querySelector<T>(`#${id}`);
  if (!element) throw new Error(`Recovery UI element #${id} is missing.`);
  return element;
};

const renderFlashStatus = (
  container: HTMLElement,
  status: RecoveryStatus,
) => {
  container.hidden = false;
  container.dataset.tone = status.tone;
  container.replaceChildren();
  const title = document.createElement("strong");
  title.textContent = status.title;
  const detail = document.createElement("span");
  detail.textContent = status.detail;
  container.append(title, detail);
};

const buildInstaller = (
  target: FirmwareTarget,
  safetyConfirmation: HTMLInputElement,
  flashStatus: HTMLElement,
): HTMLElement => {
  const installer = document.createElement("esp-web-install-button");
  installer.setAttribute("manifest", target.manifestUrl);
  installer.setAttribute("data-testid", "firmware-installer");

  const activate = document.createElement("button");
  activate.type = "button";
  activate.slot = "activate";
  activate.className = "install-button";
  activate.disabled = !safetyConfirmation.checked;
  activate.innerHTML = `<span>Connect + recover</span><span aria-hidden="true">↗</span>`;

  safetyConfirmation.addEventListener("change", () => {
    activate.disabled = !safetyConfirmation.checked;
  });

  installer.addEventListener("state-changed", (event) => {
    const status = flashStatusFromState(
      (event as CustomEvent<EspFlashState>).detail ?? {},
    );
    if (status) renderFlashStatus(flashStatus, status);
  });
  installer.append(activate);
  return installer;
};

export const mountRecoveryApp = (
  root: HTMLElement,
  options: RecoveryAppOptions = {},
) => {
  root.innerHTML = pageMarkup;
  const request = options.request ?? fetch;
  const serialSupported =
    options.serialSupported ??
    (typeof navigator !== "undefined" &&
      typeof (navigator as Navigator & { serial?: unknown }).serial !==
        "undefined");

  const compatibility = getElement(root, "compatibility");
  const catalogStatus = getElement(root, "catalog-status");
  const installerSlot = getElement(root, "installer-slot");
  const safetyConfirmation = getElement<HTMLInputElement>(
    root,
    "safety-confirmation",
  );
  const flashStatus = getElement(root, "flash-status");

  if (serialSupported) {
    compatibility.className = "notice notice--success";
    compatibility.innerHTML =
      "<strong>Browser ready</strong><span>Web Serial is available. Use Chrome or Edge on desktop.</span>";
  } else {
    compatibility.className = "notice notice--error";
    compatibility.innerHTML =
      "<strong>This browser cannot connect over USB</strong><span>Open this page in desktop Chrome or Edge. Safari, Firefox, and mobile browsers are not supported.</span>";
    safetyConfirmation.disabled = true;
  }

  const loadCatalog = async () => {
    catalogStatus.className = "firmware-status";
    catalogStatus.innerHTML = `<span class="spinner" aria-hidden="true"></span><div><strong>Loading approved firmware</strong><span>Checking the Research + Desire production catalog…</span></div>`;
    installerSlot.replaceChildren();
    flashStatus.hidden = true;

    try {
      const target = await loadProductionTarget(request);
      catalogStatus.className = "firmware-status firmware-status--ready";
      catalogStatus.replaceChildren();
      const indicator = document.createElement("span");
      indicator.className = "ready-dot";
      indicator.setAttribute("aria-hidden", "true");
      const copy = document.createElement("div");
      const title = document.createElement("strong");
      title.textContent = `Stable OSSM v${target.version}`;
      const detail = document.createElement("span");
      detail.textContent = "Approved complete recovery image";
      copy.append(title, detail);
      catalogStatus.append(indicator, copy);

      if (serialSupported) {
        installerSlot.append(
          buildInstaller(target, safetyConfirmation, flashStatus),
        );
      }
    } catch (error) {
      const message =
        error instanceof CatalogError
          ? error.message
          : "The approved firmware could not be loaded.";
      catalogStatus.className = "firmware-status firmware-status--error";
      catalogStatus.replaceChildren();
      const copy = document.createElement("div");
      const title = document.createElement("strong");
      title.textContent = "Firmware unavailable";
      const detail = document.createElement("span");
      detail.textContent = message;
      copy.append(title, detail);
      const retry = document.createElement("button");
      retry.type = "button";
      retry.className = "retry-button";
      retry.textContent = "Retry catalog";
      retry.addEventListener("click", () => void loadCatalog());
      catalogStatus.append(copy, retry);
    }
  };

  void loadCatalog();
};
