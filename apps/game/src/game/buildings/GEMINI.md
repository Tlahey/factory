# Building System Architecture

This directory implements a **Plugin-Based Architecture** for game buildings. This approach ensures scalability, maintainability, and clear separation of concerns.

## 🏗 Core Architectural Principles

- **Plugin Pattern**: Each building acts as an independent plugin.
- **Interface-Driven**: Behavior is defined via contracts (Interfaces), not inheritance hierarchies alone.
- **Strict Scoping**: A building must be self-contained. It should not depend on other specific buildings.
- **Factory Pattern**: Instantiation is centralized to decouple usage from implementation.

## 📂 Folder Structure

Each building is a self-contained module located in `src/game/buildings/[building-id]/`.
The structure must be consistent across all buildings:

```text
src/game/buildings/
├── [building-id]/               # Specific Building Folder
│   ├── [BuildingName].ts        # Main Logic (extends BuildingEntity, implements Interfaces)
│   ├── [BuildingName]Config.ts  # Configuration (Exports [ID]_CONFIG)
│   ├── [BuildingName]Visual.ts  # (Optional) Visual Logic (Three.js / React)
│   └── assets/                  # (Optional) Textures, models, specific assets
├── BuildingFactory.ts           # Central Factory for instantiation
├── BuildingConfig.ts            # Global Registry of all configurations
└── GEMINI.md                    # This Documentation
```

### File Responsibilities

1.  **`Logic ([BuildingName].ts)`**:
    - Contains the simulation logic (state, tick, update).
    - **Must** implement relevant interfaces (e.g., `IExtractable`, `IPowered`).
    - **Must Not** import other building classes directly. Dependencies should be handled via generic interfaces.

2.  **`Config ([BuildingName]Config.ts)`**:
    - Defines static data: `cost`, `description`, `io` ports, `upgrades`.
    - Must use the **Literal ID** of the building.

3.  **`Visual ([BuildingName]Visual.ts)`**:
    - Handles the 3D representation and animations.
    - Should be decoupled from logic where possible, reacting to state changes.

## 🔌 Interfaces as Contracts

Buildings are composed of capabilities defined by interfaces. A building is defined by _what it does_, not just what it is.

Common Interfaces:

- `IPowered`: Can consume or generate electricity.
- `IExtractable`: Can extract resources from the world.
- `IIOBuilding`: Has Input/Output ports (Conveyors, Machines).
- `IStorage`: Handles inventory (Chests).

**Rule**: If multiple buildings share complex logic, extract that logic into a **Game System** or a **Utility**, do not copy-paste or cross-import.

## 🏭 The Building Factory

To avoid tight coupling and huge `switch` statements throughout the codebase, we use a Factory pattern.

- **`BuildingFactory.ts`**: Maintains a registry of all buildings.
- **Usage**: Always use `createBuildingLogic(type, ...)` or `createBuildingVisual(type, ...)` to instantiate entities.
- **Benefits**: Adding a new building only requires registering it in the Factory and Config, without modifying the rest of the game engine.

## 🔑 Type Safety & Literal IDs

Building IDs are the Source of Truth.

- **Rule**: All IDs (e.g., `'extractor'`, `'conveyor'`) must be **String Literal Types**.
- **Usage**: Use these literals for `type` fields in configurations and factory lookups.
- **Why**: This ensures strict type checking. Typescript will catch typos (e.g., `'extracter'` vs `'extractor'`) at compile time.

## 🚀 Adding a New Building

1.  **Create the Folder**: `src/game/buildings/my-building/`
2.  **Implement Logic**: `MyBuilding.ts` (implements `BuildingEntity + Interfaces`)
3.  **Define Config**: `MyBuildingConfig.ts`
4.  **Register**:
    - Add Config to `BuildingConfig.ts`
    - Add Class & Visual to `BuildingFactory.ts`
