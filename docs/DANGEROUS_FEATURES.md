# Dangerous Features

Dangerous Features are optional controls that interact directly with a game
account. The first launch after this feature is installed asks every user to
activate it or keep it disabled. Either choice is remembered and can be changed
in **Settings → Dangerous Features**.

The developer believes these features should be compatible with the terms of
service, but this has not been verified or approved by Kuro Games.

## Connecting

1. Activate Dangerous Features in the startup prompt or Settings.
2. Open **Settings → Dangerous Features → Add player profile** and sign in
   with a global Kuro email/password account, or choose a saved sign-in.
3. The dialog checks the official servers and shows each existing player's name,
   Union level and UID. Choose **Add profile** on your server. The login is
   associated with that player automatically.
4. Select that player in the sidebar and click **Connect** at the bottom left.

Finding players first asks the official launcher region service where characters
exist. Only those servers are briefly joined to verify their player details; this
can disconnect another game session. Empty servers are never joined and no new
characters are created. A failed check is shown as an error, not an empty server.

The **Game account** dropdown selects an existing login. Use **Add player
profile** to add another account or server. **Manage player profiles** lists the
players linked to that account and lets you remove them or sign out. Removing a
profile unregisters it while preserving its cached data and map progress for
when the same player is added again.

Selecting a linked player profile chooses its saved account while disconnected.
**Connect** then uses that account and the profile's server, checking the player
identity before syncing. Selecting a profile does not connect automatically.

The app reads the installed game's app, launcher, resource and SDK information,
and fetches the official server catalogue. If discovery fails after an update,
update and run the game once, then restart Mornye Tools. An installed global PC
client is required; third-party account login and mainland-China accounts are
not supported by this flow.

**In world** appears only after the server confirms the player identity and
accepts entry. The UID is hidden by default; click its reveal button on
**Overview** to view it. The app keeps the connection alive with heartbeats.
Use **Cancel connection** while joining, or **Disconnect** after joining. Sign
out, disabling Dangerous Features, and closing the main window also stop the
connection. Network operations already in progress can take until their timeout
to stop. A separate connection may sign you out of another game session.

## Echo marks

While connected, select the connected player profile and open **Inventory → Echoes**.
Each captured echo has native lock and discard icon toggles. Click an active
icon to clear its mark; the padlock opens when unlocked. Hover for action and
stack-quantity tooltips.
The right-click menu also offers lock/unlock and discard/unmark actions. Marking
a stack applies to all copies shown on that card. Selecting Locked replaces
Discarded, and selecting Discarded replaces Locked, as in the game.

Changes use the active connection and appear after server confirmation. Stale
marks or stack counts are rejected so an old card cannot overwrite a newer
change. Missing confirmation is never retried automatically. Manual echoes and
other players' profiles cannot be marked in-game. Mark controls are disabled
while an upgrade batch or another marking request is running.

## Automatic echo upgrades

While connected, select the connected account's profile and open **Tools → Echo Upgrader**.
Open **Select echoes** to choose echoes and stack quantities in the picker,
then set the rating threshold and start the batch from the rules panel.
The threshold, allowed fodder and automatic discard setting are saved across
restarts. The initial threshold comes from the Echo Upgrade Assistant setting;
subsequent batch-rule changes are independent of that assistant.

Each selected echo is leveled in five-level stages and tuned one substat at a
time. After each new substat, its best possible final rating is recalculated
across relevant character guides, allowing for its rarity's remaining slots.
As soon as no character can reach the threshold, that echo stops and the next
selected echo begins. Passing echoes continue to their level limit. Already
impossible echoes, manual echoes and echoes without a relevant guide are skipped.
Echoes with unlocked but untuned slots are tuned before further leveling.

The rules panel lets you enable discard-marked echo fodder and each EXP tube
rarity independently. These choices stay fixed for the batch. Materials include
only the enabled sources, plus
tuners and Shell Credits. Only discard echoes with usable invested EXP contribute
EXP; an unleveled echo with zero EXP cannot supply any. Discard echoes are used
first when they fit the stage. Oversized materials that would jump past a stage
are left for later. Locked, equipped and selected target echoes are never consumed.
All selected entries stay protected throughout the batch, including after a stack
split. Choose how many copies to upgrade from each stack in the echo picker.
Each selected copy has its own queue card and result; unselected copies stay untouched.
Echoes that fail the threshold keep their existing mark by default. Enable
**Mark failed echoes as discard** to mark them in-game before moving on to the
next echo. Locked, equipped and unsplit stacked echoes keep their marks. An
echo without a relevant guide is skipped without marking. All selected echoes,
including ones newly marked as discard, remain protected from consumption for
the entire batch. Marking uses the same active connection and waits for a
confirming server notification; uncertain marking requests are not retried.

After the initial sync, the upgrader follows live inventory notifications and
confirmed operation responses. It does not repeat inventory initialization
requests before each stage. Fresh server updates for every spent material and
the expected echo fodder removals must be confirmed before the next stage can
start. The server's material counts include refunds from tuned echo fodder.

Progress remains available in the Echo Upgrader tab while switching tabs.
**Stop batch** prevents the next request; a request already sent may finish.
Changing account profiles or disconnecting stops the batch. Missing materials,
unverified substats, or a failed/uncertain request stop further spending. Upgrades
are never retried automatically. Check the refreshed inventory before restarting.

## Account profiles

Each account/server pair has its own store under
`profiles/<serverId>-<playerId>/`, and `profiles.json` lists them plus the one
currently shown. The key combines the verified game player ID with the official
server ID, so two accounts - or the same account on two servers - never share
resonators, weapons, echoes, inventory, teams, exploration or progression. A
first launch migrates the legacy top-level `account.json` into a local profile.

The account selector changes which profile the UI reads and which linked login
the next connection uses.
Incoming passive or active packets always stay attached to the profile that
produced them, even while you browse a different one.

A legacy store or a passive-only capture has no official server ID. When it
contains data, the app asks for the player name, player ID and server or region
instead of leaving it as a local profile. That region is provisional; the next
active connection on the account replaces it with the official server ID.

## Exporting map data

**Settings → Export → Map data** includes the selected profile's captured
exploration and scene, imported/manual collection marks, timestamps and explicit
uncollected overrides. It is selected by default. Export each player separately
using the sidebar profile selector. Exports contain no saved login tokens or
passwords. Map export waits until the manual marks have loaded successfully.

## Storage and architecture

Passwords are never saved, and no token is returned to the webview. After a
successful login, the reusable account authorization is saved in the OS
credential store (Windows Credential Manager, Linux Secret Service, or macOS
Keychain). The short-lived game-login token and password are not persisted.
The password input is cleared when submitted.

On restart, an enabled app restores the remembered sign-in locally. It still
waits for **Connect** before obtaining a fresh game token or joining a world.
Explicit sign-out removes the selected account's remembered authorization.
Disabling Dangerous Features signs out all saved accounts; closing the app or
disconnecting from the world keeps them.
If the server explicitly rejects the authorization, the session is cleared and
the login form returns with the last email already filled in. Temporary network
errors do not erase the remembered sign-in.

`dangerous-features.json` contains the activation choice, nonsecret account
metadata (email, device ID, server and saved-session flag), and player-profile
links. Every account's authorization has its own OS credential-store entry. It never
contains a password or token. If secure storage is unavailable or locked, login
can still be used for the current run, with a warning rather than a plaintext
fallback. On Linux, a running, unlocked Secret Service provider (such as GNOME
Keyring or KWallet's Secret Service integration) is required for remembering a
session across restarts.

The Tauri service in `src-tauri/src/dangerous.rs` shares authentication,
installation discovery and active UDP/KCP session code with
`tools/session-probe`. Consent gates account access, a single worker owns the
world connection, and cancellation invalidates stale operation results. Account
commands are restricted to the main window.

An active session requests the same snapshots the passive capture observes and
feeds them through the shared extractors (`account/ingest.rs`), writing player
details, resonators, weapons, echoes, inventory, teams and exploration and
progression updates into the connected profile. Writes from both sources are
revision-ordered so an older queued save cannot overwrite a newer one. The
active client levels and tunes explicitly selected echoes during automatic
batches. It does not perform equipment changes or purchases.

The plain-browser development UI supports the activation choice, while login
and connection controls require the desktop app.

## Development checks

```powershell
bun run test
bun run build
cargo test --manifest-path tools/session-probe/Cargo.toml --locked
# Run from src-tauri so its .cargo/config.toml selects the pinned protos:
Set-Location src-tauri
cargo test --lib dangerous::tests --locked
cargo test --lib account:: --locked
```

The shared client's local HTTP/UDP mocks verify login, world entry, player
identity checks, heartbeats, cancellation and inventory isolation. The backend
tests cover remembered opt-in/opt-out, secure sign-in restoration, sign-out,
expired authorization, storage failures, stale authentication results, profile
isolation and migration, and cancellation on disable. These checks do not
contact live game accounts. An optional native-store roundtrip uses only a
unique dummy credential and deletes it afterwards:
`cargo test --lib dangerous::credentials::tests::native_vault_roundtrip -- --ignored`.
