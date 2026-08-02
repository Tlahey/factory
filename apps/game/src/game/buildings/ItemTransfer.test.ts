import { describe, test, expect, beforeEach } from "vitest";
import { canPushItem, pushItem } from "./ItemTransfer";
import { Conveyor } from "./conveyor/Conveyor";
import { BuildingEntity } from "../entities/BuildingEntity";
import { IWorld } from "../entities/types";

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

describe("ItemTransfer output-port enforcement", () => {
  let world: MockWorld;

  beforeEach(() => {
    world = new MockWorld();
  });

  test("pushItem rejects a target that is not one of source's declared output ports, even when the sink would accept it", () => {
    // source faces east at (0,0), so its only real output port is (1,0).
    const source = new Conveyor(0, 0, "east");
    // sink faces north at (0,-1): its open back (input) is the tile south of
    // it, i.e. (0,0) — exactly where source sits — so canInput(0,0) is true.
    // Pushing to the sink's own tile (0,-1) is still illegal: it's not one of
    // source's output ports.
    const sink = new Conveyor(0, -1, "north");
    world.add(source);
    world.add(sink);

    expect(sink.canInput(0, 0)).toBe(true); // sanity: the sink alone would accept it
    expect(pushItem(asWorld(world), source, 0, -1, "iron_ore")).toBe(false);
    expect(sink.currentItem).toBeNull();
  });

  test("canPushItem reports false for the same illegitimate target", () => {
    const source = new Conveyor(0, 0, "east");
    const sink = new Conveyor(0, -1, "north");
    world.add(source);
    world.add(sink);

    expect(canPushItem(asWorld(world), source, 0, -1, "iron_ore")).toBe(false);
  });

  test("pushItem still succeeds against source's real output position", () => {
    const source = new Conveyor(0, 0, "east");
    const sink = new Conveyor(1, 0, "east");
    world.add(source);
    world.add(sink);

    expect(pushItem(asWorld(world), source, 1, 0, "iron_ore")).toBe(true);
    expect(sink.currentItem).toBe("iron_ore");
  });

  test("canPushItem still reports true against source's real output position", () => {
    const source = new Conveyor(0, 0, "east");
    const sink = new Conveyor(1, 0, "east");
    world.add(source);
    world.add(sink);

    expect(canPushItem(asWorld(world), source, 1, 0, "iron_ore")).toBe(true);
  });
});
