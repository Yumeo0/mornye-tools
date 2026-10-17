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
and decodes them with the vendored `spectrum` crate. There is no on/off control:
capture follows the game process and stops on its own once the process is gone.
The session key cache survives restarts.

- Windows: the app must run elevated - raw capture needs Administrator rights and
  fails with `WSAEACCES` otherwise. Linux needs
  `setcap cap_net_raw,cap_net_admin+eip` on the binary.
- Because capture is passive, open the Character / Echo / Weapon menus once (or
  let the game request them on login) so the notifies arrive.
- Capture health is visible in settings → Developer: frame / packet /
  decode error counters, plus a stall warning when frames keep arriving but
  nothing decodes. A stall means the passive KCP mirror lost a segment (it can
  never ask for a retransmit); account updates stay frozen until the game
  restarts its connection.

## Overlay protocol

The overlay is purely event-driven. A Rust supervisor (`src-tauri/src/overlay.rs`)
owns the whole scan/input round trip and only runs while the overlay window is
visible:

- It captures the game window, OCRs the trigger regions
  (`src-tauri/src/echo_panel.rs`) at an adaptive cadence (fast while an echo
  menu is on screen), and folds the panel/flicker/dialog state machines.
- When the Echo Upgrade panel opens on a fresh echo it presses the game's lock
  key to identify the echo (the game answers with an
  `ItemFuncValueUpdateNotify`, which the sniffer turns into `echo-detected`)
  and restores the previous mark right after.
- Events to the frontend: `overlay-panel` (show/hide the card layer),
  `echo-detected` / `echo-updated` / `echo-split` (the exact echo for the
  card), `menu-debug` (per-tick snapshot while the debug panel is on) and
  `capture-origin-changed` (outline placement).
- The Echo Upgrade Assistant is split: the frontend rates the updated echo
  against the TypeScript character catalogs and queues or cancels a discard
  through `assistant_queue_discard` / `assistant_cancel_discard`; the
  supervisor owns the timing (tuning-banner wait, panel checks) and presses
  the discard key itself.

Account data has a single frontend source of truth as well: `src/lib/account.ts`
mirrors the Rust store (one fetch path, one `account-updated` subscription,
all writes through its mutation functions) and exposes it via `useAccount`.

## Layout

- `src-tauri/src/account/` - account model, store and overrides
- `src-tauri/src/sniffer/` - capture lifecycle, keys, extraction, live modules
- `src-tauri/src/overlay.rs` - overlay scan supervisor, mark presses, events
- `src-tauri/src/echo_panel.rs` - trigger-region OCR and template matching
- `src-tauri/crates/spectrum/` - vendored Apache-2.0 capture/decrypt crate
- `data/VERSION.json` - the game version each pinned input came from
  (`game`, `assets`, `data`, `protos`); the pipeline refreshes `assets` and
  `data` from their checkouts, while `game` and `protos` are edited by hand.
- `data/wuwa-protos/` - pinned `protos.proto` + `packetIds.json` that the
  `spectrum` build compiles; refresh by hand from a `wuwa-protos` extraction
- `scripts/` - the data pipeline (configs, assets, versions) plus the
  `postinstall` builders, all run with `bun`
- `src/lib/account.ts`, `src/lib/calc/` - the single account store (reads,
  writes, `useAccount`) and calculator translation/evaluation
- `src/lib/rating.ts`, `src/pages/Overlay.tsx` - overlay card rendering and echo rating