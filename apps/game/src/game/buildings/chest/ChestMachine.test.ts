import { describe, it, expect } from "vitest";
import { Chest } from "./Chest";
import { World } from "../../core/World";

describe("Chest XState Machine", () => {
  it("should transition between idle and working depending on slots count", () => {
    const world = new World();
    const chest = new Chest(5, 5);

    expect(chest.actor).toBeDefined();
    let snapshot = chest.actor.getSnapshot();
    expect(snapshot.value).toBe("idle");

    // Add item to slots
    chest.slots.push({ type: "wood", count: 10 });
    chest.tick(1.0, world);
    snapshot = chest.actor.getSnapshot();
    expect(snapshot.value).toBe("working");

    // Empty chest
    chest.slots = [];
    chest.tick(1.0, world);
    snapshot = chest.actor.getSnapshot();
    expect(snapshot.value).toBe("idle");
  });
});
