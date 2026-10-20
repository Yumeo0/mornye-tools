# Quest data available to the client

Investigated 2026-10-20 using the local game installation, the pinned 3.7.8 game
data, the pinned protocol definitions, and both saved login captures in
`C:/Users/Yumeo/Programmieren/wuwa-protos/out/captures/`.

The client has both a static quest catalogue and server-provided personal quest
state. We can recover completed quests from login traffic, locate explicit quest
givers, and join active objectives to their tracking targets. The app now captures
quest lists and active objective nodes for its read-only side quest map layer.
Its Achievements tab also captures achievement snapshots and live updates.

## Static definitions

The current source is
[`QuestData/questdata.json`](../data/wuwa-data/BinData/QuestData/questdata.json),
not the older 86-row `quest/quest.json` table. This is also the table read by the
installed client's `QuestNewModel.GetQuestConfig`.

It contains **1,899 definitions**, including hidden logic and test quests;
**923 have a nonempty English title** in
[`MultiText.json`](../data/wuwa-data/Textmaps/en/multi_text/MultiText.json).
These are raw configuration counts, not counts of playable quests.

Useful fields in each row's `Data`:

| Information | Fields |
| --- | --- |
| Identity and text | `Id`, `TidName`, `TidDesc`, `ChapterId`, `TagId` |
| Category | `Type`, joined to `questtype/questtype.json` and `questmaintype.json` |
| Map/instance context | `DungeonId`, `RegionId` |
| How it is offered | `DistributeType`: System, Interact, Passive, Activity, Daily, PhoneMessage, UseItem |
| Prerequisites | `ProvideType`, including prerequisite quests/steps, exploration level, LevelPlay, dates, items, systems, dungeons and gender |
| Acceptance interaction | `AddInteractOption.EntityId`, its dialogue/flow and interaction settings |
| Rewards | `RewardId`, plus objective-specific rewards in node definitions |
| Visibility/tracking | `IsHideInTaskList`, `IsHideAcceptMarkOnNpc`, `IsAutoTrack` |
| Scripted behavior | `ActiveActions`, `AcceptActions`, `FinishActions`, referenced entities/quests/flows |

Quest text and visibility need filtering: type 100 is test content, type 11 is
internal/hidden content, and quests can also be hidden individually or belong to
inactive activities. The client applies additional state and resource/focus-mode
checks before displaying a quest. A raw `Progress` count is therefore much larger
than the player's visible quest log.

## Where quests start

**306 quest definitions have an explicit acceptance entity. All 306 resolve to a
static entity with a position.** The join is:

1. Read `Data.AddInteractOption.EntityId` and `Data.DungeonId`.
2. Resolve the dungeon/instance through
   [`instancedungeon.json`](../data/wuwa-data/BinData/instance_dungeon/instancedungeon.json)
   to its `MapConfigId`.
3. Join `(MapConfigId, EntityId)` to
   [`levelentityconfig.json`](../data/wuwa-data/BinData/level_entity/levelentityconfig.json).
4. Use its `AreaId` and `Transform[0]`. Convert this table's stored XYZ by `0.01`,
   as the existing map compiler already does.

304 joins also work directly with `DungeonId`. Two replay definitions,
`32750007` and `32750008`, use instance `20020008`, which maps to physical map 8.
Joining on entity ID alone is unsafe: one of their entity IDs exists on both
map 8 and map 906.

Examples on map 8 in Jinzhou, in the coordinate units used by our map:

| Quest | Acceptance entity | World XYZ |
| --- | --- | --- |
| `11000030`: Lost Ranger | `109002501` | `(-51701, 109006.5, 1621.09)` |
| `140000000`: Honorary Chef: Taste of Memories | `109002505` | `(-41188.74, 100523.87, 2328.73)` |

Lost Ranger requires prerequisite quest `114000020`; its acceptance NPC also has
a daytime visibility condition. The cooking quest specifies exploration level 8
and prerequisite quest `139000030`. A known position alone does not establish
that the player can currently accept the quest or that its NPC is visible.

The remaining quest definitions do not all have a single physical starting point.
System, activity and phone quests can be offered without a quest giver. Passive
quests can depend on scripted conditions or trigger volumes. Their first
objective/tracking target is useful, but must not be labelled a proven acceptance
location without checking the relevant flow or trigger.

## Personal state sent by the server

These definitions are present in the
[`pinned protocol`](../data/wuwa-protos/protos.proto):

| Message | ID | Information |
| --- | --- | --- |
| `QuestFinishListNotify` | `17000` | Previously completed quest IDs |
| `QuestListNotify` | `23759` | Quest IDs and their current states |
| `QuestReadyListNotify` | `24620` | Quests the server offers as available |
| `QuestStateUpdateNotify` | `28378` | Live state changes for a quest |
| `QuestShowListNotify` | `17562` | Quests to show before normal progression |
| `QuestLockInfoNotify` | `17210` | Quest lock information |
| `QuestFocusInfoNotify` | `18164` | Focus quest ID |
| `BehaviorTreeInfoNotify` | `27985` | Objective tree snapshots |
| `UpdateNodeProgressNotify` | `27949` | Objective counter/progress updates |
| `UpdateNodeStatusNotify` | `18896` | Tree node state changes |
| `UpdateChildQuestNodeStatusNotify` | `20398` | Child-objective state changes |

`QuestState` has named values: **0 InActive, 1 Ready, 2 Progress, 3 Finish,
4 Delete**. Deletion is not completion. A completed objective node is also not
proof that its whole quest is completed.

The installed client's
`Game/Module/QuestNew/Controller/QuestController.js` explicitly registers the
first four messages. `HandleFinishListNotify` adds the IDs to the completed
collection. `HandleQuestStateUpdate` adds state-3 quests to that collection and
removes state-4 quests from the current quest collection.

`Game/Module/QuestNew/Model/QuestModel.js` implements `GetQuestState` by checking:

1. A current quest object and its state.
2. The completed quest collection.
3. The available quest collection.
4. Otherwise, inactive.

The available collection also includes quests outside the current area. The
controller's ready-list handler can retain these separately, then add/remove their
local quest objects on area changes. Removing a local quest object during this
area handling is not the same as the server deleting or completing the quest.

For passive capture, keep snapshot coverage separate from state: absence from
traffic recorded after login is not sufficient evidence of inactivity or lack of
completion. After reconnecting, use a fresh snapshot rather than permanently
unioning all historical states, especially for daily, event and replay content.
The completion list contains IDs, not completion timestamps.

## Verified in the saved captures

Both files were replayed through the existing Spectrum transport decoder, then
quest/tree payloads were decoded with the pinned protobuf schema. None of the
selected quest/tree payloads failed protobuf decoding. Transport does reject some
frames (including CRC errors), so these recordings do not prove complete traffic
coverage.

| Capture | Quest list | Ready within list | Progress within list | Finished IDs | Separate ready list | Quest trees |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `session.pcap` | 299 | 69 | 230 | 583 | 20 | 300 |
| `session_all_claimed.pcap` | 300 | 69 | 231 | 582 | 46 | 300 |

The separate ready lists are subsets of the 69 Ready entries in these recordings;
do not add the counts. All completed IDs and all 300 quest tree configuration IDs
in each recording join to the static quest definitions.

Frame references:

- `session.pcap`: quest list frame 150; ready list 174; completion list 175.
- `session_all_claimed.pcap`: quest list frame 112; ready list 135; completion
  list 137.

Examples from `session_all_claimed.pcap`:

- **Honorary Chef: Taste of Memories** (`140000000`) is in the completed list.
- **Lost Ranger** (`11000030`) has state Ready.
- **Immortal Blaze** (`121000035`) has state Progress. Its active node 5 asks
  the player to ask around about Hongzhen. The static objective references three
  NPCs; the snapshot records `121900015` in the completed interaction list,
  giving **1/3 conversations**.
- **Small Wooly, Big Adventures** (`121000036`) has state Progress, with active
  node 5, “Sit down and wait for the story to begin.”

The hundreds of progressing trees include background logic. In the second
capture only 49 Progress entries have a nonempty English title; even these need
the client's visibility/category filters before becoming user-facing quests.

## Objective locations and progress

[`QuestNodeData/questnodedata.json`](../data/wuwa-data/BinData/QuestNodeData/questnodedata.json)
contains **26,092 nodes**, including **13,279 ChildQuest objectives**. It carries
localized `TidTip` text, conditions, rewards, actions and `TrackTarget` data.

Tracking targets include direct `Locations`, entity IDs, LevelPlay IDs and
capture-vision targets. Objective coordinates in `TrackTarget.Locations` and
conditions such as `ReachArea.Pos` are already in world coordinates; do not apply
the entity table's `0.01` conversion to them again.

For snapshots, select `BtTypeQuest` (1), match the local player's `TreeOwnerId`,
map `TreeIncId` to `BlackboardId` (quest configuration ID), then join each node to
the static key `${questId}_${nodeId}`. Live node updates use the instance tree ID.
Persisting that runtime ID as a static quest ID would produce incorrect joins.

Progress can include interacted NPCs, collected/used items, kills, entity states,
instance completion and LevelPlay counts. Interpret each progress union against
its own objective condition rather than treating every field as a generic count.
Objectives can branch or run in parallel, so an active quest need not have just
one current target.

## Fit with the app

The sniffer's world capture continues to handle **LevelPlay trees only**
(`bt_type == 2`). A separate progression handler captures quest lists, completed
IDs, active quest nodes and achievements under `account.json.progression`, scoped
to the identity captured at login. The overlay continues to only read account data.

The side quest map layer uses:

- Resolved acceptance markers for Interact quests, with server-known availability
  and completion state.
- Active objectives and their current tracking positions.
- A filtered side quest catalogue with prerequisites and completed status.

Keep acceptance markers separate from objective markers, retain unknown state
when snapshot coverage is missing, and use the instance-to-map join consistently.

Research helpers, decoded captures and the extracted client JavaScript are under
the ignored `.cache/quest-research/` directory; no client or vendored sources were
changed for this investigation.
