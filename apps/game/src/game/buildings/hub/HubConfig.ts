import {
  BaseBuildingConfig,
  ConfigOf,
  IPowered,
  IIOBuilding,
  IConnectable,
  IUpgradable,
} from "../BuildingConfig";

export type HubConfigType = BaseBuildingConfig &
  ConfigOf<IPowered> &
  ConfigOf<IIOBuilding> &
  ConfigOf<IConnectable> &
  ConfigOf<IUpgradable>;

export const HUB_CONFIG: HubConfigType = {
  id: "hub",
  name: "Central Hub",
  type: "hub",
  category: "special",
  cost: { stone: 0 }, // First one is free logic handled in input system, this is replacement cost? Or maybe logic overrides.
  // Actually, let's make it cost 0 for now as it's the starter. The "only 1" logic handles abuse.
  locked: false,
  hasMenu: true,
  description: "Generates electricity from solar panels.",
  maxCount: 1,
  width: 2,
  height: 2,
  io: {
    hasInput: false,
    hasOutput: false,
  },
  powerConfig: {
    type: "producer",
    rate: 60,
  },
  maxConnections: 1,
  upgrades: [
    {
      level: 1,
      name: "upgrade.hub.power_1.name",
      description: "upgrade.hub.power_1.description",
      cost: { stone: 100 },
      effects: [{ type: "multiplier", stat: "powerRate", value: 1.25 }],
    },
    {
      level: 2,
      name: "upgrade.hub.power_2.name",
      description: "upgrade.hub.power_2.description",
      cost: { stone: 200 },
      effects: [{ type: "multiplier", stat: "powerRate", value: 1.5 }],
    },
  ],
};
