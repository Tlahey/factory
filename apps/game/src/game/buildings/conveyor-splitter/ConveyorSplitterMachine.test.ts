import { describe, it, expect } from "vitest";
import { ConveyorSplitter } from "./ConveyorSplitter";
import { World } from "../../core/World";

describe("ConveyorSplitter XState Machine", () => {
  it("should transition between idle and working depending on item presence", () => {
    const world = new World();
    const splitter = new ConveyorSplitter(5, 5);

    expect(splitter.actor).toBeDefined();
    let snapshot = splitter.actor.getSnapshot();
    expect(snapshot.value).toBe("idle");

    // Add item
    splitter.currentItem = "wood";
    splitter.tick(0.1, world);
    snapshot = splitter.actor.getSnapshot();
    expect(snapshot.value).toBe("working");

    // Clear item
    splitter.currentItem = null;
    splitter.tick(0.1, world);
    snapshot = splitter.actor.getSnapshot();
    expect(snapshot.value).toBe("idle");
  });
});
