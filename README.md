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

## Exploration map

The **Map** tab displays extracted game tiles with 29,199 static chest, Tidal
Heritage, collectible and gathering-resource placements across ten maps.
Hover a nation icon in the horizontal region bar to choose an area, or open it
with a click or the keyboard. Choosing Jinzhou, Mengzhou, Ragunna or another
area fits that area's bounds, including when they share the overworld map;
separate maps switch automatically. Region icons are extracted from the game's
`TabIcon` atlas, and the menu follows the game tables' nation/area hierarchy.
Areas with districts open further menus to the right; each includes an
**All of…** option for the parent area. Travel within the current map pans and
zooms smoothly, honors reduced-motion preferences, and stops on manual input.

The filter panel searches and toggles the listed reward items and quest
statuses; chest rows read type-first ("Supply Chest · Advanced"), and the
list/box view is remembered across sessions. Show all, collected or
not-collected placements with the status radios. Drag to pan, scroll to zoom,
and select a marker for its details and coordinates. Every placement is always
shown; the 860 that the game data assigns to an underground terrain floor
(joined from `multimap.json` by area id) carry a small cave badge in the
marker's bottom-right corner.
Selecting such a collectible switches the artwork to its floor — surface tiles
dim underneath — and selecting it again, or selecting any surface collectible,
returns to the surface. Markers whose floor has no extracted artwork keep their
plain icon, since that layout cannot be opened. Fifteen texture references are
absent from the installed game and are reported rather than replaced with
invented terrain.

The map shows only the live account: the sniffer writes exploration evidence
into `account.json` and the tab refreshes through `account-updated`. A
successful reward RPC or an exact live `CheckTreasureBeenClaimed` completion
marks a placement collected; everything else starts as not collected. There is
no inference from completed graphs, spawn presence or spawn absence, so markers
stay unattributed until the game confirms them or the player marks them.
Manual marks are stored per account (`map-markers.json`) and only outrank live
evidence that is older than the mark. Generic resource harvesting and a
universal Tidal Heritage history are not established by the available captures.

Item icons and community notes come from [wuthering.gg](https://wuthering.gg).
Our game tables do not map a blueprint to a specific UI icon, so `bun run
map:icons` joins our placements to the site's marker datasets by their raw
`Transform` coordinates (their data uses the same unscaled values), falls back
to unambiguous name matches against the site's marker and item databases, and
writes `src/configs/map_icons.json` plus the downloaded images under
`public/map/icons/gg/`. Everything it cannot prove keeps the built-in per-kind
icon, and blueprint-specific matches win over type and name matches. The
details panel also lists that spot's community notes from
`https://api.wuthering.gg/comments/<id>`, where `<id>` is the sum of the
placement's raw X and Y coordinates — the key the site computes for its own
pins, so the same id can collide for points mirrored across the diagonal. Level
entities that are only props — activity, gameplay, quest and trophy props,
unnamed pickup nodes, and casket/resource rows the game names generically — are
filtered out of the catalogue (two chests that share a blueprint with real ones
are excluded by entity id), so neither the map nor the sniffer's claim rules
carry them; every placement still feeds the area bounds.

The **Exploration** filters include Blobflies, Mutterfly swarms, Windchimers
(bells), Frostbugs (worms), viewpoints, challenge projects and named Echo
challenges. All map marker sections, including side quests, start disabled and
collapsed. Section checkboxes control marker visibility; section headers expand
or collapse their filter entries. Search expands matching sections without
changing their normal expansion state. Exploration markers support per-account
manual completion marks.
The compiler identifies actors through their exploration category and blueprint,
and challenges through their gameplay graphs, preferring an interaction device
to its controller so each challenge has one marker. Mutterfly destination bases,
unnamed challenge scenery and quest-only devices are excluded. A challenge's
reward chest remains a separate collectible; completing a graph alone never
marks either placement collected.

The map also shows the controlled player's position and facing. Choose
**Follow player** to keep the marker centered; dragging or using arrow keys
stops following, and zoom stays unchanged as you move. Movement uses a
transient `player-position` event (up to four updates per second), without
writing account.json. Tracking starts after a captured login and scene join,
follows confirmed character switches, and clears when leaving the scene or
ending capture. Whenever the selected destination changes, its bounds flash on
the map as a smoothed, rounded outline in the accent color and then fade away.

Map tiles and atlas sprites live in the `wuwa-assets` checkout alongside the
other game images. Its extractor includes map tiles, world-map icons and nation
icons by default. To refresh them from a local game installation (requires .NET):

```powershell
dotnet run --project data/wuwa-assets/tools/wuwa-extract -- --quiet
# Alternate installation:
dotnet run --project data/wuwa-assets/tools/wuwa-extract -- --paks 'D:\Wuthering Waves\Client' --quiet
# Compile placements and publish images from the checkout:
bun run map:compile
```

The normal `update:data` pipeline compiles map metadata with the other game data.
`copy_assets.ts` publishes the referenced images from `wuwa-assets`, including
WebP tiles, low-resolution overview tiles, nation icons and the world-map icon
atlas in `public/map`. The map compiler also writes the sniffer's exact claim
rules to `src/configs/map_rules.json`. The tile size and alignment follow the
client's `MapDefine.js` / `MapTileMgr.js`; the captured Jinzhou position falls
inside city tile `0_-1`.

Side quests use the game's world-map pins — the ordinary marker, a gold variant
for quests that are not available yet and a green variant once completed — with
client-synced availability and completion. Active quests use their current
objective targets when those are known; otherwise an explicit quest giver is
shown. Quests without a proven start or active target are not assigned a guessed
location. The side quest filter lists one row per status, toggleable exactly like
the reward items; quest status itself is read-only. Start capture before logging
in to receive the quest and completion lists.

The **Achievements** tab reads the client's achievement snapshot and live updates,
including progress, completion dates and reward-claimed state. The client requests
that snapshot while loading into the game, so - like the quest lists - start
capture before logging in; live updates keep arriving afterwards. Search,
category/group filters and the hidden-achievement toggle only change the view;
nothing changes game state. Before a relevant snapshot is captured, status remains
unknown. The static quest and achievement catalogue is rebuilt with
`bun run progression:compile` or the normal `update:data` pipeline; its images are
published by `copy_assets.ts`.

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
