# AGENTS.md

Wuthering Waves desktop companion: Tauri v2 (Rust) + React 19/TypeScript (Vite)

- Tailwind v4. The Rust backend passively sniffs the game's UDP traffic and
  drives the in-game overlay window.

## Setup gotchas

- Public assets are stored directly in Git; Git LFS is not required.
- Use `bun run dev` / `bun run build`, never raw `vite`: the `postinstall`
  hook bundles the pinned `wuwa_calc` simulation adapter. The generated
  bundle is required, so `bun install` fails outright without an initialized
  submodule; on failure run `git submodule update --init` and install again.
- Rust builds need `protoc` (the vendored `spectrum` crate compiles pinned
  protos).
- On Windows the app must run elevated for raw capture.
- `bun run update:data` refreshes all game data, assets and protocols, selecting
  the newest numbered data release branch automatically. Update the installed
  game first; extraction needs .NET 10 SDK and `protoc`. The client is discovered
  automatically, or selected with `--game <Client directory>` / `WUWA_GAME`.

## Releases

- `v*` tags are built by `.github/workflows/release.yml` **on GitHub**
  (`github.com/Yumeo0/mornye-tools`, mirrored from git.yumeo.dev); the app
  self-updates from that repo's `releases/latest/download/latest.json`.
- Cut releases with `bun release patch|minor|major` (bumps `package.json`,
  `tauri.conf.json`, `Cargo.toml` and `Cargo.lock`, then commits, tags and
  pushes). Never hand-edit those versions.
- The updater's public key lives in `src-tauri/tauri.conf.json`; the matching
  private key is the GitHub secret `TAURI_SIGNING_PRIVATE_KEY` (kept locally at
  `~/.tauri/mornye-tools.key`, no password). The update UI is
  `src/lib/updater.ts` + `src/components/settings/UpdatesCard.tsx`.

## Architecture rules

- Account data is stored per account/server profile under `profiles/`. The
  passive sniffer and the opt-in active session both write through the shared
  converters; the overlay scan only reads the selected profile and never writes.
  Keep profile selection separate from packet routing.
- Never edit vendored or generated code: `src-tauri/crates/spectrum/`
  (including generated protos), `wuwa_calc/`, `data/` checkouts.
- For protocol-tooling work, edit the first-party extractor in
  `data/wuwa-protos/tools/Extractor` and regenerate with
  `bun run update:protos --game <Client directory>`. This also publishes the
  `src-tauri/protocol/` build snapshot. Never hand-edit either set of generated
  protocol artifacts or hard-code packet IDs; use
  `mornye_game_client::message_id`.
- The main window lives in `src/pages/MainWindow.tsx` (tab shell with
  Overview / Characters / Echoes / Weapons / Optimizer / Settings tabs in
  `src/components/tabs/`); the overlay is a separate Vite entry
  (`overlay.html` → `overlay-main.tsx` → `src/pages/Overlay.tsx`).
- UI primitives in `src/components/ui` are Base UI + Hugeicons (shadcn
  "base-lyra" style), not Radix.
- Long lists use `src/components/VirtualGrid.tsx` (TanStack React Virtual),
  not plain `.map()` grids.
- `bun run dev` also serves the UI in a plain browser with Tauri APIs
  degraded — handy for UI work without Rust.

Rust backend crates live under `src-tauri/crates/`: `account`, `game-client`,
`sync`, `connection`, and `overlay`. The desktop entry point only wires them up.
Run Cargo from `src-tauri/`; use `cargo test -p mornye-<crate>` for focused checks.
Format a changed package with `cargo fmt -p <package>`, not `--all` (which can
traverse vendored Spectrum).

`docs/DEVELOPMENT.md` covers setup, releases and architecture.
