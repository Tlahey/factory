import {
  BaseBuildingConfig,
  ConfigOf,
  IPowered,
  IIOBuilding,
  IPowerConnectable,
  IUpgradable,
} from "../BuildingConfig";

/**
 * Biomass-specific interface for consumption mechanics
 */
export interface IBiomassConsumer {
  /** Time in seconds to consume one unit of wood */
  consumptionTime: number;
  /** Base power generation rate */
  basePowerRate: number;
  /** Power fluctuation range (+/- this value) */
  powerFluctuation: number;
  /** Maximum wood storage capacity */
  fuelCapacity: number;
}

export type BiomassPlantConfigType = BaseBuildingConfig &
  ConfigOf<IPowered> &
  ConfigOf<IIOBuilding> &
  ConfigOf<IPowerConnectable> &
  ConfigOf<IUpgradable> &
  ConfigOf<IBiomassConsumer> & {
    id: "biomass_plant";
    type: "biomass_plant";
  };

export const BIOMASS_PLANT_CONFIG: BiomassPlantConfigType = {
  id: "biomass_plant",
  name: "Biomass Power Plant",
  type: "biomass_plant",
  category: "power",
  cost: { stone: 30, iron: 20 },
  locked: true,
  hasMenu: true,
  width: 1,
  height: 1,
  description:
    "Generates electricity by burning wood. Feed it biomass to produce power.",
  io: {
    hasInput: true,
    hasOutput: false,
    showArrow: true,
    inputSide: "back",
  },
  powerConfig: {
    type: "producer",
    rate: 20, // Base rate, will fluctuate
  },
  maxConnections: 1,
  // Biomass-specific config
  consumptionTime: 5, // 5 seconds per wood
  basePowerRate: 20,
  powerFluctuation: 3, // +/- 3 units fluctuation
  fuelCapacity: 20, // Can store up to 20 wood
  upgrades: [
    {
      level: 1,
      name: "upgrade.biomass_plant.efficiency_1.name",
      description: "upgrade.biomass_plant.efficiency_1.description",
      cost: { stone: 100, iron: 50 },
      effects: [{ type: "multiplier", stat: "basePowerRate", value: 1.25 }],
    },
    {
      level: 2,
      name: "upgrade.biomass_plant.capacity_1.name",
      description: "upgrade.biomass_plant.capacity_1.description",
      cost: { stone: 150, iron: 75, wood: 50 },
      effects: [{ type: "additive", stat: "fuelCapacity", value: 10 }],
    },
    {
      level: 3,
      name: "upgrade.biomass_plant.speed_1.name",
      description: "upgrade.biomass_plant.speed_1.description",
      cost: { iron: 200, copper_ingot: 50 },
      effects: [{ type: "multiplier", stat: "consumptionTime", value: 0.8 }], // 20% faster = 0.8x time
    },
  ],
  shop: {
    baseCost: { stone: 75, iron: 50 },
    priceMultiplier: 2.0,
    initialCount: 0,
  },
};
