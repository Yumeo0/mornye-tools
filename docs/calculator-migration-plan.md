# Calculator migration plan

Status: implemented, 2026-11-10. See [implementation and validation](calculator-migration.md)
for the shipped behavior, validation, and remaining native WebView check.
The sections below preserve the design and its acceptance criteria.

Replace `thewuwacalculator` with
[`Riley31415/wuwa_calc`](https://github.com/Riley31415/wuwa_calc) as the simulation
backend. Keep inventory search, account translation, and optimizer UI owned by
Mornye. Use one production backend after cutover; do not build a general plugin
system or retain the old engine as a fallback.

## Scope and decisions

- Preserve the current own-damage optimization and support optimization modes,
  filters, baseline comparison, result limits, cancellation, and echo equipment
  workflow. Both modes still change one character's five echoes per run.
- Change support mode's objective to maximize total team damage, including the
  optimized support's own damage and every teammate's damage. Only the selected
  support's five echoes change; teammates' builds stay fixed.
- Run Riley's timed team simulation for either objective. Own-damage mode reads
  the optimized character's damage; support mode reads the team's total damage
  over the same authored scenario. Scores will change because rotations, combat
  mechanics, and the support objective change.
- Simulate every team member at character level 90 with max skills and a
  max-level weapon, including the equipped baseline. Keep actual resonance chains
  and weapon refinements, with supported overrides. Echo levels and rolled stats
  remain those of the actual owned echoes. Account progression is not modified.
- Derive minimum ER from the selected team's actual rotation and energy flow.
  Remove the editable minimum-ER value and guide-based ER defaults. Only builds
  that can pay every scheduled energy spend for the whole team are valid results.
- Fix each member's main echo to the single echo type declared by the selected
  rotation profile. Search among eligible owned copies of that type for slot one;
  the instance UID and stats may vary, but the type may not. An echo used in the
  rotation, such as Phrolova's, must match the equipped main echo exactly.
- Offer all premade teams from Riley's `src/resonators/teams.ts` that contain the
  selected character in any slot, including support slots. Selecting a team loads
  its authored loadout/rotation variants and preserves its original slot order.
  Team browsing and manual selection are part of this migration.
- Missing resonators are acceptable for this migration. Unsupported characters,
  weapons, echoes, or team rotations must produce actionable explanations rather
  than zero scores, substituted builds, or a single-skill fallback.
- Defer simultaneous allocation across characters, automatic team selection,
  rotation editing/search, new resonators, and GPU acceleration. Leave
  architecture seams for these without exposing new modes.
- Keep account persistence, profile routing, capture, and the Rust backend out of
  scope. Retain existing independent echo ratings and guide data.

Riley models action/hit timing, swaps, cooldowns, buff expiration, resources,
openers, and repeated cycles. The current calculator supports ordered rotation
nodes and conditions but does not provide the same combat clock. More detailed
simulation is useful, but upstream placeholder timings still require validation.
Copying each character's guide rotation is a starting point: the composed team
must also have valid energy, Concerto, swaps, and buff timing.

Full team simulations require bounded local search rather than retaining the
old compiled scorer's large candidate space. Search quality and responsiveness
need separate validation.

## 1. Establish the compatibility contract

Inventory the current surfaces in `src/lib/calc/`, `useOptimizerTeam`,
`useOptimizerRun`, and the optimizer components before changing dependencies.
Record representative own-damage and support runs as fixtures, including input
UIDs, filters, overrides, baseline, main echo, and result/equipment behavior.

Resolve these compatibility requirements before production cutover:

| Surface                       | Migration decision                                                                                                                                                                                                                                                                                                                                                                                                         |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Character/weapon progression  | Assume character level 90, max skills, and maximum weapon level for all team members and baseline/candidate scores. Riley's maximum-progression model is acceptable. Remove character-level and weapon-level optimizer controls and ignore their saved overrides; show these fixed assumptions in the optimizer. Lower account levels do not prevent optimization. Preserve actual account progression outside simulation. |
| Chains and weapon refinements | Translate actual values and overrides; select the rotation variant valid for that chain level.                                                                                                                                                                                                                                                                                                                             |
| Support objective             | Replace selected-teammate scoring with total team damage while searching only the selected support's echoes. Invalidate old support scores and remove the measured-teammate selection from this mode.                                                                                                                                                                                                                      |
| Effect controls               | Retain controls that map to genuine scenario inputs. Let the simulator derive triggered buffs, stacks, and expiration. Replace incompatible force toggles with an explicit unavailable explanation; never forward old control keys blindly.                                                                                                                                                                                |
| Rotations                     | Use stable app-owned IDs mapped to authored Riley rotations. Validate team order and compatibility; do not persist upstream registry indexes. Old rotation selections require explicit mapping or reselection.                                                                                                                                                                                                             |
| Premade teams                 | Use the exported `ALL_TEAMS` registry as the team catalog. Include every entry containing the selected character, with distinct loadout/rotation variants retained. Do not restrict to the website's `PRIMARY_TEAM` representatives or hide unowned teams. Show availability and incompatibility reasons separately from catalog inclusion.                                                                                |
| Main echo                     | Each rotation profile declares one required main-echo type per member using a stable catalog ID, including distinct normal/nightmare variants. Validate it against authored echo actions. Optimize eligible owned copies of that type in slot one; never substitute another type during search.                                                                                                                            |
| Energy                        | Replace manual minimum ER and guide defaults with simulation-derived requirements for each member. Enforce energy feasibility over the selected authored scenario for every candidate. Display actual versus required ER and shortfalls; never generate extra ER rolls or silently repair an account build.                                                                                                                |
| CPU/GPU preference            | Migrate the saved preference to the new CPU search and remove the unavailable GPU selector. Retain the saved results limit.                                                                                                                                                                                                                                                                                                |
| Result stats                  | Define whether displayed stats are unbuffed panel values or a named snapshot. Do not present a timed fight's changing stats as one unexplained final stat line.                                                                                                                                                                                                                                                            |

Any engine changes belong in a separate upstream contribution or maintained
upstream fork, then a pinned revision. Do not patch vendored source in place.
Non-max progression support is outside the migration scope; no engine extension
for actual character levels, skill levels, or weapon levels is required.

**Done when:** supported configurations, control mappings, changed semantics, and
known exclusions are documented and covered by representative fixtures.

## 2. Introduce an app-owned simulation boundary

Add narrow contracts under `src/lib/calc/` and move UI/hooks off upstream types.
Suggested responsibilities:

- `types.ts`: immutable echo/build/team/scenario DTOs, capability descriptions,
  simulation results, search requests, and progress/results.
- `translate.ts`: account IDs and actual inventory values to those DTOs, with
  structured translation errors and original echo UIDs preserved.
- `calculator/engine.ts`: the only production module importing upstream engine code; registry,
  premade-team catalog projection, gear construction, scenario execution, and
  result normalization.
- `simulation.worker.ts`: worker protocol and isolated evaluator lifecycle.
- `optimizer.ts`: candidate selection, legal builds, deterministic search, and
  objective selection. Reuse suitable logic from `teamOptimizer.ts`.

Represent a scenario with team members, fixed builds, enemy settings, stable
rotation profile ID, and versioned opener/cycle/resource and maximum-progression
assumptions. Normalize character level, skills, and weapon level before baseline
or candidate evaluation. A search request separately identifies mutable members
and the scoring objective: either
`memberDamage` with a member ID for own-damage mode, or `teamDamage` for support
mode. Initially the mutable-member list must contain exactly one member. Support
mode needs no measured-member ID. Do not couple team membership to which build is
being optimized.

Include a `requiredMainEchoTypeId` for each member in the rotation profile and
resolved scenario. Validate this contract against the rotation's echo actions
before evaluation. Profiles without an echo action still pin one main-echo type
for passive effects; type selection belongs to the profile, not candidate search.
Changing this requirement changes scenario identity and invalidates cached scores.

Project the upstream team registry into app-owned serializable team descriptors.
`ALL_TEAMS` already expands slot alternatives, removes duplicate resonators, and
deduplicates identical ordered loadouts/roles; do not reimplement its private
`TEAMS` expansion or use the website's collapsed support grouping. Index descriptors
by account character ID to include teams where the selected character is either
a DPS or a support. Keep separate loadout variants of the same character, such as
Phrolova's different rotation lengths, and retain the per-slot `mdps` role flags.

Build persistent team IDs from the ordered declared `Loadout.id` values and role
flags, with an app catalog version. The declared loadout IDs are distinct from
upstream's encounter-order IDs and `t<index>` keys; never persist those indexes.
Resolve IDs again after upstream updates and explain removed profiles rather than
silently choosing a different team. Keep upstream imports and object identities
inside the adapter/worker; send only descriptors to the UI.

Each selectable profile combines the team/loadout identities with compatible
fixed main-echo types. If an upstream loadout offers multiple main-echo types,
expose explicitly named compatible profile variants, each pinning exactly one
type per member. Validate these against the authored echo actions and team
prerequisites; do not search across types within a run or copy theoretical gear
choices into actual account builds.

Return per-member damage, total damage, simulated duration, resource feasibility,
and diagnostics from evaluation. Keep objective selection outside simulation;
support the member-damage and team-total objectives at cutover. Team total is the
sum of all members' attributed damage, including the support and off-field hits,
counting each hit once. Use total damage over the fixed scenario rather than
silently switching to DPS. Additional objectives can reuse the engine adapter.

### Derive ER from the rotation

Return each member's required constant/panel ER, actual constant/panel ER, and
energy feasibility, with the limiting spend or cycle for diagnostics. Riley's
energy-window tracking (`TeamMember.erWorst`/`erWants` in `engine/state.ts` and
`engine/evaluate.ts`) already measures what scheduled spends require, accounting
for shared energy, flat gains, timed ER buffs, and capped energy banking. Reuse
that engine logic through the adapter. Do not call solver helpers that add ER
rolls or assume their cached guesses are the final measured requirement.

Use the modeled base ER as the lower bound (normally 100%). Keep any separate
kit/loadout stat floor explicitly identified: an ER target for maximizing a buff
is not the ER needed to cast the rotation. Show the rotation requirement and any
separate enforced kit constraint distinctly.

Measure over the full authored opener and repeated cycles, with the profile's
fixed initial resources. For the initial default scenario, use the opener plus
three repeat cycles, matching Riley's normal four-section run. Do not validate
only a full-energy opener or refill energy between cycles. Describe the result
as sufficient for that modeled scenario, not proof of indefinite sustain.

Requirements can change with team composition, loadout/rotation variant, chains,
weapons/refinements, main echo, set effects, and energy-related candidate gear.
Recompute or reuse a demonstrably equivalent measurement for each candidate;
include these dependencies and scenario resource assumptions in cache identity.
A preliminary displayed requirement from the equipped build is informative, not
a universal scalar threshold for all searched builds. A candidate must satisfy
every member's measured energy requirements and action resource checks with its
actual gear; ER cannot repair a Concerto, Forte, or timing failure. Treat a spend
that cannot be funded at any attainable ER as infeasible, even if an upstream
diagnostic returns a zero/sentinel requirement. Do not turn incomplete runs into
valid scores.

Use plain serializable messages across the worker boundary. Construct Riley's
Gear objects and closures inside the worker. Its ambient module-global context
requires serial execution within each worker and a fresh fight State for every
evaluation. Do not overlap asynchronous simulations in one engine instance.

**Done when:** components and hooks consume app-owned contracts, and worker
messages contain no upstream class instances or runtime objects.

## 3. Integrate Riley with exact account builds

Add a pinned `wuwa_calc/` submodule using the requested repository. Start from the
reviewed commit `7bcbb24ea8c3ef873a8479fcd99d25dd305d8a1f`, updating the pin
deliberately if compatibility work requires it. Keep the old dependency only
while the migration branch is being developed.

Use a small app-owned source entry to import the engine and selected registries;
let TypeScript/Vite build the worker. Riley currently has no reusable package
exports. Avoid importing its website/solver entrypoint or registering upstream
website worker handlers. Smoke-test this packaging early in a production build.

Use an app-owned adapter that supports multiple sets and species:

- Map character, weapon, echo species, sonata, and stat IDs explicitly.
- Equip actual main stats and substats, including secondary flat stats, with
  correct units and per-echo rounding. Do not use theoretical substat spreads or
  Riley's automatic ER-spread adjustment.
- Apply kit, weapon, unlocked sequences, main-echo passive, and set effects once.
  Count distinct species for set activation according to game rules. Distinct
  echo UIDs alone do not establish distinct species.
- Enforce five unique owned echoes and the cost ceiling. Slot one must match the
  profile's required main-echo type, including for fixed teammates. Apply active
  echo actions and main passives from that same type. Passive-slot permutations
  are the same build.
- Apply the fixed level-90/max-skills/max-weapon-level assumptions to every
  member. Translate enemy settings, actual chains/refinements and their supported
  overrides, and scenario controls through the compatibility contract. Preserve
  actual echo levels and rolled stats.
- Run a complete authored team scenario. Fix its cycle count and initial-resource
  policy for the whole search, including the equipped baseline. Store these
  assumptions with results so scores from different scenarios are not mixed.
  Read rotation-derived ER requirements without modifying supplied echo stats.
  Verify all members' actual resource availability before accepting its score.
- Preserve the registry's ordered slots and opener behavior when selecting the
  optimized character; do not move that character into the first simulation slot.
  Choose each loadout's chain-appropriate rotation and revalidate compatibility
  for the selected profile and actual builds.
- Attribute hits to the correct member, including coordinated/off-field damage.
  Invalid resource execution is an infeasible candidate with diagnostics, not an
  apparently valid high damage score.

**Done when:** fixture builds reproduce expected panel stats and effects, support
gear changes can affect team-total scoring, and A → B → A evaluations return
the same result without mutating input builds.

## 4. Replace inventory search with bounded worker search

Build one search implementation for both planned objectives. Riley's solver is
for predefined build choices and theoretical stats; it cannot replace actual
account inventory allocation directly.

1. Apply existing inventory, set, main-stat, substat, equipped-item, and echo-level
   filters. Create a dedicated slot-one pool containing only eligible owned
   copies of the profile's required main-echo type. Keep this pool separate from
   general candidate-pool truncation so required copies are not lost to rankings
   intended for passive slots. If no eligible copy remains, explain whether the
   echo is missing or excluded by filters; do not substitute a type or bypass
   filters silently. Keep the equipped build available for baseline scoring even
   when it falls outside search filters, provided it satisfies the rotation's
   main-echo requirement. An incompatible equipped main echo has no comparable
   baseline score under that profile; show why rather than simulating an echo
   action it cannot perform or silently reordering equipped slots.
2. Enforce legal build constraints and rotation-derived ER feasibility for the
   complete candidate team. Do not prune against a stale equipped-build or guide
   ER value. Rank candidate pools with role-appropriate heuristics so support
   ER/HP/healing-related choices are not discarded by personal-damage weights.
   Include ER-capable seeds and search moves across infeasible candidates so a
   deficient starting build does not prevent finding a feasible one. Only feasible
   builds enter ranked results. A fixed teammate's baseline energy deficit may
   be repaired by the searched support's energy effects; judge each complete
   candidate rather than rejecting the whole search from that baseline alone.
   Expose any pool truncation and explain when no feasible build was found.
3. Seed with equipped and guide-based builds plus deterministic restarts. Search
   single-echo substitutions, including different owned copies of the fixed
   main-echo type; add legal paired moves where single swaps cannot reach another
   set or cost layout. Seeds and every search move must preserve the slot-one
   type requirement and UID uniqueness across all five slots.
4. Cache evaluations by canonical build and scenario identity, retain top-K
   distinct builds, and score baseline/results using the same exact evaluator.
   Include engine revision and scenario version in any reusable cache key. Cache
   raw evaluation metrics independently of objective; include objective identity
   in any cached ranking or scalar score to avoid mixing own/team results.
5. The implemented default is 1,500 provisional evaluations, with strict validation
   of published results. Bun and browser worker measurements are recorded separately;
   native WebView tuning remains a manual check; do not inherit the packed
   optimizer's 160-echo limit or claim exhaustive optimality.
6. Report evaluated candidates, elapsed time, budget, and best-so-far results.
   Show completion/budget exhaustion as search status, not percentage of all
   possible inventory combinations searched.
7. Yield between bounded batches for progress and cooperative cancellation; allow
   worker termination when needed. Tag requests with run ID, profile ID, and
   inventory revision. Discard stale results after profile or build changes.

Retain original UIDs and reserve fixed teammates' echoes under the existing
equipment-availability policy. Keep allocation validation separate from scoring
so future multi-member search can enforce team-wide exclusivity. Do not implement
that search now.

**Done when:** both modes produce legal reproducible results, preserve baseline
comparison, cancel promptly, and never apply results to another account revision.

## 5. Rewire the existing optimizer UI

Update `useOptimizerTeam`, `useOptimizerRun`, `OptimizerTab`, loadout/effect forms,
run controls, and result components to the new service. Preserve filters,
main-echo ordering, deduplication, baseline rows, and the current equipment flow.

Show capability errors before starting a run. Explain the selected rotation
profile and score meaning: own-damage mode measures the optimized member;
support mode measures total team damage while changing only the support's build.
Remove the support mode's measured-teammate selector, retaining team composition
controls through the premade-team selection. Show team-total baseline, result
damage, and improvement in support mode, and invalidate results produced with
the old selected-teammate objective.
Display the profile's required main echo as a fixed type, with the selected owned
copy in results. Explain missing/filtered copies and incompatible equipped
baselines. Reject fixed teammate builds that violate their own main-echo
requirements before search starts.
Do not carry the old first-skill fallback into missing rotation handling. Migrate
saved settings without changing stored account data; invalidate stale engine
results and incompatible rotation/control selections explicitly.

Show the fixed level-90, max-skills, and max-weapon-level assumptions alongside
the scenario. Remove character/weapon level controls and discard saved overrides
for those controls. Retain chain/refinement controls and echo-level filters. A
baseline means the currently equipped echoes evaluated at the same assumed
maximum progression as candidates, rather than current in-game damage.

Replace the manual minimum-ER input with a read-only rotation requirement and
actual-versus-required ER status. Remove guide ER initialization and discard old
saved manual minimum-ER settings; keep other inventory filters. Refresh the
requirement when the selected team, rotation, loadout, or energy-related gear
changes, and show each result's own measured requirement. Explain deficits for
all affected members. An infeasible baseline has no valid damage/improvement
comparison; show its deficits while allowing search for a feasible build.

For the selected character, show all matching Riley premade teams in both modes,
including teams where the character is a support. Label teammates, roles, and
loadout/rotation variants so otherwise identical compositions are distinguishable.
Use `VirtualGrid` if the chooser becomes a long list. Do not hide interchangeable
support alternatives behind the website's default representative. Show unowned
or incompatible teams with reasons, and disable running until missing members,
actual builds, or required main echoes are resolved; do not fabricate inventory.

Selecting a team sets its composition, ordered rotation profile, and fixed
main-echo requirements while retaining the selected optimization target. Resolve
teammates from their account builds and supported explicit overrides. Team
composition edits must resolve to another supported premade profile; arbitrary
new team rotation composition remains future work. Keep Tethys guide data for
recommendations, but use Riley's registry as the authority for runnable premade
teams. Manual team selection does not benchmark, rank, or optimize across teams.

Keep additional objective modes and rotation authoring out of the UI. Future
objectives can read additional evaluator metrics; simultaneous whole-team build
optimization can expand the mutable-member set and allocation search while
reusing the team-total objective, account translation, and UI-facing simulation
types.

**Done when:** the existing own/support workflows work in browser and desktop,
including errors, cancellation, saved settings, result selection, and equipment
UID validation. No upstream types escape the adapter.

## 6. Remove the old build and data dependencies

Before deleting the old submodule, remove every non-simulation dependency on it:

- Replace calculator-provided catalog/progression metadata with app-owned compiled
  data sourced from the existing game-data checkouts where needed. Keep display
  names, icons, and IDs independent from simulation roster coverage.
- Replace weapon icon sources in `scripts/lib/public-assets.ts`; verify the
  `/images/weapons/<id>.webp` catalog paths still resolve after regeneration.
- Remove `@wuwacalc/core`, its lockfile entries, `build-calc-core.ts`, and
  `sync-calc-data.ts` once all consumers are replaced. Remove old `/data/live`
  fetching and copying only after checking remaining consumers.
- Update postinstall, `.gitmodules`, release checkout steps, source/formatter
  exclusions, setup docs, and `AGENTS.md`. Treat the new upstream tree as vendored.

**Done when:** a fresh checkout can initialize submodules, install, regenerate
required assets/data, and build without the old tree, old `node_modules` output,
or stale `public/data/live`. Historical documentation may still name the old
engine; runtime imports and build paths may not.

## 7. Validate and cut over

Required checks:

- Translation fixtures: flat/percent units, rounding, chains/refinements,
  main passives, duplicate-species set behavior, unknown IDs, and legal costs.
- Progression-assumption fixtures: lower-level account characters and weapons
  normalize to level 90/max skills/max weapon level for all members and the
  baseline. Old character/weapon level overrides do not affect scores, while
  chains, refinements, echo levels, and actual echo stats still do. Stored account
  progression remains unchanged.
- Main-echo fixtures: an owned copy of another type with stronger stats must never
  enter slot one; multiple copies of the required type remain eligible and can
  replace each other. Cover normal/nightmare IDs, matching authored echo actions,
  required copies surviving general pool truncation, no eligible copy, fixed
  teammate mismatch, and an incompatible equipped baseline.
- Team-catalog fixtures: all matching `ALL_TEAMS` entries are discoverable for a
  selected character in any slot, including non-primary support alternatives.
  Preserve distinct loadout variants, slot order, role flags, stable selection
  across registry reordering, and clear handling of removed profiles. Show
  unavailable teams with reasons. Verify selection keeps the optimization target
  and uses the correct opener, chain-dependent rotations, and fixed main echoes.
- Simulation fixtures: state isolation, damage ownership, buff timing, support
  scaling, derived minimum ER, and insufficient-resource scenarios. Use deterministic
  expectations tied to the pinned engine and inspect representative hit traces.
- ER fixtures: reject a build that passes a full-energy opener but fails a later
  repeat; validate the boundary at the computed requirement with a documented
  numeric tolerance. Cover teammate energy sharing, flat restoration, timed ER
  buffs, energy caps, weapon/main-echo/set changes, separate kit floors, and
  impossible spends. Verify all team members, including fixed teammates, are
  feasible for a ranked build. Old manual/guide ER values must not affect search,
  and no imaginary ER rolls or between-cycle refills may be added. Include an
  initially infeasible baseline for which search finds a feasible build, including
  a support build that resolves a fixed teammate's deficit.
- Support-objective fixtures: assert team total equals the sum of all members'
  attributed damage, including support and off-field hits without double counting.
  Include candidate builds where maximizing one teammate selects a different
  winner from maximizing team total; require support mode to choose the team-total
  winner while leaving teammates' gear fixed. Verify baseline and result gains
  use that same objective and scenario.
- Small inventory fixtures with exhaustive enumeration under Riley as an oracle.
  Include alternate copies of the required main-echo type, set transitions, and a
  support-sensitive case, with the same slot-one constraint in the oracle.
  Require the chosen production search to find the oracle optimum on these
  curated fixtures; document that this does not guarantee a large-space optimum.
- Measure the actual worker in browser and Tauri WebView. Confirm progress stays
  responsive and cancellation is acknowledged within 250 ms on the recorded test
  machine, using termination if necessary. Set search budgets from these runs;
  keep wall-clock performance checks manual rather than flaky CI assertions.
- Exercise both modes, filters, saved setting migration, unsupported builds,
  profile/inventory changes during runs, baseline/result ordering, and equipment
  UID preservation. Do not send active game mutations merely to test simulation.
- Run focused calculator/hook tests, `bun test ./src ./scripts --timeout 15000`,
  and `bun run build`; verify release packaging from a clean environment.

Do not require old/new damage equality: their rotations and simulation semantics
differ. Validate actual gear and mechanics, and describe material score changes.
Do not claim new roster/rotation accuracy beyond the inspected fixtures.

Cut over only after maximum-progression normalization, control compatibility,
search quality, worker behavior, and clean installation gates pass. Remove the old dependency
and temporary comparison wiring in the final change. A code rollback restores
the prior calculator without requiring an account-data migration.

## Suggested implementation sequence

1. App-owned contracts, fixtures, and compatibility inventory.
2. Pinned Riley source integration, worker, and actual-echo adapter with fixed
   maximum-progression assumptions.
3. Shared bounded inventory search and objective wiring.
4. Existing UI/settings migration and browser/desktop validation.
5. Independent data/assets, old-engine removal, clean CI/release validation.

Each step should leave the application buildable. The first two steps should
settle packaging and simulation correctness before investing in search tuning or
UI conversion. The migration is complete when the current workflows use Riley
alone with support mode scoring total team damage; additional objectives and
simultaneous whole-team build search remain separate projects.
