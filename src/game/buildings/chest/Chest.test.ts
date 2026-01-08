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
    test("input is connected when an outputting building is in front", () => {
      // Chest at (5,5) facing north. Input is at (5,4).
      const mockConveyor = {
        x: 5,
        y: 4,
        getOutputPosition: () => ({ x: 5, y: 5 })
      };
      
      world.buildings.set("5,4", mockConveyor as unknown as BuildingEntity);
      
      chest.tick(0, world as unknown as IWorld);
      expect(chest.isInputConnected).toBe(true);
    });

    test("input is disconnected when neighbor is facing away", () => {
      const mockConveyor = {
        x: 5,
        y: 4,
        getOutputPosition: () => ({ x: 5, y: 3 }) // points away from chest
      };
      
      world.buildings.set("5,4", mockConveyor as unknown as BuildingEntity);
      
      chest.tick(0, world as unknown as IWorld);
      expect(chest.isInputConnected).toBe(false);
    });

    test("output is never connected (chests don't output by themselves)", () => {
      chest.tick(0, world as unknown as IWorld);
      expect(chest.isOutputConnected).toBe(false);
    });
  });
});
