import { describe, it, expect, beforeEach } from "vitest";
import { World } from "./World";
import { useGameStore } from "../state/store";

describe("World Placement Limits", () => {
  let world: World;

  beforeEach(() => {
    useGameStore.getState().reset();
    world = new World();
  });

  it("should prevent placing more Hubs than allowed", () => {
    // Hub maxCount is 1
    const success1 = world.placeBuilding(5, 5, "hub");
    expect(success1).toBe(true);

    // Try placing another Hub
    const canPlace = world.canPlaceBuilding(10, 10, "hub");
    expect(canPlace).toBe(false);

    const success2 = world.placeBuilding(10, 10, "hub");
    expect(success2).toBe(false);
  });

  it("should allow placing unlimited buildings like conveyors", () => {
    world.placeBuilding(5, 5, "conveyor");
    const canPlace = world.canPlaceBuilding(6, 5, "conveyor");
    expect(canPlace).toBe(true);
  });
});
