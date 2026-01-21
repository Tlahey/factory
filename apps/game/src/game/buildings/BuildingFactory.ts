import { BuildingEntity } from "../entities/BuildingEntity";
import { ParticleSystem } from "../visuals/ParticleSystem";
import { VisualEntity } from "../visuals/VisualEntity";
import { BuildingRegistryEntry, BuildingId } from "./BuildingConfig";

// Logic Imports
import { Extractor } from "./extractor/Extractor";
import { Conveyor } from "./conveyor/Conveyor";
import { ConveyorMerger } from "./conveyor-merger/ConveyorMerger";
import { ConveyorSplitter } from "./conveyor-splitter/ConveyorSplitter";
import { Hub } from "./hub/Hub";
import { ElectricPole } from "./electric-pole/ElectricPole";
import { Chest } from "./chest/Chest";
import { Battery } from "./battery/Battery";
import { Furnace } from "./furnace/Furnace";
import { Sawmill } from "./sawmill/Sawmill";

// Visual Imports
import { ExtractorVisual } from "./extractor/ExtractorVisual";
import { ConveyorVisual } from "./conveyor/ConveyorVisual";
import { ConveyorMergerVisual } from "./conveyor-merger/ConveyorMergerVisual";
import { ConveyorSplitterVisual } from "./conveyor-splitter/ConveyorSplitterVisual";
import { HubVisual } from "./hub/HubVisual";
import { ElectricPoleVisual } from "./electric-pole/ElectricPoleVisual";
import { ChestVisual } from "./chest/ChestVisual";
import { BatteryVisual } from "./battery/BatteryVisual";
import { FurnaceVisual } from "./furnace/FurnaceVisual";
import { SawmillVisual } from "./sawmill/SawmillVisual";

// Context for Visual Creation
export interface VisualContext {
  particleSystem: ParticleSystem;
}

type Direction = "north" | "south" | "east" | "west";

// Central Registry
// exclude 'cable' as it doesn't have logic/visual classes in this factory
export const BuildingRegistry: Partial<
  Record<BuildingId, BuildingRegistryEntry>
> = {
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
    createVisual: (b) => new ConveyorVisual(b as Conveyor),
  },
  conveyor_merger: {
    Logic: ConveyorMerger,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Visual: ConveyorMergerVisual as any,
    createVisual: (b) => new ConveyorMergerVisual(b as ConveyorMerger),
  },
  conveyor_splitter: {
    Logic: ConveyorSplitter,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Visual: ConveyorSplitterVisual as any,
    createVisual: (b) => new ConveyorSplitterVisual(b as ConveyorSplitter),
  },
  hub: {
    Logic: Hub,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Visual: HubVisual as any,
    createVisual: (b) => new HubVisual(b as Hub),
  },
  electric_pole: {
    Logic: ElectricPole,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Visual: ElectricPoleVisual as any,
    createVisual: (b) => new ElectricPoleVisual(b as ElectricPole),
  },
  chest: {
    Logic: Chest,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Visual: ChestVisual as any,
    createVisual: (b) => new ChestVisual(b as Chest),
  },
  battery: {
    Logic: Battery,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Visual: BatteryVisual as any,
    createVisual: (b) => new BatteryVisual(b as Battery),
  },
  furnace: {
    Logic: Furnace,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Visual: FurnaceVisual as any,
    createVisual: (b, ctx) =>
      new FurnaceVisual(b as Furnace, ctx.particleSystem),
  },
  sawmill: {
    Logic: Sawmill,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Visual: SawmillVisual as any,
    createVisual: (b, ctx) =>
      new SawmillVisual(b as Sawmill, ctx.particleSystem),
  },
};

export function createBuildingLogic(
  type: BuildingId,
  x: number,
  y: number,
  direction: Direction = "north",
): BuildingEntity | null {
  const entry = BuildingRegistry[type];
  if (entry && entry.Logic) {
    return new entry.Logic(x, y, direction);
  }
  return null;
}

export function createBuildingVisual(
  type: BuildingId,
  building: BuildingEntity,
  context: VisualContext,
): VisualEntity {
  const entry = BuildingRegistry[type as BuildingId];
  if (entry) {
    if (entry.createVisual) {
      return entry.createVisual(building, context);
    }
    if (entry.Visual) {
      return new entry.Visual(building);
    }
  }
  throw new Error(`Could not create visual for ${type}`);
}
