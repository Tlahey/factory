import { describe, test, expect, beforeEach } from "vitest";
import { World } from "./World";
import { TileFactory } from "../TileFactory";
import { TileType } from "../constants";
import { useGameStore } from "../state/store";

describe("Cable Deletion on Building Removal", () => {
  let world: World;

  beforeEach(() => {
    // Reset store and unlock Hub to ensure placement is allowed
    const store = useGameStore.getState();
    store.reset();
    store.buyBuilding("hub");

    world = new World();
  });

  test("should delete cables when a building is removed", () => {
    // 1. Place two electric poles
    const x1 = 10,
      y1 = 10;
    const x2 = 15,
      y2 = 10;

    // Ensure tiles are valid for ElectricPole (Grass) to avoid flakiness from random World generation (Stone)
    world.setTile(x1, y1, TileFactory.createTile(TileType.GRASS));
    world.setTile(x2, y2, TileFactory.createTile(TileType.GRASS));

    world.placeBuilding(x1, y1, "electric_pole");
    world.placeBuilding(x2, y2, "electric_pole");

    // 2. Add a cable between them
    world.addCable(x1, y1, x2, y2);
    expect(world.cables.length).toBe(1);

    // 3. Remove one pole
    world.removeBuilding(x1, y1);

    // 4. Cable should be automatically removed because it's linked to the deleted building
    expect(world.cables.length).toBe(0);
  });

  test("should delete cables connected to any tile of a multi-tile building", () => {
    // Hub is 2x2. Tiles: (10,10), (11,10), (10,11), (11,11)
    const hx = 10,
      hy = 10;

    world.setTile(hx, hy, TileFactory.createTile(TileType.GRASS));
    world.setTile(hx + 1, hy, TileFactory.createTile(TileType.GRASS));
    world.setTile(hx, hy + 1, TileFactory.createTile(TileType.GRASS));
    world.setTile(hx + 1, hy + 1, TileFactory.createTile(TileType.GRASS));

    world.placeBuilding(hx, hy, "hub");

    // Place a pole nearby
    const px = 15,
      py = 10;

    // Ensure tile is valid (Grass)
    world.setTile(px, py, TileFactory.createTile(TileType.GRASS));

    world.placeBuilding(px, py, "electric_pole");

    // Connect cable to one of the Hub's tiles (not the origin)
    world.addCable(hx + 1, hy + 1, px, py);
    expect(world.cables.length).toBe(1);

    // Remove the Hub (via its origin)
    world.removeBuilding(hx, hy);

    // Cable should be removed
    expect(world.cables.length).toBe(0);
  });
});
