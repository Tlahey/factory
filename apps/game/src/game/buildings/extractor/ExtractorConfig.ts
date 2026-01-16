import {
  BaseBuildingConfig,
  ConfigOf,
  IExtractable,
  IPowered,
  IIOBuilding,
  IConnectable,
  IUpgradable,
} from "../BuildingConfig";

export type ExtractorConfigType = BaseBuildingConfig &
  ConfigOf<IExtractable> &
  ConfigOf<IPowered> &
  ConfigOf<IIOBuilding> &
  ConfigOf<IConnectable> &
  ConfigOf<IUpgradable>;
// import { Extractor } from "./Extractor";
// import { BuildingEntity } from "../../entities/BuildingEntity";

export const EXTRACTOR_CONFIG: ExtractorConfigType = {
  id: "extractor",
  name: "Extractor",
  type: "extractor",
  category: "production",
  cost: { iron: 10 },
  locked: true,
  hasMenu: true,
  description: "Extracts resources from the ground. Requires Energy.",
  io: {
    hasInput: false,
    hasOutput: true,
    showArrow: true,
    outputSide: "front", // Output in direction extractor faces
  },
  extractionRate: 60, // items per minute
  powerConfig: {
    type: "consumer",
    rate: 20,
  },
  maxConnections: 1,
  shop: {
    baseCost: { iron: 50 },
    priceMultiplier: 2.5,
    initialCount: 0,
  },
  upgrades: [
    {
      level: 1,
      name: "upgrade.extractor.speed_1.name",
      description: "upgrade.extractor.speed_1.description",
      cost: { stone: 50 },
      effects: [{ type: "multiplier", stat: "extractionRate", value: 1.2 }],
    },
    {
      level: 2,
      name: "upgrade.extractor.speed_2.name",
      description: "upgrade.extractor.speed_2.description",
      cost: { stone: 100, iron: 20 }, // Multiple resources
      effects: [{ type: "multiplier", stat: "extractionRate", value: 1.4 }],
    },
    {
      level: 3,
      name: "upgrade.extractor.speed_3.name",
      description: "upgrade.extractor.speed_3.description",
      cost: { stone: 200, iron: 50, copper: 25 }, // Multiple resources
      effects: [{ type: "multiplier", stat: "extractionRate", value: 1.6 }],
    },
  ],
};
