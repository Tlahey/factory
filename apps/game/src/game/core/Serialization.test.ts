import { describe, it, expect, beforeEach } from "vitest";
import { World } from "./World";
import { useGameStore } from "../state/store";
import { Furnace } from "../buildings/furnace/Furnace";

import { TileType } from "../constants";
import { TileFactory } from "../TileFactory";

describe("Serialization Persistence", () => {
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
      },
    });
    world = new World();
  });

  describe("Furnace Persistence", () => {
    it("should serialize and deserialize active furnace state directly", () => {
      const furnace = new Furnace(0, 0, "north");
      furnace.setRecipe("iron-ingot");
      furnace.inputQueue = [{ type: "iron-ore", count: 10 }];
      furnace.outputSlot = { type: "iron-ingot", count: 5 };
      furnace.activeJobs = [
        { recipeId: "iron-ingot", progress: 0.5, elapsed: 1 },
      ];

      const data = furnace.serialize();
      const restored = new Furnace(0, 0, "north");
      restored.deserialize(data);

      expect(restored.selectedRecipeId).toBe("iron-ingot");
      expect(restored.inputQueue).toEqual([{ type: "iron-ore", count: 10 }]);
      expect(restored.outputSlot).toEqual({ type: "iron-ingot", count: 5 });
      expect(restored.activeJobs).toHaveLength(1);
      expect(restored.activeJobs[0].progress).toBe(0.5);
    });
  });

  describe("Chest Persistence", () => {
    it("should store inventory", () => {
      world.grid[15][15] = TileFactory.createTile(TileType.GRASS);
      world.placeBuilding(15, 15, "chest");
      const chest = world.getBuilding(15, 15) as any;
      chest.addItem("iron-ore", 10);
      chest.bonusSlots = 2;

      const data = world.serialize();
      world = new World();
      world.deserialize(data);

      const restored = world.getBuilding(15, 15) as any;
      expect(restored).toBeDefined();
      expect(restored.slots).toEqual([{ type: "iron-ore", count: 10 }]);
      expect(restored.bonusSlots).toBe(2);
    });
  });

  describe("Conveyor Persistence", () => {
    it("should store items on belt", () => {
      world.grid[16][16] = TileFactory.createTile(TileType.GRASS);
      world.placeBuilding(16, 16, "conveyor");
      const belt = world.getBuilding(16, 16) as any;
      belt.currentItem = "copper-wire";
      belt.transportProgress = 0.8;
      belt.itemId = 12345;

      const data = world.serialize();
      world = new World();
      world.deserialize(data);

      const restored = world.getBuilding(16, 16) as any;
      expect(restored).toBeDefined();
      expect(restored.currentItem).toBe("copper-wire");
      expect(restored.transportProgress).toBe(0.8);
      expect(restored.itemId).toBe(12345);
    });

    it("should store merger state", () => {
      world.grid[17][17] = TileFactory.createTile(TileType.GRASS);
      world.placeBuilding(17, 17, "conveyor_merger");
      const merger = world.getBuilding(17, 17) as any;
      merger.currentItem = "coal";
      merger.transportProgress = 0.5;

      const data = world.serialize();
      world = new World();
      world.deserialize(data);

      const restored = world.getBuilding(17, 17) as any;
      expect(restored).toBeDefined();
      expect(restored.currentItem).toBe("coal");
      expect(restored.transportProgress).toBe(0.5);
    });
  });

  describe("Power Grid Building Persistence", () => {
    it("should store battery charge", () => {
      world.grid[18][18] = TileFactory.createTile(TileType.GRASS);
      world.placeBuilding(18, 18, "battery");
      const battery = world.getBuilding(18, 18) as any;
      battery.currentCharge = 500;
      battery.isEnabled = false;

      const data = world.serialize();
      world = new World();
      world.deserialize(data);

      const restored = world.getBuilding(18, 18) as any;
      expect(restored).toBeDefined();
      expect(restored.currentCharge).toBe(500);
      expect(restored.isEnabled).toBe(false);
    });

    it("should store hub state", () => {
      world.grid[20][20] = TileFactory.createTile(TileType.GRASS);
      world.grid[20][21] = TileFactory.createTile(TileType.GRASS);
      world.grid[21][20] = TileFactory.createTile(TileType.GRASS);
      world.grid[21][21] = TileFactory.createTile(TileType.GRASS);
      world.placeBuilding(20, 20, "hub");
      const hub = world.getBuilding(20, 20) as any;
      hub.isEnabled = false;

      const data = world.serialize();
      world = new World();
      world.deserialize(data);

      const restored = world.getBuilding(20, 20) as any;
      expect(restored).toBeDefined();
      expect(restored.isEnabled).toBe(false);
    });

    it("should exist after reload (Electric Pole - stateless)", () => {
      world.grid[22][22] = TileFactory.createTile(TileType.GRASS);
      world.placeBuilding(22, 22, "electric_pole");

      const data = world.serialize();
      world = new World();
      world.deserialize(data);

      const restored = world.getBuilding(22, 22);
      expect(restored).toBeDefined();
    });
  });

  describe("Extractor Persistence", () => {
    // Note: Extractor logic involves automatic finding of resources,
    // but here we just test state persistence.
    it("should persist internal buffer amount", () => {
      const x = 25,
        y = 25;
      // Force place resource tile for extractor validity
      world.grid[y][x] = TileFactory.createTile(TileType.STONE);

      world.placeBuilding(x, y, "extractor");
      const extractor = world.getBuilding(x, y) as any;

      extractor.slots = [{ type: "iron-ore", count: 15 }];
      extractor.speedMultiplier = 2.5;

      const data = world.serialize();

      world = new World();
      world.deserialize(data);

      const restoredExtractor = world.getBuilding(x, y) as any;
      expect(restoredExtractor).toBeDefined();
      expect(restoredExtractor.slots).toEqual([
        { type: "iron-ore", count: 15 },
      ]);
      expect(restoredExtractor.speedMultiplier).toBe(2.5);
    });
  });
});
