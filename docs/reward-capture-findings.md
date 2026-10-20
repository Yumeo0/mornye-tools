# Reward claims in session.pcap

Follow-up: [already-claimed-area capture](reward-capture-all-claimed.md) examines
`session_all_claimed.pcap`, including login summaries for completed graphs and
the limits of recovering Tidal Heritage history.

Analyzed 2026-10-19:
`C:\Users\Yumeo\Programmieren\wuwa-protos\out\captures\session.pcap`.

The capture proves one live chest claim and five historical chest claims.
Historical claims are explicitly present in behavior-tree snapshots, even though
the dedicated LevelPlay treasure-box reward lists are empty. Spawn absence is
therefore not the only way to recover claims made before capture started.

## Capture coverage

- 3,628 PCAP records, about 79.6 seconds, including login and a scene join.
- 3,341 decoded game messages; all their protobuf payloads decoded using the
  project's pinned `protos.proto` and `packetIds.json`.
- Transport rejected 51 records outside the game's port ranges, nine with a KCP
  CRC mismatch, and nine with an invalid four-byte payload. No decoded game
  message failed protobuf parsing. This does not establish lossless capture.
- PCAP frame numbers below are one-based. Times are relative to the first PCAP
  record, not the wall-clock time at which an offline decoder ran.

## A claim made during the recording

Frame 392, at +1.616 seconds, adds runtime entity `19002` with
`ConfigType=Level`, `ConfigId=938700793`, and
`OwnerIncId=844424930150940`. Its placement is map `906`, blueprint
`branch3.0_693_Treasure_3_3`, name `TsEntity_3_0_精密物资箱2`.

The claim sequence is:

1. Frame 3013, +64.542 seconds: `GetRewardTreasureBoxRequest` (`24443`),
   `EntityId=19002`, `rpc_id=957`.
2. Frame 3014, +64.573 seconds: `ItemRewardNotify` (`21938`),
   `Reason=15002`, `DropId=1403`, including item `3` with count `20`.
3. In the same frame: `UpdateChildQuestNodeStatusNotify` (`20398`),
   `TreeIncId=844424930150940`, `NodeId=28`, `Status=CQNS_Finished` (`4`).
4. `EntityRemoveNotify` (`17769`), `IsRemove=true`, `EntityId=19002`,
   `Type=RemoveTypeNormal` (`3`).
5. `GetRewardTreasureBoxResponse` (`28349`), `rpc_id=957`,
   `ErrorCode=Success` (`0`).
6. `UpdateNodeStatusNotify` (`18896`), the same tree and node,
   `Status=CompletedSuccess` (`4`).

Use the request's runtime entity ID to find the static placement, and confirm
the claim by matching the response's **RPC ID**. A request alone is an attempt.
Keep the mapping in the pending request because the entity can be removed
before the response arrives, as it is here.

The reward notification corroborates receipt and provides item details, but has
no source entity ID or RPC ID. It cannot independently identify the chest.
Do not require removal type `RemoveTypeTreasureBox` (`5`), and do not interpret
ordinary AOI exits (`IsRemove=false`) as claims.

## Claims made before the recording

`BehaviorTreeInfoNotify` (`27985`) supplies the missing mapping:

```text
TreeInfos[].TreeIncId -> { BtType, BlackboardId, TreeOwnerId }
```

For `BtTypeLevelPlay`, `BlackboardId` identifies the static LevelPlay graph.
`TreeOwnerId` identifies the player; it is not the LevelPlay ID.

Resolve each snapshot node against
`LevelPlayNodeData[Key = "<BlackboardId>_<NodeId>"]`. A completed node whose
condition specifically checks `CheckTreasureBeenClaimed { EntityId }` is a
server-provided historical claim signal for that static entity.

Frame 393, +1.619 seconds, contains tree `844424930150940`,
`BlackboardId=938700033`:

- Node `25`: `CompletedSuccess` -> chest `938700789`, map `906`.
- Node `26`: `CompletedSuccess` -> chest `938700791`, map `906`.
- Nodes `24`, `27`, `28`: active, with child status `CQNS_Progress`; their
  respective claim checks concern `938700790`, `938700792`, `938700793`.
- The graph's claim-count variable is `2`.

Frame 2061, +47.687 seconds, contains tree `844424930152884`,
`BlackboardId=150700037`:

- Node `25`: `CompletedSuccess` -> chest `150701862`, map `906`.
- Node `26`: `CompletedSuccess` -> chest `150701805`, map `906`.
- Node `27`: `CompletedSuccess` -> chest `150701806`, map `906`.
- Nodes `24` and `28` are still progressing.
- The graph's claim-count variable is `3`.

These five completed singleton claim checks precede the sole reward request.
The later node `28` transition in the first tree supplies a sixth confirmed
claim, for `938700793`.

Handle both snapshot `Nodes[].Status` and live status updates. Completed snapshot
nodes here omit `ChildQuestNodeInfo`, so checking only its status loses the
historical evidence. Node IDs repeat across graphs: join through `TreeIncId`
and `BlackboardId`, rather than matching node number or timing alone.

Only infer claims logically guaranteed by the condition. The examples above
each contain exactly one positive claim check. An OR group containing several
checks does not prove every referenced chest was claimed. Missing or inactive
nodes do not establish an unclaimed state. The two demonstrated snapshots do
not establish coverage for every chest or every previously finished graph.

## Tidal Heritage

The static blueprint registry distinguishes `TreasureBox`, `HookTreasureBox`,
and `VisionTreasureBox`. Use the registry's `EntityType` instead of substring
matching blueprint names when classifying rewards.

This capture streams a heritage-type entity in frame 393, +1.619 seconds:

- Runtime entity `19050`, static entity `150700614`, map `906`.
- Blueprint `branch3.0_938_Treasure4`, name `TsEntity_幻象宝箱_3_0_金5`.
- Blueprint `EntityType=VisionTreasureBox`.
- `OwnerIncId=844424930150930`, whose tree has `BlackboardId=150700035`.

There is **no reward request for this entity**, so its claim protocol is not
validated by this capture. The shared treasure reward request/response is the
first candidate to monitor when claiming one; retain `LevelPlayRewardRequest`
and `LevelPlayRewardResponse` in a follow-up trace as well.

The static data does contain positive `CheckTreasureBeenClaimed` checks for
`VisionTreasureBox` placements: graph `187750008`, nodes `40`, `45`, `55`,
and `62`, referencing entities `187750955` through `187750958`. This supports
the same behavior-tree method where such checks exist, but that graph is not
observed in this capture.

For the observed heritage's graph `150700035`, the static kill node unlocks
the reward entity. Completing that node establishes combat completion / reward
availability, not receipt of the reward. The graph also has a daily refresh
configuration. Do not turn its completion count into a permanent claimed flag
for the heritage.

## Signals that do not provide a general claimed set here

- No `LevelPlayGainRewardInfoNotify` arrives. All seven
  `LevelPlayStateListResponse` messages have empty `GainRewardInfoDict`.
- No `LevelPlayRewardNotify`, `LevelPlayRewardRequest`, or
  `LevelPlayRewardResponse` arrives.
- `LevelPlayInfoNotify` has counts for gameplay nodes, not per-chest identity.
- `TreasureChestCountNotify` supplies 43 aggregate records, all with
  `CurrentCount=0`; it does not enumerate claimed placements.
- `ExploreProgressResponse` supplies area/category counts and percentages,
  not the identities of claimed rewards.
- `JoinSceneNotify.SceneInfo.OwnerFinishMingSuGens` is empty in this scene.
- A missing spawn remains ambiguous because of streaming, gates, sublevels,
  and capture loss. Keep it as unknown unless stronger evidence resolves it.

## Implementation outline

Maintain scene-scoped runtime entity mappings and player/tree-scoped
`TreeIncId -> BlackboardId` mappings. Index static claim checks by graph and
node, resolving placements with their map ID. Retain int64 IDs as strings or
64-bit integers rather than assuming JavaScript number precision.

Persist claim evidence under the account and map/static entity identity:
successful reward response, completed snapshot claim check, or live claim-check
completion. Preserve the source and observed time; a historical snapshot gives
an observation time, not the original claim time. Apply refresh rules where
rewards can reset. Keep availability and gameplay completion separate from
claims, and scope co-op observations to the scene/tree owner whose state they
describe.

The probe used during this investigation omitted `BehaviorTreeInfoNotify`.
Its analyzer used a nearby reward request to disambiguate repeated node IDs,
so it could not recover these five historical claims. That tooling has since
been removed. Future analysis should use tree snapshots and exact tree mappings,
record `GamePacket.rpc_id` for reliable request/response pairing, and preserve
PCAP timestamps rather than replay wall-clock time.

Sources: the supplied PCAP, `data/wuwa-protos/{protos.proto,packetIds.json}`,
and the pinned `wuwa-data` tables `LevelPlayNodeData`, `LevelPlayData`,
`level_entity`, and `blueprint`. Full decoded traffic and temporary analysis
tools were kept outside the repository in
`%TEMP%\mornye-reward-investigation`.
