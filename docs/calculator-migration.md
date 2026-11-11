# Riley calculator integration

The optimizer now uses the pinned `wuwa_calc` revision
`7bcbb24ea8c3ef873a8479fcd99d25dd305d8a1f`. The old calculator, its npm package,
runtime JSON, and icon dependency have been removed. Account storage and the Rust
backend are unchanged.

## Behavior

- Start with **Load rotation**. The floating browser lists all authored profiles
  and filters by character, that character's DPS/support role, team ownership,
  model compatibility, and text (including variants and main echoes). After
  loading a rotation, select an optimization target using its character portraits.
  Switching targets keeps the rotation; loading a different rotation clears the
  target and previous results. Simulation assumptions are available from the
  header info icon on hover or keyboard focus.
- Own damage measures the selected character. Support mode measures total team
  damage while changing only the selected character's echoes.
- All matching `ALL_TEAMS` entries are available, including support alternatives
  and distinct rotations. Unowned or incompatible profiles remain visible with
  explanations. Slot order and authored chain-dependent rotations are preserved.
- Every profile fixes one main echo type per member. Search may replace its owned
  copy, but cannot change the type. Normal and nightmare forms are distinct.
- All characters use level 90, maximum skills and maximum weapon level. Actual
  chains, refinements, echo levels and rolled stats are retained. Chains and
  modeled weapons/refinements may be overridden without editing account data.
- Owned teammates have an **Echoes** selector: **Equipped** (default)
  or **Rotation stats**. For example, optimize Phrolova's inventory while
  Shorekeeper and Lucilla use rotation stats without equipped echoes. Ownership,
  selected weapon, refinement, chain and fixed main echo still apply. The target
  always uses owned echoes, including after changing the selected target.
  Weapons, equipped echoes and the fixed main echo are shown as images. The info
  icon beside the echo selector explains rotation stats and shows their panel stats.
- Rotation stats use Riley's authored echo sets, main stats and normal ChemX32
  substat templates. A bounded three-pass coordinate search selects templates for
  team damage, promoting ER within the available substat tiers to meet rotation
  and kit requirements. A theoretical target anchors this preparation; its stats
  are discarded afterward. Teammate templates are fixed for the baseline and all
  inventory candidates, which still undergo strict team-wide validation. These
  templates are theoretical assumptions, not guaranteed global optima or owned
  equipment; they neither reserve inventory nor appear in equip actions.
- The scenario is a continuous full-energy opener followed by three repeats,
  against Riley's level-100, 20%-RES enemy. Resources are never refilled between
  sections. Timed buffs and effects come from the simulation.
- Each candidate measures every member's required ER from the rotation. Kit ER
  floors are separate. Strict validation rejects resource/buff failures and
  incomplete simulations. This establishes feasibility for the modeled scenario,
  rather than indefinite sustain or fidelity to every in-game mechanic.
- The equipped baseline uses the same scenario. Incompatible or infeasible
  baselines have no damage/gain comparison, but do not prevent searching for a
  feasible replacement. Displayed stats are constant ATK/HP/DEF/CR/CD/ER panel
  values; action-scoped damage bonuses and amplification are omitted.

Old manual ER settings are discarded; other inventory filters and result limits
remain. The former GPU preference resolves to CPU. Manual effect toggles and
arbitrary team construction are unavailable. Joint team echo allocation, rotation
editing, automatic team selection and roster expansion remain future work.

## Implementation

`calculator/engine.ts` is the sole production upstream import boundary. Bun
bundles it into ignored `src/lib/calc/riley/engine.generated.js`; install, dev and
build regenerate it. The production build type-checks the application and bundles
the upstream adapter without a separate upstream TypeScript check. No upstream
source is patched.

The adapter translates exact owned stats into gear, activates sets by distinct
species, applies main passives once, and runs a fresh fight state per evaluation.
Bounded caches include complete build and rotation identities. The worker executes
serially because upstream uses ambient simulation context. Only serializable
app-owned contracts cross the worker boundary.

Inventory search retains eligible copies of the required main independently of
pool truncation, plus set/cost/main-stat diversity and guide-ranked choices. Fixed
teammates using equipped stats reserve their echoes. Rotation-stat teammates do
not reserve echoes; inventory equipment filters still apply. Small spaces are enumerated; larger spaces use
deterministic restarts, single replacements and bounded paired moves, with a
1,500-candidate budget. Progress describes this budget, not the fraction of all
inventory combinations searched. Large-space optimality is not guaranteed.

Provisional evaluations omit expensive trace construction. Before any candidate
appears in progress or final results, it is evaluated again with strict timed
resource/buff checks. Scores always come from the validated evaluation. Workers
are terminated on cancel or scenario/inventory changes. Generation tokens reject
late callbacks; equip actions recheck the current account and inventory revision.
No active game commands are needed to test the simulator.

## Validation

Regression tests cover exact translation and stat units, maximum-progression
assumptions, state isolation, damage ownership, duplicate species, fixed main
echoes, team-wide UID exclusivity, ER boundary and later-cycle deficits, saved
settings migration, pool truncation, strict rejection with lower-score fallbacks, cancellation/budget limits,
and an independently enumerated real-engine support-search optimum.

At migration cutover, the full app/scripts suite passed (314 tests, five platform
skips), along with the TypeScript checks and production build. A clean source export with
only the pinned Riley checkout successfully runs `bun install --frozen-lockfile`
and `bun run build`, without old calculator files, game-data checkouts, generated
output or `public/data`. Production-browser checks covered team browsing, own and support runs, ER
readouts, progress, cancellation and restart with synthetic inventory. Native
Tauri/WebView and live equipment application are manual checks; no game mutations were sent.

See the [production-browser smoke record](benchmarks/browser-results.json).
