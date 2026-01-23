import { describe, it, expect, beforeEach, vi } from "vitest";
import { useGameStore } from "./store";

describe("Game Store", () => {
  beforeEach(() => {
    useGameStore.getState().reset();
  });

  describe("Inventory System", () => {
    it("should start with empty inventory", () => {
      const { inventory } = useGameStore.getState();
      expect(inventory).toHaveLength(10);
      expect(
        inventory.every((slot) => slot.type === null && slot.count === 0),
      ).toBe(true);
    });

    it("should add items to empty slots", () => {
      useGameStore.getState().addItem("iron_ore", 10);
      const slot = useGameStore.getState().inventory[0];
      expect(slot.type).toBe("iron_ore");
      expect(slot.count).toBe(10);
    });

    it("should stack items", () => {
      useGameStore.getState().addItem("iron_ore", 50);
      useGameStore.getState().addItem("iron_ore", 30);
      const slot = useGameStore.getState().inventory[0];
      expect(slot.type).toBe("iron_ore");
      expect(slot.count).toBe(80);
    });

    it("should overflow to new slot when stack is full", () => {
      useGameStore.getState().addItem("iron_ore", 90);
      useGameStore.getState().addItem("iron_ore", 20); // 100 max per stack

      const inv = useGameStore.getState().inventory;
      expect(inv[0].count).toBe(100);
      expect(inv[1].type).toBe("iron_ore");
      expect(inv[1].count).toBe(10);
    });

    it("should remove items", () => {
      useGameStore.getState().addItem("iron_ore", 50);
      useGameStore.getState().removeItem("iron_ore", 20);
      expect(useGameStore.getState().inventory[0].count).toBe(30);
    });

    it("should clear slot when removing all items", () => {
      useGameStore.getState().addItem("iron_ore", 10);
      useGameStore.getState().removeItem("iron_ore", 10);
      const slot = useGameStore.getState().inventory[0];
      expect(slot.type).toBe(null);
      expect(slot.count).toBe(0);
    });
  });

  describe("Building Limits", () => {
    it("should update building counts", () => {
      useGameStore.getState().updateBuildingCount("extractor", 1);
      expect(useGameStore.getState().buildingCounts["extractor"]).toBe(1);

      useGameStore.getState().updateBuildingCount("extractor", 5);
      expect(useGameStore.getState().buildingCounts["extractor"]).toBe(6);

      useGameStore.getState().updateBuildingCount("extractor", -2);
      expect(useGameStore.getState().buildingCounts["extractor"]).toBe(4);
    });

    it("should reset building counts", () => {
      useGameStore.getState().updateBuildingCount("extractor", 5);
      useGameStore.getState().resetBuildingCounts();
      expect(useGameStore.getState().buildingCounts).toEqual({});
    });
  });

  describe("Hotbar", () => {
    it("should start with empty hotbar", () => {
      const { hotbar } = useGameStore.getState();
      expect(hotbar).toHaveLength(9);
      expect(hotbar.every((slot) => slot === null)).toBe(true);
    });

    it("should set hotbar slot", () => {
      useGameStore.getState().setHotbarSlot(0, "extractor");
      expect(useGameStore.getState().hotbar[0]).toBe("extractor");
    });
  });

  describe("Skill Tree", () => {
    it("should unlock skill", () => {
      useGameStore.getState().unlockSkill("speed_1");
      expect(useGameStore.getState().unlockedSkills).toContain("speed_1");
    });

    it("should handle pending unlocks", () => {
      vi.useFakeTimers();
      const now = Date.now();
      vi.setSystemTime(now);

      useGameStore.getState().startUnlock("speed_2", 10);

      const pending = useGameStore.getState().pendingUnlocks;
      expect(pending).toHaveLength(1);
      expect(pending[0].skillId).toBe("speed_2");
      expect(pending[0].duration).toBe(10);

      // Complete
      useGameStore.getState().completeUnlock("speed_2");
      expect(useGameStore.getState().pendingUnlocks).toHaveLength(0);
      expect(useGameStore.getState().unlockedSkills).toContain("speed_2");

      vi.useRealTimers();
    });

    it("should cancel unlock", () => {
      useGameStore.getState().startUnlock("speed_3", 10);
      useGameStore.getState().cancelUnlock("speed_3");
      expect(useGameStore.getState().pendingUnlocks).toHaveLength(0);
      expect(useGameStore.getState().unlockedSkills).not.toContain("speed_3");
    });
  });

  describe("Global Reset", () => {
    it("should reset everything", () => {
      // Setup dirty state
      useGameStore.getState().addItem("iron_ore", 10);
      useGameStore.getState().updateBuildingCount("hub", 1);
      useGameStore.getState().setHotbarSlot(1, "chest");
      useGameStore.getState().unlockSkill("tech_1");

      // Reset
      useGameStore.getState().reset();

      const state = useGameStore.getState();
      expect(state.inventory[0].count).toBe(0);
      expect(state.buildingCounts).toEqual({});
      expect(state.hotbar.every((s) => s === null)).toBe(true);
      expect(state.unlockedSkills).toHaveLength(0);
    });
  });

  describe("Global Escape Key Logic (Simulated)", () => {
    // Mock the pause toggle since it's local state in page.tsx
    const togglePauseMock = vi.fn();

    // Replicate the logic from page.tsx for testing
    const handleEscape = () => {
      const state = useGameStore.getState();

      // 1. Close Building Menu
      if (state.isBuildingMenuOpen) {
        state.toggleBuildingMenu();
        return;
      }

      // 2. Close Info Panel / Hub
      if (state.openedEntityKey) {
        state.setOpenedEntityKey(null);
        return;
      }

      // 3. Close Inventory
      if (state.isInventoryOpen) {
        state.toggleInventory();
        return;
      }

      // 4. Cancel Building Selection / Deletion Tool
      if (state.selectedBuilding) {
        state.setSelectedBuilding(null);
        return;
      }

      // 5. Default: Toggle Pause Menu
      togglePauseMock();
    };

    beforeEach(() => {
      togglePauseMock.mockClear();
    });

    it("should close Building Menu first", () => {
      useGameStore.setState({ isBuildingMenuOpen: true });
      useGameStore.setState({ isInventoryOpen: true });
      useGameStore.setState({ openedEntityKey: "1,1" });

      handleEscape();

      expect(useGameStore.getState().isBuildingMenuOpen).toBe(false);
      expect(useGameStore.getState().isInventoryOpen).toBe(true);
      expect(useGameStore.getState().openedEntityKey).toBe("1,1");
      expect(togglePauseMock).not.toHaveBeenCalled();
    });

    it("should close Info Panel second", () => {
      useGameStore.setState({ openedEntityKey: "1,1" });
      useGameStore.setState({ isInventoryOpen: true });

      handleEscape();

      expect(useGameStore.getState().openedEntityKey).toBe(null);
      expect(useGameStore.getState().isInventoryOpen).toBe(true);
      expect(togglePauseMock).not.toHaveBeenCalled();
    });

    it("should close Inventory third", () => {
      useGameStore.setState({ isInventoryOpen: true });
      useGameStore.setState({ selectedBuilding: "conveyor" });

      handleEscape();

      expect(useGameStore.getState().isInventoryOpen).toBe(false);
      expect(useGameStore.getState().selectedBuilding).toBe("conveyor");
      expect(togglePauseMock).not.toHaveBeenCalled();
    });

    it("should deselect selection fourth", () => {
      useGameStore.setState({ selectedBuilding: "conveyor" });

      handleEscape();

      expect(useGameStore.getState().selectedBuilding).toBe(null);
      expect(togglePauseMock).not.toHaveBeenCalled();
    });

    it("should toggle pause last (or default)", () => {
      handleEscape();
      expect(togglePauseMock).toHaveBeenCalled();
    });
  });
});
