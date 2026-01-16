import { describe, test, expect, beforeEach } from "vitest";
import { Conveyor } from "./Conveyor";
import { IWorld } from "../../entities/types";

class MockEntity {
  x: number;
  y: number;
  type: string;
  isResolved: boolean = true;
  inputs: string[] = [];

  constructor(type: string, x: number, y: number) {
    this.type = type;
    this.x = x;
    this.y = y;
  }

  addItem(item: string): boolean {
    this.inputs.push(item);
    return true;
  }

  getType() {
    return this.type;
  }
}

class MockWorld implements IWorld {
  buildings: Map<string, MockEntity | Conveyor> = new Map();

  add(b: MockEntity | Conveyor) {
    this.buildings.set(`${b.x},${b.y}`, b);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getBuilding(x: number, y: number): any {
    return this.buildings.get(`${x},${y}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getTile(_x: number, _y: number): any {
    return { isStone: () => false, isWater: () => false };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getBuildingConnectionsCount(_building: any): number {
    return 0;
  }

  getConnectionsCount(_x: number, _y: number): number {
    return 0;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setTile(_x: number, _y: number, _tile: any): void {}
  cables = [];

  hasPathTo(): boolean {
    return false;
  }
}

describe("Conveyor Item Transport", () => {
  let world: MockWorld;

  beforeEach(() => {
    world = new MockWorld();
  });

  test("Moves item to next conveyor", () => {
    // C1 (0,0) -> C2 (0,-1) [North]
    const c1 = new Conveyor(0, 0, "north");
    const c2 = new Conveyor(0, -1, "north");

    c1.isResolved = true; // Connected to c2
    c2.isResolved = true; // Connected to something else presumably

    world.add(c1);
    world.add(c2);

    // Initial State
    c1.currentItem = "iron_ore";
    c1.transportProgress = 0.99;

    // Tick to trigger move (assuming speed 1 for simplicity or large delta)
    // Speed is 1 tile/sec default (60/60).
    // Delta 0.1 should suffice to cross 1.0
    c1.tick(0.1, world as unknown as IWorld);

    expect(c1.currentItem).toBeNull();
    expect(c2.currentItem).toBe("iron_ore");
    // Check smooth transition
    expect(c2.transportProgress).toBeCloseTo(0.09, 2); // 0.99 + 0.1 - 1.0 = 0.09
  });

  test("Does NOT move item if next conveyor is full", () => {
    // C1 (0,0) -> C2 (0,-1)
    const c1 = new Conveyor(0, 0, "north");
    const c2 = new Conveyor(0, -1, "north");

    c1.isResolved = true;
    c2.isResolved = true;

    world.add(c1);
    world.add(c2);

    c1.currentItem = "iron_ore";
    c1.transportProgress = 0.99;

    c2.currentItem = "copper_ore"; // Blocked

    c1.tick(0.1, world as unknown as IWorld);

    expect(c1.currentItem).toBe("iron_ore"); // Still here
    expect(c1.transportProgress).toBe(1.0); // Clamped at end
    expect(c2.currentItem).toBe("copper_ore");
  });

  test("Moves item to Chest", () => {
    const c1 = new Conveyor(0, 0, "north");
    const chest = new MockEntity("chest", 0, -1);

    c1.isResolved = true;
    world.add(c1);
    world.add(chest);

    c1.currentItem = "iron_ore";
    c1.transportProgress = 0.99;

    c1.tick(0.1, world as unknown as IWorld);

    expect(c1.currentItem).toBeNull();
    expect(chest.inputs).toContain("iron_ore");
  });

  test("Moves item to next conveyor even if NOT resolved", () => {
    // C1 (0,0) -> C2 (0,-1)
    const c1 = new Conveyor(0, 0, "north");
    const c2 = new Conveyor(0, -1, "north");

    c1.isResolved = false;
    c2.isResolved = false;

    world.add(c1);
    world.add(c2);

    c1.currentItem = "coal";
    c1.transportProgress = 0.95;

    // Delta 0.1 should move it
    c1.tick(0.1, world as unknown as IWorld);

    expect(c1.currentItem).toBeNull();
    expect(c2.currentItem).toBe("coal");
  });
});
