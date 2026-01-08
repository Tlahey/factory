import { describe, it, expect, beforeEach } from "vitest";
import { useGameStore } from "../state/store";
import { skillTreeManager } from "../buildings/hub/skill-tree/SkillTreeManager";

describe("Game Progression System", () => {
  beforeEach(() => {
    useGameStore.getState().reset();
    useGameStore.getState().resetSkillTree();
  });

  it("should start with only Hub unlocked", () => {
    const { unlockedBuildings } = useGameStore.getState();
    expect(unlockedBuildings).toEqual(["hub"]);
    expect(unlockedBuildings).not.toContain("cable");
  });

  it("should enforce resource costs", () => {
    const { hasResources, addItem } = useGameStore.getState();

    // Extractor costs 10 iron (from config update)
    const cost = { iron: 10 };

    expect(hasResources(cost)).toBe(false);

    addItem("iron", 5);
    expect(hasResources(cost)).toBe(false);

    addItem("iron", 5); // Total 10
    expect(hasResources(cost)).toBe(true);
  });

  it("should deduct resources correctly", () => {
    const { addItem, removeResources } = useGameStore.getState();
    const cost = { iron: 10 };

    addItem("iron", 15);
    removeResources(cost);

    const ironSlot = useGameStore
      .getState()
      .inventory.find((s) => s.type === "iron");
    expect(ironSlot?.count).toBe(5);
  });

  it("should unlock buildings via SkillTreeManager", () => {
    // Mock inventory for cost
    useGameStore.getState().addItem("stone", 100); // Enough for initial unlocks

    // Check initial state
    expect(skillTreeManager.isBuildingUnlocked("extractor")).toBe(false);

    // Unlock Extractor (id: extractor_unlock)
    // Config says duration 30s, cost 20 stone
    // We can force unlock for test or simulate time

    const success = skillTreeManager.startUnlocking("extractor_unlock");
    expect(success).toBe(true); // Should succeed as we have resources and requirements met (root is met)

    // It has duration, so it should be pending
    expect(skillTreeManager.isPending("extractor_unlock")).toBe(true);

    // Fast forward time? Or modify store directly to Complete
    useGameStore.getState().completeUnlock("extractor_unlock");

    // NOW we need to check if the store listener (SkillTreeManager doesn't listen, but we added logic to checkPendingUnlocks?)
    // Wait, checkPendingUnlocks is called by the loop.
    // startUnlocking -> if duration > 0 -> startUnlock
    // completeUnlock just updates unlockedSkills.
    // BUT we modified checkPendingUnlocks to ALSO call unlockBuilding.
    // AND we modified startUnlocking to call unlockBuilding if duration is 0.

    // We need to manually invoke the logic that bridges skill -> building
    // Since we manually called completeUnlock, we bypassed the checkPendingUnlocks logic that does the bridge.
    // So we should manually call unlockBuilding to simulate the bridge, OR test checkPendingUnlocks.

    // Let's test checkPendingUnlocks
    // Reset
    useGameStore.getState().resetSkillTree();
    useGameStore.getState().addItem("stone", 100);

    // Start again
    skillTreeManager.startUnlocking("extractor_unlock");

    // Set start time to past
    useGameStore.setState((state) => ({
      pendingUnlocks: state.pendingUnlocks.map((p) => ({
        ...p,
        startTime: Date.now() - 100000, // Way past duration
      })),
    }));

    // Run check
    skillTreeManager.checkPendingUnlocks();

    // Verify
    expect(useGameStore.getState().unlockedSkills).toContain(
      "extractor_unlock",
    );
    expect(useGameStore.getState().unlockedBuildings).toContain("extractor");
  });

  it("should start with ONLY hub and unlock more buildings step by step", () => {
    // 1. Initial State: Only Hub
    expect(useGameStore.getState().unlockedBuildings).toEqual(["hub"]);
    expect(useGameStore.getState().unlockedSkills).toEqual([]); // root is virtual in manager
    expect(skillTreeManager.isBuildingUnlocked("extractor")).toBe(false);
    expect(skillTreeManager.isBuildingUnlocked("cable")).toBe(false);

    // 2. Add resources and unlock Cable
    useGameStore.getState().addItem("stone", 100);
    skillTreeManager.startUnlocking("cable_unlock");

    // Set time to past to complete
    useGameStore.setState((state) => ({
      pendingUnlocks: state.pendingUnlocks.map((p) => ({
        ...p,
        startTime: Date.now() - 100000,
      })),
    }));
    skillTreeManager.checkPendingUnlocks();

    // Verify Cable is now unlocked, but not Extractor
    expect(useGameStore.getState().unlockedBuildings).toContain("hub");
    expect(useGameStore.getState().unlockedBuildings).toContain("cable");
    expect(useGameStore.getState().unlockedBuildings).not.toContain(
      "extractor",
    );
    expect(skillTreeManager.isBuildingUnlocked("cable")).toBe(true);
    expect(skillTreeManager.isBuildingUnlocked("extractor")).toBe(false);

    // 3. Unlock Extractor
    skillTreeManager.startUnlocking("extractor_unlock");
    useGameStore.setState((state) => ({
      pendingUnlocks: state.pendingUnlocks.map((p) => ({
        ...p,
        startTime: Date.now() - 100000,
      })),
    }));
    skillTreeManager.checkPendingUnlocks();

    // Verify both are now unlocked
    expect(useGameStore.getState().unlockedBuildings).toContain("hub");
    expect(useGameStore.getState().unlockedBuildings).toContain("cable");
    expect(useGameStore.getState().unlockedBuildings).toContain("extractor");
  });
});
