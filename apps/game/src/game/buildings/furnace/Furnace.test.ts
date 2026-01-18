import { describe, it, expect, beforeEach, vi } from "vitest";
import { Furnace } from "./Furnace";
import { IWorld } from "../../entities/types";
import { Chest } from "../chest/Chest";
import { ResourceTile } from "../../core/ResourceTile";
import { Grass } from "../../environment/grass/Grass";
import { Rock } from "../../environment/rock/Rock";
import { Water } from "../../environment/water/Water";
import { skillTreeManager } from "../hub/skill-tree/SkillTreeManager";

// Mock external dependencies
vi.mock("../hub/skill-tree/SkillTreeManager", () => ({
  skillTreeManager: {
    getStatMultiplier: vi.fn().mockReturnValue(1.0),
    getStatAdditive: vi.fn().mockReturnValue(0),
  },
}));

describe("Furnace", () => {
  let furnace: Furnace;
  let world: IWorld;

  beforeEach(() => {
    (skillTreeManager.getStatMultiplier as any)
      .mockReset()
      .mockReturnValue(1.0);
    (skillTreeManager.getStatAdditive as any).mockReset().mockReturnValue(0);

    furnace = new Furnace(10, 10, "north");
    world = {
      getBuilding: vi.fn().mockReturnValue(null),
      getTile: vi.fn().mockReturnValue({} as ResourceTile),
    } as unknown as IWorld;
  });

  it("should initialize with default values", () => {
    expect(furnace.getType()).toBe("furnace");
    expect(furnace.inputQueue).toEqual([]);
    expect(furnace.outputSlot).toBeNull();
    expect(furnace.activeJobs).toEqual([]);
  });

  it("should only be placed on grass", () => {
    const grassTile = new Grass();
    console.log("Grass Placement Valid:", furnace.isValidPlacement(grassTile));
    expect(furnace.isValidPlacement(grassTile)).toBe(true);

    const rockTile = new Rock(100);
    console.log("Rock Placement Valid:", furnace.isValidPlacement(rockTile));
    expect(furnace.isValidPlacement(rockTile)).toBe(false);

    const waterTile = new Water();
    console.log("Water Placement Valid:", furnace.isValidPlacement(waterTile));
    expect(furnace.isValidPlacement(waterTile)).toBe(false);
  });

  it("should accept input up to queue limit (20)", () => {
    furnace.selectedRecipeId = "iron_ingot";
    const capacity = 20;

    // Fill queue
    for (let i = 0; i < capacity; i++) {
      expect(furnace.addItem("iron_ore", 1)).toBe(true);
    }

    // Check full
    expect(furnace.inputQueue.reduce((acc, i) => acc + i.count, 0)).toBe(
      capacity,
    );

    // Reject overflow
    expect(furnace.addItem("iron_ore", 1)).toBe(false);
  });

  it("should accept valid input", () => {
    furnace.selectedRecipeId = "iron_ingot"; // Input: iron_ore

    // Valid input
    const accepted = furnace.addItem("iron_ore", 1);
    expect(accepted).toBe(true);
    expect(furnace.inputQueue).toHaveLength(1);
    expect(furnace.inputQueue[0]).toEqual({ type: "iron_ore", count: 1 });
  });

  it("should reject invalid input", () => {
    furnace.selectedRecipeId = "iron_ingot"; // Input: iron_ore

    // Invalid input
    const accepted = furnace.addItem("copper_ore", 1);
    expect(accepted).toBe(false);
    expect(furnace.inputQueue).toHaveLength(0);
  });

  it("should start processing when powered and has input", () => {
    furnace.selectedRecipeId = "iron_ingot";
    furnace.addItem("iron_ore", 1); // Need 1 ore for iron_ingot recipe
    furnace.hasPowerSource = true;
    furnace.powerSatisfaction = 1.0;

    furnace.tick(0.1, world);

    // Should have started a job
    expect(furnace.activeJobs).toHaveLength(1);
    expect(furnace.activeJobs[0].recipeId).toBe("iron_ingot");
    expect(furnace.inputQueue).toHaveLength(0); // Input consumed fully
  });

  it("should complete processing and output", () => {
    furnace.selectedRecipeId = "iron_ingot"; // Duration 2s
    furnace.addItem("iron_ore", 1); // Need 1 ore for iron_ingot recipe
    furnace.hasPowerSource = true;
    furnace.powerSatisfaction = 1.0;

    // Start
    furnace.tick(0.1, world);
    expect(furnace.activeJobs).toHaveLength(1);

    // Advance 2.0s
    furnace.tick(2.0, world);

    // Job should be done
    expect(furnace.activeJobs).toHaveLength(0);

    // Output should be set
    expect(furnace.outputSlot).toEqual({ type: "iron_ingot", count: 1 });
  });

  it("should try to output to neighbor", () => {
    furnace.selectedRecipeId = "iron_ingot";
    furnace.outputSlot = { type: "iron_ingot", count: 1 };
    furnace.isOutputConnected = true;

    // Mock neighbor
    const chest = new Chest(10, 9, "south"); // North of furnace, facing south
    (world.getBuilding as any).mockImplementation((x: number, y: number) => {
      if (x === 10 && y === 9) return chest;
      if ((x === 10 && y === 10) || (x === 10 && y === 11)) return furnace;
      return null;
    });

    furnace.tick(0.1, world);

    // Should have outputted
    expect(furnace.outputSlot).toBeNull();
    expect(chest.slots[0]).toEqual({ type: "iron_ingot", count: 1 });
  });

  it("should process items faster with speed upgrade", () => {
    furnace.selectedRecipeId = "iron_ingot"; // Duration 2s usually
    furnace.addItem("iron_ore", 1); // Need 1 ore for iron_ingot recipe
    furnace.hasPowerSource = true;
    furnace.powerSatisfaction = 1.0;

    // Mock upgrades: 2.0x speed
    (skillTreeManager.getStatMultiplier as any).mockImplementation(
      (building: string, stat: string) => {
        if (building === "furnace" && stat === "processingSpeed") return 2.0;
        return 1.0;
      },
    );

    furnace.tick(0.1, world); // Start job
    expect(furnace.activeJobs).toHaveLength(1);

    // Advance 0.5s => Should be 1.0s progress due to 2x speed => 50%
    furnace.tick(0.5, world);

    // Progress = 0.5 * 2.0 / 2.0 = 0.5
    expect(furnace.activeJobs[0].progress).toBeCloseTo(0.5);

    // Advance another 0.6s => Should finish (0.5 + 0.6 > 1.0 required)
    furnace.tick(0.6, world);

    expect(furnace.activeJobs).toHaveLength(0);
    expect(furnace.outputSlot?.count).toBe(1);
  });

  it("should increase queue capacity with upgrade", () => {
    furnace.selectedRecipeId = "iron_ingot";
    const baseQueue = 20;
    const extraQueue = 5;

    (skillTreeManager.getStatAdditive as any).mockImplementation(
      (building: string, stat: string) => {
        if (building === "furnace" && stat === "queueSize") return extraQueue;
        return 0;
      },
    );

    expect(furnace.getQueueSize()).toBe(baseQueue + extraQueue);

    // Fill to new capacity
    for (let i = 0; i < baseQueue + extraQueue; i++) {
      expect(furnace.addItem("iron_ore", 1)).toBe(true);
    }
    expect(furnace.addItem("iron_ore", 1)).toBe(false); // Overflow
  });

  it("should maintain selected recipe", () => {
    furnace.selectedRecipeId = "iron_ingot";
    expect(furnace.selectedRecipeId).toBe("iron_ingot");

    furnace.selectedRecipeId = "copper_ingot";
    expect(furnace.selectedRecipeId).toBe("copper_ingot");
  });

  describe("Rotation & Footprint", () => {
    it("should occupy 1x2 tiles when facing North", () => {
      expect(furnace.direction).toBe("north");
      expect(furnace.width).toBe(1);
      expect(furnace.height).toBe(2);
    });

    it("should occupy 2x1 tiles when rotated East", () => {
      furnace.rotate(); // north -> east
      expect(furnace.direction).toBe("east");
      expect(furnace.width).toBe(2);
      expect(furnace.height).toBe(1);
    });

    it("should swap dimensions back when rotated South", () => {
      furnace.rotate(); // north -> east
      furnace.rotate(); // east -> south
      expect(furnace.direction).toBe("south");
      expect(furnace.width).toBe(1);
      expect(furnace.height).toBe(2);
    });
  });

  describe("I/O Ports & Validation", () => {
    it("should provide correct port positions", () => {
      // Furnace at 10,10 North (1x2)
      // Body: (10,10), (10,11)
      // Input: back (south of 10,11) -> (10,12)
      // Output: front (north of 10,10) -> (10,9)
      expect(furnace.getInputPosition()).toEqual({ x: 10, y: 12 });
      expect(furnace.getOutputPosition()).toEqual({ x: 10, y: 9 });
    });

    it("should accept items ONLY through the input port", () => {
      furnace.selectedRecipeId = "iron_ingot";

      // Accept from back
      expect(furnace.canInput(10, 12)).toBe(true);
      expect(furnace.addItem("iron_ore", 1, 10, 12)).toBe(true);

      // Reject from side
      expect(furnace.canInput(11, 10)).toBe(false);
      expect(furnace.addItem("iron_ore", 1, 11, 10)).toBe(false);

      // Reject from front
      expect(furnace.canInput(10, 9)).toBe(false);
      expect(furnace.addItem("iron_ore", 1, 10, 9)).toBe(false);
    });

    it("should NOT output items if output port is NOT connected", () => {
      furnace.selectedRecipeId = "iron_ingot";
      furnace.outputSlot = { type: "iron_ingot", count: 1 };
      furnace.isOutputConnected = false;

      const chest = new Chest(10, 9, "south");
      (world.getBuilding as any).mockImplementation((x: number, y: number) => {
        if (x === 10 && y === 9) return chest;
        if ((x === 10 && y === 10) || (x === 10 && y === 11)) return furnace;
        return null;
      });

      // We explicitly skip updateBuildingConnectivity by only ticking the output logic?
      // No, tick() calls updateBuildingConnectivity(this, world).
      // If we want it to stay false, the mock must return something that makes it false.
      // But we ALREADY set it to false.
      // Wait, if tick() calls updateBuildingConnectivity, it will overwrite our manual setting.
      // So the mock should return something that makes it false OR we should test a specific condition.

      // Let's make the mock return NULL for output check to force isOutputConnected = false
      (world.getBuilding as any).mockImplementation((x: number, y: number) => {
        if ((x === 10 && y === 10) || (x === 10 && y === 11)) return furnace;
        return null; // chest not found at (10,9)
      });

      furnace.tick(0.1, world);

      // Should still have item because it wasn't connected
      expect(furnace.isOutputConnected).toBe(false);
      expect(furnace.outputSlot).not.toBeNull();
    });

    it("should output items ONLY when output port IS connected", () => {
      furnace.selectedRecipeId = "iron_ingot";
      furnace.outputSlot = { type: "iron_ingot", count: 1 };
      furnace.isOutputConnected = true;

      const chest = new Chest(10, 9, "south");
      (world.getBuilding as any).mockImplementation((x: number, y: number) => {
        if (x === 10 && y === 9) return chest;
        if ((x === 10 && y === 10) || (x === 10 && y === 11)) return furnace;
        return null;
      });

      furnace.tick(0.1, world);

      expect(furnace.isOutputConnected).toBe(true);
      expect(furnace.outputSlot).toBeNull();
      expect(chest.slots[0]).toEqual({ type: "iron_ingot", count: 1 });
    });
  });
});
