import {
  BaseBuildingConfig,
  ConfigOf,
  IPowered,
  IPowerConnectable,
  IUpgradable,
} from "../BuildingConfig";

export type ElectricPoleConfigType = BaseBuildingConfig &
  ConfigOf<IPowered> &
  ConfigOf<IPowerConnectable> &
  ConfigOf<IUpgradable>;

export const ELECTRIC_POLE_CONFIG: ElectricPoleConfigType = {
  id: "electric_pole",
  name: "Electric Pole",
  type: "electric_pole",
  category: "power",
  cost: { copper: 3, iron: 1 },
  locked: true,
  hasMenu: false,
  description: "Extends power range.",
  powerConfig: {
    type: "relay",
    rate: 0,
    range: 8,
  },
  maxConnections: 3,
  upgrades: [
    {
      level: 1,
      name: "building.electric_pole.upgrade.connections.name",
      description: "building.electric_pole.upgrade.connections.description",
      cost: { copper: 50 },
      effects: [
        {
          type: "additive",
          stat: "maxConnections",
          value: 1,
        },
      ],
    },
  ],
};
