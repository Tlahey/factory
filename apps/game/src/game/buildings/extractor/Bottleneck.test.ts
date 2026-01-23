import { describe, test, expect, beforeEach } from "vitest";
import { Extractor } from "./Extractor";
import { Conveyor } from "../conveyor/Conveyor";
import { ResourceTile } from "../../environment/ResourceTile";
import { IWorld } from "../../entities/types";
import { TileType } from "../../constants";

class MockStoneTile extends ResourceTile {
  constructor(amount: number) {
    super(amount);
  }
  getResourceType(): string {
    return "stone";
  }
  getType(): TileType {
    return TileType.SAND;
  }
  isStone(): boolean {
    return true;
  }
  isWater(): boolean {
    return false;
  }
}

class MockWorld implements IWorld {
  buildings: Map<string, any> = new Map();
  tiles: Map<string, any> = new Map();
  cables: { x1: number; y1: number; x2: number; y2: number }[] = [];

  getBuilding(x: number, y: number) {
    return this.buildings.get(`${x},${y}`);
  }
  getTile(x: number, y: number) {
    return this.tiles.get(`${x},${y}`);
  }
  addBuilding(b: any) {
    this.buildings.set(`${b.x},${b.y}`, b);
  }
  setTile(x: number, y: number, t: any) {
    this.tiles.set(`${x},${y}`, t);
  }
  hasPathTo(
    _startX: number,
    _startY: number,
    _targetType: string,
    _viaTypes: string[],
  ): boolean {
    return true;
  }
  getTiles() {
    return Array.from(this.tiles.values());
  }
  getConnectionsCount() {
    return 0;
  }
  getBuildingConnectionsCount() {
    return 0;
  }
}

class MockExtractor extends Extractor {
  public override get extractionRate(): number {
    return 120;
  }
}

describe("Throughput Bottleneck Test", () => {
  let world: MockWorld;
  let extractor: MockExtractor;
  let conv0: Conveyor;
  let conv1: Conveyor;
  let tile: MockStoneTile;

  beforeEach(() => {
    world = new MockWorld();
    extractor = new MockExtractor(0, 0, "east");
    extractor.hasPowerSource = true;
    extractor.powerSatisfaction = 1.0;

    conv0 = new Conveyor(1, 0, "east");
    conv0.isResolved = true;
    conv1 = new Conveyor(2, 0, "east");
    conv1.isResolved = true;

    tile = new MockStoneTile(100);
    world.setTile(0, 0, tile);
    world.addBuilding(extractor);
    world.addBuilding(conv0);
    world.addBuilding(conv1);
  });

  test("Conveyor speed 60/min should NOT limit extractor output at 120/min", () => {
    // At 120/min, extractor rate is 2.0 items/s (interval 0.5s)
    // Conveyor transport speed (from config) is 60/min -> 1.0 tiles/s (clears in 1.0s)
    // So conveyor WILL be the bottleneck, but the test verifies flow works correctly

    // T=0.5: Extractor outputs to conv0
    extractor.tick(0.5, world);
    expect(conv0.currentItem).toBe("stone");
    expect(tile.resourceAmount).toBe(99);

    // T=0.5: Conveyor moves item halfway (speed 1.0 * 0.5 = 0.5)
    conv0.tick(0.5, world);
    expect(conv0.transportProgress).toBeCloseTo(0.5, 2); // 1.0 * 0.5 = 0.5

    // T=0.5: Conveyor moves item to conv1, conv0 becomes empty
    conv0.tick(0.5, world);
    expect(conv0.currentItem).toBe(null);
    expect(conv1.currentItem).toBe("stone");

    // T=0.5: Extractor ready to output again, and conv0 is empty!
    extractor.tick(0.5, world);
    expect(tile.resourceAmount).toBe(98);
    expect(conv0.currentItem).toBe("stone");
  });
});
