import { describe, it, expect, beforeEach } from "vitest";
import { World } from "../../core/World";
import { useGameStore } from "../../state/store";
import { TileFactory } from "../../environment/TileFactory";
import { TileType } from "../../constants";

describe("Furnace Rotation Repro", () => {
  let world: World;

  beforeEach(() => {
    useGameStore.getState().reset();
    useGameStore.getState().unlockBuilding("furnace");
    useGameStore.setState({ purchasedCounts: { furnace: 10 } }); // Allow placement
    world = new World();
    // Ensure valid terrain for placement (random generation might spawn Stone which could block)
    // Set area to Grass
    for (let dx = 0; dx < 5; dx++) {
      for (let dy = 0; dy < 5; dy++) {
        world.setTile(10 + dx, 10 + dy, TileFactory.createTile(TileType.GRASS));
      }
    }
  });

  it("should occupy 1x2 tiles when facing North", () => {
    const x = 10;
    const y = 10;
    const direction = "north";

    const success = world.placeBuilding(x, y, "furnace", direction);
    expect(success).toBe(true);

    const building = world.getBuilding(x, y);
    expect(building).toBeDefined();
    expect(building?.width).toBe(1);
    expect(building?.height).toBe(2);

    // Check occupation
    expect(world.getBuilding(x, y)).toBe(building);
    expect(world.getBuilding(x, y + 1)).toBe(building);
    expect(world.getBuilding(x + 1, y)).toBeUndefined();
  });

  it("should occupy 2x1 tiles when rotated East", () => {
    const x = 10;
    const y = 10;
    const direction = "east";

    const success = world.placeBuilding(x, y, "furnace", direction);
    expect(success).toBe(true);

    const building = world.getBuilding(x, y);
    expect(building).toBeDefined();
    expect(building?.width).toBe(2);
    expect(building?.height).toBe(1);

    // Check occupation
    expect(world.getBuilding(x, y)).toBe(building);
    expect(world.getBuilding(x + 1, y)).toBe(building);
    expect(world.getBuilding(x, y + 1)).toBeUndefined();
  });

  it("should fail placement if rotated East and hitting boundary", () => {
    // WORLD_WIDTH is usually 100? Let's assume it's large enough.
    // Let's place it at the very edge.
    const x = 99; // WORLD_WIDTH - 1
    const y = 10;
    const direction = "east"; // Needs 2 width

    const success = world.placeBuilding(x, y, "furnace", direction);
    expect(success).toBe(false);
  });

  it("should allow placing up to the max count limit for non-square buildings without overcounting", () => {
    // Set limit to 2
    useGameStore.setState({ purchasedCounts: { furnace: 0 } });

    // Place first furnace (occupies 10,10 and 10,11)
    let success = world.placeBuilding(10, 10, "furnace", "north");
    expect(success).toBe(true);

    // Place second furnace (occupies 12,10 and 12,11)
    success = world.placeBuilding(12, 10, "furnace", "north");
    expect(success).toBe(true);

    // Place third furnace (should fail because limit is 2)
    success = world.placeBuilding(14, 10, "furnace", "north");
    expect(success).toBe(false);
  });
});
