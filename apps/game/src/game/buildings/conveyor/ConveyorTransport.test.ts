import { describe, test, expect, beforeEach } from "vitest";
import { Conveyor } from "./Conveyor";
import { IWorld } from "../../entities/types";

/**
 * Stand-in sink. It must honour the full {@link ItemSink} contract — `addItem`
 * AND `canInput` — because `asItemSink()` rejects anything that cannot answer
 * "is that tile one of my input ports?". Without `canInput` the mock is not a
 * sink at all and every push is silently refused.
 */
class MockEntity {
  x: number;
  y: number;
  type: string;
  isResolved: boolean = true;
  inputs: string[] = [];
  /** Tiles the senders announced themselves from. */
  inputSources: { x: number; y: number }[] = [];

  constructor(type: string, x: number, y: number) {
    this.type = type;
    this.x = x;
    this.y = y;
  }

  canInput(fromX: number, fromY: number): boolean {
    return Math.abs(fromX - this.x) + Math.abs(fromY - this.y) === 1;
  }

  addItem(
    item: string,
    _amount: number = 1,
    fromX?: number,
    fromY?: number,
  ): boolean {
    if (fromX !== undefined && fromY !== undefined) {
      if (!this.canInput(fromX, fromY)) return false;
      this.inputSources.push({ x: fromX, y: fromY });
    }
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

  getBuilding(x: number, y: number): any {
    return this.buildings.get(`${x},${y}`);
  }

  getTile(_x: number, _y: number): any {
    return { isStone: () => false, isWater: () => false };
  }

  getBuildingConnectionsCount(_building: any): number {
    return 0;
  }

  getConnectionsCount(_x: number, _y: number): number {
    return 0;
  }

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
    // The belt announces the tile it actually occupies, so the sink's
    // adjacency check passes.
    expect(chest.inputSources).toEqual([{ x: 0, y: 0 }]);
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
