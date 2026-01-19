import { BaseBuildingConfig, ConfigOf, IIOBuilding } from "../BuildingConfig";

export type ConveyorSplitterConfigType = BaseBuildingConfig &
  ConfigOf<IIOBuilding> & {
    id: "conveyor_splitter";
    type: "conveyor_splitter";
    speed: number;
  };

export const CONVEYOR_SPLITTER_CONFIG: ConveyorSplitterConfigType = {
  id: "conveyor_splitter",
  name: "Conveyor Splitter",
  type: "conveyor_splitter",
  category: "logistics",
  cost: { iron_plate: 4, copper_wire: 4 },
  locked: true,
  description: "Splits one input belt into three output belts.",
  hasMenu: false,
  io: {
    hasInput: true,
    hasOutput: true,
    showArrow: true,
    inputSide: "back",
    outputSide: "front",
    validInputSides: ["back"],
    validOutputSides: ["front", "left", "right"],
  },
  speed: 60, // Items per minute
};
