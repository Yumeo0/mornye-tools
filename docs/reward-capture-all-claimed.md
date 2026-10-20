# Already-claimed-area capture

Analyzed 2026-10-19:
`C:\Users\Yumeo\Programmieren\wuwa-protos\out\captures\session_all_claimed.pcap`.

This is a login/revisit capture, interpreted using the user's expectation that
the surrounding chests and Tidal Heritages were already claimed. There are no
live reward claims in the decoded traffic. It provides another historical-state
source to investigate, but does not independently enumerate all claimed rewards.

## Coverage and direct observations

- 776 PCAP records, 1,126 decoded game messages. All 1,124 non-key messages
  decoded against the pinned protobuf schema without a payload parsing failure.
- Transport rejected 42 records outside the game's port ranges, nine with a KCP
  CRC mismatch, and nine with an invalid four-byte payload. Capture completeness
  is not established.
- Decoded non-key traffic spans +7.685 to +27.891 seconds from the first PCAP
  record. Frame numbers here are one-based.
- Frame 101: `JoinSceneNotify`, instance/map `8`, player position approximately
  `(-48725.59, 100703.31, 1559.93)` in protocol coordinates.
- No `GetRewardTreasureBoxRequest` / response, `ItemRewardNotify`,
  `LevelPlayRewardRequest` / response, or `LevelPlayRewardNotify`.
- No `LevelPlayGainRewardInfoNotify`, `LevelPlayStateResponse`, or
  `LevelPlayStateListResponse`. Unlike the first capture, this recording does
  not include the map's LevelPlay state queries.

## Active trees do not directly identify claimed rewards here

There are 306 `BehaviorTreeInfoNotify` messages, representing 300 quest trees
and six LevelPlay trees. None of the represented quest/LevelPlay snapshot
nodes has a static `CheckTreasureBeenClaimed` condition. None of the live
LevelPlay node-status updates maps to such a condition either.

The LevelPlay graph IDs are `223800001`, `221800008`, `133000083`,
`109000025`, `109000004`, and `109000026`. For example, graph `133000083`
contains an active kill objective. That does not establish whether its reward
has been claimed. The explicit completed claim-check snapshots found in the
first capture are absent here.

## Login summaries may recover completed treasure groups

Frame 57, +7.903 seconds: `LevelPlayInfoNotify` contains 656 entries,
including 276 with `State=3`. Treat state 3 as a completed-state candidate here;
the protobuf field is an integer rather than a named state enum.

Joining those entries with `LevelPlayNodeData` finds 94 graphs containing
positive singleton `CheckTreasureBeenClaimed` checks. Their referenced reward
placements comprise 395 distinct map/entity pairs: 390 `TreasureBox` and five
`HookTreasureBox`, with no `VisionTreasureBox`. Of these, 352 placements are on
map `8`, 26 on `903`, 12 on `902`, and five on `906`.

These are **candidates from completed graphs**, not 395 independently confirmed
claims. Graph control flow must guarantee that the relevant claim checks had
to succeed before the graph could finish. Do not mark every reward owned by an
arbitrary state-3 graph as claimed: another graph may finish after unlocking a
chest or completing combat.

One useful example is graph `106850004` on map `8`:

- The login summary gives `State=3`, `GetRewardCount=0`.
- Its root is a `Sequence`, including a `ParallelSelect` with `Count=1`.
- That selector has a `ParallelSelect` branch with `Count=0`, containing four
  singleton claim checks, plus an `AlwaysFalse` helper branch for scanner use.
- The four checks reference `106850043`, `106850040`, `106850041`,
  and `938850395`.

If the client semantics confirm that `Count=0` requires all children to finish,
and state 3 denotes successful completion, this graph shape permits recovery of
all four historical claims. Validate those semantics and completion paths before
promoting the candidate set to confirmed data. It also illustrates why
`GetRewardCount=0` is not sufficient to conclude that no chests were claimed.

## Two chest entities still stream

Frame 105, +8.021 seconds: `EntityAddNotify` includes:

- Runtime `76666` -> static `111700637`, map `8`, `Treasure004`,
  `TsEntity_标准物资箱_初始可开4`, position
  `(-40224.84, 117535.53, 3547.61)`.
- Runtime `76668` -> static `111700638`, map `8`, `Treasure001`,
  `TsEntity_简易物资箱_初始可开20`, position
  `(-38809.99, 114927.75, 1230.12)`.

Both classify as `TreasureBox` in `blueprintconfig.json`. They are sent as
visible, actor-visible, alive, `EntityState_Default`, `OwnerIncId=0`, and
`StateTagId=2096634051`. Their only common entity tag is `2096634051`.
No explicit claimed/opened flag appears in their decoded components.

That state tag also occurs on the heritage entity that spawned in the first
capture, where no claim was recorded. It is therefore not evidence for a
universal claimed marker. The packets alone do not settle whether these two
particular chests were previously claimed. They are also farther from the join
position than several absent static chests, so a statement about rewards at the
player's immediate location need not include them.

No `VisionTreasureBox` placement is observed in this capture. Missing heritage
spawns are consistent with the user's cleared-area expectation, but streaming
and gameplay gates still prevent absence alone from proving a claim.

## Other state sources

- `TreasureChestCountNotify` again has 43 aggregate entries, all with
  `CurrentCount=0`; these target other area IDs rather than supplying the local
  claimed entities.
- `MapMarkInfoNotify.CompleteMarkIds` is empty. Its entity-mark list has a
  single template/location entry, not a claimed-chest list.
- `JoinSceneNotify.SceneInfo.OwnerFinishMingSuGens` and AOI `GenIds` are empty.
- `ExploreProgressResponse` contains aggregate category progress rather than
  per-reward claim identities.

The useful extension to the first report is therefore completed-graph analysis
from `LevelPlayInfoNotify`, alongside direct tree-node and successful reward-RPC
evidence. It needs graph-specific logical validation and does not yet resolve
generic Tidal Heritage history.

Temporary decoded traffic, verification scripts, and
`completed-graph-candidates.json` are under
`%TEMP%\mornye-reward-investigation\all-claimed`. No gameplay feature was changed.
