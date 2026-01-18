/**
 * Shop Utilities
 *
 * Provides utility functions for the shop system.
 * Shop configuration is now defined directly in each building's config file.
 */

import { BUILDINGS, BuildingConfig, BuildingId } from "../../BuildingConfig";

/**
 * Get all buildings that are available in the shop
 */
export function getShopItems(): BuildingConfig[] {
  return Object.values(BUILDINGS).filter(
    (b) => b.shop !== undefined,
  ) as BuildingConfig[];
}

/**
 * Calculate the cost of the next purchase for a building
 */
export function getNextPurchaseCost(
  buildingId: BuildingId,
  purchasedCount: number,
): Record<string, number> {
  const config = BUILDINGS[buildingId];
  if (!config?.shop) return {};

  const cost: Record<string, number> = {};
  const multiplier = Math.pow(config.shop.priceMultiplier, purchasedCount);

  for (const [resource, amount] of Object.entries(config.shop.baseCost)) {
    cost[resource] = Math.floor(amount * multiplier);
  }

  return cost;
}

/**
 * Get the total allowed count for a building
 */
export function getAllowedCount(
  buildingId: BuildingId,
  purchasedCount: number,
): number {
  const config = BUILDINGS[buildingId];

  if (config?.shop) {
    return (config.shop.initialCount || 0) + purchasedCount;
  }

  // Fallback to static maxCount if not a shop item
  return config?.maxCount ?? Infinity;
}
