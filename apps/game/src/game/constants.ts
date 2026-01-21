export const TILE_SIZE = 64;
export const WORLD_WIDTH = 50;
export const WORLD_HEIGHT = 50;
export const STACK_SIZE = 100;

/**
 * Represents the rarity level of resource tiles.
 * Used for balancing resource distribution.
 */
export enum ResourceRarity {
  COMMON = "common", // e.g., Wood, Stone
  UNCOMMON = "uncommon", // e.g., Iron, Copper
  RARE = "rare", // e.g., Gold
}

export enum TileType {
  EMPTY = 0,
  GRASS = 1,
  STONE = 2,
  WATER = 3,
  SAND = 4,
  TREE = 5,
}
