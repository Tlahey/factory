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

import { BUILDINGS } from "../../BuildingConfig";

// Derive building IDs from configuration for type safety
export type BuildingId = keyof typeof BUILDINGS;

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
 * Flow:
 * - root -> building unlocks
 * - building unlock -> building upgrades
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

  // === TIER 1: Extractor & Cable (Requires Hub) ===
  {
    id: "extractor_unlock",
    type: "unlock",
    buildingId: "extractor",
    level: 0,
    requires: ["root"],
    position: { x: 1, y: 1 },
    unlockDuration: 10,
  },
  {
    id: "cable_unlock",
    type: "unlock",
    buildingId: "cable",
    level: 0,
    requires: ["root"],
    position: { x: 3, y: 1 },
    unlockDuration: 10,
  },

  // === TIER 1.2: Battery (Requires Cable) ===
  {
    id: "battery_unlock",
    type: "unlock",
    buildingId: "battery",
    level: 0,
    requires: ["cable_unlock"],
    position: { x: 4, y: 2 },
    unlockDuration: 20,
  },

  // === TIER 1.5: Logistics Tech (Buffer Node) ===
  {
    id: "logistics_tech",
    type: "tech",
    buildingId: "hub", // Still needed for type safety but ignored for tech rendering
    level: 0,
    requires: ["extractor_unlock", "cable_unlock"],
    position: { x: 2, y: 2 },
    unlockDuration: 20,
  },

  // === TIER 2: Conveyor & Chest (Requires Logistics) ===
  {
    id: "conveyor_unlock",
    type: "unlock",
    buildingId: "conveyor",
    level: 0,
    requires: ["logistics_tech"],
    position: { x: 1, y: 3 },
    unlockDuration: 30,
  },
  {
    id: "chest_unlock",
    type: "unlock",
    buildingId: "chest",
    level: 0,
    requires: ["logistics_tech"],
    position: { x: 3, y: 3 },
    unlockDuration: 30,
  },
  {
    id: "conveyor_merger_unlock",
    type: "unlock",
    buildingId: "conveyor_merger",
    level: 0,
    requires: ["conveyor_unlock"],
    position: { x: 0, y: 3 },
    unlockDuration: 40,
  },
  {
    id: "conveyor_splitter_unlock",
    type: "unlock",
    buildingId: "conveyor_splitter",
    level: 0,
    requires: ["conveyor_unlock"],
    position: { x: -1, y: 3 },
    unlockDuration: 40,
  },

  // === TIER 2.5: Furnace (Requires Stone/Ore processing logic?) ===
  // Requires Conveyor/Chest to handle input/output efficiently
  {
    id: "furnace_unlock",
    type: "unlock",
    buildingId: "furnace",
    level: 0,
    requires: ["conveyor_unlock", "chest_unlock"], // Ensure logistics exist
    position: { x: 4, y: 3 },
    unlockDuration: 45,
  },

  // === TIER 3: Electric Pole (Requires Conveyor & Chest) ===
  {
    id: "electric_pole_unlock",
    type: "unlock",
    buildingId: "electric_pole",
    level: 0,
    requires: ["conveyor_unlock", "chest_unlock"],
    position: { x: 2, y: 4 },
    unlockDuration: 60,
  },

  // === TIER 2: Sawmill (Requires Extractor - alternative resource extraction) ===
  {
    id: "sawmill_unlock",
    type: "unlock",
    buildingId: "sawmill",
    level: 0,
    requires: ["extractor_unlock"],
    position: { x: 0, y: 2 },
    unlockDuration: 25,
  },

  // === TIER 2.5: Biomass Plant (Requires Sawmill - wood to power) ===
  {
    id: "biomass_plant_unlock",
    type: "unlock",
    buildingId: "biomass_plant",
    level: 0,
    requires: ["sawmill_unlock"],
    position: { x: -1, y: 4 },
    unlockDuration: 35,
  },

  // === UPGRADES ===

  // Hub Upgrades - Moved down deeply
  {
    id: "hub_1",
    type: "upgrade",
    buildingId: "hub",
    level: 1,
    requires: ["root"],
    position: { x: 4, y: 5 }, // Far bottom right or separate branch
    unlockDuration: 90,
  },

  // Extractor Upgrades - Detached from immediate flow
  {
    id: "extractor_1",
    type: "upgrade",
    buildingId: "extractor",
    level: 1,
    requires: ["extractor_unlock"],
    position: { x: 0, y: 4 }, // Side branch, later visually
    unlockDuration: 60,
  },
  {
    id: "extractor_2",
    type: "upgrade",
    buildingId: "extractor",
    level: 2,
    requires: ["extractor_1"],
    position: { x: 0, y: 5 },
    unlockDuration: 120,
  },

  // Sawmill Upgrades
  {
    id: "sawmill_1",
    type: "upgrade",
    buildingId: "sawmill",
    level: 1,
    requires: ["sawmill_unlock"],
    position: { x: -1, y: 2 },
    unlockDuration: 45,
  },
  {
    id: "sawmill_2",
    type: "upgrade",
    buildingId: "sawmill",
    level: 2,
    requires: ["sawmill_1"],
    position: { x: -1, y: 3 },
    unlockDuration: 90,
  },

  // Conveyor Upgrades
  {
    id: "conveyor_1",
    type: "upgrade",
    buildingId: "conveyor",
    level: 1,
    requires: ["conveyor_unlock"],
    position: { x: 1, y: 4 },
    unlockDuration: 60,
  },
  {
    id: "conveyor_2",
    type: "upgrade",
    buildingId: "conveyor",
    level: 2,
    requires: ["conveyor_1"],
    position: { x: 1, y: 5 },
    unlockDuration: 120,
  },

  // Chest Upgrades
  {
    id: "chest_1",
    type: "upgrade",
    buildingId: "chest",
    level: 1,
    requires: ["chest_unlock"],
    position: { x: 3, y: 4 },
    unlockDuration: 60,
  },

  // Battery Upgrades
  {
    id: "battery_capacity_1",
    type: "upgrade",
    buildingId: "battery",
    level: 1,
    requires: ["battery_unlock"],
    position: { x: 5, y: 3 },
    unlockDuration: 45,
  },
  {
    id: "battery_capacity_2",
    type: "upgrade",
    buildingId: "battery",
    level: 2,
    requires: ["battery_capacity_1"],
    position: { x: 5, y: 4 },
    unlockDuration: 90,
  },
  // Electric Pole Upgrades
  {
    id: "electric_pole_connections",
    type: "upgrade",
    buildingId: "electric_pole",
    level: 1,
    requires: ["electric_pole_unlock"],
    position: { x: 2, y: 5 },
    unlockDuration: 45,
  },

  // Biomass Plant Upgrades
  {
    id: "biomass_plant_efficiency_1",
    type: "upgrade",
    buildingId: "biomass_plant",
    level: 1,
    requires: ["biomass_plant_unlock"],
    position: { x: -2, y: 4 },
    unlockDuration: 50,
  },
  {
    id: "biomass_plant_capacity_1",
    type: "upgrade",
    buildingId: "biomass_plant",
    level: 2,
    requires: ["biomass_plant_efficiency_1"],
    position: { x: -2, y: 5 },
    unlockDuration: 75,
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
