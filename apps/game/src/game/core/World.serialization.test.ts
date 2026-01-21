import { describe, it, expect, beforeEach } from "vitest";
import { World } from "./World";
import { TileFactory } from "../TileFactory";
import { TileType } from "../constants";
import { useGameStore } from "../state/store";

describe("World Serialization & Building Counts", () => {
  let world: World;

  beforeEach(() => {
    useGameStore.getState().reset();
    useGameStore.getState().buyBuilding("hub"); // Ensure we have one
    world = new World();
  });

  it("should correctly count buildings after deserialization", () => {
    // 1. Place a building (Hub is safe to place anywhere)
    // Force specific tile to avoid random world gen issues
    world.setTile(10, 10, TileFactory.createTile(TileType.GRASS));
    world.setTile(11, 10, TileFactory.createTile(TileType.GRASS));
    world.setTile(10, 11, TileFactory.createTile(TileType.GRASS));
    world.setTile(11, 11, TileFactory.createTile(TileType.GRASS));

    world.placeBuilding(10, 10, "hub");

    // START: Check count is 1
    expect(useGameStore.getState().buildingCounts["hub"]).toBe(1);

    // 2. Serialize
    const data = world.serialize();

    // 3. Deserialize (simulate game reload)
    world.deserialize(data);

    // END: Check count is still 1 (BUG: It likely becomes 2 without the fix)
    expect(useGameStore.getState().buildingCounts["hub"]).toBe(1);
  });

  it("should reset counts before deserializing", () => {
    // 1. Place a building
    world.placeBuilding(5, 5, "hub");
    expect(useGameStore.getState().buildingCounts["hub"]).toBe(1);

    // 2. Serialize
    const data = world.serialize();

    // 3. Deserialize multiple times
    world.deserialize(data);
    world.deserialize(data);

    // Should still be 1
    expect(useGameStore.getState().buildingCounts["hub"]).toBe(1);
  });
});
