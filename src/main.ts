import "esp-web-tools";
import "./styles.css";

import { mountRecoveryApp } from "./app";

const root = document.querySelector<HTMLElement>("#app");
if (!root) throw new Error("Recovery application root is missing.");

mountRecoveryApp(root);
