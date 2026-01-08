import { ChestConfigType } from "../BuildingConfig";
// import { BuildingEntity } from "../../entities/BuildingEntity";

export const CHEST_CONFIG: ChestConfigType = {
  id: "chest",
  name: "Chest",
  type: "chest",
  cost: { wood: 10 },
  locked: true,
  hasMenu: true,
  description: "Stores items.",
  io: {
    hasInput: true,
    hasOutput: true,
    showArrow: true,
    inputSide: "front", // Input where chest faces
    outputSide: "back", // Output opposite to input
  },
  maxCount: 1,
  maxSlots: 5,
  upgrades: [
    {
      level: 1,
      name: "upgrade.chest.slots_1.name",
      description: "upgrade.chest.slots_1.description",
      cost: { stone: 30 },
      effects: [{ type: "additive", stat: "maxSlots", value: 2 }],
    },
    {
      level: 2,
      name: "upgrade.chest.slots_2.name",
      description: "upgrade.chest.slots_2.description",
      cost: { stone: 60 },
      effects: [{ type: "additive", stat: "maxSlots", value: 4 }],
    },
  ],
};
