# Mornye Tools

Tauri v2 + React 19 desktop toolkit for Wuthering Waves.

Two data paths, deliberately separate:

- **Account (packet sniffer)** - a passive, always-on UDP sniffer reads the
  game's own traffic (no injection, no memory access) and fills a single,
  game-ID-based store (`account.json`) with the player profile, resonators,
  weapons and echoes. The in-app calculator (`@wuwacalc/core`) evaluates the
  captured builds. There is no OCR fallback and no legacy migration.
- **Overlay (echo scan)** - the game-window scanner reads the echo upgrade
  panel, but only the echo *name*, and only to notice changes. When the name
  changes (or stays unreadable for a second) the app presses the game's lock
  key twice; the client then sends an `ItemLockRequest` with the echo's id and
  the overlay renders that exact echo from the captured account data. Stats
  OCR is kept as a clearly labelled fallback for when no id arrives. Capture
  only ever reads the Wuthering Waves window, never the desktop, and the
  overlay never touches `account.json`.

## Development

Prerequisites:

- Node/Bun and Rust (stable)
- `protoc` (the vendored `spectrum` crate compiles the pinned protos)
- The `thewuwacalculator` submodule (the calculator core lives in
  `packages/core`; the predev/prebuild scripts build and link it)
- `src-tauri/keys/client_private_key.pem` - the bundled RSA key is intentionally
  **not** in version control. Copy it from the `wuwa-protos` extraction output;
  without it the app builds but account sync reports an actionable error.
- `data/wuwa-data` checkout on branch `3.7` (see `.gitmodules`) for the config
  compilers.

```sh
bun install
bun run dev      # predev: builds @wuwacalc/core + syncs public/data
bun run build    # tsc + vite
bun test ./src   # translation tests
```

Rust checks:

```sh
cd src-tauri
cargo check
cargo test
```

## Packet capture

Capture is on by design. It arms on start, polls for the game process, reads
IPv4 frames with a raw `SIO_RCVALL` socket (Windows) or `AF_PACKET` (Linux),
and decodes them with the vendored `spectrum` crate. The only user control is a
runtime Pause/Resume toggle; the session key cache survives restarts.

- Windows: the app must run elevated - raw capture needs Administrator rights and
  fails with `WSAEACCES` otherwise. Linux needs
  `setcap cap_net_raw,cap_net_admin+eip` on the binary.
- Because capture is passive, open the Character / Echo / Weapon menus once (or
  let the game request them on login) so the notifies arrive.

## Layout

- `src-tauri/src/account/` - account model, store and overrides
- `src-tauri/src/sniffer/` - capture lifecycle, keys, extraction, live modules
- `src-tauri/crates/spectrum/` - vendored Apache-2.0 capture/decrypt crate
- `data/wuwa-protos/` - pinned `protos.proto` + `packetIds.json` (refresh with
  `scripts/update-wuwa-protos.ps1`)
- `src/lib/account.ts`, `src/lib/calc/` - account bridge and calculator
  translation/evaluation
- `src/lib/rating.ts`, `src/pages/Overlay.tsx` - OCR overlay path (unchanged)

## References

- `docs/packet-sniffing-and-calculator-plan.md` - the implementation plan