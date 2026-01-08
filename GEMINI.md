# GEMINI AI Development Guide

This file serves as a guide for the Antigravity AI to maintain consistency, structure, and project principles.

## 🏗 Fundamental Principles

- **SOLID**: Rigorously follow SOLID principles.
- **Colocation**: Keep related elements close to each other. Configuration, logic, visuals, and types for a building or system must reside in the same folder or subfolder.
- **Single Source of Truth**: Avoid logic duplication. Centralize global constants in `src/game/constants.ts` but keep building-specific constants within their respective folders.
- **Language Policy**: **All files, including code (comments, variables, logs) and documentation, must be in English.**
- **Internationalization (i18n)**: All user-facing text must be extracted into JSON files (e.g., `en.json`, `fr.json`). Hardcoded strings in UI components or building configs are strictly prohibited.

## 📁 Project Structure

- `src/game/buildings/`: Contains all buildings. Each building has its own subfolder (e.g., `conveyor/`).
  - `[Building].ts`: Entity logic.
  - `[Building]Config.ts`: Building configuration (name, menu, upgrades).
  - `[Building]Visual.ts`: Rendering logic (if separate).
- `src/game/systems/`: Global systems (Input, Factory, Grid).
- `src/game/core/`: Engine core (World, Tile).

## 🚀 Adding a New Feature (e.g., New Building)

To add a new building (e.g., "SolarPanel"):

1. Create `src/game/buildings/solar-panel/`.
2. Create `SolarPanel.ts` inheriting from `BuildingEntity`.
3. Create `SolarPanelConfig.ts` exporting `SOLAR_PANEL_CONFIG`.
4. Register the configuration in `src/game/buildings/BuildingConfig.ts`.
5. If complex visuals are required, create `SolarPanelVisual.ts` or similar.

## 🛠 Key Points to Watch

- **Performance**: Minimize heavy calculations in `tick()`. Use deltas.
- **Persistence**: Ensure new state data is correctly saved/loaded if necessary.
- **UI**: Buildings with `hasMenu: true` must have their `upgrades` defined in their config to automatically appear in the info panel.
- **Development**: Keep it simple. Don't create huge files, prefer to split logic into smaller files and folders. Use naming conventions to make it easy to understand what each file does.
- **Testing**: Before considering a solution complete, ensure unit tests are created and passing. Run tests to validate there are no regressions. **Automatic Test Generation**: Always generate tests for new features to ensure stability and prevent regressions.
- **Linting**: We must strictly validate the linter before merging. `lint-staged` is used to ensure code quality. **All code must adhere to the defined ESLint rules without exception.**
