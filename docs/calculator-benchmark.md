# Manual calculator benchmark

Run from the repository root after installing dependencies:

```sh
bun run bench:calculators
# Shorter smoke measurement:
bun run bench:calculators --samples 10 --budget 200
bun run check:calculator
bun test ./src/lib/calc --timeout 15000
```

The benchmark saves inputs and measurements to `.cache/calculator-migration/`.
It evaluates the preserved shared 240-echo fixture and a new deterministic
240-echo fixture at one and four continuous sections, checks provisional/strict
damage parity, searches Jiyan's own damage and Mortefi's total team damage, then
exercises the app worker protocol in Bun. It uses exact real-stat echoes, fixed
main types, actual weapon/refinement/chain values, and fixed teammates. No timing
threshold is asserted in CI. Search is bounded, not an exhaustive large-inventory
oracle. Small exhaustive correctness fixtures live in `search.test.ts`.

Recorded 2026-11-10 on Windows, Bun 1.4.4, Intel i9-12900K:

| Current 240-echo fixture | Median evaluation |
| --- | ---: |
| One section, provisional | 1.02 ms |
| One section, validated | 3.27 ms |
| Four sections, provisional | 2.58 ms |
| Four sections, validated | 14.88 ms |

With the production budget of 1,500 candidates, own/support searches evaluated
1,494 builds each in 4.28/4.01 seconds and returned ten feasible builds. Catalog
construction plus the first validated evaluation took 206 ms. A fresh Bun worker
plus validated evaluation took 351 ms. These include different costs and should
not be substituted for one another. See [raw current results](benchmarks/migration-results.json).

The [historical fixture](benchmarks/legacy-fixture.json) preserves the identical
echo inventory, sampled builds, and fixed teammates originally supplied to both
engines. [One-section results](benchmarks/legacy-results.json) and
[four-section results](benchmarks/legacy-four-cycles-results.json) pin both
calculator revisions and record environment/methodology. The current benchmark
converts those exact echoes to app DTOs and reruns them with the production
adapter. Some historical builds fail the new four-section ER checks. Historical
damage and speed are not correctness expectations: rotations, validation work,
and scoring semantics differ. The old calculator is not a production dependency
or a second executable benchmark backend after cutover.

The [production-browser smoke record](benchmarks/browser-results.json) covers
headless Chromium with synthetic account IPC: both objectives completed, progress
arrived, cancellation/restart worked, and changing the target cleared stale
results. Cancellation reached the next UI frame in about 7 ms. The runs had
background test/benchmark activity, so their timings are indicative. Native
WebView timing remains unmeasured.

For browser/native checks, use a synthetic account with the Verina → Mortefi →
Jiyan fixture, select its Heron profile, and verify both objectives, baseline ER,
progress, cancellation/restart, filters and stale-result invalidation. Measure
worker startup separately from steady-state evaluation/search. Inspect the UI
without enabling or sending equipment commands. Bun worker measurements do not
establish Tauri WebView timing; repeat on a native build before tuning the budget
for another machine.
