import { describe, it, expect, beforeEach } from "vitest";
import { World } from "../../core/World";
import { Hub } from "./Hub";

describe("Hub Connection Logic", () => {
  let world: World;

  beforeEach(() => {
    world = new World();
  });

  it("should count connections correctly for a 2x2 Hub", () => {
    // Place Hub at 10,10 (occupies 10,10; 11,10; 10,11; 11,11)
    world.placeBuilding(10, 10, "hub");
    const hub = world.getBuilding(10, 10) as Hub;
    expect(hub).toBeDefined();

    // 0 Connections initially
    expect(world.getBuildingConnectionsCount(hub)).toBe(0);

    // Add connection to top-left (10,10)
    world.addCable(10, 10, 10, 9);
    expect(world.getBuildingConnectionsCount(hub)).toBe(1);

    // Add connection to bottom-right (11,11)
    // This simulates a scenario where we forcefully add another cable to test counting
    // (InputSystem prevents this, but World counts what exists)
    world.addCable(11, 11, 12, 11);
    expect(world.getBuildingConnectionsCount(hub)).toBe(2);
  });

  it("should not count cables not connected to the hub", () => {
    world.placeBuilding(10, 10, "hub");
    const hub = world.getBuilding(10, 10) as Hub;

    world.addCable(5, 5, 5, 6); // Unrelated cable
    expect(world.getBuildingConnectionsCount(hub)).toBe(0);
  });
});
