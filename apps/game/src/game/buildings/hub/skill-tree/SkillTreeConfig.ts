/**
 * Skill Tree Configuration
 *
 * Defines the structure of the skill tree as a graph.
 * Each node represents either:
 * - A building unlock (type: "unlock")
 * - An upgrade for a building (type: "upgrade")
 *
 * All nodes originate from a central root node.
 * Buildings must be unlocked before they can be upgraded.
 */

import { BuildingId } from "../../BuildingConfig";

// Re-export for consumers
export type { BuildingId };

// Skill node types
export type SkillNodeType = "unlock" | "upgrade" | "tech";

export interface SkillNode {
  /** Unique identifier for this skill node, e.g., "extractor_unlock", "extractor_1" */
  id: string;
  /** Type of node: unlock a building or upgrade it */
  type: SkillNodeType;
  /** Building type this skill affects */
  buildingId: BuildingId;
  /** Upgrade level (0 for unlock, 1+ for upgrades) */
  level: number;
  /** IDs of prerequisite nodes that must be unlocked first */
  requires: string[];
  /** Position in the skill tree UI (for rendering) */
  position: { x: number; y: number };
  /** Time required to unlock in seconds (0 = instant) */
  unlockDuration: number;
}

/**
 * The skill tree graph definition.
 * All nodes start from a central "root" point.
 *
 * Progression is built around the Hub itself: every tier of new buildings is
 * gated behind a Hub upgrade (hub_1, hub_2, ...), which in turn requires the
 * previous tier's buildings to be unlocked first. This keeps the Hub as the
 * mandatory hub (pun intended) of progression instead of an optional side
 * branch, and every building upgrade chains off its own unlock node.
 *
 * Flow:
 * - root -> Tier 1 unlocks (Extractor, Cable, Sawmill)
 * - Tier 1 unlocks -> hub_1 (Hub upgrade, gate) -> Tier 2 unlocks
 * - Tier 2 unlocks -> hub_2 (Hub upgrade, gate) -> Tier 3 unlocks
 * - each building's own upgrade nodes chain off its unlock node
 */
export const SKILL_TREE: SkillNode[] = [
  // === ROOT (Starting Point) ===
  {
    id: "root",
    type: "unlock",
    buildingId: "hub",
    level: 0,
    requires: [],
    position: { x: 2, y: 0 },
    unlockDuration: 0,
  },

  // === TIER 1: Basic resources & power, unlocked directly from the Hub ===
  {
    id: "extractor_unlock",
    type: "unlock",
    buildingId: "extractor",
    level: 0,
    requires: ["root"],
    position: { x: -2, y: 1 },
    unlockDuration: 10,
  },
  {
    id: "cable_unlock",
    type: "unlock",
    buildingId: "cable",
    level: 0,
    requires: ["root"],
    position: { x: 1, y: 1 },
    unlockDuration: 10,
  },
  {
    id: "sawmill_unlock",
    type: "unlock",
    buildingId: "sawmill",
    level: 0,
    requires: ["root"],
    position: { x: 6, y: 1 },
    unlockDuration: 15,
  },

  // === HUB GATE 1: Requires the Tier 1 foundation (mining + power) ===
  {
    id: "hub_1",
    type: "upgrade",
    buildingId: "hub",
    level: 1,
    requires: ["extractor_unlock", "cable_unlock"],
    position: { x: 2, y: 2 },
    unlockDuration: 90,
  },

  // === TIER 2: Logistics & storage of power, unlocked by hub_1 ===
  {
    id: "logistics_tech",
    type: "tech",
    buildingId: "hub", // Still needed for type safety but ignored for tech rendering
    level: 0,
    requires: ["hub_1"],
    position: { x: 2, y: 3 },
    unlockDuration: 20,
  },
  {
    id: "battery_unlock",
    type: "unlock",
    buildingId: "battery",
    level: 0,
    requires: ["hub_1"],
    position: { x: 4, y: 3 },
    unlockDuration: 25,
  },
  {
    id: "biomass_plant_unlock",
    type: "unlock",
    buildingId: "biomass_plant",
    level: 0,
    requires: ["hub_1", "sawmill_unlock"],
    position: { x: 7, y: 3 },
    unlockDuration: 35,
  },

  // === TIER 2 outputs: Conveyor & Chest (Requires Logistics) ===
  {
    id: "conveyor_unlock",
    type: "unlock",
    buildingId: "conveyor",
    level: 0,
    requires: ["logistics_tech"],
    position: { x: 0, y: 4 },
    unlockDuration: 30,
  },
  {
    id: "chest_unlock",
    type: "unlock",
    buildingId: "chest",
    level: 0,
    requires: ["logistics_tech"],
    position: { x: 3, y: 4 },
    unlockDuration: 30,
  },
  {
    id: "conveyor_merger_unlock",
    type: "unlock",
    buildingId: "conveyor_merger",
    level: 0,
    requires: ["conveyor_unlock"],
    position: { x: -1.6, y: 5 },
    unlockDuration: 40,
  },
  {
    id: "conveyor_splitter_unlock",
    type: "unlock",
    buildingId: "conveyor_splitter",
    level: 0,
    requires: ["conveyor_unlock"],
    position: { x: -1, y: 5 },
    unlockDuration: 40,
  },

  // === HUB GATE 2: Requires the full Tier 2 logistics + power foundation ===
  {
    id: "hub_2",
    type: "upgrade",
    buildingId: "hub",
    level: 2,
    requires: ["conveyor_unlock", "chest_unlock", "battery_unlock"],
    position: { x: 2, y: 5 },
    unlockDuration: 150,
  },

  // === TIER 3: Industrialization, unlocked by hub_2 ===
  {
    id: "electric_pole_unlock",
    type: "unlock",
    buildingId: "electric_pole",
    level: 0,
    requires: ["hub_2", "conveyor_unlock", "chest_unlock"],
    position: { x: 1, y: 6 },
    unlockDuration: 60,
  },
  {
    id: "furnace_unlock",
    type: "unlock",
    buildingId: "furnace",
    level: 0,
    requires: ["hub_2", "conveyor_unlock", "chest_unlock"],
    position: { x: 2, y: 6 },
    unlockDuration: 60,
  },
  {
    id: "solar_panel_unlock",
    type: "unlock",
    buildingId: "solar_panel",
    level: 0,
    requires: ["hub_2", "battery_unlock"],
    position: { x: 5, y: 6 },
    unlockDuration: 45,
  },

  // === UPGRADES (each chains off its own building's unlock node) ===

  // Extractor Upgrades
  {
    id: "extractor_1",
    type: "upgrade",
    buildingId: "extractor",
    level: 1,
    requires: ["extractor_unlock"],
    position: { x: -2, y: 2 },
    unlockDuration: 60,
  },
  {
    id: "extractor_2",
    type: "upgrade",
    buildingId: "extractor",
    level: 2,
    requires: ["extractor_1"],
    position: { x: -2, y: 3 },
    unlockDuration: 120,
  },
  {
    id: "extractor_3",
    type: "upgrade",
    buildingId: "extractor",
    level: 3,
    requires: ["extractor_2"],
    position: { x: -2, y: 4 },
    unlockDuration: 180,
  },

  // Sawmill Upgrades
  {
    id: "sawmill_1",
    type: "upgrade",
    buildingId: "sawmill",
    level: 1,
    requires: ["sawmill_unlock"],
    position: { x: 6, y: 2 },
    unlockDuration: 45,
  },
  {
    id: "sawmill_2",
    type: "upgrade",
    buildingId: "sawmill",
    level: 2,
    requires: ["sawmill_1"],
    position: { x: 6, y: 3 },
    unlockDuration: 90,
  },
  {
    id: "sawmill_3",
    type: "upgrade",
    buildingId: "sawmill",
    level: 3,
    requires: ["sawmill_2"],
    position: { x: 6, y: 4 },
    unlockDuration: 150,
  },

  // Conveyor Upgrades
  {
    id: "conveyor_1",
    type: "upgrade",
    buildingId: "conveyor",
    level: 1,
    requires: ["conveyor_unlock"],
    position: { x: 0, y: 5 },
    unlockDuration: 60,
  },
  {
    id: "conveyor_2",
    type: "upgrade",
    buildingId: "conveyor",
    level: 2,
    requires: ["conveyor_1"],
    position: { x: 0, y: 6 },
    unlockDuration: 120,
  },

  // Chest Upgrades
  {
    id: "chest_1",
    type: "upgrade",
    buildingId: "chest",
    level: 1,
    requires: ["chest_unlock"],
    position: { x: 3, y: 5 },
    unlockDuration: 60,
  },
  {
    id: "chest_2",
    type: "upgrade",
    buildingId: "chest",
    level: 2,
    requires: ["chest_1"],
    position: { x: 3, y: 6 },
    unlockDuration: 100,
  },

  // Battery Upgrades
  {
    id: "battery_capacity_1",
    type: "upgrade",
    buildingId: "battery",
    level: 1,
    requires: ["battery_unlock"],
    position: { x: 4, y: 4 },
    unlockDuration: 45,
  },
  {
    id: "battery_capacity_2",
    type: "upgrade",
    buildingId: "battery",
    level: 2,
    requires: ["battery_capacity_1"],
    position: { x: 4, y: 5 },
    unlockDuration: 90,
  },

  // Solar Panel Upgrades
  {
    id: "solar_panel_efficiency_1",
    type: "upgrade",
    buildingId: "solar_panel",
    level: 1,
    requires: ["solar_panel_unlock"],
    position: { x: 5, y: 7 },
    unlockDuration: 60,
  },
  {
    id: "solar_panel_storage_1",
    type: "upgrade",
    buildingId: "solar_panel",
    level: 2,
    requires: ["solar_panel_efficiency_1"],
    position: { x: 5, y: 8 },
    unlockDuration: 90,
  },

  // Electric Pole Upgrades
  {
    id: "electric_pole_connections",
    type: "upgrade",
    buildingId: "electric_pole",
    level: 1,
    requires: ["electric_pole_unlock"],
    position: { x: 1, y: 7 },
    unlockDuration: 45,
  },

  // Biomass Plant Upgrades
  {
    id: "biomass_plant_efficiency_1",
    type: "upgrade",
    buildingId: "biomass_plant",
    level: 1,
    requires: ["biomass_plant_unlock"],
    position: { x: 7, y: 4 },
    unlockDuration: 50,
  },
  {
    id: "biomass_plant_capacity_1",
    type: "upgrade",
    buildingId: "biomass_plant",
    level: 2,
    requires: ["biomass_plant_efficiency_1"],
    position: { x: 7, y: 5 },
    unlockDuration: 75,
  },
  {
    id: "biomass_plant_speed_1",
    type: "upgrade",
    buildingId: "biomass_plant",
    level: 3,
    requires: ["biomass_plant_capacity_1"],
    position: { x: 7, y: 6 },
    unlockDuration: 110,
  },

  // Furnace Upgrades
  {
    id: "furnace_1",
    type: "upgrade",
    buildingId: "furnace",
    level: 1,
    requires: ["furnace_unlock"],
    position: { x: 2, y: 7 },
    unlockDuration: 90,
  },
  {
    id: "furnace_2",
    type: "upgrade",
    buildingId: "furnace",
    level: 2,
    requires: ["furnace_1"],
    position: { x: 2, y: 8 },
    unlockDuration: 150,
  },
  {
    id: "furnace_3",
    type: "upgrade",
    buildingId: "furnace",
    level: 3,
    requires: ["furnace_2"],
    position: { x: 2, y: 9 },
    unlockDuration: 200,
  },
];

/**
 * Get a skill node by its ID
 */
export function getSkillNode(id: string): SkillNode | undefined {
  return SKILL_TREE.find((node) => node.id === id);
}

/**
 * Get all skill nodes for a specific building type
 */
export function getSkillNodesForBuilding(buildingId: BuildingId): SkillNode[] {
  return SKILL_TREE.filter((node) => node.buildingId === buildingId).sort(
    (a, b) => a.level - b.level,
  );
}

/**
 * Get the unlock node for a building
 */
export function getBuildingUnlockNode(
  buildingId: BuildingId,
): SkillNode | undefined {
  return SKILL_TREE.find(
    (node) => node.buildingId === buildingId && node.type === "unlock",
  );
}

/**
 * Get upgrade nodes for a building (excluding unlock node)
 */
export function getBuildingUpgradeNodes(buildingId: BuildingId): SkillNode[] {
  return SKILL_TREE.filter(
    (node) => node.buildingId === buildingId && node.type === "upgrade",
  ).sort((a, b) => a.level - b.level);
}
