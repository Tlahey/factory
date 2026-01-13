# Adding a New Building

This guide explains how to add a new building to the game. Follow these steps to create a complete, functional building.

## Prerequisites

Before starting, ensure you understand:

- TypeScript and the project structure
- The game's entity-component pattern
- Basic Three.js for 3D models

## Quick Checklist

1. [ ] Create building folder: `apps/game/src/game/buildings/[building-name]/`
2. [ ] Create `[Building]Config.ts` - Configuration
3. [ ] Create `[Building].ts` - Entity logic
4. [ ] Create `[Building]Model.ts` - 3D model
5. [ ] Create `[Building]Visual.ts` - Visual controller
6. [ ] Register in `BuildingConfig.ts`
7. [ ] Register in `BuildingFactory.ts`
8. [ ] Add to `SkillTreeConfig.ts` (if unlockable)
9. [ ] Add translations to `en.json` and `fr.json`
10. [ ] Create tests

---

## Step 1: Create the Building Config

Create `apps/game/src/game/buildings/[building-name]/[Building]Config.ts`:

```typescript
import {
  BaseBuildingConfig,
  ConfigOf,
  IPowered,
  IIOBuilding,
  BuildingUpgrade,
} from "../BuildingConfig";

// Define building-specific interface (if needed)
export interface IMyBuilding {
  myCustomProperty: number;
}

// Compose the config type
export type MyBuildingConfigType = BaseBuildingConfig &
  ConfigOf<IIOBuilding> &
  ConfigOf<IPowered> &
  ConfigOf<IMyBuilding> & { upgrades: BuildingUpgrade[] };

export const MY_BUILDING_CONFIG: MyBuildingConfigType = {
  // === Required Base Properties ===
  id: "my_building", // Unique ID (snake_case)
  name: "My Building", // Display name (fallback)
  type: "my_building", // Same as id
  cost: { iron: 10 }, // Construction cost
  locked: true, // Start locked (unlock via skill tree)
  hasMenu: true, // Show info panel on click
  description: "Does something cool.",

  // === Optional Size ===
  width: 1, // Default: 1
  height: 1, // Default: 1

  // === IO Configuration ===
  io: {
    hasInput: true,
    hasOutput: true,
    inputSide: "back", // 'front' | 'back' | 'left' | 'right'
    outputSide: "front",
    showArrow: true,
  },

  // === Power Configuration ===
  powerConfig: {
    type: "consumer", // 'consumer' | 'producer' | 'relay'
    rate: 20, // kW consumption/production
  },

  // === Shop Configuration (if purchasable) ===
  shop: {
    baseCost: { iron: 50 }, // Cost to buy license
    priceMultiplier: 2.0, // Price doubles with each purchase
    initialCount: 0, // Free licenses when unlocked
  },

  // === Custom Properties ===
  myCustomProperty: 100,

  // === Upgrades ===
  upgrades: [
    {
      level: 1,
      name: "upgrade.my_building.level_1.name",
      description: "upgrade.my_building.level_1.description",
      cost: { stone: 50 },
      effects: [{ type: "multiplier", stat: "myCustomProperty", value: 1.5 }],
    },
  ],
};
```

---

## Step 2: Create the Entity Logic

Create `apps/game/src/game/buildings/[building-name]/[Building].ts`:

```typescript
import { BuildingEntity, Direction4 } from "../../entities/BuildingEntity";
import { Tile } from "../../core/Tile";
import { IWorld } from "../../entities/types";
import {
  MY_BUILDING_CONFIG,
  MyBuildingConfigType,
  IMyBuilding,
} from "./MyBuildingConfig";
import { IPowered, IIOBuilding } from "../BuildingConfig";
import { updateBuildingConnectivity, getIOOffset } from "../BuildingIOHelper";

export class MyBuilding
  extends BuildingEntity
  implements IMyBuilding, IPowered, IIOBuilding
{
  // === State ===
  public myCustomProperty: number;
  public isInputConnected: boolean = false;
  public isOutputConnected: boolean = false;
  public active: boolean = false;

  constructor(x: number, y: number, direction: Direction4 = "north") {
    super(x, y, "my_building", direction);
    this.myCustomProperty = MY_BUILDING_CONFIG.myCustomProperty;
    this.width = MY_BUILDING_CONFIG.width || 1;
    this.height = MY_BUILDING_CONFIG.height || 1;
  }

  // === Config Access ===
  public getConfig(): MyBuildingConfigType {
    return MY_BUILDING_CONFIG;
  }

  public get powerConfig() {
    return MY_BUILDING_CONFIG.powerConfig;
  }

  public get io() {
    return MY_BUILDING_CONFIG.io;
  }

  // === Game Logic ===
  public tick(delta: number, world?: IWorld): void {
    if (!world) return;

    // Update connectivity for IO arrows
    updateBuildingConnectivity(this, world);

    // Your custom logic here...
  }

  // === IPowered Implementation ===
  public getPowerDemand(): number {
    return this.powerConfig.rate;
  }

  public getPowerGeneration(): number {
    return 0;
  }

  public updatePowerStatus(
    satisfaction: number,
    hasSource: boolean,
    gridId: number,
  ): void {
    this.powerSatisfaction = satisfaction;
    this.hasPowerSource = hasSource;
    this.currentGridId = gridId;
  }

  // === IIOBuilding Implementation ===
  public getInputPosition(): { x: number; y: number } | null {
    if (!this.io.hasInput) return null;
    const offset = getIOOffset(
      this.io.inputSide || "back",
      this.direction,
      this.width,
      this.height,
    );
    return { x: this.x + offset.dx, y: this.y + offset.dy };
  }

  public getOutputPosition(): { x: number; y: number } | null {
    if (!this.io.hasOutput) return null;
    const offset = getIOOffset(
      this.io.outputSide || "front",
      this.direction,
      this.width,
      this.height,
    );
    return { x: this.x + offset.dx, y: this.y + offset.dy };
  }

  public canInput(_fromX: number, _fromY: number): boolean {
    return true;
  }

  public canOutput(_world: IWorld): boolean {
    return true;
  }

  public tryOutput(_world: IWorld): boolean {
    return false; // Implement if building outputs items
  }

  // === Placement Validation ===
  public getColor(): number {
    return 0x00ff00; // Preview color
  }

  public isValidPlacement(tile: Tile): boolean {
    return !tile.isWater() && !tile.isStone();
  }
}
```

---

## Step 3: Create the 3D Model

Create `apps/game/src/game/buildings/[building-name]/[Building]Model.ts`:

```typescript
import * as THREE from "three";

export function createMyBuildingModel(): THREE.Group {
  const group = new THREE.Group();

  // Create your 3D model using Three.js primitives
  const bodyGeo = new THREE.BoxGeometry(0.8, 0.6, 0.8);
  const bodyMat = new THREE.MeshLambertMaterial({ color: 0x4488ff });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 0.3;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  return group;
}
```

---

## Step 4: Create the Visual Controller

Create `apps/game/src/game/buildings/[building-name]/[Building]Visual.ts`:

```typescript
import * as THREE from "three";
import { VisualEntity } from "../../visuals/VisualEntity";
import { MyBuilding } from "./MyBuilding";
import { createMyBuildingModel } from "./MyBuildingModel";

export class MyBuildingVisual implements VisualEntity {
  public mesh: THREE.Object3D;

  constructor(_building: MyBuilding) {
    this.mesh = createMyBuildingModel();
    this.mesh.name = "my_building";
  }

  public update(_delta: number, entity?: MyBuilding): void {
    if (!entity) return;
    // Update visuals based on entity state
  }

  public setHighlight(active: boolean): void {
    this.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const mat = child.material as THREE.MeshLambertMaterial;
        if (!mat.emissive) return;

        if (active) {
          if (!child.userData.originalEmissive) {
            child.userData.originalEmissive = mat.emissive.clone();
          }
          mat.emissive.setHex(0xff0000);
          mat.emissiveIntensity = 0.5;
        } else if (child.userData.originalEmissive) {
          mat.emissive.copy(child.userData.originalEmissive);
          mat.emissiveIntensity = 0;
        }
      }
    });
  }

  public dispose(): void {
    // Clean up resources if needed
  }
}
```

---

## Step 5: Register in BuildingConfig.ts

Add to `apps/game/src/game/buildings/BuildingConfig.ts`:

```typescript
// Add import at top
import {
  MY_BUILDING_CONFIG,
  MyBuildingConfigType,
} from "./my-building/MyBuildingConfig";

// Add to BuildingConfig union type
export type BuildingConfig =
  | ExtractorConfigType
  | ConveyorConfigType
  // ... existing types ...
  | MyBuildingConfigType
  | BaseBuildingConfig;

// Add to BUILDINGS registry
export const BUILDINGS: Record<string, BuildingConfig> = {
  // ... existing buildings ...
  my_building: MY_BUILDING_CONFIG,
};
```

---

## Step 6: Register in BuildingFactory.ts

Add to `apps/game/src/game/buildings/BuildingFactory.ts`:

```typescript
// Add imports at top
import { MyBuilding } from "./my-building/MyBuilding";
import { MyBuildingVisual } from "./my-building/MyBuildingVisual";

// Add to BuildingRegistry
export const BuildingRegistry: Record<string, BuildingEntry> = {
  // ... existing entries ...
  my_building: {
    Logic: MyBuilding,
    Visual: MyBuildingVisual as any,
    createVisual: (b, _ctx) => new MyBuildingVisual(b as MyBuilding),
  },
};
```

---

## Step 7: Add to Skill Tree

Add to `apps/game/src/game/buildings/hub/skill-tree/SkillTreeConfig.ts`:

```typescript
// Add unlock node
{
  id: "my_building_unlock",
  type: "unlock",
  buildingId: "my_building",
  level: 0,
  requires: ["some_prerequisite"],  // Node ID that must be unlocked first
  position: { x: 3, y: 2 },         // Position in skill tree UI
  unlockDuration: 30,               // Seconds to unlock
},

// Add upgrade nodes (optional)
{
  id: "my_building_1",
  type: "upgrade",
  buildingId: "my_building",
  level: 1,
  requires: ["my_building_unlock"],
  position: { x: 3, y: 3 },
  unlockDuration: 60,
},
```

---

## Step 8: Add Translations

Add to `apps/game/src/game/data/locales/en.json`:

```json
{
  "building": {
    "my_building": {
      "name": "My Building",
      "description": "Does something cool."
    }
  },
  "upgrade": {
    "my_building": {
      "level_1": {
        "name": "Enhanced Mode",
        "description": "Improves performance by 50%"
      }
    }
  }
}
```

Add the same structure to `fr.json` with French translations.

---

## Step 9: Create Tests

Create `apps/game/src/game/buildings/[building-name]/[Building].test.ts`:

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { MyBuilding } from "./MyBuilding";

describe("MyBuilding Entity", () => {
  let building: MyBuilding;

  beforeEach(() => {
    building = new MyBuilding(0, 0, "north");
  });

  it("should initialize with correct defaults", () => {
    expect(building.myCustomProperty).toBeGreaterThan(0);
  });

  it("should have correct config", () => {
    expect(building.getConfig().id).toBe("my_building");
  });
});
```

Run tests with:

```bash
npm test -- --run MyBuilding
```

---

## Common Patterns

### Power Consumer

```typescript
powerConfig: {
  type: "consumer",
  rate: 20,  // 20 kW demand
}
```

### Power Producer

```typescript
powerConfig: {
  type: "producer",
  rate: 100,  // 100 kW generation
}
```

### Item Transport (Input/Output)

```typescript
io: {
  hasInput: true,
  hasOutput: true,
  inputSide: "back",
  outputSide: "front",
  showArrow: true,
}
```

### Multi-tile Buildings

```typescript
width: 2,
height: 2,
```

---

## Troubleshooting

| Issue                  | Solution                                  |
| ---------------------- | ----------------------------------------- |
| Building not appearing | Check `BuildingFactory.ts` registration   |
| Can't place building   | Check `isValidPlacement()` logic          |
| Not in skill tree      | Check `SkillTreeConfig.ts` requires array |
| No translations        | Check JSON keys match `id`                |
| Tests failing          | Run `npm test -- --run [BuildingName]`    |

---

## File Structure Example

```
apps/game/src/game/buildings/
├── my-building/
│   ├── MyBuilding.ts
│   ├── MyBuildingConfig.ts
│   ├── MyBuildingModel.ts
│   ├── MyBuildingVisual.ts
│   └── MyBuilding.test.ts
├── BuildingConfig.ts        # Add config type + registration
├── BuildingFactory.ts       # Add logic + visual registration
└── hub/
    └── skill-tree/
        └── SkillTreeConfig.ts  # Add unlock/upgrade nodes
```
