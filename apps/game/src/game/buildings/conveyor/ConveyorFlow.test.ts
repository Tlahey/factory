import { describe, test, expect, beforeEach } from "vitest";
import { Conveyor } from "./Conveyor";
import { ConveyorMerger } from "../conveyor-merger/ConveyorMerger";
import { ConveyorSplitter } from "../conveyor-splitter/ConveyorSplitter";
import { Chest } from "../chest/Chest";
import { Extractor } from "../extractor/Extractor";
import { BuildingEntity } from "../../entities/BuildingEntity";
import { IWorld } from "../../entities/types";

class MockWorld implements Partial<IWorld> {
  public buildings: Map<string, BuildingEntity> = new Map();
  public cables: { x1: number; y1: number; x2: number; y2: number }[] = [];
  public topologyVersion = 0;

  add(b: BuildingEntity) {
    this.buildings.set(`${b.x},${b.y}`, b);
    this.topologyVersion++;
  }

  getBuilding(x: number, y: number) {
    return this.buildings.get(`${x},${y}`);
  }

  getTile(): any {
    return {
      isStone: () => false,
      isWater: () => false,
      isResource: () => false,
    };
  }

  setTile(): void {}
  getConnectionsCount(): number {
    return 0;
  }
  getBuildingConnectionsCount(): number {
    return 0;
  }
  hasPathTo(): boolean {
    return false;
  }
}

const asWorld = (w: MockWorld) => w as unknown as IWorld;

describe("Conveyor flow & connections", () => {
  let world: MockWorld;

  beforeEach(() => {
    world = new MockWorld();
  });

  describe("Belt to belt", () => {
    test("never pushes into a belt's output face (head-to-head)", () => {
      // C1 faces east at (0,0); C2 at (1,0) faces west, i.e. straight back at C1.
      const c1 = new Conveyor(0, 0, "east");
      const c2 = new Conveyor(1, 0, "west");
      world.add(c1);
      world.add(c2);

      c1.currentItem = "iron_ore";
      c1.transportProgress = 1;
      c1.moveItem(asWorld(world));

      expect(c1.currentItem).toBe("iron_ore"); // stays put
      expect(c2.currentItem).toBeNull(); // no ping-pong
      expect(c1.transportProgress).toBe(1);
    });

    test("accepts a side feed onto a straight belt", () => {
      // Main line runs east; a second belt merges from the north.
      const main = new Conveyor(1, 0, "east");
      const side = new Conveyor(1, -1, "south");
      world.add(main);
      world.add(side);

      side.currentItem = "coal";
      side.transportProgress = 1;
      side.moveItem(asWorld(world));

      expect(side.currentItem).toBeNull();
      expect(main.currentItem).toBe("coal");
    });

    test("keeps the progress overflow across the seam", () => {
      const c1 = new Conveyor(0, 0, "east");
      const c2 = new Conveyor(1, 0, "east");
      world.add(c1);
      world.add(c2);

      c1.currentItem = "iron_ore";
      c1.transportProgress = 1.25;
      c1.moveItem(asWorld(world));

      expect(c2.currentItem).toBe("iron_ore");
      expect(c2.transportProgress).toBeCloseTo(0.25, 5);
    });
  });

  describe("Belt to logistics buildings", () => {
    test("feeds a merger through one of its three input sides", () => {
      const merger = new ConveyorMerger(1, 0, "east"); // outputs to (2,0)
      const belt = new Conveyor(1, -1, "south"); // feeds the merger's left side
      world.add(merger);
      world.add(belt);

      belt.currentItem = "iron_ore";
      belt.transportProgress = 1;
      belt.moveItem(asWorld(world));

      expect(belt.currentItem).toBeNull();
      expect(merger.currentItem).toBe("iron_ore");
    });

    test("feeds a splitter through its back only", () => {
      const splitter = new ConveyorSplitter(1, 0, "east"); // input at (0,0)
      const fromBack = new Conveyor(0, 0, "east");
      const fromSide = new Conveyor(1, -1, "south");
      world.add(splitter);
      world.add(fromBack);
      world.add(fromSide);

      fromSide.currentItem = "coal";
      fromSide.transportProgress = 1;
      fromSide.moveItem(asWorld(world));
      expect(fromSide.currentItem).toBe("coal"); // rejected: not the back
      expect(splitter.currentItem).toBeNull();

      fromBack.currentItem = "iron_ore";
      fromBack.transportProgress = 1;
      fromBack.moveItem(asWorld(world));
      expect(fromBack.currentItem).toBeNull();
      expect(splitter.currentItem).toBe("iron_ore");
    });
  });

  describe("Producers to logistics buildings", () => {
    test("an extractor can feed a merger directly", () => {
      const extractor = new Extractor(0, 0, "east");
      const merger = new ConveyorMerger(1, 0, "east");
      world.add(extractor);
      world.add(merger);

      extractor.addToBuffer("iron_ore", 1);

      expect(extractor.checkOutputClear(asWorld(world))).toBe(true);
      expect(extractor.tryOutput(asWorld(world))).toBe(true);
      expect(merger.currentItem).toBe("iron_ore");
    });

    test("an extractor reports blocked when the target is full", () => {
      const extractor = new Extractor(0, 0, "east");
      const belt = new Conveyor(1, 0, "east");
      world.add(extractor);
      world.add(belt);

      extractor.addToBuffer("iron_ore", 1);
      belt.currentItem = "coal"; // occupied

      expect(extractor.checkOutputClear(asWorld(world))).toBe(false);
      expect(extractor.tryOutput(asWorld(world))).toBe(false);
    });
  });

  describe("Chest input port", () => {
    test("accepts a belt feeding its front", () => {
      // Chest faces north, so its input port is the tile to the north.
      const chest = new Chest(0, 0, "north");
      const belt = new Conveyor(0, -1, "south");
      world.add(chest);
      world.add(belt);

      belt.currentItem = "iron_ore";
      belt.transportProgress = 1;
      belt.moveItem(asWorld(world));

      expect(belt.currentItem).toBeNull();
      expect(chest.slots[0]).toEqual({ type: "iron_ore", count: 1 });
    });

    test("rejects a belt feeding a side, matching what the arrows show", () => {
      const chest = new Chest(0, 0, "north"); // input at (0,-1)
      const belt = new Conveyor(-1, 0, "east"); // arrives from the west side
      world.add(chest);
      world.add(belt);

      belt.currentItem = "iron_ore";
      belt.transportProgress = 1;
      belt.moveItem(asWorld(world));

      expect(belt.currentItem).toBe("iron_ore");
      expect(chest.slots.length).toBe(0);
    });

    test("still accepts direct (UI/internal) transfers without coordinates", () => {
      const chest = new Chest(0, 0, "north");
      expect(chest.addItem("iron_ore", 5)).toBe(true);
      expect(chest.slots[0].count).toBe(5);
    });
  });

  describe("Topology caching", () => {
    test("recomputes the turn visual only when the world changed", () => {
      const belt = new Conveyor(1, 0, "east");
      world.add(belt);

      expect(belt.refreshTopology(asWorld(world))).toBe(true);
      expect(belt.refreshTopology(asWorld(world))).toBe(false);

      // A new neighbour bumps the version, so the belt refreshes again.
      world.add(new Conveyor(1, -1, "south"));
      expect(belt.refreshTopology(asWorld(world))).toBe(true);
      expect(belt.visualType).toBe("left"); // only feed is the side one: it curves
    });

    test("only a side feed makes the belt curve", () => {
      const turning = new Conveyor(1, 0, "east");
      const fromNorth = new Conveyor(1, -1, "south");
      world.add(turning);
      world.add(fromNorth);

      turning.updateVisualState(asWorld(world));
      expect(turning.visualType).toBe("left");
    });

    test("a back feed wins over a side feed, so the run stays straight", () => {
      // Regression: a straight run that also gets a side merge used to flip to
      // a curve because the first neighbour found won.
      const belt = new Conveyor(1, 0, "east");
      const behind = new Conveyor(0, 0, "east");
      const fromNorth = new Conveyor(1, -1, "south");
      world.add(belt);
      world.add(behind);
      world.add(fromNorth);

      belt.updateVisualState(asWorld(world));
      expect(belt.visualType).toBe("straight");
    });
  });
});
