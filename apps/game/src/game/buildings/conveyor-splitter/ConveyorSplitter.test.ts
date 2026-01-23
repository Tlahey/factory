import { describe, test, expect, beforeEach } from "vitest";
import { ConveyorSplitter } from "./ConveyorSplitter";
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

describe("ConveyorSplitter", () => {
  let world: MockWorld;
  let splitter: ConveyorSplitter;

  beforeEach(() => {
    world = new MockWorld();
    splitter = new ConveyorSplitter(2, 2, "north");
    world.setBuilding(2, 2, splitter);
  });

  test("should identify output positions correctly", () => {
    const outputs = splitter.getOutputPositions();
    // North splitter: Input is South (2,3). Outputs are North (2,1), West (1,2), East (3,2).
    expect(outputs).toContainEqual({ x: 2, y: 1 }); // Front (North)
    expect(outputs).toContainEqual({ x: 1, y: 2 }); // Left (West)
    expect(outputs).toContainEqual({ x: 3, y: 2 }); // Right (East)
  });

  test("should accept items from back input", () => {
    expect(splitter.addItem("iron", 1, 2, 3)).toBe(true);
    expect(splitter.currentItem).toBe("iron");
  });

  test("should not accept items from other sides", () => {
    expect(splitter.addItem("iron", 1, 1, 2)).toBe(false); // Left
    expect(splitter.addItem("iron", 1, 3, 2)).toBe(false); // Right
    expect(splitter.addItem("iron", 1, 2, 1)).toBe(false); // Front
  });

  test("should follow round-robin output order", () => {
    // Order: FRONT -> LEFT -> RIGHT
    const frontConv = new Conveyor(2, 1, "north");
    const leftConv = new Conveyor(1, 2, "west");
    const rightConv = new Conveyor(3, 2, "east");

    world.setBuilding(2, 1, frontConv);
    world.setBuilding(1, 2, leftConv);
    world.setBuilding(3, 2, rightConv);

    // Initial tick to set lastWorld
    splitter.tick(0.1, world as unknown as IWorld);

    // 1. Output to FRONT (Instant)
    splitter.addItem("item1", 1, 2, 3);
    expect(frontConv.currentItem).toBe("item1");
    expect(splitter.currentItem).toBeNull();
    frontConv.currentItem = null; // Clear

    // 2. Output to LEFT (Instant)
    splitter.addItem("item2", 1, 2, 3);
    expect(leftConv.currentItem).toBe("item2");
    expect(splitter.currentItem).toBeNull();
    leftConv.currentItem = null;

    // 3. Output to RIGHT (Instant)
    splitter.addItem("item3", 1, 2, 3);
    expect(rightConv.currentItem).toBe("item3");
    expect(splitter.currentItem).toBeNull();
    rightConv.currentItem = null;

    // 4. Back to FRONT (Instant)
    splitter.addItem("item4", 1, 2, 3);
    expect(frontConv.currentItem).toBe("item4");
  });

  test("should output item with 0 transport progress (zero latency)", () => {
    const frontConv = new Conveyor(2, 1, "north");
    world.setBuilding(2, 1, frontConv);

    splitter.tick(0.1, world as unknown as IWorld);
    splitter.addItem("item1", 1, 2, 3);

    expect(frontConv.currentItem).toBe("item1");
    expect(frontConv.transportProgress).toBe(0);
  });

  test("should skip full outputs", () => {
    // Order: FRONT -> LEFT -> RIGHT
    const frontConv = new Conveyor(2, 1, "north");
    const leftConv = new Conveyor(1, 2, "west");
    const rightConv = new Conveyor(3, 2, "east");

    world.setBuilding(2, 1, frontConv);
    world.setBuilding(1, 2, leftConv);
    world.setBuilding(3, 2, rightConv);

    // Block FRONT
    frontConv.currentItem = "blocked";

    splitter.addItem("item1");
    splitter.transportProgress = 1.0;

    // Should skip FRONT and go to LEFT
    expect(splitter.tryOutput(world as any)).toBe(true);
    expect(leftConv.currentItem).toBe("item1");
    expect(frontConv.currentItem).toBe("blocked");
  });
});
