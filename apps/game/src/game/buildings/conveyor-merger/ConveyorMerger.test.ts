import { describe, test, expect, beforeEach } from "vitest";
import { ConveyorMerger } from "./ConveyorMerger";
import { IWorld } from "../../entities/types";
import { Conveyor } from "../conveyor/Conveyor";
import { Tile } from "../../environment/Tile";
import { BuildingEntity } from "../../entities/BuildingEntity";

// Mock World for testing
class MockWorld implements IWorld {
  private buildings: Map<string, BuildingEntity> = new Map();
  public cables: { x1: number; y1: number; x2: number; y2: number }[] = [];

  getBuilding(x: number, y: number): BuildingEntity | undefined {
    return this.buildings.get(`${x},${y}`);
  }

  setBuilding(x: number, y: number, building: BuildingEntity) {
    this.buildings.set(`${x},${y}`, building);
  }

  getConnectionsCount(_x: number, _y: number): number {
    return 0;
  }
  getBuildingConnectionsCount(_building: BuildingEntity): number {
    return 0;
  }

  getTile(_x: number, _y: number): Tile {
    return { isStone: () => false, isWater: () => false } as any;
  }

  setTile(_x: number, _y: number, _tile: Tile): void {}

  hasPathTo(
    _startX: number,
    _startY: number,
    _targetType: string,
    _viaTypes: string[],
  ): boolean {
    return false;
  }
}

describe("ConveyorMerger", () => {
  let world: MockWorld;
  let merger: ConveyorMerger;

  beforeEach(() => {
    world = new MockWorld();
    merger = new ConveyorMerger(2, 2, "north");
    world.setBuilding(2, 2, merger);
  });

  test("should identify input positions correctly", () => {
    const inputs = merger.getInputPositions();
    // North merger: Output is (2,1). Inputs are South (2,3), West (1,2), East (3,2).
    expect(inputs).toContainEqual({ x: 2, y: 3 }); // Back (South)
    expect(inputs).toContainEqual({ x: 1, y: 2 }); // Left (West)
    expect(inputs).toContainEqual({ x: 3, y: 2 }); // Right (East)
  });

  test("should accept items from any of the three inputs", () => {
    expect(merger.addItem("iron", 1, 2, 3)).toBe(true); // Back
    merger.currentItem = null;
    expect(merger.addItem("iron", 1, 1, 2)).toBe(true); // Left
    merger.currentItem = null;
    expect(merger.addItem("iron", 1, 3, 2)).toBe(true); // Right
  });

  test("should not accept item if already full", () => {
    merger.addItem("iron", 1, 2, 3);
    expect(merger.addItem("copper", 1, 1, 2)).toBe(false);
  });

  test("should follow round-robin fairness order", () => {
    // Order: BACK -> LEFT -> RIGHT

    // 1. Setup neighbors with items
    const backConv = new Conveyor(2, 3, "north");
    backConv.currentItem = "iron";
    backConv.transportProgress = 1.0;
    world.setBuilding(2, 3, backConv);

    const leftConv = new Conveyor(1, 2, "east");
    leftConv.currentItem = "copper";
    leftConv.transportProgress = 1.0;
    world.setBuilding(1, 2, leftConv);

    const rightConv = new Conveyor(3, 2, "west");
    rightConv.currentItem = "gold";
    rightConv.transportProgress = 1.0;
    world.setBuilding(3, 2, rightConv);

    // 2. First tick: Should pull from BACK (Priority 1)
    merger.tick(0.1, world as unknown as IWorld);
    expect(merger.currentItem).toBe("iron");
    expect(backConv.currentItem).toBeNull();

    // Simulate output
    merger.currentItem = null;

    // 3. Second tick: Should pull from LEFT (Priority 2)
    merger.tick(0.1, world as unknown as IWorld);
    expect(merger.currentItem).toBe("copper");
    expect(leftConv.currentItem).toBeNull();

    // Simulate output
    merger.currentItem = null;

    // 4. Third tick: Should pull from RIGHT (Priority 3)
    merger.tick(0.1, world as unknown as IWorld);
    expect(merger.currentItem).toBe("gold");
    expect(rightConv.currentItem).toBeNull();

    // Simulate output
    merger.currentItem = null;

    // 5. Replenish BACK and tick again -> Back to BACK
    backConv.currentItem = "iron2";
    backConv.transportProgress = 1.0;

    merger.tick(0.1, world as unknown as IWorld);
    expect(merger.currentItem).toBe("iron2");
  });

  test("should output items to a conveyor in front instantly on addItem", () => {
    const outputConv = new Conveyor(2, 1, "north");
    world.setBuilding(2, 1, outputConv);

    // Initial tick to set lastWorld
    merger.tick(0.1, world as unknown as IWorld);

    // Add item - should output immediately
    merger.addItem("iron", 1, 2, 3);

    expect(merger.currentItem).toBeNull(); // Should be empty
    expect(outputConv.currentItem).toBe("iron"); // Should have moved
  });

  test("should proactively pull items from input conveyors", () => {
    // Setup input conveyor with item
    const backConv = new Conveyor(2, 3, "north");
    backConv.currentItem = "iron";
    backConv.transportProgress = 1.0; // Ready to output
    world.setBuilding(2, 3, backConv);

    // Setup output conveyor
    const outputConv = new Conveyor(2, 1, "north");
    world.setBuilding(2, 1, outputConv);

    // Tick merger - should pull from backConv AND push to outputConv in same tick
    merger.tick(0.1, world as unknown as IWorld);

    expect(backConv.currentItem).toBeNull(); // Pulled
    expect(merger.currentItem).toBeNull(); // Pushed
    expect(outputConv.currentItem).toBe("iron"); // Received
  });

  test("should output item with 0 transport progress (zero latency)", () => {
    const outputConv = new Conveyor(2, 1, "north");
    world.setBuilding(2, 1, outputConv);

    merger.tick(0.1, world as unknown as IWorld);
    merger.addItem("iron", 1, 2, 3);

    expect(outputConv.currentItem).toBe("iron");
    expect(outputConv.transportProgress).toBe(0); // Zero latency start
  });
});
