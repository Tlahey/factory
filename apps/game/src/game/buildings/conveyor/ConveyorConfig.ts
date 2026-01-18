import {
  BaseBuildingConfig,
  ConfigOf,
  IIOBuilding,
  ITransportable,
  IUpgradable,
} from "../BuildingConfig";

export type ConveyorConfigType = BaseBuildingConfig &
  ConfigOf<IIOBuilding> &
  ConfigOf<ITransportable> &
  Partial<ConfigOf<IUpgradable>> & {
    id: "conveyor";
    type: "conveyor";
  };

export const CONVEYOR_CONFIG: ConveyorConfigType = {
  id: "conveyor",
  name: "Conveyor Belt",
  type: "conveyor",
  category: "logistics",
  cost: { iron: 1 },
  locked: true,
  hasMenu: true,
  description: "Transports items.",
  io: {
    hasInput: true,
    hasOutput: true,
    showArrow: true,
    inputSide: "back",
    outputSide: "front",
  },
  speed: 60, // items per minute
  upgrades: [
    {
      level: 1,
      name: "upgrade.conveyor.speed_1.name",
      description: "upgrade.conveyor.speed_1.description",
      cost: { iron: 100 },
      effects: [{ type: "multiplier", stat: "speed", value: 1.5 }],
    },
    {
      level: 2,
      name: "upgrade.conveyor.speed_2.name",
      description: "upgrade.conveyor.speed_2.description",
      cost: { iron: 250, copper: 50 },
      effects: [{ type: "multiplier", stat: "speed", value: 2.0 }],
    },
  ],
};
