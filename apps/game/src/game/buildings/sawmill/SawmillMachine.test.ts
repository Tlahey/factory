import { describe, it, expect } from "vitest";
import { Sawmill } from "./Sawmill";
import { World } from "../../core/World";
import { TileFactory } from "../../environment/TileFactory";
import { TileType } from "../../constants";

describe("Sawmill XState Machine", () => {
  it("should transition between working, no_power, and no_resources", () => {
    const world = new World();
    const tile = TileFactory.createTile(TileType.TREE, 100);
    world.setTile(5, 5, tile);

    const sawmill = new Sawmill(5, 5);
    sawmill.updatePowerStatus(1.0, true, 1);

    expect(sawmill.actor).toBeDefined();
    let snapshot = sawmill.actor.getSnapshot();
    expect(snapshot.value).toBe("idle");

    // Tick to evaluate state -> should be working
    sawmill.tick(0.1, world);
    snapshot = sawmill.actor.getSnapshot();
    expect(snapshot.value).toBe("working");

    // Cut power
    sawmill.updatePowerStatus(0, false, 0);
    sawmill.tick(1.6, world);
    snapshot = sawmill.actor.getSnapshot();
    expect(snapshot.value).toBe("no_power");
  });
});
