import { describe, it, test, expect, beforeEach, vi } from "vitest";
import { World } from "./World";
import { useGameStore } from "../state/store";
import { Furnace } from "../buildings/furnace/Furnace";
import { Chest } from "../buildings/chest/Chest";
import { TileType } from "../constants";
import { TileFactory } from "../environment/TileFactory";

// Mock external dependencies
vi.mock("../buildings/hub/skill-tree/SkillTreeManager", () => ({
  skillTreeManager: {
    getStatMultiplier: vi.fn().mockReturnValue(1.0),
    getStatAdditive: vi.fn().mockReturnValue(0),
  },
}));

describe("World", () => {
  let world: World;

  beforeEach(() => {
    useGameStore.getState().reset();
    useGameStore.setState({
      purchasedCounts: {
        furnace: 100,
        chest: 100,
        conveyor: 100,
        conveyor_merger: 100,
        battery: 100,
        hub: 100,
        electric_pole: 100,
        extractor: 100,
        sawmill: 100,
      },
    });
    world = new World();
  });

  describe("Placement Rules & Limits", () => {
    it("should prevent placing more Hubs than allowed", () => {
      // Hub maxCount is 1
      const success1 = world.placeBuilding(5, 5, "hub");
      expect(success1).toBe(true);

      // Try placing another Hub
      const canPlace = world.canPlaceBuilding(10, 10, "hub");
      expect(canPlace).toBe(false);

      const success2 = world.placeBuilding(10, 10, "hub");
      expect(success2).toBe(false);
    });

    it("should allow placing unlimited buildings like conveyors", () => {
      world.placeBuilding(5, 5, "conveyor");
      const canPlace = world.canPlaceBuilding(6, 5, "conveyor");
      expect(canPlace).toBe(true);
    });
  });

  describe("Building Interaction & Cables", () => {
    test("should delete cables when a building is removed", () => {
      const x1 = 10,
        y1 = 10;
      const x2 = 15,
        y2 = 10;

      world.setTile(x1, y1, TileFactory.createTile(TileType.GRASS));
      world.setTile(x2, y2, TileFactory.createTile(TileType.GRASS));

      world.placeBuilding(x1, y1, "electric_pole");
      world.placeBuilding(x2, y2, "electric_pole");

      world.addCable(x1, y1, x2, y2);
      expect(world.cables.length).toBe(1);

      world.removeBuilding(x1, y1);
      expect(world.cables.length).toBe(0);
    });

    test("should delete cables connected to any tile of a multi-tile building", () => {
      const hx = 10,
        hy = 10;

      world.setTile(hx, hy, TileFactory.createTile(TileType.GRASS));
      world.setTile(hx + 1, hy, TileFactory.createTile(TileType.GRASS));
      world.setTile(hx, hy + 1, TileFactory.createTile(TileType.GRASS));
      world.setTile(hx + 1, hy + 1, TileFactory.createTile(TileType.GRASS));

      world.placeBuilding(hx, hy, "hub");

      const px = 15,
        py = 10;
      world.setTile(px, py, TileFactory.createTile(TileType.GRASS));
      world.placeBuilding(px, py, "electric_pole");

      world.addCable(hx + 1, hy + 1, px, py);
      expect(world.cables.length).toBe(1);

      world.removeBuilding(hx, hy);
      expect(world.cables.length).toBe(0);
    });
  });

  describe("Serialization & Persistence", () => {
    it("should correctly count buildings after deserialization", () => {
      world.setTile(10, 10, TileFactory.createTile(TileType.GRASS));
      world.setTile(11, 10, TileFactory.createTile(TileType.GRASS));
      world.setTile(10, 11, TileFactory.createTile(TileType.GRASS));
      world.setTile(11, 11, TileFactory.createTile(TileType.GRASS));

      world.placeBuilding(10, 10, "hub");
      expect(useGameStore.getState().buildingCounts["hub"]).toBe(1);

      const data = world.serialize();
      world.deserialize(data);
      expect(useGameStore.getState().buildingCounts["hub"]).toBe(1);
    });

    it("should store building-specific state", () => {
      // Furnace
      const furnace = new Furnace(5, 5, "north");
      furnace.setRecipe("iron-ingot");
      furnace.inputQueue = [{ type: "iron-ore", count: 10 }];
      furnace.outputSlot = { type: "iron-ingot", count: 5 };
      furnace.activeJobs = [
        { recipeId: "iron-ingot", progress: 0.5, elapsed: 1 },
      ];

      const fData = furnace.serialize();
      const restoredF = new Furnace(5, 5, "north");
      restoredF.deserialize(fData);
      expect(restoredF.selectedRecipeId).toBe("iron-ingot");
      expect(restoredF.inputQueue[0].count).toBe(10);

      // Chest
      world.setTile(15, 15, TileFactory.createTile(TileType.GRASS));
      world.placeBuilding(15, 15, "chest");
      const chest = world.getBuilding(15, 15) as Chest;
      chest.addItem("iron_ore", 10);

      const wData = world.serialize();
      const newWorld = new World();
      newWorld.deserialize(wData);

      const restoredC = newWorld.getBuilding(15, 15) as Chest;
      expect(restoredC.slots[0].count).toBe(10);
    });

    it("should persist extractor buffer and speed", () => {
      const x = 25,
        y = 25;
      world.grid[y][x] = TileFactory.createTile(TileType.STONE);
      world.placeBuilding(x, y, "extractor");
      const extractor = world.getBuilding(x, y) as any;
      extractor.slots = [{ type: "iron-ore", count: 15 }];
      extractor.speedMultiplier = 2.5;

      const data = world.serialize();
      const newWorld = new World();
      newWorld.deserialize(data);

      const restored = newWorld.getBuilding(x, y) as any;
      expect(restored.slots[0].count).toBe(15);
      expect(restored.speedMultiplier).toBe(2.5);
    });
  });
});
