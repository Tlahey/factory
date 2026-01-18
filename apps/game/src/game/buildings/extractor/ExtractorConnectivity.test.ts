import { describe, test, expect, beforeEach } from "vitest";
import { Extractor } from "./Extractor";
import { Conveyor } from "../conveyor/Conveyor";
import { IWorld } from "../../entities/types";
import { BuildingEntity } from "../../entities/BuildingEntity";

class MockWorld implements Partial<IWorld> {
  buildings = new Map<string, BuildingEntity>();
  getBuilding(x: number, y: number) {
    return this.buildings.get(`${x},${y}`);
  }
  getTile() {
    return {
      isStone: () => true,
      isWater: () => false,
      getType: () => "stone",
      getVisualScale: () => 1,
      isVisualVisible: () => true,
      onTick: () => null,
      serialize: () => ({ type: "stone", resourceAmount: 0 }),
    } as any;
  }
}

describe("Extractor Connectivity Reproduction", () => {
  let world: MockWorld;

  beforeEach(() => {
    world = new MockWorld();
  });

  test("Extractor correctly detects output connection to Conveyor", () => {
    const ext = new Extractor(0, 0, "east");
    const conv = new Conveyor(1, 0, "east");

    world.buildings.set("0,0", ext);
    world.buildings.set("1,0", conv);

    // Run tick to update connectivity
    ext.tick(0.1, world as unknown as IWorld);

    expect(ext.isOutputConnected).toBe(true);
  });

  test("Extractor correctly detects output connection to Chest", () => {
    const mockChest = {
      x: 1,
      y: 0,
      getType: () => "chest",
      getInputPosition: () => ({ x: 0, y: 0 }),
    };

    const ext = new Extractor(0, 0, "east");
    world.buildings.set("0,0", ext);
    world.buildings.set("1,0", mockChest as any);

    ext.tick(0.1, world as unknown as IWorld);
    expect(ext.isOutputConnected).toBe(true);
  });

  test("Extractor remains connected even if Conveyor is full", () => {
    const ext = new Extractor(0, 0, "east");
    const conv = new Conveyor(1, 0, "east");
    conv.currentItem = "stone"; // Blocking it

    world.buildings.set("0,0", ext);
    world.buildings.set("1,0", conv);

    ext.tick(0.1, world as unknown as IWorld);
    expect(ext.isOutputConnected).toBe(true);
  });

  test("Extractor correctly detects side-loading connection to Conveyor", () => {
    // Extractor at 0,0 facing East
    // Conveyor at 1,0 facing South (Side-loading)
    const ext = new Extractor(0, 0, "east");
    const conv = new Conveyor(1, 0, "south");

    world.buildings.set("0,0", ext);
    world.buildings.set("1,0", conv);

    ext.tick(0.1, world as unknown as IWorld);
    expect(ext.isOutputConnected).toBe(true);
  });

  test("Extractor remains connected to side-loading Conveyor when full", () => {
    const ext = new Extractor(0, 0, "east");
    const conv = new Conveyor(1, 0, "south");
    conv.currentItem = "stone"; // Blocking it

    world.buildings.set("0,0", ext);
    world.buildings.set("1,0", conv);

    ext.tick(0.1, world as unknown as IWorld);
    expect(ext.isOutputConnected).toBe(true);
  });

  test("Extractor shows connected even if Conveyor points AT the extractor (Head-to-Head)", () => {
    const ext = new Extractor(0, 0, "east");
    // Extractor outputs to (1,0).

    const conv = new Conveyor(1, 0, "west");
    // Conveyor at (1,0) facing West outputs to (0,0).
    // This is a head-to-head collision. With simplified logic, ANY building at output = connected.
    // The arrow hides because there's a building at the output position.

    world.buildings.set("0,0", ext);
    world.buildings.set("1,0", conv);

    ext.tick(0.1, world as unknown as IWorld);
    // New simplified rule: any building at output = output connected (arrow hidden)
    expect(ext.isOutputConnected).toBe(true);
  });
});
