import {
  BaseBuildingConfig,
  ConfigOf,
  IPowered,
  IPowerConnectable,
  IUpgradable,
} from "../BuildingConfig";

export type SolarPanelConfigType = BaseBuildingConfig &
  ConfigOf<IPowered> &
  ConfigOf<IPowerConnectable> &
  ConfigOf<IUpgradable> & {
    id: "solar_panel";
    type: "solar_panel";
  };

export const SOLAR_PANEL_CONFIG: SolarPanelConfigType = {
  id: "solar_panel",
  name: "Solar Panel",
  type: "solar_panel",
  category: "power",
  cost: { stone: 10, iron_ingot: 10, copper_ingot: 20 },
  // Checking cost: stone, iron, copper_ingot, wood are standard.
  // Re-evaluating cost: Solar panel needs "silicon" -> sand? or just copper + iron.
  // Let's use: 20 Iron Ingot + 20 Copper Ingot + 10 Stone (glass base).
  placement: {
    canPlaceOnResources: true,
  },
  locked: false, // Start unlocked for testing? Or locked if skill tree. Plan said locked.
  hasMenu: true,
  width: 1,
  height: 1,
  description: "Generates clean energy from sunlight. Efficiency depends on the time of day and cloud cover.",
  powerConfig: {
    type: "producer",
    rate: 5, // Peak generation reduced for 1x1 size
  },
  maxConnections: 2, // Daisy chaining
  upgrades: [
    {
      level: 1,
      name: "upgrade.solar_panel.efficiency_1.name",
      description: "upgrade.solar_panel.efficiency_1.description",
      cost: { iron_ingot: 50, copper_ingot: 50 },
      effects: [{ type: "multiplier", stat: "powerConfig.rate", value: 1.2 }],
    },
    {
      level: 2,
      name: "upgrade.solar_panel.storage_1.name",
      description: "upgrade.solar_panel.storage_1.description",
      cost: { iron_ingot: 100, gold_ingot: 20 },
      effects: [{ type: "additive", stat: "maxConnections", value: 1 }],
    },
  ],
  shop: {
    baseCost: { copper_ingot: 100 },
    priceMultiplier: 1.5,
    initialCount: 0,
  }
};
