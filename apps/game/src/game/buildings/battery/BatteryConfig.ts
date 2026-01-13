import {
  BaseBuildingConfig,
  ConfigOf,
  IIOBuilding,
  IPowered,
  BuildingUpgrade,
} from "../BuildingConfig";

export interface IBattery {
  capacity: number;
  maxChargeRate: number;
  maxDischargeRate: number;
}

export type BatteryConfigType = BaseBuildingConfig &
  ConfigOf<IIOBuilding> &
  ConfigOf<IPowered> &
  ConfigOf<IBattery> & { upgrades: BuildingUpgrade[] };

export const BATTERY_CONFIG: BatteryConfigType = {
  id: "battery",
  name: "Battery",
  type: "battery",
  category: "power",
  cost: { copper: 20, iron: 10 },
  locked: true,
  hasMenu: true,
  description: "Stores excess energy and releases it when needed.",
  width: 1,
  height: 1,
  io: {
    hasInput: true,
    hasOutput: true,
    inputSide: "left",
    outputSide: "right",
    showArrow: false,
  },
  powerConfig: {
    type: "relay", // Takes participation in grid, but logic is custom
    rate: 0,
  },
  capacity: 2000, // 2000 kWs (kJ?)
  maxChargeRate: 50, // 50 kW
  maxDischargeRate: 50, // 50 kW
  shop: {
    baseCost: { copper: 50 },
    priceMultiplier: 2.0,
    initialCount: 0,
  },
  upgrades: [
    {
      level: 1,
      name: "upgrade.battery.capacity_1.name",
      description: "upgrade.battery.capacity_1.description",
      cost: { copper: 50 },
      effects: [
        { type: "multiplier", stat: "capacity", value: 1.5 },
        { type: "multiplier", stat: "maxChargeRate", value: 1.5 },
        { type: "multiplier", stat: "maxDischargeRate", value: 1.5 },
      ],
    },
    {
      level: 2,
      name: "upgrade.battery.capacity_2.name",
      description: "upgrade.battery.capacity_2.description",
      cost: { copper: 100, iron: 50 },
      effects: [
        { type: "multiplier", stat: "capacity", value: 2.0 },
        { type: "multiplier", stat: "maxChargeRate", value: 2.0 },
        { type: "multiplier", stat: "maxDischargeRate", value: 2.0 },
      ],
    },
  ],
};
