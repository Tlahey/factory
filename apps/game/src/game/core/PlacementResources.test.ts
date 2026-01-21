import { describe, it, expect, beforeEach } from "vitest";
import { World } from "./World";
import { TileFactory } from "../TileFactory";
import { TileType } from "../constants";

import { useGameStore } from "../state/store";

describe("Resource Placement Rules", () => {
  let world: World;

  beforeEach(() => {
    useGameStore.getState().reset();
    // Ensure we have allowance to place buildings
    useGameStore.getState().updateBuildingCount("extractor", -100); // Hack to reset count? No, reset() does that.
    // We need to ensure maxCount > 0.
    // Simulate purchase or unlock if needed.
    // For unit tests, we can just assume unlimited if we don't care about limits.
    // But getAllowedCount might enforce it.
    // Let's explicitly unlock/purchase in store for these types.
    // useGameStore.getState().addResource("iron", 1000);

    // update purchasedCounts manually for test
    useGameStore.setState({
      purchasedCounts: {
        extractor: 5,
        sawmill: 5,
        conveyor: 100,
        hub: 1,
        chest: 5,
      },
    });

    world = new World();
  });

  it("should prevent Conveyor placement on a Tree (Resource)", () => {
    // Set (5,5) to Tree
    world.setTile(5, 5, TileFactory.createTile(TileType.TREE));

    // Check Conveyor
    const canPlace = world.canPlaceBuilding(5, 5, "conveyor");
    expect(canPlace).toBe(false);
  });

  it("should allow Conveyor placement on Grass", () => {
    world.setTile(5, 5, TileFactory.createTile(TileType.GRASS));
    const canPlace = world.canPlaceBuilding(5, 5, "conveyor");
    expect(canPlace).toBe(true);
  });

  it("should prevent Extractor placement on Grass (requires resource)", () => {
    world.setTile(5, 5, TileFactory.createTile(TileType.GRASS));
    const canPlace = world.canPlaceBuilding(5, 5, "extractor");
    expect(canPlace).toBe(false);
  });

  it("should allow Extractor placement on Stone", () => {
    world.setTile(5, 5, TileFactory.createTile(TileType.STONE));
    const canPlace = world.canPlaceBuilding(5, 5, "extractor");
    expect(canPlace).toBe(true);
  });

  it("should prevent Extractor placement on Tree (Wrong Resource)", () => {
    // Extractor config requires stone/ores, not wood
    world.setTile(5, 5, TileFactory.createTile(TileType.TREE));
    const canPlace = world.canPlaceBuilding(5, 5, "extractor");
    expect(canPlace).toBe(false);
  });

  it("should prevent Sawmill placement on Stone (Wrong Resource)", () => {
    world.setTile(5, 5, TileFactory.createTile(TileType.STONE));
    const canPlace = world.canPlaceBuilding(5, 5, "sawmill");
    expect(canPlace).toBe(false);
  });

  it("should allow Sawmill placement on Tree", () => {
    world.setTile(5, 5, TileFactory.createTile(TileType.TREE));
    const canPlace = world.canPlaceBuilding(5, 5, "sawmill");
    expect(canPlace).toBe(true);
  });

  it("should prevent Hub placement on Resource", () => {
    // Hub is 2x2. Make 5,5 a Tree
    world.setTile(5, 5, TileFactory.createTile(TileType.TREE));
    // And others grass
    world.setTile(6, 5, TileFactory.createTile(TileType.GRASS));
    world.setTile(5, 6, TileFactory.createTile(TileType.GRASS));
    world.setTile(6, 6, TileFactory.createTile(TileType.GRASS));

    const canPlace = world.canPlaceBuilding(5, 5, "hub");
    expect(canPlace).toBe(false);
  });
});
