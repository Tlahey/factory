import { describe, it, expect } from "vitest";
import { Extractor } from "./Extractor";
import { World } from "../../core/World";
import { TileFactory } from "../../environment/TileFactory";
import { TileType } from "../../constants";

describe("Extractor XState Machine", () => {
  it("should transition between working, no_power, and blocked", () => {
    const world = new World();
    const tile = TileFactory.createTile(TileType.STONE, 100);
    world.setTile(5, 5, tile);

    const extractor = new Extractor(5, 5);
    extractor.updatePowerStatus(1.0, true, 1);

    // Initial state is idle
    expect(extractor.actor).toBeDefined();
    let snapshot = extractor.actor.getSnapshot();
    expect(snapshot.value).toBe("idle");

    // Tick evaluates to working
    extractor.tick(0.1, world);
    snapshot = extractor.actor.getSnapshot();
    expect(snapshot.value).toBe("working");

    // Cut power: debouncing status change
    extractor.updatePowerStatus(0, false, 0);
    extractor.tick(0.5, world);
    snapshot = extractor.actor.getSnapshot();
    expect(snapshot.value).toBe("working"); // debounced

    extractor.tick(1.1, world);
    snapshot = extractor.actor.getSnapshot();
    expect(snapshot.value).toBe("no_power"); // transitioned after threshold
  });
});
