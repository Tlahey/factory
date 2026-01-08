import type { HubConfigType } from "../BuildingConfig";

export const HUB_CONFIG: HubConfigType = {
  id: "hub",
  name: "Central Hub",
  type: "hub",
  cost: 50,
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
