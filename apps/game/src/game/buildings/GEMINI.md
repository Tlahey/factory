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

## 📐 Footprint, Anchor & Placement (`BuildingFootprint.ts`)

`BuildingFootprint.ts` is the **single source of truth** for grid geometry. Never re-derive
this maths locally — that is exactly how 1x2 buildings drifted off the grid.

Three coordinate frames, and mixing them is always a bug:

| Frame      | Meaning                                                                                                                            |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **Base**   | `config.width` x `config.height`, as authored facing north. The 3D model and the I/O arrows live here.                             |
| **World**  | Base rotated by `direction`; width/height swap for east/west. `BuildingEntity.width/height` are already in this frame.             |
| **Anchor** | `building.x / building.y`, the min-x / min-y tile of the world footprint. `World` keys its tile map on it and save files store it. |

Key helpers:

- `getFootprintSizeForConfig(config, direction)` — the only place the east/west swap happens.
  `BuildingEntity.syncFootprint()` calls it; **any direct write to `entity.direction` must be
  followed by `syncFootprint()`**, or the footprint drifts from the tiles `World` registered.
- `getOccupiedTiles(x, y, size)` / `entity.getOccupiedTiles()` — iterate tiles; never write
  nested `for (dx…) for (dy…)` loops again.
- `getFootprintCenter(x, y, size)` / `entity.getCenter()` — models are authored centred on
  their footprint, so views position the group **on the centre, not on the anchor**. Use
  `getBuildingTransform(entity)` (`components/buildings/BuildingTransform.ts`) in every view
  and `getFootprintTransform(...)` for the placement ghost.
- `getPlacementAnchor(hoverX, hoverY, baseW, baseH, direction)` — converts the **hovered tile**
  into the anchor. Multi-tile buildings pivot around the cursor, so pressing `R` rotates the
  ghost in place instead of flinging it to the other side of the cursor. `GameInput` must call
  this before `canPlaceBuilding` / `placeBuilding`; those two always take the **anchor**.

## 🔌 I/O Ports & Connectivity

Ports are derived from `config.io` plus the footprint, in `BuildingIOHelper.ts`. A declared
side expands to **one port per tile along that side** (`getSidePorts`), each carrying:

- `inner` — the tile of _this_ building holding the port,
- `outer` — the external tile it exchanges items with,
- `side` + `index` — index in the **base** frame, so port `i` is the same physical port at
  every rotation (which is what lets arrow meshes map one-to-one onto ports).

Rules:

- **Don't hand-roll ports.** Buildings implement `getInputPosition` / `getOutputPosition` /
  `canInput` by delegating to `getConfiguredInputPosition(this)`, `getConfiguredOutputPositions(this)`,
  `canInputFromConfig(this, x, y)`. Override only when ports are genuinely dynamic (belts curving).
- **Announce the touching tile, not the anchor.** Sinks validate "are you adjacent to me?".
  `ItemTransfer.getSourcePortTile()` resolves the occupied tile that touches the receiver — a
  1x2 furnace facing south outputs from its _second_ tile, and sending the anchor made every
  belt reject the item.
- **Output (strict)**: connected only if a building sits on the port's `outer` tile AND it
  declares an input port on our `inner` tile. Mere adjacency is not enough.
- **Input**: connected when a neighbour's output points at the port's `inner` tile.
- **Self-connection**: a building must never treat itself as a neighbour (multi-tile buildings
  are their own neighbours on the tile map).

## 🏹 Arrow Visibility Rules

- **Output Arrow (Red)**: hidden once that port is connected.
- **Input Arrow (Green)**: hidden once that port is fed.
- **Per-port granularity**: a wide side draws one arrow per tile; `connectedInputPorts` /
  `connectedOutputPorts` (keys `side#index`) drive them, so one edge tile can go quiet while
  the neighbouring tile keeps advertising. `connectedInputSides` / `connectedOutputSides` are
  the coarser aggregate, kept for side-level checks.
- **Conveyor Special Rule (1x1)**: a belt draws a single back arrow but accepts Back, Left and
  Right. That arrow hides as soon as **any** of the three is fed.
- **Centralized State**: all connectivity flags live on `BuildingEntity`; always refresh them
  through `updateBuildingConnectivity()`.

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
