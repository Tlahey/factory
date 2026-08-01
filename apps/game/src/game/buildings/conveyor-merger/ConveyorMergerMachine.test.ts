import { describe, it, expect } from "vitest";
import { ConveyorMerger } from "./ConveyorMerger";
import { World } from "../../core/World";

describe("ConveyorMerger XState Machine", () => {
  it("should transition between idle and working depending on item presence", () => {
    const world = new World();
    const merger = new ConveyorMerger(5, 5);

    expect(merger.actor).toBeDefined();
    let snapshot = merger.actor.getSnapshot();
    expect(snapshot.value).toBe("idle");

    // Add item
    merger.currentItem = "wood";
    merger.tick(0.1, world);
    snapshot = merger.actor.getSnapshot();
    expect(snapshot.value).toBe("working");

    // Clear item
    merger.currentItem = null;
    merger.tick(0.1, world);
    snapshot = merger.actor.getSnapshot();
    expect(snapshot.value).toBe("idle");
  });
});
