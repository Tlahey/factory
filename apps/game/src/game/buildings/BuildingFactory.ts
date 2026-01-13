import { Extractor } from "./extractor/Extractor";
import { ExtractorVisual } from "./extractor/ExtractorVisual";
import { Conveyor } from "./conveyor/Conveyor";
import { ConveyorVisual } from "./conveyor/ConveyorVisual";
import { Hub } from "./hub/Hub";
import { HubVisual } from "./hub/HubVisual";
import { ElectricPole } from "./electric-pole/ElectricPole";
import { ElectricPoleVisual } from "./electric-pole/ElectricPoleVisual";
import { Chest } from "./chest/Chest";
import { ChestVisual } from "./chest/ChestVisual";
import { Battery } from "./battery/Battery";
import { BatteryVisual } from "./battery/BatteryVisual";
import { BuildingEntity } from "../entities/BuildingEntity";
import { ParticleSystem } from "../visuals/ParticleSystem";
import { VisualEntity } from "../visuals/VisualEntity";

// Context for Visual Creation
export interface VisualContext {
  particleSystem: ParticleSystem;
}

type Direction = "north" | "south" | "east" | "west";

// Definition of the Registry Entry
interface BuildingEntry {
  Logic: new (x: number, y: number, direction?: Direction) => BuildingEntity;
  Visual: new (building: BuildingEntity, ...args: unknown[]) => VisualEntity;
  createVisual?: (
    building: BuildingEntity,
    context: VisualContext,
  ) => VisualEntity;
}

// Registry
export const BuildingRegistry: Record<string, BuildingEntry> = {
  extractor: {
    Logic: Extractor,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Visual: ExtractorVisual as any,
    createVisual: (b, ctx) =>
      new ExtractorVisual(b as Extractor, ctx.particleSystem),
  },
  conveyor: {
    Logic: Conveyor,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Visual: ConveyorVisual as any,
    createVisual: (b, _ctx) => new ConveyorVisual(b as Conveyor),
  },
  hub: {
    Logic: Hub,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Visual: HubVisual as any,
    createVisual: (b, _ctx) => new HubVisual(b as Hub),
  },
  electric_pole: {
    Logic: ElectricPole,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Visual: ElectricPoleVisual as any,
    createVisual: (b, _ctx) => new ElectricPoleVisual(b as ElectricPole),
  },
  chest: {
    Logic: Chest,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Visual: ChestVisual as any,
    createVisual: (b, _ctx) => new ChestVisual(b as Chest),
  },
  battery: {
    Logic: Battery,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Visual: BatteryVisual as any,
    createVisual: (b, _ctx) => new BatteryVisual(b as Battery),
  },
};

export function createBuildingLogic(
  type: string,
  x: number,
  y: number,
  direction: Direction = "north",
): BuildingEntity | null {
  const entry = BuildingRegistry[type];
  if (entry && entry.Logic) {
    return new entry.Logic(x, y, direction);
  }
  // Fallback? Or Error?
  // console.warn(`Unknown building logic type: ${type}`);
  return null;
}

export function createBuildingVisual(
  type: string,
  building: BuildingEntity,
  context: VisualContext,
): VisualEntity {
  const entry = BuildingRegistry[type];
  if (entry) {
    if (entry.createVisual) {
      return entry.createVisual(building, context);
    }
    if (entry.Visual) {
      // Default constructor assuming (building) signature
      return new entry.Visual(building);
    }
  }
  // Default fallback
  // We might need a generic visual if none exists?
  console.warn(`No visual factory for ${type}, using SimpleVisual fallback`);
  // Pass a dummy object3d? This is risky.
  // Better to throw or return a placeholder.
  // Use SimpleVisual with empty group?
  // return new SimpleVisual(new THREE.Group());
  throw new Error(`Could not create visual for ${type}`);
}
