# Mornye Tools - AI Coding Instructions

## Project Overview

Tauri v2 desktop application with React 19 frontend. **Dual-window architecture**: a settings window (`index.html`) and a fullscreen click-through overlay (`overlay.html`) controlled by the settings window.

## Tech Stack & Runtime

- **Frontend**: React 19 + TypeScript + Vite (multi-page build)
- **Backend**: Rust with Tauri v2
- **Runtime**: Uses **Bun** (not npm/yarn) - see `tauri.conf.json` `beforeDevCommand`/`beforeBuildCommand`
- **UI**: Base UI (@base-ui/react) components with Tailwind CSS v4 and shadcn-style patterns
- **Icons**: HugeIcons library (@hugeicons/react)
- **Linting/Formatting**: Biome (tab indentation, double quotes)

## Architecture

### Multi-Window Pattern

Two separate entry points defined in [tauri.conf.json](../src-tauri/tauri.conf.json):

1. **Settings Window** (`label: "settings"`)
   - Entry: [index.html](../index.html) → [src/main.tsx](../src/main.tsx) → [src/pages/App.tsx](../src/pages/App.tsx)
   - Normal window with decorations, visible by default
   - Controls the overlay window via `getAllWindows()` and `show()`/`hide()`

2. **Overlay Window** (`label: "overlay"`)
   - Entry: [overlay.html](../overlay.html) → [src/overlay-main.tsx](../src/overlay-main.tsx) → [src/pages/Overlay.tsx](../src/pages/Overlay.tsx)
   - `transparent: true, decorations: false, alwaysOnTop: true, focusable: false`
   - **Critical**: Uses `setIgnoreCursorEvents(true)` to enable click-through behavior
   - Hidden by default, controlled by settings window

### Vite Multi-Page Configuration

[vite.config.ts](../vite.config.ts) uses `rollupOptions.input` with multiple entry points. Fixed port 1420 for Tauri integration.

## Development Workflows

### Commands

```bash
# Dev mode with hot-reload
bun run dev              # Start Vite dev server
bun tauri dev            # Launch Tauri + Vite together

# Build
bun run build            # Build frontend (TypeScript check + Vite)
bun tauri build          # Full production build

# Format/Lint
bunx @biomejs/biome check --write  # Format and fix with Biome
```

### Debugging

- Rust errors: Tauri console output in terminal
- Frontend: Dev tools in each window (right-click → Inspect)
- Window state issues: Check `getAllWindows()` labels match `tauri.conf.json`

## Code Conventions

### Component Patterns

UI components follow shadcn/ui structure with Base UI primitives:

```tsx
// Pattern: Export primitive + variants + wrapper
import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva("base-classes", {
  variants: { variant: {...}, size: {...} },
  defaultVariants: { variant: "default", size: "default" }
})

function Button({ className, variant, size, ...props }: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return <ButtonPrimitive className={cn(buttonVariants({ variant, size, className }))} {...props} />
}

export { Button, buttonVariants }
```

All UI components in [src/components/ui/](../src/components/ui/).

### Styling

- Tailwind CSS v4 with CSS variables in [src/index.css](../src/index.css)
- Theme: `baseColor: "stone"` from [components.json](../components.json)
- Utility: `cn()` from [src/lib/utils.ts](../src/lib/utils.ts) for class merging

### Path Aliases

Configured in [vite.config.ts](../vite.config.ts) and [components.json](../components.json):
- `@/` → `src/`
- Import components: `@/components/ui/button`

### Tauri Commands

Add new Rust commands in [src-tauri/src/lib.rs](../src-tauri/src/lib.rs):

```rust
#[tauri::command]
fn my_command(arg: &str) -> String {
    // implementation
}

// Register in invoke_handler
.invoke_handler(tauri::generate_handler![greet, my_command])
```

Call from frontend:

```ts
import { invoke } from '@tauri-apps/api/core';
await invoke('my_command', { arg: 'value' });
```

## Key Files

- [tauri.conf.json](../src-tauri/tauri.conf.json) - Window configuration, bundle settings
- [vite.config.ts](../vite.config.ts) - Multi-page build, aliases
- [components.json](../components.json) - shadcn/ui configuration
- [biome.json](../biome.json) - Code style rules (tabs, double quotes)

## Common Tasks

**Add new overlay features**: Edit [src/pages/Overlay.tsx](../src/pages/Overlay.tsx). Keep `pointerEvents: 'none'` for click-through; use `pointerEvents: 'auto'` only on interactive elements.

**Add new window**: Update `tauri.conf.json` windows array, create new HTML entry and React component, add to `vite.config.ts` rollupOptions.

**Add UI component**: Use `bunx shadcn add <component-name>` (configured for Base UI in [components.json](../components.json)).

**Window communication**: Use Tauri events (`emit`/`listen`) or commands for cross-window messaging.

**Check for errors**: Always check files for errors after changes
