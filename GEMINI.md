# GEMINI AI Development Guide

This file serves as a guide for the Antigravity AI to maintain consistency, structure, and project principles.

## 🏗 Fundamental Principles

- **SOLID**: Rigorously follow SOLID principles.
- **Colocation**: Keep related elements close to each other. Configuration, logic, visuals, and types for a building or system must reside in the same folder or subfolder.
- **Single Source of Truth**: Avoid logic duplication. Centralize global constants in `src/game/constants.ts` but keep building-specific constants within their respective folders.
- **Language Policy**: **All files, including code (comments, variables, logs) and documentation, must be in English.**
- **Internationalization (i18n)**: All user-facing text must be extracted into JSON files (e.g., `en.json`, `fr.json`). Hardcoded strings in UI components or building configs are strictly prohibited.
- **Type Safety**: Prefer **String Literal Types** (unions) over primitive `string` for known sets of values (e.g., `BuildingId`, `ResourceType`, `Direction`). This ensures strict type checking and prevents typos.

## 🏗 Software Architecture

- **Global Pattern**: Strictly follow SOLID principles.
- **State Management**: Use the **State Pattern** for active entities (e.g., Player, Enemies).
- **Decoupling**: Game logic (State Machines) must be strictly separated from the rendering engine (Three.js).
- **Communication**: Use an event-driven system to update visuals following a state change.

## 📁 Project Structure

This is a Monorepo with two main workspaces:

- `apps/game/`: The main game application.
- `apps/tools/`: Standalone developer tools.

### Game Structure (`apps/game/src/`)

- `game/buildings/`: Contains all buildings. Each building has its own subfolder.
  - `[Building].ts`: Entity logic.
  - `[Building]Config.ts`: Building configuration.
  - `[Building]Model.ts`: 3D model creation function.
  - `[Building]Visual.ts`: Visual/animation handler.
- `game/systems/`: Global systems.
- `game/core/`: Engine core.
- `components/ui/panels/`: HUD panels for buildings.
- `components/ui/panels/widgets/`: Reusable UI widgets.

## 🎨 Styling & UI

- **Z-Index**: Never use hardcoded Z-Index values (e.g., `z-[100]`). Always use the defined Tailwind theme variables in `globals.css` (e.g., `z-hud`, `z-panel`) to ensure consistent layering and avoid conflicts.
- **Scrollbars**: Use the global `.custom-scrollbar` class for scrollable containers to ensure a consistent look and feel across the application.
- **HUD Panels**: Use composable widgets from `panels/widgets/` to build consistent building UIs. See `apps/game/src/game/buildings/GEMINI.md` for details.

## 🚀 Adding a New Feature (e.g., New Building)

To add a new building (e.g., "SolarPanel"):

### Game Logic (5 steps)

1. Create `apps/game/src/game/buildings/solar-panel/`.
2. Create `SolarPanel.ts` extending `BuildingEntity`, implementing interfaces (`IPowered`, `IIOBuilding`, etc.).
3. Create `SolarPanelConfig.ts` exporting `SOLAR_PANEL_CONFIG`.
4. Create `SolarPanelModel.ts` with `createSolarPanelModel()` function.
5. Create `SolarPanelVisual.ts` implementing `VisualEntity`.

### Registration (2 steps)

6. Register in `BuildingConfig.ts` (add to `BuildingId`, union, and `BUILDINGS` record).
7. Register in `BuildingFactory.ts` (add to `BuildingRegistry`).

### Visuals (2 steps)

8. Add to `PlacementVisuals.ts` for ghost preview.
9. Add to `ModelPreview.tsx` for shop preview.

### Skill Tree (optional)

10. Add unlock/upgrade nodes to `SkillTreeConfig.ts`.

### HUD Panel (3 steps)

11. Create `SolarPanelPanel.tsx` in `components/ui/panels/`:
    - Use `ResourceProducerPanel` for extractor-like buildings
    - Compose widgets for unique buildings
    - Create custom for complex buildings (Hub, Furnace)
12. Export in `panels/index.ts`.
13. Add to `BuildingInfoPanel.tsx` (import, instanceof check, render, update fallback).

### i18n

14. Add translations in `en.json` (`building.solar_panel.*`, `upgrade.solar_panel.*`).

### Testing

15. Create `SolarPanel.test.ts` with unit tests.
16. Run `npm run build` and `npm test` to validate.

> **See `apps/game/src/game/buildings/GEMINI.md` for complete documentation.**

## 🛠 Key Points to Watch

- **Performance**: Minimize heavy calculations in `tick()`. Use deltas.
- **Persistence**: Ensure new state data is correctly saved/loaded if necessary.
- **UI**: Buildings with `hasMenu: true` must have their `upgrades` defined in their config to automatically appear in the info panel.
- **HUD Composability**: Use shared panels (`ResourceProducerPanel`) for similar buildings. Compose from widgets (`StatusIndicatorWidget`, `PowerConsumerWidget`, etc.) for unique buildings.
- **Drag & Drop Safety**: When implementing drag-and-drop affecting game state (e.g. moving items), use **Immediate Removal** from source to prevent duplication bugs (e.g. items being processed by conveyor while dragged). Implement **Transaction Confirmation** (e.g. `GAME_ITEM_TRANSFER_SUCCESS` event) to robustly confirm successful drops across different UI components, rather than relying solely on `dropEffect`.
- **Development**: Keep it simple. Don't create huge files, prefer to split logic into smaller files and folders. Use naming conventions to make it easy to understand what each file does.
- **Testing**: Before considering a solution complete, ensure unit tests are created and passing. Run tests to validate there are no regressions. **Automatic Test Generation**: Always generate tests for new features to ensure stability and prevent regressions.
- **Linting**: We must strictly validate the linter before merging. `lint-staged` is used to ensure code quality. **All code must adhere to the defined ESLint rules without exception.**
- **Build**: We must strictly validate the build before merging. `npm run build` is used to ensure the build is successful. **Automatic Build**: Always generate a build before merging to ensure stability and prevent regressions.
