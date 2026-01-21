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
│   ├── [BuildingName]Model.ts   # (Optional) 3D Model creation function
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

4.  **`Model ([BuildingName]Model.ts)`**:
    - Creates the 3D mesh (Three.js Group).
    - Pure function: `createXxxModel(): THREE.Group`.
    - Used by Visual, PlacementVisuals, and ModelPreview.

## 🔌 Interfaces as Contracts

Buildings are composed of capabilities defined by interfaces. A building is defined by _what it does_, not just what it is.

Common Interfaces:

- `IPowered`: Can consume or generate electricity.
- `IExtractable`: Can extract resources from the world.
- `IIOBuilding`: Has Input/Output ports (Conveyors, Machines).
- `IStorage`: Handles inventory (Chests).

**Rule**: If multiple buildings share complex logic, extract that logic into a **Game System** or a **Utility**, do not copy-paste or cross-import.

## 🏗 Multi-Tile Buildings & Connectivity

Buildings larger than 1x1 (e.g., the 1x2 Furnace) require specific handling for their Input/Output (I/O) ports.

- **Dimension Source of Truth**: When calculating I/O offsets (using `getIOOffset`), always use the **base dimensions from the configuration** (un-rotated). The `BuildingEntity` instance's `width` and `height` properties are already swapped based on rotation, and using them in offset calculations would lead to a "double-swap" bug.
- **Port Detection**:
  - **Input**: A building is considered "connected" if an adjacent building's output points to **any tile** occupied by the building.
  - **Output (Strict)**: A building is considered "connected" if there is a building at the calculated output tile AND that neighbor **accepts input** from our position (validated via `neighbor.canInput(sourceX, sourceY)`). Simply being adjacent is not enough to hide the output arrow.
- **Multi-Tile Coordinates**: When calling `canInput` for a neighbor, use the coordinates of our tile that is **actually adjacent** to the neighbor, not our anchor (0,0) position.
- **Self-Connection**: A building must **not** consider itself as a neighbor. This is particularly important for multi-tile buildings during rotation to avoid false connectivity locks.

## 🏹 Arrow Visibility Rules

Visual indicators (Arrows) follow specific logic to avoid clutter and provide accurate feedback:

- **Output Arrow (Red)**: Hidden only if `isOutputConnected` is true (Strict check passed).
- **Input Arrow (Green)**: Hidden if `isInputConnected` is true.
- **Conveyor Special Rule (1x1)**: A standard conveyor has one input arrow at the back, but accepts input from **Back, Left, and Right**. The back arrow must be hidden if ANY of these three sides receives a connection.
- **Centralized State**: All connectivity flags (`isInputConnected`, `connectedInputSides`, etc.) are defined in the `BuildingEntity` base class. Always use `updateBuildingConnectivity()` to refresh these flags.

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

---

## 🖥 HUD / Panel Architecture

The building HUD system uses a **Composable Widget Pattern** to automatically display the appropriate UI based on the building's interfaces.

### Panel Types

| Panel Type              | Used By            | Description                              |
| ----------------------- | ------------------ | ---------------------------------------- |
| `ResourceProducerPanel` | Extractor, Sawmill | Buildings that extract/produce resources |
| `BiomassPlantPanel`     | BiomassPlant       | Fuel-consuming power producer            |
| `BatteryPanel`          | Battery            | Energy storage with charge/discharge     |
| `ChestPanel`            | Chest              | Item storage                             |
| `FurnacePanel`          | Furnace            | Recipe-based processing                  |
| `ConveyorPanel`         | Conveyor           | Item transport                           |
| `ElectricPolePanel`     | Electric Pole      | Power grid connections                   |

### Reusable Widgets (`components/ui/panels/widgets/`)

| Widget                  | Interface             | Description                                        |
| ----------------------- | --------------------- | -------------------------------------------------- |
| `PowerProducerWidget`   | `IPowered` (producer) | Real-time power generation display                 |
| `PowerConsumerWidget`   | `IPowered` (consumer) | Power consumption + satisfaction                   |
| `FuelGaugeWidget`       | Custom                | Fuel level gauge with warnings                     |
| `StatusIndicatorWidget` | All                   | Operational status (working, idle, no_power, etc.) |

### Panel Selection Logic

The `BuildingInfoPanel.tsx` uses `instanceof` checks to determine which panel to render:

```tsx
const isExtractor = building instanceof Extractor;
const isSawmill = building instanceof Sawmill;
// ...

{isExtractor && <ExtractorPanel building={building} ... />}
{isSawmill && <SawmillPanel building={building} ... />}
```

### Creating a Panel for a New Building

**Option 1: Use Existing Shared Panel**

If your building is similar to an existing type (e.g., extracts resources like Extractor/Sawmill):

```tsx
// MyBuildingPanel.tsx
import { ResourceProducerPanel } from "./ResourceProducerPanel";

export function MyBuildingPanel({ building, ...handlers }) {
  return (
    <ResourceProducerPanel
      building={building}
      resourceType="my_resource"
      {...handlers}
    />
  );
}
```

**Option 2: Compose from Widgets**

If your building has unique characteristics, compose using widgets:

```tsx
// MyBuildingPanel.tsx
import { StatusIndicatorWidget, PowerConsumerWidget, FuelGaugeWidget } from "./widgets";
import { BreakerSwitch } from "./BreakerSwitch";

export function MyBuildingPanel({ building, forceUpdate }) {
  return (
    <div className="space-y-4 py-2">
      <BreakerSwitch isEnabled={building.isEnabled} onToggle={...} />
      <StatusIndicatorWidget status={building.operationStatus} ... />
      <PowerConsumerWidget building={building} />
      <FuelGaugeWidget currentFuel={...} maxFuel={...} />
    </div>
  );
}
```

**Option 3: Full Custom Panel**

For complex buildings like Hub or Furnace with special dashboards.

---

## 🚀 Adding a New Building (Complete Checklist)

### 1. Game Logic

1. **Create the Folder**: `src/game/buildings/my-building/`
2. **Implement Logic**: `MyBuilding.ts`
   - Extends `BuildingEntity`
   - Implements relevant interfaces (`IPowered`, `IIOBuilding`, etc.)
   - Implements `serialize()` / `deserialize()` for save/load
3. **Define Config**: `MyBuildingConfig.ts`
   - Export type and config constant
   - Include `shop` config if purchasable
4. **Create Model**: `MyBuildingModel.ts`
   - Export `createMyBuildingModel(): THREE.Group`
5. **Create Visual**: `MyBuildingVisual.ts`
   - Implements `VisualEntity`
   - Creates IO arrows, handles animations

### 2. Registration

6. **Update `BuildingConfig.ts`**:
   - Add ID to `BuildingId` type
   - Add config type to `BuildingConfig` union
   - Add config to `BUILDINGS` record
7. **Update `BuildingFactory.ts`**:
   - Import Logic and Visual classes
   - Add entry to `BuildingRegistry`

### 3. Visuals

8. **Update `PlacementVisuals.ts`**:
   - Import `createMyBuildingModel`
   - Add case for ghost mesh creation
9. **Update `ModelPreview.tsx`**:
   - Import `createMyBuildingModel`
   - Add case for shop preview

### 4. Skill Tree (if locked)

10. **Update `SkillTreeConfig.ts`**:
    - Add unlock node
    - Add upgrade nodes (optional)

### 5. HUD Panel

11. **Create Panel**: `components/ui/panels/MyBuildingPanel.tsx`
    - Use shared panel or compose from widgets
12. **Update `panels/index.ts`**:
    - Export new panel
13. **Update `BuildingInfoPanel.tsx`**:
    - Import building class and panel
    - Add `instanceof` check
    - Add panel rendering condition
    - Update fallback condition

### 6. i18n

14. **Update `en.json`**:
    - Add `building.my_building.name` and `description`
    - Add `upgrade.my_building.*` entries if needed

### 7. Testing

15. **Create Tests**: `MyBuilding.test.ts`
    - Test initialization, core mechanics, serialization
16. **Run Build**: `npm run build`
17. **Run Tests**: `npm test`
