import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { SkillTreeManager } from "./SkillTreeManager";
import { useGameStore } from "../../../state/store";

// Mock the store for testing
vi.mock("../../../state/store", () => ({
  useGameStore: {
    getState: vi.fn(),
  },
}));

describe("SkillTreeManager", () => {
  let manager: SkillTreeManager;
  let mockGetState: ReturnType<typeof vi.fn>;

  // Default mock state
  const createMockState = (overrides = {}) => ({
    unlockedSkills: [],
    pendingUnlocks: [],
    inventory: [],
    unlockSkill: vi.fn(),
    startUnlock: vi.fn(),
    completeUnlock: vi.fn(),
    unlockBuilding: vi.fn(),
    removeItem: vi.fn(),
    ...overrides,
  });

  beforeEach(() => {
    manager = new SkillTreeManager();
    mockGetState = vi.mocked(useGameStore.getState);
    mockGetState.mockReturnValue(createMockState());
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("getUnlockedNodeIds", () => {
    it("should return unlocked skills from store", () => {
      mockGetState.mockReturnValue(
        createMockState({ unlockedSkills: ["root", "extractor_unlock"] }),
      );

      const result = manager.getUnlockedNodeIds();
      expect(result).toEqual(["root", "extractor_unlock"]);
    });

    it("should return ['root'] when no skills unlocked", () => {
      const result = manager.getUnlockedNodeIds();
      expect(result).toEqual(["root"]);
    });
  });

  describe("isUnlocked", () => {
    it("should return true for unlocked skill", () => {
      mockGetState.mockReturnValue(
        createMockState({ unlockedSkills: ["root", "extractor_unlock"] }),
      );

      expect(manager.isUnlocked("root")).toBe(true);
      expect(manager.isUnlocked("extractor_unlock")).toBe(true);
    });

    it("should return false for locked skill", () => {
      mockGetState.mockReturnValue(
        createMockState({ unlockedSkills: ["root"] }),
      );

      expect(manager.isUnlocked("extractor_unlock")).toBe(false);
    });
  });

  describe("isPending", () => {
    it("should return true for pending unlock", () => {
      mockGetState.mockReturnValue(
        createMockState({
          pendingUnlocks: [
            {
              skillId: "extractor_unlock",
              startTime: Date.now(),
              duration: 30,
            },
          ],
        }),
      );

      expect(manager.isPending("extractor_unlock")).toBe(true);
    });

    it("should return false for non-pending skill", () => {
      mockGetState.mockReturnValue(createMockState({ pendingUnlocks: [] }));

      expect(manager.isPending("extractor_unlock")).toBe(false);
    });
  });

  describe("getUnlockProgress", () => {
    it("should return 0 for non-pending skill", () => {
      mockGetState.mockReturnValue(createMockState({ pendingUnlocks: [] }));

      expect(manager.getUnlockProgress("extractor_unlock")).toBe(0);
    });

    it("should return progress between 0 and 1", () => {
      const startTime = Date.now() - 15000; // 15 seconds ago
      mockGetState.mockReturnValue(
        createMockState({
          pendingUnlocks: [
            { skillId: "extractor_unlock", startTime, duration: 30 },
          ],
        }),
      );

      const progress = manager.getUnlockProgress("extractor_unlock");
      expect(progress).toBeGreaterThan(0.4);
      expect(progress).toBeLessThan(0.6);
    });

    it("should cap progress at 1", () => {
      const startTime = Date.now() - 60000; // 60 seconds ago (past duration)
      mockGetState.mockReturnValue(
        createMockState({
          pendingUnlocks: [
            { skillId: "extractor_unlock", startTime, duration: 30 },
          ],
        }),
      );

      expect(manager.getUnlockProgress("extractor_unlock")).toBe(1);
    });
  });

  describe("getRemainingTime", () => {
    it("should return 0 for non-pending skill", () => {
      mockGetState.mockReturnValue(createMockState({ pendingUnlocks: [] }));

      expect(manager.getRemainingTime("extractor_unlock")).toBe(0);
    });

    it("should return remaining seconds", () => {
      const startTime = Date.now() - 10000; // 10 seconds ago
      mockGetState.mockReturnValue(
        createMockState({
          pendingUnlocks: [
            { skillId: "extractor_unlock", startTime, duration: 30 },
          ],
        }),
      );

      const remaining = manager.getRemainingTime("extractor_unlock");
      expect(remaining).toBeGreaterThan(18);
      expect(remaining).toBeLessThan(22);
    });
  });

  describe("isBuildingUnlocked", () => {
    it("should always return true for hub", () => {
      expect(manager.isBuildingUnlocked("hub")).toBe(true);
    });

    it("should return true when building unlock node is unlocked", () => {
      mockGetState.mockReturnValue(
        createMockState({ unlockedSkills: ["root", "extractor_unlock"] }),
      );

      expect(manager.isBuildingUnlocked("extractor")).toBe(true);
    });

    it("should return false when building unlock node is not unlocked", () => {
      mockGetState.mockReturnValue(
        createMockState({ unlockedSkills: ["root"] }),
      );

      expect(manager.isBuildingUnlocked("extractor")).toBe(false);
    });
  });

  describe("canUnlock", () => {
    it("should return false for already unlocked node (root is always unlocked)", () => {
      mockGetState.mockReturnValue(createMockState({ unlockedSkills: [] }));

      expect(manager.canUnlock("root")).toBe(false);
    });

    it("should return false for pending node", () => {
      mockGetState.mockReturnValue(
        createMockState({
          unlockedSkills: ["root"],
          pendingUnlocks: [
            {
              skillId: "extractor_unlock",
              startTime: Date.now(),
              duration: 30,
            },
          ],
        }),
      );

      expect(manager.canUnlock("extractor_unlock")).toBe(false);
    });

    it("should return true when all requirements are met", () => {
      mockGetState.mockReturnValue(
        createMockState({ unlockedSkills: ["root"] }),
      );

      // extractor_unlock requires "root"
      expect(manager.canUnlock("extractor_unlock")).toBe(true);
    });

    it("should return true when root requirement is met (root is auto-unlocked)", () => {
      mockGetState.mockReturnValue(createMockState({ unlockedSkills: [] }));

      // extractor_unlock requires "root" which is auto-unlocked
      expect(manager.canUnlock("extractor_unlock")).toBe(true);
    });

    it("should return false for non-existent node", () => {
      expect(manager.canUnlock("nonexistent")).toBe(false);
    });
  });

  describe("getNodeCost", () => {
    it("should return cost for unlock nodes", () => {
      const cost = manager.getNodeCost("extractor_unlock");
      expect(cost).toHaveProperty("stone");
      expect(cost.stone).toBeGreaterThan(0);
    });

    it("should return cost from building config for upgrade nodes", () => {
      const cost = manager.getNodeCost("extractor_1");
      expect(cost).toHaveProperty("stone");
    });

    it("should return empty object for non-existent node", () => {
      const cost = manager.getNodeCost("nonexistent");
      expect(cost).toEqual({});
    });
  });

  describe("canAfford", () => {
    it("should return true when player has enough resources", () => {
      mockGetState.mockReturnValue(
        createMockState({
          inventory: [{ type: "stone", count: 100 }],
        }),
      );

      expect(manager.canAfford("extractor_unlock")).toBe(true);
    });

    it("should return false when player lacks resources", () => {
      mockGetState.mockReturnValue(
        createMockState({
          inventory: [{ type: "stone", count: 1 }],
        }),
      );

      expect(manager.canAfford("extractor_unlock")).toBe(false);
    });

    it("should handle multi-resource costs", () => {
      mockGetState.mockReturnValue(
        createMockState({
          inventory: [
            { type: "stone", count: 200 },
            { type: "iron", count: 50 },
            { type: "copper", count: 30 },
          ],
        }),
      );

      // extractor_3 requires stone: 200, iron: 50, copper: 25
      expect(manager.canAfford("extractor_3")).toBe(true);
    });
  });

  describe("getVisibleNodes", () => {
    it("should include unlocked nodes", () => {
      mockGetState.mockReturnValue(
        createMockState({ unlockedSkills: ["root"] }),
      );

      const visible = manager.getVisibleNodes();
      expect(visible.some((n) => n.id === "root")).toBe(true);
    });

    it("should include pending nodes", () => {
      mockGetState.mockReturnValue(
        createMockState({
          unlockedSkills: ["root"],
          pendingUnlocks: [
            {
              skillId: "extractor_unlock",
              startTime: Date.now(),
              duration: 30,
            },
          ],
        }),
      );

      const visible = manager.getVisibleNodes();
      expect(visible.some((n) => n.id === "extractor_unlock")).toBe(true);
    });

    it("should include directly unlockable nodes", () => {
      mockGetState.mockReturnValue(
        createMockState({ unlockedSkills: ["root"] }),
      );

      const visible = manager.getVisibleNodes();
      // Nodes that require only "root" should be visible
      expect(visible.some((n) => n.id === "extractor_unlock")).toBe(true);
      expect(visible.some((n) => n.id === "hub_1")).toBe(true);
    });

    it("should not include nodes with unmet requirements", () => {
      mockGetState.mockReturnValue(
        createMockState({ unlockedSkills: ["root"] }),
      );

      const visible = manager.getVisibleNodes();
      // extractor_1 requires extractor_unlock, which is not unlocked
      expect(visible.some((n) => n.id === "extractor_1")).toBe(false);
    });
  });

  describe("getBuildingUpgradeLevel", () => {
    it("should return 0 when no upgrades unlocked", () => {
      mockGetState.mockReturnValue(
        createMockState({ unlockedSkills: ["root", "extractor_unlock"] }),
      );

      expect(manager.getBuildingUpgradeLevel("extractor")).toBe(0);
    });

    it("should return highest unlocked level", () => {
      mockGetState.mockReturnValue(
        createMockState({
          unlockedSkills: [
            "root",
            "extractor_unlock",
            "extractor_1",
            "extractor_2",
          ],
        }),
      );

      expect(manager.getBuildingUpgradeLevel("extractor")).toBe(2);
    });
  });

  describe("getStatMultiplier", () => {
    it("should return 1.0 when no upgrades unlocked", () => {
      mockGetState.mockReturnValue(
        createMockState({ unlockedSkills: ["root", "extractor_unlock"] }),
      );

      expect(manager.getStatMultiplier("extractor", "extractionRate")).toBe(
        1.0,
      );
    });

    it("should return multiplier from active upgrade", () => {
      mockGetState.mockReturnValue(
        createMockState({
          unlockedSkills: ["root", "extractor_unlock", "extractor_1"],
        }),
      );

      const multiplier = manager.getStatMultiplier(
        "extractor",
        "extractionRate",
      );
      expect(multiplier).toBe(1.2);
    });
  });

  describe("getStatAdditive", () => {
    it("should return 0 when no upgrades unlocked", () => {
      mockGetState.mockReturnValue(
        createMockState({ unlockedSkills: ["root", "chest_unlock"] }),
      );

      expect(manager.getStatAdditive("chest", "maxSlots")).toBe(0);
    });

    it("should return additive value from active upgrade", () => {
      mockGetState.mockReturnValue(
        createMockState({
          unlockedSkills: [
            "root",
            "extractor_unlock",
            "chest_unlock",
            "chest_1",
          ],
        }),
      );

      const additive = manager.getStatAdditive("chest", "maxSlots");
      expect(additive).toBe(2);
    });
  });

  describe("startUnlocking", () => {
    it("should return false if cannot unlock", () => {
      mockGetState.mockReturnValue(createMockState({ unlockedSkills: [] }));

      expect(manager.startUnlocking("extractor_unlock")).toBe(false);
    });

    it("should return false if cannot afford", () => {
      mockGetState.mockReturnValue(
        createMockState({
          unlockedSkills: ["root"],
          inventory: [],
        }),
      );

      expect(manager.startUnlocking("extractor_unlock")).toBe(false);
    });

    it("should deduct resources and start unlock for instant unlocks", () => {
      const mockState = createMockState({
        unlockedSkills: ["root"],
        inventory: [{ type: "stone", count: 100 }],
      });
      mockGetState.mockReturnValue(mockState);

      // Root has duration 0, but we can't unlock it again
      // Let's test with a node that has duration > 0
      const result = manager.startUnlocking("extractor_unlock");

      expect(result).toBe(true);
      expect(mockState.removeItem).toHaveBeenCalled();
      expect(mockState.startUnlock).toHaveBeenCalledWith(
        "extractor_unlock",
        10,
      );
    });
  });

  describe("checkPendingUnlocks", () => {
    it("should complete finished unlocks", () => {
      const startTime = Date.now() - 60000; // 60 seconds ago
      const mockState = createMockState({
        pendingUnlocks: [
          { skillId: "extractor_unlock", startTime, duration: 10 },
        ],
      });
      mockGetState.mockReturnValue(mockState);

      const completed = manager.checkPendingUnlocks();

      expect(completed).toContain("extractor_unlock");
      expect(mockState.completeUnlock).toHaveBeenCalledWith("extractor_unlock");
    });

    it("should not complete ongoing unlocks", () => {
      const startTime = Date.now() - 5000; // Only 5 seconds ago
      const mockState = createMockState({
        pendingUnlocks: [
          { skillId: "extractor_unlock", startTime, duration: 10 },
        ],
      });
      mockGetState.mockReturnValue(mockState);

      const completed = manager.checkPendingUnlocks();

      expect(completed).not.toContain("extractor_unlock");
      expect(mockState.completeUnlock).not.toHaveBeenCalled();
    });
  });
});
