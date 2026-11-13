# Development

## Setup

Requires Bun, Node/npm, Rust stable, `protoc`, and the
[Tauri system prerequisites](https://v2.tauri.app/start/prerequisites/).

```sh
git submodule update --init
bun install
bun run dev          # browser UI
bun run tauri dev    # desktop app
bun run build        # calculator bundle + TypeScript + production frontend
```

Use the Bun scripts rather than raw Vite. `bun install` builds the calculator
submodule into a generated simulation adapter. No calculator data is fetched at runtime.
If installation fails because a submodule is missing, initialize it and rerun.

## Checks

From the repository root:

```sh
bun run check        # Biome checks + Tailwind canonical-class warnings
bun run lint         # Biome lint + Tailwind canonical-class warnings
bun run format       # Format with Biome, then print Tailwind warnings
bun run format:check # Check formatting without writing, then print Tailwind warnings
bun test ./src ./scripts --timeout 15000
bun run build
```

These commands run the Tailwind check even if Biome reports errors. Pass file or
directory paths to limit either check, for example `bun run lint src/components`.
Tailwind suggestions are warnings and do not fail the command; Biome errors and
checker failures still produce a nonzero exit code.

Biome skips generated game-data tables, calculator bundles, protocol snapshots,
and recorded benchmark results. Refresh these through their generating scripts.

The Tailwind check uses `better-tailwindcss/enforce-canonical-classes` through
Oxlint, with the app's `src/index.css` theme. It uses the same canonicalization
as VS Code's `tailwindCSS.lint.suggestCanonicalClasses`, including suggestions
such as `[overflow-wrap:anywhere]` → `wrap-anywhere`. Biome remains responsible
for formatting and other lint rules. To run or autofix just the Tailwind rule:

```sh
bun run lint:tailwind
bun run lint:tailwind --fix
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

Development builds use line-level debug symbols (`debug = 1`) to retain source
locations and backtraces while reducing linker memory use and PDB generation.
Windows x64 builds use Rust's bundled `rust-lld` linker; no separate LLVM install
is needed. A linker or debug-profile change requires a one-time dependency rebuild.

Only one Cargo build can use `src-tauri/target/` at a time. If a restart reports
`Blocking waiting for file lock on build directory`, let the earlier build finish
or stop its original dev/test command before starting another one.

## Releases

```sh
bun release patch    # or minor / major; --no-push keeps it local
```

Write and commit user-facing notes under `## [Unreleased]` in `CHANGELOG.md`
before running the release command. Group notes under `### Added`, `### Improved`,
`### Fixed`, or `### Good to know`, describing what users can do and what changes
for them. Omit commit prefixes, release housekeeping, and implementation details.
For example: “Create and save team rotations in the Rotation Builder.”

The release command moves that draft into a dated version section in the same
commit as the version bump and leaves an empty Unreleased section. Missing notes
stop the release before any versions change. GitHub releases and updater manifests
use the version's curated entry; a publish retry also refreshes the GitHub body.
`RELEASE_NOTES` remains an optional workflow override.

The script updates all four version files, commits, tags and pushes. Do not bump
versions by hand.

Builds run on **GitHub**, in `.github/workflows/release.yml`. The `v*` tag must
reach [Yumeo0/mornye-tools](https://github.com/Yumeo0/mornye-tools).
The release script pushes the branch and tag atomically to origin first, then
syncs a configured GitHub remote. This keeps the Forgejo mirror from deleting
and recreating a tag that only exists on GitHub, which would start duplicate
release builds. If the mirror already copied the tag, the direct GitHub push
does nothing. To retry an existing tag, use **Actions → Build and Release →
Run workflow** with the tag.

The updater reads `releases/latest/download/latest.json` from that repository.
Its public key is in `src-tauri/tauri.conf.json`; the private key is the GitHub
secret `TAURI_SIGNING_PRIVATE_KEY` (local copy: `~/.tauri/mornye-tools.key`).
Downloads in the README use stable, versionless installer aliases.

The update banner and Settings → Updates offer a changelog before installing.
After an update restarts the app, the main window automatically opens the
installed version's changelog once, remembering dismissal across launches. Fresh
installations establish a version baseline without showing the dialog. The updater
records the previous version before installation, including when the Windows
installer restarts the app itself; failed installs do not announce an update.
Settings also keeps a changelog button for the installed version. Notes come
from the update manifest or the matching GitHub release tag and are cached in
`settings.json` before installation so they remain available offline afterward.
The dialog renders Markdown headings, lists and emphasis. Bundled entries from
`CHANGELOG.md` take precedence over older remote or cached text for that version.

## Architecture

| Area                                    | Entry points                                       |
| --------------------------------------- | -------------------------------------------------- |
| Desktop wiring                          | `src-tauri/src/lib.rs`                             |
| Game client: login, transport, upgrades | `src-tauri/crates/game-client/`                    |
| Account models and persistence          | `src-tauri/crates/account/`                        |
| Passive capture and shared ingestion    | `src-tauri/crates/sync/`                           |
| Active connection and credentials       | `src-tauri/crates/connection/`                     |
| Overlay, window capture and OCR         | `src-tauri/crates/overlay/`                        |
| Main window and tabs                    | `src/pages/MainWindow.tsx`, `src/components/tabs/` |
| Calculator and ratings                  | `src/lib/calc/`, `src/lib/rating.ts`               |

Rust crates share `src-tauri/Cargo.lock` and `src-tauri/target/`.
A change rebuilds its crate and dependents; the desktop app still needs relinking.
For example, an overlay edit keeps account storage, sync and the game client cached.
The desktop entry crate builds only an `rlib` for its executable; unused mobile
`staticlib`/`cdylib` outputs would add large archives and extra linking to each rebuild.
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

The installed game release is checked at startup and every 30 seconds, independently
of capture permissions or login. The running client's installation takes precedence
over launcher discovery. A release newer than either the bundled game data or
protocol snapshot produces a persistent warning with a shortcut to update settings;
both versions also appear in capture diagnostics. Resource hotfix revisions are
separate from the game release and do not trigger this warning by themselves.

In **Settings → Advanced → Capture diagnostics**, **Start recording** keeps
raw game-network frames and successfully decoded packet payloads in memory.
Start before reconnecting the game to include the KCP handshake and key exchange.
Recording also includes packets fed through offline import while it is enabled.
It stops at a 64 MiB recording budget or 50,000 frames, preserving the beginning
of the stream. Stop and clear the recording to release it; quitting also clears it.

**Export raw (.pcap)** saves Ethernet-framed packets with timestamps, including
frames that failed parsing or decryption. Windows frames have synthetic Ethernet
headers. **Export parsed (.json)** includes packet headers, directions, source,
decrypted payload hex, fields decoded with the pinned protocol, and decode errors.
The document records the protocol version and hashes so a capture can be checked
against the correct schema. After a game update, successful protobuf decoding
alone does not prove that the pinned names and fields are still correct.
Offline-import recording timestamps reflect when frames were processed.
Exports go to Downloads without stopping the passive listener or changing profiles.
They may contain account/login data and should be kept private.

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
`src-tauri/crates/spectrum/`, `wuwa_calc/`, and `data/` checkouts.

| Task                                                   | Command                                          |
| ------------------------------------------------------ | ------------------------------------------------ |
| Update all game data, assets and named protocols       | `bun run update:data`                            |
| Rebuild from the currently pinned checkouts            | `bun scripts/compile_all_data.ts`                |
| Republish referenced images after changing asset paths | `bun scripts/copy_assets.ts`                     |
| Refresh Tethys builds and team presets                 | `bun scripts/compile_build_guides.ts`            |
| Refresh community map icons / GHZS matching lookup     | `bun run map:icons` / `bun run map:ghzs-mapping` |

The data pipeline reports numbered stages, timings, and output totals. Add
`--verbose` (`bun run update:data --verbose` or
`bun scripts/compile_all_data.ts --verbose`) for per-item processing and source
diagnostics. Warnings remain visible in the default output. Required compiler
failures stop the pipeline; unavailable Tethys/Nanoka updates are reported as
skipped and retain the bundled data.

`bun run update:data` initializes/refreshes `data/wuwa-assets` and the private
`data/wuwa-protos` tooling, automatically selects the newest numbered upstream
release branch of `data/wuwa-data` (including across major/minor updates), extracts
named protocols and packet IDs, publishes the app protocol snapshot, then runs
every compiler and asset publisher above. It does not update the calculator
submodule. Git refreshes preserve local edits and stop on conflicts.

Update the installed game first. Extraction requires the **.NET 10 SDK** and
`protoc`; missing tools or a client/asset/data game-version mismatch stop the
command. Steam libraries and Windows uninstall entries are searched automatically.
For another installation, use `bun run update:data --game '<game root or Client>'`
or set `WUWA_GAME`. `--keys <file or URL>` overrides the public PAK-key source;
`--protoc <executable>` overrides `PROTOC` or `protoc` on PATH. Run
`bun run update:data --help` for options. No packet IDs or branch pins need editing.

`data/VERSION.json` records these input versions; protocol versions are tracked
separately, and resource revisions can differ from the game version. For a
protocol-only refresh, the same client discovery is available through
`update:protos`. This command uses the currently checked-out extractor:

```powershell
git submodule update --init data/wuwa-protos
bun run update:protos
# Or select an installation explicitly:
bun run update:protos --game 'C:/Games/Wuthering Waves/Client'
# Or publish an already generated/pulled tooling snapshot:
bun run update:protos --pinned
```

The extractor reads `Aki.Protocol.dll` from the newest base/patch archives,
reconstructs messages, enums, field encodings, maps, oneofs and optional presence,
then derives packet IDs from `EMessageId`. It reads metadata and IL without
executing client code. `--keys <file or URL>` overrides the default public PAK-key
source. See `data/wuwa-protos/README.md` for direct DLL input and checks.

The update command validates artifact hashes and compiles the schema before
copying the generated files into `src-tauri/protocol/` and recording the protocol
game version. This committed build snapshot lets app and release builds run
without access to the private extraction repository, .NET, or a local client.
Commit the submodule revision and build snapshot together after an update.
Do not edit either set of generated artifacts by hand.

`mornye-game-client::message_id` is generated from that same packet map at build
time. Passive capture, movement, exploration, progression, teams, active sessions,
and profile discovery use those names; patch-specific numeric IDs never need
manual replacement. Missing/renamed messages produce compile errors; changes
to message semantics may still require converter updates.

Extractor tests use synthetic protoc-generated assemblies:
`python -S data/wuwa-protos/tests/run.py`. To validate a full local login capture
through the app's production transport and schemas without writing account data:

```powershell
$env:MORNYE_PROTOCOL_CAPTURE = 'C:/Users/you/Downloads/mornye-capture.pcap'
Set-Location src-tauri
cargo test -p mornye-sync current_protocol_decodes_login_capture --locked -- --ignored --nocapture
```

Tracked `public/**` files are stored directly in Git; Git LFS is not required.
Icons live in `public/icons/`, artwork in
`public/images/`, overlay templates in `public/templates/`, and compiled map
metadata in `public/map/`. The asset publisher deduplicates images and prunes
unused files; regenerate rather than hand-renaming outputs.

Character details load Spine 4.1 formation portraits on demand by character ID.
`bun scripts/publish_spine.ts` reads `data/wuwa-assets/SPINE.json`, publishes base
portraits in `public/spine/portraits/`, and generates
`src/configs/spine_portraits.json`. It also runs as part of `copy_assets.ts` and
`update:data`. Atlas pages use WebP at their original dimensions; skeletons stay
binary. Shared Rover models retain every character ID; costumes and gacha scenes
are not included in this portrait bundle. The publisher matches each character's
base skin in `roleskin.json` and includes its `SpineParam` X/Y offsets and scale.
The player uses a shared formation coordinate system, so wide accessories do not
shrink characters and widening the canvas preserves their zoom. The reusable
`CharacterArtwork` component uses the idle animation's first frame while loading,
on failure, and with reduced motion, and pauses playback offscreen or in hidden
windows. The publisher bakes transparent 1280×1040 WebP frames with the same player
and framing, reusing images for shared models with identical placement. Changed
assets, placement, or renderer code invalidate the image cache. Rendering new
frames requires Chrome or Edge (or `SPINE_BROWSER_PATH` pointing to a Chromium
executable); unchanged frames need no browser. The pinned official Spine runtime's
license is included in `public/spine/LICENSE.txt`; its Spine Editor licensing terms
apply to integration and distribution.

To publish missing inventory artwork from a local extractor output without
changing the asset checkout, run
`bun scripts/publish_inventory_icons.ts .cache/inventory-game-assets 7`, then
`bun scripts/compile_inventory_data.ts` and `bun scripts/copy_assets.ts`.
The trailing game `MainTypeId` restricts publication (`7` is Valuables); omit it
to process all inventory items. Missing artwork is reported by item ID.

To extract fresh map artwork from an installed game (requires .NET):

```powershell
dotnet run --project data/wuwa-assets/tools/wuwa-extract -- --maps --quiet
# Custom installation: add --paks 'D:\Wuthering Waves\Client'
bun scripts/compile-map-data.ts
bun scripts/copy_assets.ts
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

## Calculator

`update:data` also imports calculator-supported characters and weapons missing
from the released catalogs from [Nanoka](https://ww.nanoka.cc/). Their metadata
is tracked in `src/configs/preview_data.json`; portraits, sequence icons and
weapon artwork are bundled in `public/` with the other managed assets. These
entries carry a `Preview` badge and never create owned inventory. Released
records take precedence automatically after a game-data update. Use
`bun scripts/build-calculator.ts && bun scripts/compile-preview-data.ts && bun scripts/copy_assets.ts`
to refresh only previews and their assets. A Nanoka
outage during `update:data` retains the last bundled preview catalog.

The pinned `wuwa_calc/` tree is read-only. App-owned integration lives in
`calculator/engine.ts`; `bun install`, `bun run dev`, and `bun run build` regenerate
the ignored `src/lib/calc/riley/engine.generated.js` bundle. The worker and UI
communicate through `src/lib/calc/types.ts`. See
[migration details](calculator-migration.md).

`bun run update:data` also pre-calculates every pre-made team rotation's optimal
reference stats and team damage, writing `src/configs/rotation_damage.json`.
This checked-in snapshot is bundled with the app; opening or sorting the picker
does not simulate pre-made teams. Invalid rotations retain their diagnostics.
Data updates reuse this versioned snapshot, including on fresh checkouts, when
the calculator fingerprint matches. Only missing or incomplete entries are
calculated; a changed calculator fingerprint invalidates the old scores. Local
checkpoints also resume interrupted calculations.
The pinned Lily model omits Dream Perfume generation. Her pre-made reference
scores are marked `≈` and retain a model warning instead of fabricating resource
gains. Other failures, custom rotations, and inventory optimization remain
subject to cast/buff and energy validation. Forte report counters may drain past
zero during combos; explicit cast requirements determine whether a press is legal.
Reference builds can replace authored 3-cost mains with real ER mains when the
normal ER substat tiers cannot sustain the rotation. Passive main-echo choices
remain valid even when their active cast is absent from the authored rotation.
To regenerate only this snapshot after calculator changes, use
`bun scripts/compile-rotation-damage.ts` (several minutes). The production build checks its
fingerprint and coverage against the freshly bundled calculator.

Custom rotations resolve their optimal stats in an isolated Riley worker before
scoring. Builder playback and picker damage use the same reference scenario;
cached custom scores include the calculator fingerprint and the full document,
so team/action edits invalidate them. Inventory optimization still evaluates
actual candidate echoes with the chosen chains and weapons.
