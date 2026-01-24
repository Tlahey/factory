// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, act } from "@testing-library/react";
import { GameContextProvider } from "./GameProvider";

// Use vi.hoisted to ensure mocks are available for vi.mock
const { mockGetState, mockSetState, mockStore } = vi.hoisted(() => {
  const getState = vi.fn();
  const setState = vi.fn();
  // We need store to be a function to mimic hook behavior BUT also have properties
  const store = vi.fn();
  store.getState = getState;
  store.setState = setState;
  return { mockGetState: getState, mockSetState: setState, mockStore: store };
});

vi.mock("../state/store", () => ({
  useGameStore: mockStore,
}));

// Mock World and Systems using Classes to avoid "not a constructor" issues
vi.mock("../core/World", () => {
  class MockWorld {
    serialize() {
      return { tiles: [] };
    }
    deserialize() {}
    reset() {}
    placeBuilding() {}
    removeBuilding() {}
  }
  return { World: MockWorld };
});

vi.mock("../systems/FactorySystem", () => {
  class MockFactorySystem {}
  return { FactorySystem: MockFactorySystem };
});

vi.mock("../systems/PowerSystem", () => {
  class MockPowerSystem {
    rebuildNetworks() {}
  }
  return { PowerSystem: MockPowerSystem };
});

vi.mock("../systems/GuidanceSystem", () => {
  class MockGuidanceSystem {}
  return { GuidanceSystem: MockGuidanceSystem };
});

describe("GameProvider Persistence", () => {
  const mockState = {
    inventory: [],
    unlockedSkills: ["root", "skill_1"],
    unlockedBuildings: ["hub", "test_building"],
    unlockedRecipes: ["recipe_1"],
    purchasedCounts: { test_building: 5 },
    isUnlimitedResources: true,
    showDialogue: vi.fn(),
    setSceneReady: vi.fn(),
    setInventory: vi.fn(),
    pendingUnlocks: [],
    reset: vi.fn(),
    seenDialogues: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockGetState.mockReturnValue(mockState);
  });

  it("should save progression data to localStorage on GAME_SAVE", () => {
    render(
      <GameContextProvider>
        <div></div>
      </GameContextProvider>,
    );

    act(() => {
      window.dispatchEvent(new CustomEvent("GAME_SAVE"));
    });

    const savedString = localStorage.getItem("factory_save");
    expect(savedString).not.toBeNull();

    if (savedString) {
      const savedData = JSON.parse(savedString);
      expect(savedData.progression).toBeDefined();
      expect(savedData.progression.unlockedSkills).toEqual(["root", "skill_1"]);
    }
  });

  it("should restore progression data from localStorage on GAME_LOAD", () => {
    const saveState = {
      world: { tiles: [] },
      inventory: [],
      progression: {
        unlockedSkills: ["root", "loaded_skill"],
        isUnlimitedResources: false,
        unlockedBuildings: ["hub"],
        unlockedRecipes: [],
        purchasedCounts: {},
      },
      timestamp: Date.now(),
    };
    localStorage.setItem("factory_save", JSON.stringify(saveState));

    render(
      <GameContextProvider>
        <div></div>
      </GameContextProvider>,
    );

    act(() => {
      window.dispatchEvent(new CustomEvent("GAME_LOAD"));
    });

    // Check if setState was called
    expect(mockSetState).toHaveBeenCalled();
    const calls = mockSetState.mock.calls;
    const progressionCall = calls.find(
      (args) => args[0] && args[0].unlockedSkills,
    );

    expect(progressionCall).toBeDefined();
    expect(progressionCall![0].unlockedSkills).toEqual([
      "root",
      "loaded_skill",
    ]);
  });
});
