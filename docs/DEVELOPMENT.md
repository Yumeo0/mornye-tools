# Development

Building, releasing and the internals of Mornye Tools. The [README](../README.md)
covers what the app does and where to download it.

- [Build and test](#build-and-test)
- [Releases and updates](#releases-and-updates)
- [Packet capture](#packet-capture)
- [Optimizer](#optimizer)
- [Exploration map](#exploration-map)
- [Overlay protocol](#overlay-protocol)
- [Layout](#layout)

## Build and test

Prerequisites:

- Bun, Node and Rust (stable)
- Git LFS (all tracked files under `public/` use LFS)
- `protoc` (the vendored `spectrum` crate compiles the pinned protos)

```sh
git lfs install
git lfs pull       # download public assets after cloning an existing checkout
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

The dev profile disables overflow checks only for the `kcp` dependency, as
required by Spectrum's passive transport mirror. Its ACK timing arithmetic can
overflow when remote timestamps use a different clock origin. Keep this package
override when changing build profiles; application overflow checks stay enabled.

## Releases and updates

Releases are built by `.github/workflows/release.yml` on GitHub
(`github.com/Yumeo0/mornye-tools`). Pushing a `v*` tag builds the Linux and
Windows bundles, signs them for the Tauri updater and publishes them to a
GitHub release together with the `latest.json` manifest the app polls:

```
https://github.com/Yumeo0/mornye-tools/releases/latest/download/latest.json
```

Cut a release with the bump script: it updates the version in `package.json`,
`src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml` and `src-tauri/Cargo.lock`,
commits, tags and pushes.

```sh
bun release patch   # or minor / major; --no-push keeps it local
```

The tag has to reach github.com/Yumeo0/mornye-tools for the workflow to run.
Note that the Forgejo push mirror updates the refs there **without creating a
workflow run**, so a release is started either by pushing the tag to GitHub
directly (add a remote for it and `bun release` pushes GitHub before origin to
avoid racing the mirror - see `scripts/release.ts`) or by hand:
Actions -> Build and Release -> Run workflow,
with the tag as the input.

Installers are published under version-less aliases
(`mornye-tools-windows-x86_64-setup.exe`, `mornye-tools-windows-x86_64.msi`,
`mornye-tools-linux-x86_64.AppImage`, `.deb`, `.rpm`), so the README's download
buttons can link to `releases/latest/download/<alias>` and always land on the
newest build. The updater archives keep their versioned names, and for NSIS the
signed installer *is* the updater artifact - `latest.json` points at whatever
name each artifact was actually published under.

The app checks that manifest on start (release builds only) and on demand in
Settings -> Updates, where a newer release can be downloaded, installed and
restarted into. Every bundle is verified against the public key in
`plugins.updater.pubkey`; the matching private key is the repository secret
`TAURI_SIGNING_PRIVATE_KEY`. If it is ever lost, generate a new pair with
`bunx tauri signer generate -w ~/.tauri/mornye-tools.key` and update both the
config and the secret - the key used here has no password.

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
- Capture login, then open team setup to load saved formations for the optimizer.
  `UpdateFormationNotify` carries player-scoped teams with nested role information;
  only the local player's teams are merged. An empty `GetFormationDataResponse`
  is an acknowledgement and leaves them intact. Successful edits, switches and
  explicit removals update individual teams. Login rebuilds the list so teams from
  another account cannot linger. Teams are stored in the account's profile;
  selecting one in the optimizer only changes its local character slots.
- Capture health is visible in settings → Developer: frame / packet /
  decode error counters, plus a stall warning when frames keep arriving but
  nothing decodes. A stall means the passive KCP mirror lost a segment (it can
  never ask for a retransmit); account updates stay frozen until the game
  restarts its connection.

## Account profiles and active sessions

Account data lives under `profiles/<serverId>-<playerId>/` (`account.json` plus
`overrides.json`); `profiles.json` lists the identities and the profile the UI
currently shows. Profiles are keyed by the verified player ID and the official
server ID, so accounts and regions cannot overwrite each other. `Profiles` in
`src-tauri/src/account/profiles.rs` owns the stores, the passive-source pointer
and the UI selection. The passive sniffer follows the first captured login and
keeps writing that player's store. The selector only changes which store the UI
reads; ingestion targets are explicit, and a save from an older revision is
discarded by `PreparedSave`.

A migrated legacy store and a passive-only capture have no official server ID.
The UI asks for the player name, player ID and server/region the first time such
a profile contains data; the entered region becomes a provisional server key and
the profile moves under `profiles/<server>-<player>/`. The next active connection
on that account adopts the provisional profile and replaces the key and region
with the official server values.

The optional active session (`src-tauri/src/dangerous.rs`) authenticates with a
global Kuro account, selects an official server, and joins the world. It requests
`NormalItem`, `PhantomItem`, `WeaponItem`, role list, formations and achievements.
Own-player name, level, world level and signature come from `BasicInfoNotify`
and `PlayerAttrNotify`; the public `PlayerBasicInfoGetRequest` rejects looking
up yourself with code 400003 (`ErrCanNotGetSelfBasicInfo`). The session feeds
every handled packet through `account/ingest.rs` and the same converters as
passive capture. Inventory is
stored as `inventory` in the profile snapshot. The active worker writes only its
own profile. Passwords and short-lived game tokens are never persisted. Saved
accounts keep nonsecret email/server metadata and profile associations in
`dangerous-features.json`; each account has a separate device ID and OS credential
store entry managed by `dangerous/credentials.rs`. The previous single-account
preferences and vault entry remain usable without signing in again. Restart
restores sign-in only, not a world connection. Sign-out clears only the selected
account's authorization; disabling the feature clears all saved authorizations.
Each account's durable restore gate prevents a failed OS deletion from restoring
a signed-out session. An unavailable secure
store produces a warning and never falls back to storing tokens in app JSON.

Settings shows a saved-account dropdown plus Add/Manage player profile dialogs.
Adding authenticates the login, uses the official catalogue's `GARUrl` and
`UserRegion/GetUserInfo` to locate existing characters, then briefly probes only
those servers for authenticated name, Union level and UID. Invalid/rejected GAR
responses fail discovery rather than implying empty servers. Probes use the
shared player-attribute converter without ingesting inventory. The backend caches
verified candidates for that login; cancelling or changing accounts invalidates
them. Choosing a candidate registers/selects its profile and persists its login
association. Removing a profile unregisters it without deleting its cached store
or map progress; re-adding the same UID/server reuses those files.
Selecting a linked player profile selects its login context while idle; Connect
resolves the association again in Rust and uses that profile's official server.
The authenticated UID/server must match before ingestion starts. Browsing another
profile during a connection never reroutes that socket's packets. Profile selection
does not join the world automatically.

Settings Export includes a `map` section by default: profile identity, player ID,
captured exploration/scene and the selected UID's manual map marks from
`map-markers.json`. It preserves imported marks and explicit uncollected overrides.
The export is blocked until that UID's manual marks load, avoiding partial backups.

The active transport reads the game frame length as a three-byte little-endian
integer, excluding the prefix itself. The high byte is significant for large
inventory responses; treating it as reserved truncates frames above 64 KiB.
Split frames remain buffered until complete, with a 4 MiB receive limit and
CRC validation before decrypting normal data frames. Exception envelopes (types
3/19) are rejected with numeric frame type/length only: live type 3 can be just
14 bytes, so its body must not be interpreted as a normal RPC response header.
The rejected frame is consumed once; its opaque body is never decoded or stored.

Echo upgrades use a bounded command queue on the same active worker; IPC never
exposes arbitrary game RPCs. `tools/session-probe/src/echo_upgrade.rs` plans each
stage from the connected session's echo/material state and the compiled
`src/configs/echo_upgrade.json` tables (`bun scripts/compile_echo_upgrade.ts`).
Execution revalidates the plan, sends `PhantomLevelUpRequest` with one tuning
slot or `PhantomIdentifyRequest` for an already unlocked slot, and reconciles
echoes and materials through the shared converters. Discard echo EXP uses the
game's refund ratio. Locked/equipped echoes and all selected instance IDs are
excluded from consumption. Failed mutations are never retried. Stack splits
follow the server's operated-copy instance ID and add it to the protected IDs.
`src/lib/echoUpgradeBatch.ts` owns the sequential batch independently of mounted
tabs; rating uses the same guide/maximum-potential calculation as the overlay.
`live_inventory.rs` starts with the initial inventory snapshots, then applies
server notifications and successful operation responses in transport order.
Repeated inventory initialization RPCs can be rejected by the server, so preview,
revalidation and reconciliation use a heartbeat acknowledgment to drain pending
updates instead. A stage waits for fresh authoritative updates for every spent
material and expected echo fodder removals as well as verified substats. Material
counts include refunds from consumed tuned echoes; they need not equal the old
count minus the cost. Missing consumption updates stop the batch.
The next mutation also requires a passing rating verdict.
Profile changes, disconnects and Stop prevent further stages.

The main sidebar separates Inventory (Characters, Echoes, Weapons, Achievements,
Quests) from Tools (Optimizer, Map, Echo Upgrader). The dedicated upgrader uses
an echo picker modal and a queue beside the rules/progress panel. The queue only
shows selected copies with the shared inventory echo cards, follows operated
copies and confirmed remainders after stack splits, and highlights and scrolls
to the echo currently being upgraded. Stack quantities are selected in the picker.
Connection errors appear in dismissible toasts rather than below the sidebar button.
Batch rules (threshold, discard fodder, EXP material rarities and auto-discard) are
saved in `settings.json` under `echoUpgradeRules`, independently of the overlay's
upgrade assistant. Saved rules are validated before use and writes are serialized
across tab mounts. The overlay threshold supplies the initial migration default.
Each batch captures a fixed
`MaterialPolicy`: discard echo fodder and the four EXP tube IDs are independent
choices, enforced by the Rust planner during preview and execution. Optional
auto-discard uses `ItemDisuseRequest` (`Oper = 1`), whose `ErrCode` is checked.
The worker checks current equipment and echo state before marking, preserves
locks/equipment/unsplit stacks, and waits for the server's mark notification.
Mark updates follow the same inventory converters and fixed connection
profile as upgrades. Failed targets stay protected as fodder until the batch ends.

The default **Overview** page shows the selected profile's name, region, Union
and World levels, signature, last update and collection totals. The UID is not
rendered until its reveal button is clicked; changing profiles or leaving the
page hides it again. Characters now contains only the roster and character
details. The profile portrait comes from `PlayerAttrKey.HeadPhoto`, captured on
login and on attribute updates, and persists as `player.headId`. Older snapshots
without it use a placeholder until the next capture.

`bun scripts/compile_profile_data.ts` compiles the head-item-to-image mapping from
`PlayerHead/playerheadre.json` and `role/roleskin.json`, including skin and event
portraits. It runs as part of `compile_all_data.ts`. The existing asset manifest
and copy step publish those referenced portraits alongside character artwork.

## Optimizer

Engine and result-count preferences live in Settings → Optimizer and persist in
`settings.json`. Team presets keep the selected target and fill its two teammate
slots using captured loadouts, or defaults for unowned characters.

Tethys.gg recommendations are bundled in `src/configs/character_teams.json`.
`bun scripts/compile_build_guides.ts` refreshes builds and teams together;
`--teams-only` refreshes just the team presets. Slot alternatives expand into
distinct compositions, and guide annotations remain visible as loadout advice.
Team presets do not apply echo sets or rotations automatically.

To verify saved-team extraction against a local PCAP without touching the live
account, set `MORNYE_TEST_CAPTURE` to the capture path, optionally set
`MORNYE_TEST_OUTPUT` to a JSON output path, and run from `src-tauri`:
`cargo test --lib sniffer::teams::tests::replay_saved_teams -- --ignored`.

## Exploration map

Select a trackable map item and press **C** to toggle its Collected status. Rebind
the shortcut in Settings → Shortcuts; the current binding is shown beside the
item's Collected switch. It is active only on the Map tab, ignores held keys and
typing, and pauses while a dialog or menu is open.

The **Map** tab displays extracted game tiles with 22,376 static chest, Tidal
Heritage, collectible, exploration and gathering-resource placements across ten maps.
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
into the active account profile and the tab refreshes through `account-updated`. A
successful reward RPC or an exact live `CheckTreasureBeenClaimed` completion
marks a placement collected; everything else starts as not collected. There is
no inference from completed graphs, spawn presence or spawn absence, so markers
stay unattributed until the game confirms them or the player marks them.
Manual marks are stored per account (`map-markers.json`) and only outrank live
evidence that is older than the mark. Generic resource harvesting and a
universal Tidal Heritage history are not established by the available captures.

The first visit to **Map** offers a one-time progress import guide. Dismissing
it is remembered on this device. Use **Settings → Import → Start import** to
reopen the guide anytime and bring marked locations from the English
[GHZS map](https://www.ghzs666.com/wutheringwaves-map#/) into the connected game
account. The guide has five steps: choose GHZS, open and sign in to the
map, copy and run the export script in GHZS's browser console, upload the downloaded
`ghzs-progress.json`, then review and import the matches. **Next** advances each
step and **Back** lets you revisit the instructions without losing your choices.
Uncheck any matches you do not want before importing.
The script reads the current GHZS account's loaded marks and public catalogs;
it does not export login tokens, upload progress, or change GHZS marks.

Imported locations merge into the account's manual marks, preserving existing
progress and leaving the sniffer's profile store untouched. Reimporting the same
locations is safe. An export can be previewed without connecting a game account,
but saving requires one. The dialog resets its preview when accounts change.

Checked matches also collect their directly linked challenge or reward chests,
using explicit same-map catalog links in either direction. The preview and import
count include these additions. Already-collected matches can still supply links
and can be unchecked. Expansion stops after one link: importing a chest can mark
its challenge, but does not then collect sibling chests or complete an entire
quest. Quest membership and nearby coordinates do not imply collection links.

The importer first consults an offline GHZS-to-game mapping generated from
TH.GL's public matching service. A mapped game entity must still agree with
the local catalog's coordinates; missing or conflicting entries are skipped.
Regenerate the lookup with `bun run map:ghzs-mapping` when updating map data.
This sends only public GHZS catalog IDs to TH.GL during development, never a
player's progress. Unmapped IDs fall back to coordinate matching.

GHZS pins use Web Mercator coordinates over separately cropped map images.
`src/configs/ghzs_maps.json` contains alignments calibrated against public
collectible locations on 2026-10-20, and a view may repeat its ID once per
artwork inset it stitches into one image; an inset can also name the single
game artwork layer it shows. Matching requires the same physical map and marker
type, a unique nearby game placement within 12 metres, and enough separation
from alternatives. Neighbouring marks are assigned one placement each through a
globally consistent one-to-one assignment, so a dense chest cluster no longer
loses every mark to its neighbours; an assignment that a free alternative
contradicts stays ambiguous. Assignments also remain ambiguous when swapping
two markers between held placements produces a comparable error. Missing
pins, uncertain matches, gathering items, enemies, and quest markers are
skipped and reported in the preview. Fourteen GHZS map views currently have
alignments, Avinoleum through two insets and the Vault Underground through its
surface plus four calibrated floors; the Roya Frostlands surface and Vault
floors without enough marked locations remain unsupported. Marker IDs and map
alignments can change independently of game data, so the importer validates
versioned exports and never treats GHZS IDs as game entity IDs.

Pickup metadata comes first from native reward previews: the compiler joins
merged entity/template `RewardComponent` data to `droppackage.DropPreview` and
`iteminfo`. A single known preview item supplies its icon and a fallback name;
meaningful plant/source names remain intact. Thousandfold Petals use their native
item names for all nine variants. Extracted artwork is published through the
asset manifest; if unavailable, an existing cached image with the exact native
texture filename is used. Empty, unknown and multi-item previews retain fallbacks.

Additional artwork and community notes come from [wuthering.gg](https://wuthering.gg).
For placements without native item metadata, `bun run map:icons` joins our
placements to the site's marker datasets by their raw
`Transform` coordinates (their data uses the same unscaled values), falls back
to unambiguous name matches against the site's marker and item databases, and
writes `src/configs/map_icons.json` plus the downloaded images under
`public/images/map-items/` as WebP. Everything it cannot prove keeps the built-in per-kind
icon, and blueprint-specific matches win over type and name matches.
Native item placements bypass this community artwork inference. Tidal Heritage
tiers are preserved from native exploration degrees independently of artwork;
only records without a native tier use the legacy icon-name fallback. Serving an
item texture from local assets preserves its existing saved filter key.

To trim transparent padding from existing icons without fetching them again,
use `python scripts/trim-transparent-padding.py icon.png` (requires Pillow).
Pass several file paths or quoted globs such as `"public/icons/map/**/*.webp"`;
`--dry-run` previews changes. The script updates PNG/WebP files in place with
lossless encoding, preserving every nontransparent pixel. Fetching and compilation
do not run this script automatically.

The details panel also lists that spot's community notes from
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
They also include Musicflies, Moments Scattered to the Wind, Dreams of Cindertide,
Dream Patrols, Mimic Chests, Overflowing Palettes, Crab Chests, Three Brothers,
Boat Racing, Ace Wings, Flash Dodge, Elite Monsters, and book fragments/records.
These families use the game's own map-marker targets and exploration graph
categories, with one marker per activity. Crab altars reuse their reward chest's
entity ID when there is a single chest; Musicflies use the activity start rather
than placing a marker on every sound disc. Elite Monsters use `SpecialElite`
encounters rather than every ordinary elite enemy. Book fragments and permanent
field records use specific lore reward packages, excluding generic investigation
loot. Individual patrol and Cindertide names appear in the details panel, while
their filters stay grouped by activity. GHZS imports recognize these categories.
The compiler identifies actors through their exploration category and blueprint,
and challenges through their gameplay graphs, preferring an interaction device
to its controller so each challenge has one marker. Mutterfly destination bases,
unnamed challenge scenery and quest-only devices are excluded. A challenge's
reward chest remains a separate collectible; completing a graph alone never
marks either placement collected.

Exploration category names and icons are joined from
`exploreprogress.SubTypeScore` to `exploretype`, using area ancestry and accepting
only unambiguous mappings. Actor selection and preferred filter names remain UI
choices; progress-only quest controllers and respawning bosses are not promoted
to collectible activities. Standalone Training Dummies (formerly Obelisk Challenges) are discovered through
merged `TargetGearGroupComponent` data, same-map strike mechanisms and explicit
completion-state `UnlockEntity`/`AwakeEntity` actions targeting mapped chests.
Hidden, packed and graph-owned variants are excluded to avoid duplicate or
quest-only pins. No individual Training Dummy IDs or chest links are maintained by hand.

Map details show native requirements in **Obtained through**, alongside a chest's
quest and challenge sources. A shared resolver follows explicit spawn, unlock,
and state-change dependencies across entities and nested gameplay graphs. It
merges blueprint component defaults with instance overrides and resolves entity
groups, gathering, combat, destruction, interactions, state checks, area triggers,
and prerequisite gameplay. Ordered steps, alternative routes, and explicit
completion counts retain their distinct meanings. Other conditions can use the
game's localized objective text. Cycles, unresolved dynamic targets, and unknown
logic are omitted rather than inferred from proximity or silently turned into
mandatory steps. Requirements apply to any map marker type, including ownerless
chests; they do not change collection state or import links.
When a challenge is already shown as a linked source, its matching activation or
completion requirement is hidden by native entity key. Independent requirements,
alternative routes, and counted conditions remain visible.

Resource filters are split into **Upgrade materials** and **Other resources**.
The compiler joins gathering reward previews to native item `ShowTypes` to
identify character, weapon, skill and Echo development materials; cooking,
medicine, crafting ingredients and other pickups stay in the second group.
Both sections retain the original item filter keys and saved visibility toggles.

**Teleport points** groups Resonance Nexuses, Resonance Beacons, permanent domain
entrances and named travel destinations such as The Grand Library. The compiler
joins canonical `teleporter` IDs to native map marks and entity positions, avoiding
quest-only entrance copies and event shortcuts. These locations use native icons,
remain visible under either collection-status filter, and never enter collected
totals, manual completion marks or sniffer claim rules.

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
WebP tiles and low-resolution overview tiles in `public/images/maps/tiles/` and
`public/images/maps/thumbnails/`, nation artwork in `public/images/maps/regions/`,
and only the referenced world-map sprites in `public/icons/map/`.
The map compiler also writes the sniffer's exact claim
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

The **Quests** tab below Achievements lists all named, player-facing quest types,
including quests without map locations, with their native type icons. Search and
quest-type/status filters only change the view. Completion uses the same account
snapshot as the side-quest map pins; missing progress remains **Not synced** until
both login lists arrive. Hidden/internal and test tasks are excluded from the
catalog. The map continues to show only side quests with proven locations.

The **Achievements** tab reads the client's achievement snapshot and live updates,
including progress, completion dates and reward-claimed state. The client requests
that snapshot while loading into the game, so - like the quest lists - start
capture before logging in; live updates keep arriving afterwards. Search,
category/group filters and the hidden-achievement toggle only change the view;
nothing changes game state. Before a relevant snapshot is captured, status remains
unknown. The static quest and achievement catalogue is rebuilt with
`bun run progression:compile` or the normal `update:data` pipeline; its images are
published by `copy_assets.ts`.

## Public asset layout

- `public/icons/`: reusable UI glyphs, grouped by navigation, inventory, echo
  marks, elements, stats, weapon types, rarity quality, achievements and map pins.
- `public/images/`: game-data artwork, grouped into resonator portraits, artwork
  and sequences; profile portraits; echoes; echo sets; weapons; item families;
  community map-item artwork; and map regions, tiles and thumbnails.
- `public/templates/`: recognition templates used by the Rust overlay.
- `public/map/`: compiled map metadata (`catalog.json`).
- `public/data/live/`: gitignored calculator JSON, synced by `bun install`.

Run `bun scripts/copy_assets.ts` after changing image references. All data
compilers produce the same canonical paths, so `bun run update:data` maintains
this layout. Images use readable lowercase names; weapon images retain their
item IDs, and map filenames preserve signed tile coordinates. Calculator weapon
artwork is used by item ID because several native weapon texture IDs differ
from their inventory item IDs.

The publisher builds `data/asset_manifest.json` from rendered catalogue fields
and UI references, validates source-name collisions, reuses current WebP
encodings, and converts changed sources. Identical source artwork at the same
resolution and byte-identical published images share one file;
`src/configs/asset_aliases.json` records the aliases. Only after all referenced
files exist does it prune unused images and legacy directories. Saved map
filters retain their original `filterIcon` identity independently of image
renames and deduplication. Account snapshots and map collection marks are not
part of image publication.

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
mirrors the selected Rust profile (one fetch path, one `account-updated`
subscription, all writes through its mutation functions) and exposes it via
`useAccount`. `AccountProfileSelector` switches profiles through
`account_select_profile`.

## Layout

- `src-tauri/src/account/` - profile registry, account model/store, overrides
  and active-session ingestion
- `src-tauri/src/dangerous.rs` - opt-in account login, server discovery and the
  active session
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
  `postinstall` builders and the release scripts, all run with `bun`
- `src/lib/account.ts`, `src/lib/calc/` - the single account store (reads,
  writes, `useAccount`) and calculator translation/evaluation
- `src/lib/rating.ts`, `src/pages/Overlay.tsx` - overlay card rendering and echo rating
