/**
 * Shop Configuration
 *
 * Defines the items available in the shop, their base costs, and price scaling.
 */

import { BuildingId } from "../skill-tree/SkillTreeConfig";
import { getBuildingConfig } from "../../BuildingConfig";

export interface ShopItemConfig {
  id: BuildingId;
  baseCost: Record<string, number>;
  /** How much the cost increases with each purchase (e.g., 2.0 = double price) */
  priceMultiplier: number;
  /** Initial count given for free (optional, defaults to 0) */
  initialCount?: number;
}

export const SHOP_CONFIG: Record<string, ShopItemConfig> = {
  extractor: {
    id: "extractor",
    baseCost: { iron: 50 },
    priceMultiplier: 2.5,
    initialCount: 0,
  },
  chest: {
    id: "chest",
    baseCost: { wood: 30 },
    priceMultiplier: 2.0,
    initialCount: 0,
  },
};

/**
 * Calculate the cost of the next purchase for a building
 */
export function getNextPurchaseCost(
  buildingId: string,
  purchasedCount: number,
): Record<string, number> {
  const config = SHOP_CONFIG[buildingId];
  if (!config) return {};

  const cost: Record<string, number> = {};
  const multiplier = Math.pow(config.priceMultiplier, purchasedCount);

  for (const [resource, amount] of Object.entries(config.baseCost)) {
    cost[resource] = Math.floor(amount * multiplier);
  }

  return cost;
}

/**
 * Get the total allowed count for a building
 */
export function getAllowedCount(
  buildingId: string,
  purchasedCount: number,
): number {
  const shopConfig = SHOP_CONFIG[buildingId];
  if (shopConfig) {
    return (shopConfig.initialCount || 0) + purchasedCount;
  }

  // Fallback to static config if not a shop item
  const buildingConfig = getBuildingConfig(buildingId);
  return buildingConfig?.maxCount ?? Infinity;
}
