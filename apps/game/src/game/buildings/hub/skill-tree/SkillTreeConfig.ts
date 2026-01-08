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
