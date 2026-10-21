# AGENTS.md

Wuthering Waves desktop companion: Tauri v2 (Rust) + React 19/TypeScript (Vite)
+ Tailwind v4. The Rust backend passively sniffs the game's UDP traffic and
drives the in-game overlay window.

## Setup gotchas

- Use `bun run dev` / `bun run build`, never raw `vite`: the `postinstall`
  hook builds the `thewuwacalculator` submodule's `@wuwacalc/core` and syncs
  live game data into the gitignored `public/data`. Both are hard
  requirements, so `bun install` fails outright without an initialized
  submodule; on failure run `git submodule update --init` and install again.
- Rust builds need `protoc` (the vendored `spectrum` crate compiles pinned
  protos).
- On Windows the app must run elevated for raw capture.

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

- The sniffer fills one game-ID-based `account.json`; the overlay scan only
  reads it and never writes. Keep the two data paths separate.
- Never edit vendored or generated code: `src-tauri/crates/spectrum/`
  (including generated protos), `thewuwacalculator/`, `data/` checkouts.
- The main window lives in `src/pages/MainWindow.tsx` (tab shell with
  Characters / Echoes / Weapons / Optimizer / Settings tabs in
  `src/components/tabs/`); the overlay is a separate Vite entry
  (`overlay.html` → `overlay-main.tsx` → `src/pages/Overlay.tsx`).
- UI primitives in `src/components/ui` are Base UI + Hugeicons (shadcn
  "base-lyra" style), not Radix.
- Long lists use `src/components/VirtualGrid.tsx` (TanStack React Virtual),
  not plain `.map()` grids.
- `bun run dev` also serves the UI in a plain browser with Tauri APIs
  degraded — handy for UI work without Rust.

`docs/DEVELOPMENT.md` documents the sniffer/overlay protocol in depth.