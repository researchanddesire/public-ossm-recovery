export type StatusTone = "working" | "success" | "warning" | "error";

export type RecoveryStatus = {
  tone: StatusTone;
  title: string;
  detail: string;
};

export type EspFlashState = {
  state?: unknown;
  message?: unknown;
  details?: unknown;
};

const describeDetails = (state: EspFlashState): string => {
  const values = [state.message, state.details];
  return values
    .map((value) => {
      if (typeof value === "string") return value;
      if (value instanceof Error) return `${value.name}: ${value.message}`;
      if (value && typeof value === "object") {
        const namedValue = value as { name?: unknown; message?: unknown };
        if (
          typeof namedValue.name === "string" &&
          typeof namedValue.message === "string"
        ) {
          return `${namedValue.name}: ${namedValue.message}`;
        }
        try {
          return JSON.stringify(value);
        } catch {
          return "";
        }
      }
      return "";
    })
    .filter(Boolean)
    .join(" ");
};

export const flashStatusFromState = (
  state: EspFlashState,
): RecoveryStatus | null => {
  switch (state.state) {
    case "initializing":
      return {
        tone: "working",
        title: "Connecting to the ESP32",
        detail: "Choose the Awesome serial port when Chrome or Edge asks.",
      };
    case "preparing":
      return {
        tone: "working",
        title: "Preparing the recovery image",
        detail: "Keep USB connected and do not close this page.",
      };
    case "erasing":
      return {
        tone: "working",
        title: "Erasing damaged flash data",
        detail: "This is expected during a complete bootloader recovery.",
      };
    case "writing":
      return {
        tone: "working",
        title: "Restoring bootloader and firmware",
        detail: "Do not unplug the USB cable until installation completes.",
      };
    case "finished":
      return {
        tone: "success",
        title: "Recovery image installed",
        detail:
          "Disconnect USB, restore normal power with the path clear, and complete the unloaded verification below.",
      };
    case "error": {
      const details = describeDetails(state).toLowerCase();
      if (
        /notfounderror|no port selected|cancelled|canceled|user.*dismiss/.test(
          details,
        )
      ) {
        return {
          tone: "warning",
          title: "Installation canceled",
          detail:
            "No changes were requested. Start again when the correct Awesome serial port is available.",
        };
      }
      if (
        /already open|port.*open|in use|busy|claimed|networkerror/.test(details)
      ) {
        return {
          tone: "error",
          title: "Serial port is busy",
          detail:
            "Close other browser tabs, terminals, Arduino tools, or apps using the port, reconnect USB, and retry once.",
        };
      }
      return {
        tone: "error",
        title: "Recovery did not complete",
        detail:
          "Keep motor power disconnected. Reconnect USB, use the manual ROM-loader steps, and retry once before contacting support.",
      };
    }
    default:
      return null;
  }
};
