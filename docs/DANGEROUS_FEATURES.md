# Active connections and echo upgrades

Enable **Dangerous Features** in Settings to connect directly to a game account.
This opens a separate game session and can disconnect your running game.
Kuro Games has not approved this feature.

## Connect

1. Open **Settings → Dangerous Features → Add player profile**.
2. Sign in with a global Kuro email/password account, or choose a saved login.
3. Choose the player/server to add, then select that profile in the sidebar.
4. Click **Connect** at the bottom left. Wait for **In world**.

Requires an installed global PC client. Third-party and mainland-China logins
are unsupported. If installation discovery fails after an update, run the
updated game once and restart Mornye Tools.

Profile discovery briefly joins servers with existing characters to verify
player details; this can also interrupt another session. It creates no characters.
Selecting a profile only changes the displayed data. An existing connection keeps
syncing its original profile.

Use **Cancel connection** while joining or **Disconnect** once connected.
Closing the app, signing out or disabling the feature also stops the connection.

## Echo marks

In **Inventory → Echoes**, use the lock/discard icons or right-click menu.
Marks apply to the whole stack; locking replaces discard and discarding replaces
a lock. Changes require the connected profile and server confirmation.
Mark controls pause during upgrade batches.

## Bulk upgrades

1. Open **Tools → Echo Upgrader → Select echoes** and choose copies to upgrade.
2. Set the minimum rating, allowed fodder/EXP tubes, and optional
   **Mark failed echoes as discard**.
3. Start the batch. Rules persist across restarts and stay fixed during a batch.

Echoes aim for five-level checkpoints and tune one substat at a time. Discarded
echoes are used before tubes, even when their EXP passes a checkpoint. Newly
unlocked substats are tuned and evaluated individually before spending more EXP. After each
roll, the batch checks the best possible final rating across relevant character
guides. An echo stops when it can no longer reach the threshold; passing echoes
continue to their level limit. Manual echoes and echoes without a guide are skipped.

- Uses only enabled EXP sources, plus tuners and Shell Credits. Zero-EXP echoes
  cannot supply fodder EXP.
- Equipped echoes, pending/passing targets and split remainders stay protected.
- Auto-discard **replaces locks** on failed copies. Equipped echoes and unsplit
  stacks keep their marks.
- Confirmed failed/discarded copies can feed later targets when discard fodder
  is enabled. Consumed queue cards turn gray and show **Used as fodder**.

**Stop batch** prevents the next request; a sent request may finish.
Switching tabs keeps progress. Changing profiles or disconnecting stops the batch.
Missing materials or uncertain server results stop further spending without
automatic retries. Check inventory before restarting.

The **Inventory** tab shows all captured items with exact owned counts, including
Shell Credits, tuners, and EXP tubes. Search by item name or ID; filters
persist across restarts. Server code `200099` means an item is missing, but does
not specify which resource. Check these counts before starting another batch.
Core currencies and tides stay pinned above the item grid, including zero balances.

## Profiles, backups and saved logins

**Manage player profiles** removes profiles without deleting cached data or map
progress; adding the same player/server again reuses it.
Export each player's data through **Settings → Export**, with the intended
sidebar profile selected. **Map data** includes captured exploration and
manual/imported marks.

Passwords and short-lived game tokens are never saved. Remembered authorization
uses the OS credential store; app JSON and exports contain no login tokens.
Linux needs an unlocked Secret Service provider to remember sign-ins.
If secure storage is unavailable, sign-in lasts only for the current run.

Restarting restores sign-in and waits for **Connect**.
Signing out clears that login; disabling the feature clears all saved logins.
Disconnecting or closing the app keeps them.

Build commands and backend entry points are in [Development](DEVELOPMENT.md).
