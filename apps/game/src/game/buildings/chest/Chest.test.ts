import { describe, test, expect, beforeEach } from "vitest";
import { Chest } from "./Chest";
import { BuildingEntity } from "../../entities/BuildingEntity";
import { IWorld } from "../../entities/types";

// Simple mock world for connectivity tests
class MockWorld implements Partial<IWorld> {
  buildings = new Map<string, BuildingEntity>();
  getBuilding(x: number, y: number) {
    return this.buildings.get(`${x},${y}`);
  }
}

describe("Chest IO & Storage", () => {
  let chest: Chest;
  let world: MockWorld;

  beforeEach(() => {
    chest = new Chest(5, 5, "north");
    world = new MockWorld();
  });

  describe("Storage Logic", () => {
    test("starts empty", () => {
      expect(chest.slots.length).toBe(0);
      expect(chest.isFull()).toBe(false);
    });

    test("addItem stacks existing items", () => {
      chest.addItem("iron", 50);
      expect(chest.slots.length).toBe(1);
      expect(chest.slots[0].count).toBe(50);

      chest.addItem("iron", 30);
      expect(chest.slots.length).toBe(1);
      expect(chest.slots[0].count).toBe(80);
    });

    test("addItem creates new slot when needed", () => {
      chest.addItem("iron", 100); // Assuming STACK_SIZE is 100 (from constants.ts)
      chest.addItem("copper", 10);

      expect(chest.slots.length).toBe(2);
      expect(chest.slots[1].type).toBe("copper");
    });

    test("isFull and blocking addItem", () => {
      // Max slots is 5 by default
      chest.addItem("item1", 100);
      chest.addItem("item2", 100);
      chest.addItem("item3", 100);
      chest.addItem("item4", 100);
      chest.addItem("item5", 100);

      expect(chest.isFull()).toBe(true);

      const added = chest.addItem("item6", 1);
      expect(added).toBe(false);
      expect(chest.slots.length).toBe(5);
    });
  });

  describe("IO Connectivity", () => {
    test("input is connected when feeder at input position outputs to us", () => {
      // Chest at (5,5) facing north. Input is at (5,4).
      // Feeder at (5,4) outputs to (5,5) which is the chest
      const mockConveyor = {
        x: 5,
        y: 4,
        getOutputPosition: () => ({ x: 5, y: 5 }), // outputs to chest's position
      };

      world.buildings.set("5,5", chest as unknown as BuildingEntity);
      world.buildings.set("5,4", mockConveyor as unknown as BuildingEntity);

      chest.tick(0, world as unknown as IWorld);
      expect(chest.isInputConnected).toBe(true);
    });

    test("input is disconnected when feeder outputs away", () => {
      // Feeder at (5,4) outputs to (5,3) - away from chest
      const mockConveyor = {
        x: 5,
        y: 4,
        getOutputPosition: () => ({ x: 5, y: 3 }), // points away from chest
      };

      world.buildings.set("5,5", chest as unknown as BuildingEntity);
      world.buildings.set("5,4", mockConveyor as unknown as BuildingEntity);

      chest.tick(0, world as unknown as IWorld);
      expect(chest.isInputConnected).toBe(false);
    });

    test("output is connected when conveyor at output position", () => {
      // Chest at (5,5) facing north. Output is at (5,6) (back side).
      const mockConveyor = {
        x: 5,
        y: 6,
        getOutputPosition: () => ({ x: 5, y: 7 }), // conveyor outputs further away
      };

      world.buildings.set("5,5", chest as unknown as BuildingEntity);
      world.buildings.set("5,6", mockConveyor as unknown as BuildingEntity);

      chest.tick(0, world as unknown as IWorld);
      expect(chest.isOutputConnected).toBe(true);
    });
  });

  describe("Output Logic", () => {
    test("canOutput returns false when chest is empty", () => {
      expect(chest.canOutput()).toBe(false);
    });

    test("canOutput returns true when chest has items", () => {
      chest.addItem("iron", 10);
      expect(chest.canOutput()).toBe(true);
    });

    test("tryOutput pushes item to resolved conveyor", async () => {
      // Use dynamic import to avoid circular dependency issues
      const { Conveyor } = await import("../conveyor/Conveyor");

      // Setup: Chest at (5,5) facing north, output at (5,6)
      chest.addItem("iron", 5);

      // Create a real conveyor at the output position
      const conveyor = new Conveyor(5, 6, "south");
      conveyor.isResolved = true;
      conveyor.currentItem = null;

      world.buildings.set("5,5", chest as unknown as BuildingEntity);
      world.buildings.set("5,6", conveyor as unknown as BuildingEntity);

      // Call tick to trigger output
      chest.tick(0.1, world as unknown as IWorld);

      // Verify item was pushed to conveyor
      expect(conveyor.currentItem).toBe("iron");
      expect(conveyor.itemId).not.toBeNull();
      expect(chest.slots[0].count).toBe(4);
    });

    test("tryOutput pushes item to unresolved conveyor", async () => {
      const { Conveyor } = await import("../conveyor/Conveyor");

      chest.addItem("iron", 5);

      const conveyor = new Conveyor(5, 6, "south");
      conveyor.isResolved = false; // Not resolved!
      conveyor.currentItem = null;

      world.buildings.set("5,5", chest as unknown as BuildingEntity);
      world.buildings.set("5,6", conveyor as unknown as BuildingEntity);

      chest.tick(0.1, world as unknown as IWorld);

      // Item SHOULD be pushed
      expect(conveyor.currentItem).toBe("iron");
      expect(chest.slots[0].count).toBe(4);
    });

    test("tryOutput does not push to full conveyor", async () => {
      const { Conveyor } = await import("../conveyor/Conveyor");

      chest.addItem("iron", 5);

      const conveyor = new Conveyor(5, 6, "south");
      conveyor.isResolved = true;
      conveyor.currentItem = "copper"; // Already has an item

      world.buildings.set("5,5", chest as unknown as BuildingEntity);
      world.buildings.set("5,6", conveyor as unknown as BuildingEntity);

      chest.tick(0.1, world as unknown as IWorld);

      // Item should NOT be pushed
      expect(conveyor.currentItem).toBe("copper");
      expect(chest.slots[0].count).toBe(5);
    });

    test("removes empty slot after outputting last item", async () => {
      const { Conveyor } = await import("../conveyor/Conveyor");

      chest.addItem("iron", 1); // Only 1 item
      expect(chest.slots.length).toBe(1);

      const conveyor = new Conveyor(5, 6, "south");
      conveyor.isResolved = true;
      conveyor.currentItem = null;

      world.buildings.set("5,5", chest as unknown as BuildingEntity);
      world.buildings.set("5,6", conveyor as unknown as BuildingEntity);

      chest.tick(0.1, world as unknown as IWorld);

      // Slot should be removed
      expect(chest.slots.length).toBe(0);
      expect(conveyor.currentItem).toBe("iron");
    });
  });
});
