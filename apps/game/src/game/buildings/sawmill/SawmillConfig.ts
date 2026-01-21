import {
  BaseBuildingConfig,
  ConfigOf,
  IExtractable,
  IPowered,
  IIOBuilding,
  IPowerConnectable,
  IUpgradable,
} from "../BuildingConfig";

export type SawmillConfigType = BaseBuildingConfig &
  ConfigOf<IExtractable> &
  ConfigOf<IPowered> &
  ConfigOf<IIOBuilding> &
  ConfigOf<IPowerConnectable> &
  ConfigOf<IUpgradable> & {
    id: "sawmill";
    type: "sawmill";
  };

export const SAWMILL_CONFIG: SawmillConfigType = {
  id: "sawmill",
  name: "Sawmill",
  type: "sawmill",
  category: "production",
  cost: { iron: 15, wood: 5 },
  locked: true,
  hasMenu: true,
  description: "Harvests wood from trees. Place on tree tiles.",
  io: {
    hasInput: false,
    hasOutput: true,
    showArrow: true,
    outputSide: "front",
  },
  extractionRate: 45, // Items per minute (slower than extractor)
  powerConfig: {
    type: "consumer",
    rate: 15, // Less power than extractor
  },
  maxConnections: 1,
  shop: {
    baseCost: { iron: 40, stone: 20 },
    priceMultiplier: 2.0,
    initialCount: 0,
  },
  upgrades: [
    {
      level: 1,
      name: "upgrade.sawmill.blade_1.name",
      description: "upgrade.sawmill.blade_1.description",
      cost: { wood: 50 },
      effects: [{ type: "multiplier", stat: "extractionRate", value: 1.2 }],
    },
    {
      level: 2,
      name: "upgrade.sawmill.blade_2.name",
      description: "upgrade.sawmill.blade_2.description",
      cost: { wood: 100, iron: 30 },
      effects: [{ type: "multiplier", stat: "extractionRate", value: 1.4 }],
    },
    {
      level: 3,
      name: "upgrade.sawmill.blade_3.name",
      description: "upgrade.sawmill.blade_3.description",
      cost: { wood: 200, iron: 75, copper: 30 },
      effects: [{ type: "multiplier", stat: "extractionRate", value: 1.6 }],
    },
  ],
};
