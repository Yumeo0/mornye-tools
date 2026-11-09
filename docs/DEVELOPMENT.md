# Development

## Setup

Requires Bun, Node/npm, Rust stable, `protoc`, and the
[Tauri system prerequisites](https://v2.tauri.app/start/prerequisites/).

```sh
git submodule update --init
bun install
bun run dev          # browser UI
bun run tauri dev    # desktop app
bun run build        # TypeScript + production frontend
```

Use the Bun scripts rather than raw Vite. `bun install` builds the calculator
submodule and syncs its required JSON into gitignored `public/data/live/`.
If installation fails because a submodule is missing, initialize it and rerun.

## Checks

From the repository root:

```sh
bun test ./src ./scripts --timeout 15000
bun run build
```

Run desktop Rust checks **from `src-tauri/`** so Cargo loads the pinned-protocol
configuration:

```sh
cd src-tauri
cargo check --workspace --exclude spectrum --all-targets
cargo test --workspace --exclude spectrum --locked
# Check one subsystem:
cargo test -p mornye-game-client --locked
```

Keep the dev-profile overflow-check override for `kcp`; its passive transport
mirror can overflow timestamp arithmetic.

## Releases

```sh
bun release patch    # or minor / major; --no-push keeps it local
```

The script updates all four version files, commits, tags and pushes. Do not bump
versions by hand.

Builds run on **GitHub**, in `.github/workflows/release.yml`. The `v*` tag must
reach [Yumeo0/mornye-tools](https://github.com/Yumeo0/mornye-tools).
Forgejo's push mirror does not trigger Actions: push directly to a GitHub remote,
or run **Actions → Build and Release → Run workflow** with the tag.
The release script pushes a configured GitHub remote before origin.

The updater reads `releases/latest/download/latest.json` from that repository.
Its public key is in `src-tauri/tauri.conf.json`; the private key is the GitHub
secret `TAURI_SIGNING_PRIVATE_KEY` (local copy: `~/.tauri/mornye-tools.key`).
Downloads in the README use stable, versionless installer aliases.

## Architecture

| Area | Entry points |
| --- | --- |
| Desktop wiring | `src-tauri/src/lib.rs` |
| Game client: login, transport, upgrades | `src-tauri/crates/game-client/` |
| Account models and persistence | `src-tauri/crates/account/` |
| Passive capture and shared ingestion | `src-tauri/crates/sync/` |
| Active connection and credentials | `src-tauri/crates/connection/` |
| Overlay, window capture and OCR | `src-tauri/crates/overlay/` |
| Main window and tabs | `src/pages/MainWindow.tsx`, `src/components/tabs/` |
| Calculator and ratings | `src/lib/calc/`, `src/lib/rating.ts` |

Rust crates share `src-tauri/Cargo.lock` and `src-tauri/target/`.
A change rebuilds its crate and dependents; the desktop app still needs relinking.
For example, an overlay edit keeps account storage, sync and the game client cached.
Format only the changed package with `cargo fmt -p <package>`; avoid `--all`,
which can traverse vendored path dependencies.

### Profiles and connections

- Player UID is account identity across servers. Passive capture reuses the
  existing profile for that UID; server/region is connection metadata.
  Internal profile keys and folders stay stable when metadata is refined, so
  existing sign-in links, selection and cached data stay attached.
  `profiles.json` tracks the registry and UI selection. The sidebar's profile
  settings button manages all local players, including passive captures, without
  enabling Dangerous Features. Removing a profile preserves its cached files.
- Passive capture and active sessions use shared converters and write to their
  source profile. Changing the selected profile must never reroute packets.
  Revision-ordered saves prevent older writes replacing newer data.
- `src/lib/account.ts` owns frontend account state and the `account-updated`
  subscription. Read it through `useAccount`.
- Active commands run through one worker. Echo mutations revalidate current
  state and wait for authoritative updates; uncertain mutations are never retried.
  The batch survives tab switches. See [active connection usage](DANGEROUS_FEATURES.md).

### Capture and overlay

Capture follows the game process automatically. On Windows, run elevated.
On Linux, install `libcap` (`libcap2-bin` on Debian/Ubuntu) and `sudo`.
`bun run tauri dev` uses a Cargo runner that grants the desktop executable
`cap_net_raw=ep` before launch. Sudo may request your password after each Rust
rebuild, because relinking clears file capabilities; frontend hot reloads and
launches of an unchanged binary reuse the existing grant. Cargo tests and the
game-client CLI pass through the runner without requesting privileges.
For a packaged binary, grant `cap_net_raw=ep` with `sudo setcap` after installation
or an update. No `CAP_NET_ADMIN` capability is needed by the Linux capture socket.
Start capture before game login for quests, achievements and saved teams;
open inventory menus to receive their snapshots.

The sidebar's **Passive listener** indicator opens **Settings → Developer**.
It distinguishes waiting for the game/login, receiving data, and stalled capture.
Diagnostics show the process PID, UDP ports, counters for the current capture,
last frame/packet times, and a timestamped capture log. A listener attached after
login cannot reconstruct the missing KCP stream or session key: reconnect or
relaunch the game while Mornye Tools is running. An open capture socket alone
does not mean account sync is decoding data.

Passive capture and active sessions share the bounded game-frame codec in
`mornye-game-client` (24-bit lengths, CRC, crypto and decompression). Passive KCP
reassembly lives in `mornye-sync`; vendored Spectrum supplies protocol messages.

The overlay supervisor runs while the overlay is visible. It detects the echo
panel through OCR, briefly toggles and restores the in-game mark to identify the
echo, then emits `echo-detected`, `echo-updated` and `echo-split`.
The frontend rates the echo; the supervisor times any assistant discard input.
The overlay reads the selected profile and does not write account data.

### UI conventions

Use Base UI/Hugeicons primitives in `src/components/ui/` and `VirtualGrid` for
long lists. The plain-browser dev UI degrades desktop APIs; active connections
require Tauri.

## Game data and assets

Do not edit vendored/generated code or submodule contents:
`src-tauri/crates/spectrum/`, `thewuwacalculator/`, and `data/` checkouts.

| Task | Command |
| --- | --- |
| Update game-data/assets checkouts and rebuild configs/assets | `bun run update:data` |
| Rebuild from the currently pinned checkouts | `bun scripts/compile_all_data.ts` |
| Rebuild map / quest and achievement data | `bun run map:compile` / `bun run progression:compile` |
| Republish referenced images after changing asset paths | `bun scripts/copy_assets.ts` |
| Refresh Tethys builds and team presets | `bun scripts/compile_build_guides.ts` |
| Refresh community map icons / GHZS matching lookup | `bun run map:icons` / `bun run map:ghzs-mapping` |

`data/VERSION.json` records input versions. Refresh pinned `data/wuwa-protos/`
artifacts from a protocol extraction when the game protocol changes.

Tracked `public/**` files are stored directly in Git; Git LFS is not required.
Icons live in `public/icons/`, artwork in
`public/images/`, overlay templates in `public/templates/`, and compiled map
metadata in `public/map/`. The asset publisher deduplicates images and prunes
unused files; regenerate rather than hand-renaming outputs.

To publish missing inventory artwork from a local extractor output without
changing the asset checkout, run
`bun scripts/publish_inventory_icons.ts .cache/inventory-game-assets 7`, then
`bun scripts/compile_inventory_data.ts` and `bun scripts/copy_assets.ts`.
The trailing game `MainTypeId` restricts publication (`7` is Valuables); omit it
to process all inventory items. Missing artwork is reported by item ID.

To extract fresh map artwork from an installed game (requires .NET):

```powershell
dotnet run --project data/wuwa-assets/tools/wuwa-extract -- --quiet
# Custom installation: add --paks 'D:\Wuthering Waves\Client'
bun run map:compile
```

### Map correctness rules

- Collection needs a confirmed reward/claim, a manual mark, or an imported mark.
  Graph completion, nearby entities and missing spawns are not collection evidence.
- Manual marks live per player in `map-markers.json`; newer live evidence wins
  over older manual marks. Teleports never enter collection totals.
- Challenge names, requirements and chest links need native data evidence.
  Keep ambiguous mechanics generic; never infer ownership from proximity.
- GHZS import validates map/type/coordinates and skips ambiguous matches.
  Direct challenge/chest links expand one hop only. Alignments live in
  `src/configs/ghzs_maps.json`; the offline mapping is regenerated separately.

See [remaining challenge questions](map-challenge-audit.md) and
[challenge icon sources](map-combat-icon.md).
