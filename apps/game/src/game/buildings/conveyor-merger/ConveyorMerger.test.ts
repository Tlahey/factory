import { describe, test, expect, beforeEach } from "vitest";
import { ConveyorMerger } from "./ConveyorMerger";
import { IWorld } from "../../entities/types";
import { Conveyor } from "../conveyor/Conveyor";
import { Tile } from "../../core/Tile";
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

    // Update merger to see the world
    merger.tick(0.1, world as unknown as IWorld);

    // 2. Initial state: any can go. Let's take from LEFT.
    expect(merger.addItem("copper", 1, 1, 2)).toBe(true);
    expect(merger.currentItem).toBe("copper");

    // 3. Last taken was LEFT. Next priority should be RIGHT, then BACK.
    merger.currentItem = null; // Simulate outputting

    // If RIGHT tries, it should succeed.
    expect(merger.canInput(3, 2)).toBe(true);

    // If BACK tries, it should FAIL because RIGHT is also ready and has higher priority.
    expect(merger.canInput(2, 3)).toBe(false);

    // 4. Take from RIGHT.
    expect(merger.addItem("gold", 1, 3, 2)).toBe(true);
    merger.currentItem = null;

    // 5. Last taken was RIGHT. Next priority is BACK.
    expect(merger.canInput(2, 3)).toBe(true);
    // LEFT should FAIL because BACK is ready.
    expect(merger.canInput(1, 2)).toBe(false);
  });

  test("should output items to a conveyor in front", () => {
    const outputConv = new Conveyor(2, 1, "north");
    world.setBuilding(2, 1, outputConv);

    merger.addItem("iron", 1, 2, 3);
    merger.transportProgress = 1.0;

    const moved = merger.tryOutput(world as unknown as IWorld);
    expect(moved).toBe(true);
    expect(merger.currentItem).toBeNull();
    expect(outputConv.currentItem).toBe("iron");
  });
});
