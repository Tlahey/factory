export const RESOURCES = [
  "stone",
  "coal",
  "wood",
  "iron_ore",
  "copper_ore",
  "gold_ore",
  "iron_ingot",
  "copper_ingot",
  "gold_ingot",
  "copper_wire",
  "iron_rod",
  "iron_plate",
  "concrete",
  "limestone",
] as const;

export type ResourceType = (typeof RESOURCES)[number];

export const isResource = (id: string): id is ResourceType => {
  return RESOURCES.includes(id as ResourceType);
};
