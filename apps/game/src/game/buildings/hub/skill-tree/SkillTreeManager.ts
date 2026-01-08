/**
 * Skill Tree Manager
 *
 * Manages the skill tree state and provides utility methods for:
 * - Checking unlock requirements
 * - Getting visible nodes
 * - Calculating upgrade levels for buildings
 * - Managing unlock progress with duration
 */

import { useGameStore } from "../../../state/store";
import {
  SKILL_TREE,
  SkillNode,
  getSkillNode,
  getSkillNodesForBuilding,
  getBuildingUnlockNode,
  BuildingId,
} from "./SkillTreeConfig";
import { getBuildingConfig, BuildingUpgrade } from "../../BuildingConfig";

export class SkillTreeManager {
  /**
   * Get the list of unlocked skill node IDs from the store
   */
  getUnlockedNodeIds(): string[] {
    const ids = useGameStore.getState().unlockedSkills;
    return ids.includes("root") ? ids : ["root", ...ids];
  }

  /**
   * Get pending unlock progress
   */
  getPendingUnlocks(): {
    skillId: string;
    startTime: number;
    duration: number;
  }[] {
    return useGameStore.getState().pendingUnlocks;
  }

  /**
   * Check if a specific node is unlocked
   */
  isUnlocked(nodeId: string): boolean {
    return this.getUnlockedNodeIds().includes(nodeId);
  }

  /**
   * Check if a node is currently being unlocked
   */
  isPending(nodeId: string): boolean {
    return this.getPendingUnlocks().some((p) => p.skillId === nodeId);
  }

  /**
   * Get progress (0-1) for a pending unlock
   */
  getUnlockProgress(nodeId: string): number {
    const pending = this.getPendingUnlocks().find((p) => p.skillId === nodeId);
    if (!pending) return 0;

    const elapsed = (Date.now() - pending.startTime) / 1000;
    return Math.min(1, elapsed / pending.duration);
  }

  /**
   * Get remaining time in seconds for a pending unlock
   */
  getRemainingTime(nodeId: string): number {
    const pending = this.getPendingUnlocks().find((p) => p.skillId === nodeId);
    if (!pending) return 0;

    const elapsed = (Date.now() - pending.startTime) / 1000;
    return Math.max(0, pending.duration - elapsed);
  }

  /**
   * Check if a building is unlocked in the skill tree
   */
  isBuildingUnlocked(buildingId: string): boolean {
    // Hub is always unlocked (root)
    if (buildingId === "hub") return true;

    const unlockNode = getBuildingUnlockNode(buildingId as BuildingId);
    if (!unlockNode) return true; // No unlock node means always available

    return this.isUnlocked(unlockNode.id);
  }

  /**
   * Check if a node can be unlocked (all requirements met)
   */
  canUnlock(nodeId: string): boolean {
    const node = getSkillNode(nodeId);
    if (!node) return false;

    // Already unlocked
    if (this.isUnlocked(nodeId)) return false;

    // Already pending
    if (this.isPending(nodeId)) return false;

    // Check all requirements are unlocked
    const unlocked = this.getUnlockedNodeIds();
    return node.requires.every((reqId) => unlocked.includes(reqId));
  }

  /**
   * Get the upgrade definition for a node from the building config
   */
  getUpgradeForNode(nodeId: string): BuildingUpgrade | undefined {
    const node = getSkillNode(nodeId);
    if (!node) return undefined;

    // Unlock nodes don't have upgrade definitions (they just unlock the building)
    if (node.type === "unlock" || node.type === "tech") return undefined;

    const config = getBuildingConfig(node.buildingId);
    if (!config || !("upgrades" in config)) return undefined;

    const upgrades = config.upgrades as BuildingUpgrade[];
    return upgrades.find((u) => u.level === node.level);
  }

  /**
   * Get the cost for unlocking a node
   * For unlock nodes, we define a base cost
   * For upgrade nodes, we get from building config
   */
  getNodeCost(nodeId: string): Record<string, number> {
    const node = getSkillNode(nodeId);
    if (!node) return {};

    if (node.type === "unlock" || node.type === "tech") {
      // Building unlock costs - could be defined elsewhere or here
      const unlockCosts: Record<string, Record<string, number>> = {
        extractor_unlock: { stone: 10 },
        cable_unlock: { stone: 5 }, // Very cheap
        logistics_tech: { stone: 15 },
        conveyor_unlock: { stone: 20 },
        chest_unlock: { stone: 30 },
        electric_pole_unlock: { stone: 50, iron: 10 },
      };
      return unlockCosts[nodeId] || { stone: 10 };
    }

    const upgrade = this.getUpgradeForNode(nodeId);
    return upgrade?.cost || {};
  }

  /**
   * Check if the player can afford to unlock a node
   */
  canAfford(nodeId: string): boolean {
    const cost = this.getNodeCost(nodeId);
    const inventory = useGameStore.getState().inventory;

    // Calculate total of each resource type in inventory
    const resourceCounts: Record<string, number> = {};
    for (const slot of inventory) {
      if (slot.type) {
        resourceCounts[slot.type] =
          (resourceCounts[slot.type] || 0) + slot.count;
      }
    }

    // Check if we have enough of each required resource
    for (const [resource, amount] of Object.entries(cost)) {
      if ((resourceCounts[resource] || 0) < amount) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get all visible nodes (unlocked + directly unlockable)
   */
  getVisibleNodes(): SkillNode[] {
    const unlocked = this.getUnlockedNodeIds();
    const pending = this.getPendingUnlocks().map((p) => p.skillId);

    return SKILL_TREE.filter((node) => {
      // Show if unlocked
      if (unlocked.includes(node.id)) return true;

      // Show if pending
      if (pending.includes(node.id)) return true;

      // Show if all requirements are met (directly unlockable)
      return node.requires.every((reqId) => unlocked.includes(reqId));
    });
  }

  /**
   * Start unlocking a skill (deducts resources and starts timer)
   * Returns true if successful, false otherwise
   */
  startUnlocking(nodeId: string): boolean {
    if (!this.canUnlock(nodeId)) return false;
    if (!this.canAfford(nodeId)) return false;

    const node = getSkillNode(nodeId);
    if (!node) return false;

    const cost = this.getNodeCost(nodeId);

    // Deduct resources
    const removeItem = useGameStore.getState().removeItem;
    for (const [resource, amount] of Object.entries(cost)) {
      removeItem(resource, amount);
    }

    // Start unlock (instant if duration is 0)
    if (node.unlockDuration === 0) {
      useGameStore.getState().unlockSkill(nodeId);
      if (node.type === "unlock") {
        useGameStore.getState().unlockBuilding(node.buildingId);
      }
    } else {
      useGameStore.getState().startUnlock(nodeId, node.unlockDuration);
    }

    return true;
  }

  /**
   * Check and complete any finished pending unlocks
   * Should be called periodically (e.g., in game loop)
   */
  checkPendingUnlocks(): string[] {
    const completed: string[] = [];
    const pendingUnlocks = this.getPendingUnlocks();

    for (const pending of pendingUnlocks) {
      const elapsed = (Date.now() - pending.startTime) / 1000;
      if (elapsed >= pending.duration) {
        useGameStore.getState().completeUnlock(pending.skillId);
        
        // Check for building unlock
        const node = getSkillNode(pending.skillId);
        if (node && node.type === "unlock") {
            useGameStore.getState().unlockBuilding(node.buildingId);
        }

        completed.push(pending.skillId);
      }
    }

    return completed;
  }

  /**
   * Get the current upgrade level for a building type
   * Returns 0 if no upgrades unlocked, otherwise the highest unlocked level
   */
  getBuildingUpgradeLevel(buildingId: string): number {
    const unlocked = this.getUnlockedNodeIds();
    const buildingNodes = getSkillNodesForBuilding(buildingId as BuildingId);

    let maxLevel = 0;
    for (const node of buildingNodes) {
      if (
        node.type === "upgrade" &&
        unlocked.includes(node.id) &&
        node.level > maxLevel
      ) {
        maxLevel = node.level;
      }
    }

    return maxLevel;
  }

  /**
   * Get the active upgrade for a building (the highest unlocked level)
   */
  getActiveUpgrade(buildingId: string): BuildingUpgrade | undefined {
    const level = this.getBuildingUpgradeLevel(buildingId);
    if (level === 0) return undefined;

    const config = getBuildingConfig(buildingId);
    if (!config || !("upgrades" in config)) return undefined;

    const upgrades = config.upgrades as BuildingUpgrade[];
    return upgrades.find((u) => u.level === level);
  }

  /**
   * Get the multiplier for a specific stat on a building
   * Returns 1.0 if no upgrades affect this stat
   */
  getStatMultiplier(buildingId: string, stat: string): number {
    const upgrade = this.getActiveUpgrade(buildingId);
    if (!upgrade) return 1.0;

    const effect = upgrade.effects.find(
      (e) => e.type === "multiplier" && e.stat === stat,
    );
    return effect?.value ?? 1.0;
  }

  /**
   * Get the additive bonus for a specific stat on a building
   * Returns 0 if no upgrades affect this stat
   */
  getStatAdditive(buildingId: string, stat: string): number {
    const upgrade = this.getActiveUpgrade(buildingId);
    if (!upgrade) return 0;

    const effect = upgrade.effects.find(
      (e) => e.type === "additive" && e.stat === stat,
    );
    return effect?.value ?? 0;
  }
}

// Singleton instance for easy access
export const skillTreeManager = new SkillTreeManager();
