import {
  BaseBuildingConfig,
  ConfigOf,
  IPowered,
  IIOBuilding,
  IPowerConnectable,
  IUpgradable,
  IRecipeBuilding,
} from "../BuildingConfig";

export interface IFurnace {
  processingSpeed: number; // Base processing speed multiplier
  queueSize: number; // Input queue capacity
  parallelProcessing: number; // How many items can be processed at once
}

export type FurnaceConfigType = BaseBuildingConfig &
  ConfigOf<IPowered> &
  ConfigOf<IIOBuilding> &
  ConfigOf<IPowerConnectable> &
  ConfigOf<IUpgradable> &
  ConfigOf<IFurnace> &
  ConfigOf<IRecipeBuilding> & {
    id: "furnace";
    type: "furnace";
  };

export const FURNACE_CONFIG: FurnaceConfigType = {
  id: "furnace",
  name: "Furnace",
  type: "furnace",
  category: "production",
  cost: { iron: 15, stone: 10 },
  locked: true,
  hasMenu: true,
  width: 1,
  height: 2,
  description:
    "Smelts raw ore into refined ingots. Requires power and input materials.",
  io: {
    hasInput: true,
    hasOutput: true,
    showArrow: true,
    inputSide: "back",
    outputSide: "front",
  },
  powerConfig: {
    type: "consumer",
    rate: 30,
  },
  maxConnections: 1,
  processingSpeed: 1.0,
  queueSize: 20,
  parallelProcessing: 1,
  recipes: [
    {
      id: "iron_ingot",
      input: "iron_ore",
      output: "iron_ingot",
      inputCount: 1,
      duration: 2,
      unlockCost: { iron_ore: 10 },
    },
    {
      id: "copper_ingot",
      input: "copper_ore",
      output: "copper_ingot",
      inputCount: 1,
      duration: 2,
      unlockCost: { copper_ore: 10 },
    },
    {
      id: "gold_ingot",
      input: "gold_ore",
      output: "gold_ingot",
      inputCount: 1,
      duration: 3,
      unlockCost: { gold_ore: 10 },
    },
  ],
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
  shop: {
    baseCost: { iron: 75, stone: 50 },
    priceMultiplier: 2.0,
    initialCount: 0,
  },
};

export const FURNACE_RECIPES = FURNACE_CONFIG.recipes;
