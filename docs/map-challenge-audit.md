# Challenge marker audit

Reviewed all 107 markers still labeled `Challenge Project` in the working catalog.

- Relabeled 45 using native titles, localized objectives, explicit failure timers, or identifiable device families.
- Removed 20 Dream Patrol replay duplicates, one remaining expired Rift Runner marker, and 16 excluded activity markers (Hua Lielang Duel, Hide and Seek, Inferno Rider Challenge, Swim, Gulpuff, Swim, Rescue Challenge, Motorcycle Race, Device Activation Challenge).
- Removed six additional controllers reported in Remnant Residence and Heron Wetland, plus all six expired Moon Shooter event markers.
- Removed the crate controller at `38245, 289096`, which releases the separately mapped Blobfly (`8:138000765`).
- Added the nearby Obelisk Challenge at `40975, 289726` (`8:118001239`). Its native `TargetGearGroupComponent` groups three obelisks, and its completion action awakens Standard Supply Chest `8:118001243`; it has no level-play graph.
- Added the Obelisk Challenge at `27928, 273764` (`8:118004465`), linked to Standard Supply Chest `8:146000314` at `28606, 274142`. Its `TargetGearGroupComponent` requires obelisks `118004463`, `118004464`, and `118004459` to match state 5; the group's completion explicitly calls `UnlockEntity` on the chest.
- Removed the controller at `27009, 294891` (`8:146000950`): its graph only checks the reward chest `8:146000929` for the Race Challenge at `23727, 293103` (`8:146000921`). The race and its chest remain mapped and linked.
- Retained 17 ambiguous markers for further verification; no proximity-based naming was used.

At `46499, 84770`, the target stand has no explicit failure timer in the available gameplay data, so it is `Shooting Challenge`. At `-114824, 172868`, the graph has a 20-second failure timer, so it is `Timed Shooting Challenge`.

Existing marker IDs, positions, and linked reward chests are preserved for renamed markers. Named objectives remain available in details when they are more specific than their filter category.

The two individually reviewed Obelisk entries above are now regression examples,
not compiler overrides. Native group and reward-action inference discovers them
and 28 additional standalone challenges. Candidates that fail ownership or
visibility checks remain excluded.

## Remaining ambiguous markers

| Marker | Position (map units) | Evidence still missing |
| --- | --- | --- |
| `8:109800366` | `-38169, 117289` | Backflip practice helper, without a localized objective. |
| `8:115000000` | `-105179, -603224` | Shared terminal; referenced graph does not identify its mechanic. |
| `8:133003516` | `273573, 349901` | No diagnostic entity references or localized objective. |
| `8:142900390` | `792849, 695966` | References are generic or insufficient to establish a safe category. |
| `8:143850344` | `1166972, 1131927` | No resolvable gameplay owner or localized title. |
| `8:157750005` | `1181565, 1377805` | Sword-related device; no localized objective to establish the challenge category. |
| `8:157750234` | `1154875, 1399663` | Sword-related device; no localized objective to establish the challenge category. |
| `8:157750538` | `1192575, 1385100` | Sword-related device; no localized objective to establish the challenge category. |
| `8:157750542` | `1188215, 1395868` | Sword-related device; no localized objective to establish the challenge category. |
| `8:200700001` | `862880, 477012` | Internal timer/flow controller without a player-facing objective. |
| `8:200750333` | `-4940, 79400` | Internal timer/flow controller without a player-facing objective. |
| `8:221800113` | `74397, 258530` | Atmosphere controller, without a standalone player objective. |
| `8:224750445` | `61440, 262610` | References are generic or insufficient to establish a safe category. |
| `8:224750452` | `61440, 262610` | Internal timer/flow controller without a player-facing objective. |
| `8:316700188` | `838763, 514559` | Internal timer/flow controller without a player-facing objective. |
| `905:150700144` | `361872, -3265` | References are generic or insufficient to establish a safe category. |
| `905:172700127` | `-3916, -36609` | References are generic or insufficient to establish a safe category. |
