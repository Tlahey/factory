import type { ConveyorConfigType } from "../BuildingConfig";

export const CONVEYOR_CONFIG: ConveyorConfigType = {
  id: "conveyor",
  name: "Conveyor Belt",
  type: "conveyor",
  cost: 2,
  hasMenu: false,
  description: "Transports items.",
  io: {
    hasInput: true,
    hasOutput: true,
    showArrow: false,
  },
  speed: 60, // items per minute
};
