# Contributing

Thank you for helping improve Awesome recovery.

## Before opening a change

- Keep this tool limited to the public, read-only OSSM production catalog.
- Do not commit credentials, firmware binaries, build output, or device data.
- Preserve the safety sequence: motor power disconnected before USB recovery,
  followed by unloaded verification after installation.
- Do not add alpha or beta firmware selection to this public recovery path.

## Checks

Install dependencies with `pnpm install --frozen-lockfile`, then run:

```sh
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
```

Hardware-affecting changes also require a controlled test on an ESP32-based
Awesome control board with the motor supply disconnected during flashing.
