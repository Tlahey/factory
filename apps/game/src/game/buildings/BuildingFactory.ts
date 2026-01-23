import { BuildingEntity } from "../entities/BuildingEntity";
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
import { BiomassPlant } from "./biomass-plant/BiomassPlant";

type Direction = "north" | "south" | "east" | "west";

// Central Registry
export const BuildingRegistry: Partial<
  Record<BuildingId, BuildingRegistryEntry>
> = {
  extractor: {
    Logic: Extractor,
  },
  conveyor: {
    Logic: Conveyor,
  },
  conveyor_merger: {
    Logic: ConveyorMerger,
  },
  conveyor_splitter: {
    Logic: ConveyorSplitter,
  },
  hub: {
    Logic: Hub,
  },
  electric_pole: {
    Logic: ElectricPole,
  },
  chest: {
    Logic: Chest,
  },
  battery: {
    Logic: Battery,
  },
  furnace: {
    Logic: Furnace,
  },
  sawmill: {
    Logic: Sawmill,
  },
  biomass_plant: {
    Logic: BiomassPlant,
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
