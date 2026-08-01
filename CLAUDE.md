# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A web-based isometric factory-building game (Factorio/Satisfactory-inspired) built with Next.js, React Three Fiber, and TypeScript. Monorepo with two npm workspaces:

- `apps/game/` — the game itself (Next.js 16, React 19, Three.js, Zustand, XState)
- `apps/tools/` — standalone dev tools, e.g. the Skill Tree Editor (Vite)

## Commands

Run from repo root (npm workspaces, use `-w apps/game` / `-w apps/tools` to target a workspace):

```bash
npm run dev            # dev:game — Next.js dev server at localhost:3000
npm run dev:tools      # Vite dev server for tools (skill tree editor) at localhost:5173
npm run build          # build:game — production build
npm run test           # runs `vitest run` inside apps/game
npm run lint           # eslint . --max-warnings=0 (zero warnings allowed)
npm run lint:fix
npm run prettier       # prettier --write .
```

Single test / watch mode (run inside `apps/game`, or via `npm run <script> -w apps/game -- <args>`):

```bash
cd apps/game
npx vitest run src/game/buildings/furnace/FurnaceRotation.test.ts
npm run test:watch
```

Test environment is `happy-dom` (see `apps/game/vitest.config.mts`), with `@/` aliased to `apps/game/src/`.

Before considering any change complete: it must pass `npm run lint` (zero warnings) and `npm run build`, and any touched/new logic must have passing unit tests.

## Architecture

### Runtime structure (apps/game)

The simulation is plain TypeScript (no React), rendered via React Three Fiber:

- `game/core/World.ts` — the authoritative game world: tile grid, building placement/removal, connectivity/flow propagation between buildings, cable network, save/load (`serialize`/`deserialize`).
- `game/systems/` — cross-cutting systems that operate on the `World`: `PowerSystem` (electrical networks), `FactorySystem` (production ticking), `GuidanceSystem` (tutorial/hints), `AssetLibrary`, `LocalizationManager`.
- `game/providers/GameProvider.tsx` — instantiates `World` + systems once per session (`useMemo`), wires save/load/new-game via `window` CustomEvents (`GAME_SAVE`, `GAME_LOAD`, `GAME_NEW`, `GAME_REBUILD_POWER`, `GAME_TOGGLE_PAUSE`), and exposes them via `useGameContext()`. Also patches `world.placeBuilding`/`removeBuilding` to trigger power-network rebuilds as a side effect.
- `game/state/store.ts` — Zustand store for UI/meta state (inventory, unlocked buildings/skills/recipes, purchased counts, dialogues). The `World` itself is not in the store; it's held in `GameProvider` and read via `useGameStore.getState()` from inside world/building logic when needed.
- `game/entities/` — `Entity`/`BuildingEntity` base classes shared by all buildings.
- `game/environment/` — the tile system (grass/water/sand/rock/tree) and the unified "Nature Asset" visual pipeline for dynamically-discovered GLTF models with persisted `variantId` per tile.
- `game/resources/` — item/resource definitions (ores, ingots, wood, stone), each a `GameResource` subclass registered in `ResourceRegistry`.
- `components/ui/` — React HUD (panels, menus, dashboards); `components/ui/panels/` holds per-building panels and reusable `widgets/`.
- `game/data/locales/{en,fr}.json` — all user-facing strings live here; hardcoded UI strings are not allowed (see i18n rule below).

### Building system (plugin architecture)

Every building lives in `game/buildings/[building-id]/` as a self-contained plugin — this is the pattern to follow for any new building. Full spec: [`apps/game/src/game/buildings/GEMINI.md`](apps/game/src/game/buildings/GEMINI.md).

- `[Name].ts` — simulation logic, extends `BuildingEntity`, implements capability interfaces (`IPowered`, `IExtractable`, `IIOBuilding`, `IStorage`, etc.). Must not import other building classes directly — shared behavior goes into a system or utility, not cross-imports.
- `[Name]Config.ts` — static config (`cost`, `io`, `upgrades`, `placement`) exported as `[ID]_CONFIG`, registered in `BuildingConfig.ts` (`BuildingId` union + `BUILDINGS` record).
- `[Name]Model.ts` — pure `createXxxModel(): THREE.Group` function.
- `[Name]Visual.ts` — Three.js visual/animation layer, decoupled from logic, reacts to state.
- Instantiation always goes through `BuildingFactory.ts` (`createBuildingLogic`/`createBuildingVisual`) — never construct building classes directly elsewhere.
- HUD panels use a composable widget pattern (`components/ui/panels/widgets/`); `BuildingInfoPanel.tsx` selects a panel via `instanceof` checks. Prefer reusing `ResourceProducerPanel` for extractor-like buildings or composing widgets before writing a fully custom panel.

Multi-tile buildings (e.g. the 1x2 Furnace) and I/O connectivity have sharp edges — read the "Multi-Tile Buildings & Connectivity" and "Arrow Visibility Rules" sections of the buildings GEMINI.md before touching I/O offset math, rotation, or connectivity flags (`isInputConnected`, `connectedInputSides`, etc., all refreshed via `updateBuildingConnectivity()`).

### Environment / nature assets

`game/environment/GEMINI.md` documents the tile system and the "Nature Asset" pipeline: GLTF models are dynamically discovered from `public/models/[entityId]/` via `/api/assets`, served through `/api/model/`, and the chosen variant is persisted per-tile (`variantId`) in save data. Depletable tiles (`ResourceTile`) track `resourceAmount` and transform to another tile type when exhausted (e.g. Tree → Grass).

### Resources

`game/resources/GEMINI.md`: every item extends `GameResource` and is registered in `ResourceRegistry` (singleton). Add new resources under their own folder and register in `ResourceInitialization.ts`.

## Conventions

- **Colocation**: config, logic, visuals, and types for a building/system live together in its folder; only truly global constants go in `game/constants.ts`.
- **String literal types over `string`**: IDs like `BuildingId`, `ResourceType`, `Direction` must be literal unions, not primitive `string` — this is enforced by design, not just lint.
- **`@typescript-eslint/no-explicit-any` is `error`** everywhere except `*.test.ts(x)`/`*.spec.ts(x)` (see `eslint.config.mjs`). Don't reach for `any` in non-test code.
- **i18n**: no hardcoded user-facing strings in components/configs — add entries to `game/data/locales/en.json` (and `fr.json`).
- **Language policy**: all code, comments, and docs are in English.
- **Drag & drop affecting game state**: use immediate removal from the source (not on drop) to avoid duplication bugs, and confirm success via a transaction event (e.g. `GAME_ITEM_TRANSFER_SUCCESS`) rather than relying on `dropEffect` alone.
- **Z-index**: never hardcode (`z-[100]`); use the Tailwind theme vars in `globals.css` (`z-hud`, `z-panel`, ...).
- Keep files small; split logic into focused files/folders rather than growing one large file.
