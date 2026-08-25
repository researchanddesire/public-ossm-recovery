# OSSM Recovery

A public, browser-based recovery tool for restoring the bootloader and stable
firmware on an OSSM ESP32 control board.

The recovery tool does not bundle firmware. It reads the current approved
production release from Research + Desire's public firmware catalog, validates
that the returned installer belongs to the expected production endpoint, and
then hands that installer to [ESP Web Tools](https://esphome.github.io/esp-web-tools/).
The approved installer is a complete flash image containing the bootloader,
partition table, OTA bootstrap, and application.

## Use the recovery tool

This repository is not currently hosted. To run it locally:

1. Install [Node.js 22](https://nodejs.org/) and
   [pnpm](https://pnpm.io/installation).
2. Clone this repository.
3. Run `pnpm install --frozen-lockfile`.
4. Run `pnpm dev`.
5. Open the local address shown by Vite in desktop Chrome or Edge. Web Serial
   treats `localhost` as a secure context.

Before connecting the control board, stop all motion, clear the travel path,
disconnect motor power, and use USB power only. Follow every instruction shown
by the recovery tool.

## Development

```sh
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
```

The production firmware catalog is read-only:

```text
https://dashboard.researchanddesire.com/api/firmware/v1/web-flasher/catalog?deviceType=ossm&hardwareVariant=default
```

No credentials, firmware binaries, hosting configuration, or deployment
workflow belong in this repository.

## Support

If recovery fails after one controlled retry, stop and contact
[support@researchanddesire.com](mailto:support@researchanddesire.com). Include
the operating system, browser, serial-port name, installer message, and the
steps already attempted.

## License

The recovery-site software is available under the [MIT License](LICENSE).
Firmware is distributed separately through Research + Desire's approved release
system and retains its own licensing.
