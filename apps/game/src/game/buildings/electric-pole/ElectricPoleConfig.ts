import type { ElectricPoleConfigType } from "../BuildingConfig";

export const ELECTRIC_POLE_CONFIG: ElectricPoleConfigType = {
  id: "electric_pole",
  name: "Electric Pole",
  type: "electric_pole",
  cost: { copper: 3, iron: 1 },
  locked: true,
  hasMenu: false,
  description: "Extends power range.",
  powerConfig: {
    type: "relay",
    rate: 0,
    range: 8,
  },
};
