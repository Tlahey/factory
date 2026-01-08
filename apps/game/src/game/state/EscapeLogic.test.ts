import { describe, it, expect, beforeEach, vi } from "vitest";
import { useGameStore } from "./store";

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

describe("Global Escape Key Logic", () => {
  beforeEach(() => {
    useGameStore.getState().reset();
    togglePauseMock.mockClear();
  });

  it("should close Building Menu first", () => {
    useGameStore.setState({ isBuildingMenuOpen: true });

    // Set other states to true to test priority
    useGameStore.setState({ isInventoryOpen: true });
    useGameStore.setState({ openedEntityKey: "1,1" });

    handleEscape();

    expect(useGameStore.getState().isBuildingMenuOpen).toBe(false);
    expect(useGameStore.getState().isInventoryOpen).toBe(true); // Should affect lower priority
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
    // No other state set
    handleEscape();

    expect(togglePauseMock).toHaveBeenCalled();
  });
});
