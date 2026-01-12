import type { ConveyorConfigType } from "../BuildingConfig";

export const CONVEYOR_CONFIG: ConveyorConfigType = {
  id: "conveyor",
  name: "Conveyor Belt",
  type: "conveyor",
  cost: { iron: 1 },
  locked: true,
  hasMenu: false,
  description: "Transports items.",
  io: {
    hasInput: true,
    hasOutput: true,
    showArrow: true,
    inputSide: "back",
    outputSide: "front",
  },
  speed: 60, // items per minute
};
