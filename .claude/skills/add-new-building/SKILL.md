---
name: add-new-building
description: Step-by-step guide for adding a new building type to the game (config, logic, XState machine, 3D model, R3F view, HUD panel, registration, i18n, tests). Use whenever the user asks to add, create, or scaffold a new building.
---

# Adding a New Building

This game uses a plugin architecture: every building is a self-contained folder under
`apps/game/src/game/buildings/[building-id]/`. Before writing any code, read
`apps/game/src/game/buildings/GEMINI.md` — it is the source of truth for the footprint/anchor
math, I/O port connectivity rules, and arrow visibility rules. Never re-derive that math locally.

Use `[building-id]` (snake_case, e.g. `wind_turbine`) for the folder/config `id`, and
`[BuildingName]` (PascalCase, e.g. `WindTurbine`) for class/file names.

## Checklist

1. Create the folder `apps/game/src/game/buildings/[building-id]/`.
2. Write `[BuildingName]Config.ts`.
3. Write `[BuildingName]Machine.ts` (XState machine driving the tick logic).
4. Write `[BuildingName].ts` (entity, wires up the machine).
5. Write `[BuildingName]Model.ts` (pure `THREE.Group` factory).
6. Write `[BuildingName]View.tsx` (R3F component) and register it in `BuildingsRenderer.tsx`.
7. Register in `BuildingConfig.ts` (`BuildingId` union, config-type union, `BUILDINGS` record).
8. Register in `BuildingFactory.ts` (`BuildingRegistry`, `Logic` only — there is no `Visual` field here anymore).
9. Register the model in `PlacementVisuals.ts` (placement ghost) and `ModelPreview.tsx` (shop/menu preview).
10. If locked behind progression, add unlock/upgrade nodes to `SkillTreeConfig.ts`.
11. Add a HUD panel: reuse `ResourceProducerPanel`, compose from `components/ui/panels/widgets/`, or write a custom one; export it from `panels/index.ts`; wire it into `BuildingInfoPanel.tsx` via an `instanceof` check.
12. Add `building.[id].name` / `.description` (and any `upgrade.[id].*`) to `en.json` and `fr.json`.
13. Add `[BuildingName].test.ts` covering init, core mechanics, and `serialize()`/`deserialize()`.
14. Run `npm run lint` (zero warnings) and `npm run build` from repo root; run the new test file with `npx vitest run` from `apps/game`.

## Step 2: Config

```typescript
// WindTurbineConfig.ts
import {
  BaseBuildingConfig,
  ConfigOf,
  IPowered,
  BuildingUpgrade,
} from "../BuildingConfig";

export type WindTurbineConfigType = BaseBuildingConfig &
  ConfigOf<IPowered> & { upgrades: BuildingUpgrade[] };

export const WIND_TURBINE_CONFIG: WindTurbineConfigType = {
  id: "wind_turbine",
  name: "Wind Turbine",
  type: "wind_turbine",
  cost: { iron: 30 },
  locked: true,
  hasMenu: true,
  description: "Generates power from wind.",
  width: 1,
  height: 1,
  powerConfig: { type: "producer", rate: 100 },
  upgrades: [
    {
      level: 1,
      name: "upgrade.wind_turbine.level_1.name",
      description: "upgrade.wind_turbine.level_1.description",
      cost: { stone: 50 },
      effects: [{ type: "multiplier", stat: "rate", value: 1.5 }],
    },
  ],
};
```

## Step 3: XState machine

Buildings drive their per-tick logic through an XState machine, not an inline `tick()` body.
The entity's `tick()` just forwards a `TICK` event; the machine owns state transitions and
mutates the entity via `context.building`. See `extractor/ExtractorMachine.ts` for the fullest
example (buffer fill/drain, connectivity refresh, power-gated status).

```typescript
// WindTurbineMachine.ts
import { setup } from "xstate";
import type { WindTurbine } from "./WindTurbine";
import type { IWorld } from "../../entities/types";
import { updateBuildingConnectivity } from "../BuildingIOHelper";

export const windTurbineMachine = setup({
  types: {
    context: {} as { building: WindTurbine },
    input: {} as { building: WindTurbine },
    events: {} as { type: "TICK"; delta: number; world: IWorld },
  },
  actions: {
    tickWindTurbine: ({ context, event }) => {
      const { building } = context;
      updateBuildingConnectivity(building, event.world);
      // ... state/output logic, mutate `building` directly
    },
  },
}).createMachine({
  id: "windTurbine",
  context: ({ input }) => ({ building: input.building }),
  on: { TICK: { actions: "tickWindTurbine" } },
});
```

## Step 4: Entity logic

```typescript
// WindTurbine.ts
import { createActor } from "xstate";
import { BuildingEntity } from "../../entities/BuildingEntity";
import { IWorld, Direction } from "../../entities/types";
import { IPowered } from "../BuildingConfig";
import {
  WIND_TURBINE_CONFIG,
  WindTurbineConfigType,
} from "./WindTurbineConfig";
import { windTurbineMachine } from "./WindTurbineMachine";

export class WindTurbine extends BuildingEntity implements IPowered {
  constructor(x: number, y: number, direction: Direction = "north") {
    super(x, y, "wind_turbine", direction);
    this.actor = createActor(windTurbineMachine, { input: { building: this } });
    this.actor.start();
  }

  public getConfig(): WindTurbineConfigType {
    return WIND_TURBINE_CONFIG;
  }

  public get powerConfig() {
    return WIND_TURBINE_CONFIG.powerConfig;
  }

  public tick(delta: number, world?: IWorld): void {
    if (!world) return;
    this.actor?.send({ type: "TICK", delta, world });
  }

  public getPowerDemand(): number {
    return 0;
  }

  public getPowerGeneration(): number {
    return this.powerConfig.rate;
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

  public isValidPlacement(tile: Tile): boolean {
    return !tile.isWater();
  }
}
```

For buildings with I/O ports (conveyor-connected), implement `IIOBuilding` by **delegating**
to the shared helpers in `BuildingIOHelper.ts` — do not hand-roll port math:

```typescript
import {
  getConfiguredInputPosition,
  getConfiguredOutputPositions,
  canInputFromConfig,
} from "../BuildingIOHelper";

public getInputPosition() { return getConfiguredInputPosition(this); }
public getOutputPosition() { return getConfiguredOutputPositions(this)[0] ?? null; }
public canInput(fromX: number, fromY: number) { return canInputFromConfig(this, fromX, fromY); }
```

Also implement `serialize()` / `deserialize()` if the building has state beyond what
`BuildingEntity` already persists (buffers, energy, queues, etc.) — see the
`004-battery-energy-not-persisted` task in `docs/tasks/` for what happens when this is skipped.

## Step 5: 3D model

```typescript
// WindTurbineModel.ts
import * as THREE from "three";

export function createWindTurbineModel(): THREE.Group {
  const group = new THREE.Group();
  const poleGeo = new THREE.CylinderGeometry(0.05, 0.08, 1.5);
  const pole = new THREE.Mesh(
    poleGeo,
    new THREE.MeshLambertMaterial({ color: 0xcccccc }),
  );
  pole.position.y = 0.75;
  pole.castShadow = true;
  group.add(pole);
  return group;
}
```

## Step 6: R3F view + renderer registration

Visuals are plain React Three Fiber components now — **not** a `VisualEntity` class, and
**not** registered through `BuildingFactory.ts`. Follow `ExtractorView.tsx`: build the model
once in `useMemo`, animate in `useFrame`, position via `getBuildingTransform(entity)`.

```tsx
// WindTurbineView.tsx
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { WindTurbine } from "../../buildings/wind-turbine/WindTurbine";
import { createWindTurbineModel } from "../../buildings/wind-turbine/WindTurbineModel";
import { getBuildingTransform } from "./BuildingTransform";

export function WindTurbineView({ entity }: { entity: WindTurbine }) {
  const groupRef = useRef<THREE.Group>(null);
  const { mesh, bladeMesh } = useMemo(() => {
    const mesh = createWindTurbineModel();
    return { mesh, bladeMesh: mesh.getObjectByName("blades") };
  }, [entity]);

  useFrame((_, delta) => {
    if (bladeMesh) bladeMesh.rotation.z += delta * entity.windSpeed;
  });

  const { position, rotationY } = getBuildingTransform(entity);
  return (
    <group ref={groupRef} position={position} rotation={[0, rotationY, 0]}>
      <primitive object={mesh} />
    </group>
  );
}
```

Then add a branch to `apps/game/src/game/components/BuildingsRenderer.tsx`:

```tsx
} else if (building.getType() === "wind_turbine") {
  return <WindTurbineView key={key} entity={building as unknown as WindTurbine} />;
```

(plus the two `import` lines at the top of that file, next to the existing building imports.)

## Step 7-8: Registration

`BuildingConfig.ts` — add the id to the `BuildingId` union, add the config type to the
`BuildingConfig` union, add an entry to the `BUILDINGS` record.

`BuildingFactory.ts` — add to `BuildingRegistry`, `Logic` field only:

```typescript
wind_turbine: {
  Logic: WindTurbine,
},
```

## Step 9: Placement ghost + shop preview

- `apps/game/src/game/visuals/helpers/PlacementVisuals.ts`: add an `if (ghostType === "wind_turbine")` branch calling `createWindTurbineModel()`.
- `apps/game/src/components/ui/ModelPreview.tsx`: add an `if (id === "wind_turbine")` branch calling `createWindTurbineModel()`.

## Step 10: Skill tree (if locked)

Add unlock/upgrade nodes to `apps/game/src/game/buildings/hub/skill-tree/SkillTreeConfig.ts`
(`id`, `type: "unlock" | "upgrade"`, `buildingId`, `requires`, `position`, `unlockDuration`).

## Step 11: HUD panel

`apps/game/src/components/ui/BuildingInfoPanel.tsx` selects a panel via `instanceof`:

```tsx
const isWindTurbine = building instanceof WindTurbine;
{isWindTurbine && <WindTurbinePanel building={building} ... />}
```

Reuse an existing panel (e.g. `ResourceProducerPanel`) if the building fits an existing shape,
or compose one from `components/ui/panels/widgets/` (`PowerProducerWidget`,
`StatusIndicatorWidget`, etc.) before writing a fully custom panel. Export the new panel from
`components/ui/panels/index.ts`.

## Step 12: i18n

Add `building.wind_turbine.name` / `.description` to both `en.json` and `fr.json` (never
hardcode user-facing strings), plus `upgrade.wind_turbine.*` entries if it has upgrades.

## Step 13-14: Tests, lint, build

Write `WindTurbine.test.ts` covering initialization, `getConfig().id`, core tick behavior, and
`serialize()`/`deserialize()` round-tripping. Then:

```bash
npx vitest run src/game/buildings/wind-turbine/WindTurbine.test.ts   # from apps/game
npm run lint    # from repo root, zero warnings required
npm run build   # from repo root
```

## Troubleshooting

| Issue                           | Likely cause                                                                                        |
| ------------------------------- | --------------------------------------------------------------------------------------------------- |
| Building not appearing in 3D    | Missing branch in `BuildingsRenderer.tsx`                                                           |
| Can't place building            | `isValidPlacement()` logic, or missing `PlacementVisuals.ts` branch                                 |
| No preview in shop/menu         | Missing `ModelPreview.tsx` branch                                                                   |
| Not in skill tree               | Missing/misconfigured node in `SkillTreeConfig.ts`                                                  |
| No HUD panel                    | Missing `instanceof` branch in `BuildingInfoPanel.tsx`                                              |
| Missing translations            | JSON keys don't match the config `id`                                                               |
| I/O arrows wrong / not clearing | Hand-rolled port math instead of delegating to `BuildingIOHelper.ts` — see its rules in `GEMINI.md` |
