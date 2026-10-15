# Mornye Tools

Desktop companion for Wuthering Waves. It reads the game's own network traffic to 
keep your account data live, rates your echoes, and follows along in an overlay 
while you upgrade them.

## Features

- **Live account sync** - your profile, resonators, weapons and echoes stay current
  as you play.
- **Characters, Echoes, Weapons** - browse your inventory, with substat ratings,
  lock/discard marks and stack counts (×N) on each echo card.
- **Manual echoes** - add or remove entries by hand; they are marked "Manual".
- **Build calculator** - evaluates a build's damage.
- **Optimizer** - finds the best loadout for a target from your echo inventory.
- **Overlay echo scan** - shows the echo you are upgrading, kept in step as you level
  or tune it.
- **Echo Upgrade Assistant** - re-rates an echo after each upgrade or tuning and marks
  it for discard once it can no longer reach your threshold; a manual mark cancels that.
- **Stats OCR** - fallback for echoes that cannot be identified automatically.

## Development

Prerequisites:

- Bun, Node and Rust (stable)
- `protoc` (the vendored `spectrum` crate compiles the pinned protos)

```sh
bun install        # postinstall: builds @wuwacalc/core + syncs public/data
bun run dev
bun run build      # tsc + vite
bun test ./src     # translation tests
bun run update:data  # update both submodules, compile configs, publish assets
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
- Capture health is visible in settings → Packet capture: frame / packet /
  decode error counters, plus a stall warning when frames keep arriving but
  nothing decodes. A stall means the passive KCP mirror lost a segment (it can
  never ask for a retransmit); account updates stay frozen until the game
  restarts its connection.

## Layout

- `src-tauri/src/account/` - account model, store and overrides
- `src-tauri/src/sniffer/` - capture lifecycle, keys, extraction, live modules
- `src-tauri/crates/spectrum/` - vendored Apache-2.0 capture/decrypt crate
- `data/VERSION.json` - the game version each pinned input came from
  (`game`, `assets`, `data`, `protos`); the pipeline refreshes `assets` and
  `data` from their checkouts, while `game` and `protos` are edited by hand.
- `data/wuwa-protos/` - pinned `protos.proto` + `packetIds.json` that the
  `spectrum` build compiles; refresh by hand from a `wuwa-protos` extraction
- `scripts/` - the data pipeline (configs, assets, versions) plus the
  `postinstall` builders, all run with `bun`
- `src/lib/account.ts`, `src/lib/calc/` - account bridge and calculator
  translation/evaluation
- `src/lib/rating.ts`, `src/pages/Overlay.tsx` - OCR overlay path (unchanged)