import { describe, it, expect, beforeEach, vi, Mock } from "vitest";
import { World } from "../../core/World";
import { TileFactory } from "../../TileFactory";
import { TileType } from "../../constants";
import { useGameStore } from "../../state/store";

// Mock store to control resources/unlocks
vi.mock("../../state/store", () => ({
  useGameStore: {
    getState: vi.fn(),
    setState: vi.fn(),
  },
}));

describe("Battery Placement Logic", () => {
  let world: World;
  let mockStore: Record<string, unknown>;

  beforeEach(() => {
    world = new World();
    world.grid = [];
    // Create 10x10 grid of GRASS
    for (let y = 0; y < 10; y++) {
      const row = [];
      for (let x = 0; x < 10; x++) {
        row.push(TileFactory.createTile(TileType.GRASS));
      }
      world.grid.push(row);
    }

    mockStore = {
      purchasedCounts: { battery: 5 },
      unlockedBuildings: ["battery"], // Unlocked by default for tests
      resources: { copper: 1000, iron: 1000 }, // Plenty of resources
      hasResources: (_cost: Record<string, number>) => true,
      removeResources: vi.fn(),
      updateBuildingCount: vi.fn(),
      resetBuildingCounts: vi.fn(),
    };
    (useGameStore.getState as Mock).mockReturnValue(mockStore);
  });

  it("should allow placement on grass with resources and unlock", () => {
    // 1. Ensure resources/unlock (set in beforeEach)

    // 2. Try place
    const success = world.placeBuilding(5, 5, "battery");
    expect(success).toBe(true);
    expect(world.getBuilding(5, 5)).toBeDefined();
  });

  it("should fail placement on water", () => {
    // Set 5,5 to WATER
    world.grid[5][5] = TileFactory.createTile(TileType.WATER);

    const success = world.placeBuilding(5, 5, "battery");
    expect(success).toBe(false);
  });

  it("should fail placement on stone", () => {
    // Set 5,5 to STONE
    world.grid[5][5] = TileFactory.createTile(TileType.STONE);

    const success = world.placeBuilding(5, 5, "battery");
    expect(success).toBe(false);
  });

  it("should fail placement if occupied", () => {
    world.placeBuilding(5, 5, "battery");
    const success = world.placeBuilding(5, 5, "battery"); // Overlap
    expect(success).toBe(false);
  });

  // Note: World.placeBuilding DOES NOT check Cost/Lock. InputSystem does.
  // So this test mainly verifies World/Building logic.
  // We can't easily unit test InputSystem without DOM.
  // But confirming World logic is correct narrows it down to InputSystem.
});
