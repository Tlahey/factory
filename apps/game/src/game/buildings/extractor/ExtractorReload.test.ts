import { describe, test, expect, beforeEach } from "vitest";
import { World } from "../../core/World";
import { TileType } from "../../constants";
import { Rock } from "../../environment/rock/Rock";
import { ResourceTile } from "../../core/ResourceTile";

describe("Extractor - Reload after Resource Depletion", () => {
  let world: World;

  beforeEach(() => {
    world = new World();

    // Simulate GameApp wrapper
    const originalPlace = world.placeBuilding.bind(world);
    world.placeBuilding = (x, y, type, direction, skipValidation = false) => {
      return originalPlace(x, y, type, direction, skipValidation);
    };
  });

  test("extractor should persist after resource is depleted and world is reloaded", () => {
    // 1. Manually set a stone tile at (10, 10)
    const x = 10;
    const y = 10;

    world.setTile(x, y, new Rock(1)); // Only 1 resource

    // 2. Place extractor
    const placed = world.placeBuilding(x, y, "extractor", "north", true);
    expect(placed).toBe(true);
    expect(world.getBuilding(x, y)).toBeDefined();

    // 3. Deplete resource
    const tile = world.getTile(x, y);
    if (tile instanceof ResourceTile) {
      tile.deplete(1);
    }

    // 4. Tick the world so the tile turns to grass
    world.tick(1);
    expect(world.getTile(x, y).getType()).toBe(TileType.GRASS);
    expect(world.getBuilding(x, y)).toBeDefined(); // Still there before reload

    // 5. Serialize
    const data = world.serialize();

    // 6. Create new world and deserialize
    const newWorld = new World();
    newWorld.deserialize(data);

    // 7. Check if extractor is still there
    const b = newWorld.getBuilding(x, y);
    expect(b).toBeDefined();
    expect(b?.getType()).toBe("extractor");
  });
});
