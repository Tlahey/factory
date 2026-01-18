import { BaseBuildingConfig, ConfigOf, IIOBuilding } from "../BuildingConfig";

export type ConveyorMergerConfigType = BaseBuildingConfig &
  ConfigOf<IIOBuilding> & {
    id: "conveyor_merger";
    type: "conveyor_merger";
    speed: number;
  };

export const CONVEYOR_MERGER_CONFIG: ConveyorMergerConfigType = {
  id: "conveyor_merger",
  name: "Conveyor Merger",
  type: "conveyor_merger",
  category: "logistics",
  cost: { iron_plate: 4, copper_wire: 4 },
  locked: true,
  description: "Merges three input belts into one output belt.",
  hasMenu: false,
  io: {
    hasInput: true,
    hasOutput: true,
    showArrow: true,
    inputSide: "back",
    outputSide: "front",
  },
  speed: 60, // Items per minute
};
