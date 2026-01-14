import {
  BaseBuildingConfig,
  BuildingUpgrade,
  ConfigOf,
  IIOBuilding,
  IPowered,
} from "../BuildingConfig";

export interface Recipe {
  id: string;
  input: string; // Resource ID (e.g., 'iron_ore')
  output: string; // Resource ID (e.g., 'iron_ingot')
  inputCount: number; // Number of input items consumed per craft
  duration: number; // Seconds
  unlockCost: Record<string, number>; // Cost to unlock this recipe in the HUB
}

export const FURNACE_RECIPES: Recipe[] = [
  {
    id: "iron_ingot",
    input: "iron_ore",
    output: "iron_ingot",
    inputCount: 5,
    duration: 2.0,
    unlockCost: { iron_ore: 100 },
  },
  {
    id: "copper_ingot",
    input: "copper_ore",
    output: "copper_ingot",
    inputCount: 5,
    duration: 3.0,
    unlockCost: { copper_ore: 80 },
  },
  {
    id: "gold_ingot",
    input: "gold_ore",
    output: "gold_ingot",
    inputCount: 3,
    duration: 4.0,
    unlockCost: { gold_ore: 50 },
  },
];

export interface IFurnace {
  processingSpeed: number; // Multiplier
  queueSize: number; // Input buffer size
  parallelProcessing: number; // How many items can be processed at once
}

export type FurnaceConfigType = BaseBuildingConfig &
  ConfigOf<IPowered> &
  ConfigOf<IIOBuilding> &
  ConfigOf<IFurnace> & {
    recipes: Recipe[];
    upgrades: BuildingUpgrade[];
  };

export const FURNACE_CONFIG: FurnaceConfigType = {
  id: "furnace",
  name: "Furnace",
  type: "furnace",
  category: "production",
  description: "Smelts ores into ingots.",
  locked: true,
  hasMenu: true,
  width: 1,
  height: 2,
  cost: {
    stone: 20,
    copper_wire: 10,
  },

  // IPowered
  powerConfig: {
    type: "consumer",
    rate: 20, // kW
  },

  // Shop Config
  shop: {
    baseCost: { copper_ingot: 20 },
    priceMultiplier: 1.5,
    initialCount: 0,
  },

  // IIOBuilding
  io: {
    hasInput: true,
    hasOutput: true,
    inputSide: "back",
    outputSide: "front",
    showArrow: true,
  },

  // IFurnace
  processingSpeed: 1.0,
  queueSize: 20,
  parallelProcessing: 1,

  recipes: FURNACE_RECIPES,

  upgrades: [
    {
      level: 1,
      name: "upgrade.furnace.speed.1.name",
      description: "upgrade.furnace.speed.1.desc",
      cost: { iron_ingot: 50 },
      effects: [
        { type: "multiplier", stat: "processingSpeed", value: 1.5 }, // +50% speed
      ],
    },
    {
      level: 2,
      name: "upgrade.furnace.parallel.1.name",
      description: "upgrade.furnace.parallel.1.desc",
      cost: { iron_ingot: 200, copper_ingot: 100 },
      effects: [
        { type: "additive", stat: "parallelProcessing", value: 1 }, // +1 parallel slot
      ],
    },
    {
      level: 3,
      name: "upgrade.furnace.queue.1.name",
      description: "upgrade.furnace.queue.1.desc",
      cost: { gold_ingot: 50 },
      effects: [
        { type: "additive", stat: "queueSize", value: 5 }, // +5 queue slots
      ],
    },
  ],
};
