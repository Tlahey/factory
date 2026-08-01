import { describe, it, expect } from "vitest";
import { Conveyor } from "./Conveyor";
import { World } from "../../core/World";

describe("Conveyor XState Machine", () => {
  it("should transition between idle and working depending on item presence", () => {
    const world = new World();
    const conveyor = new Conveyor(5, 5);

    expect(conveyor.actor).toBeDefined();
    let snapshot = conveyor.actor.getSnapshot();
    expect(snapshot.value).toBe("idle");

    // Add item to conveyor
    conveyor.currentItem = "wood";
    conveyor.tick(0.1, world);
    snapshot = conveyor.actor.getSnapshot();
    expect(snapshot.value).toBe("working");
    expect(conveyor.active).toBe(true);

    // Remove item
    conveyor.currentItem = null;
    conveyor.tick(0.1, world);
    snapshot = conveyor.actor.getSnapshot();
    expect(snapshot.value).toBe("idle");
    expect(conveyor.active).toBe(false);
  });
});
