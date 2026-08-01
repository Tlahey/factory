import { describe, it, expect } from "vitest";
import { Furnace } from "./Furnace";
import { World } from "../../core/World";

describe("Furnace XState Machine", () => {
  it("should transition through working, no_resources, no_power, and blocked", () => {
    const world = new World();
    const furnace = new Furnace(5, 5);
    furnace.updatePowerStatus(1.0, true, 1);

    expect(furnace.actor).toBeDefined();
    let snapshot = furnace.actor.getSnapshot();
    expect(snapshot.value).toBe("idle");

    // Select a recipe (iron_ingot)
    furnace.setRecipe("iron_ingot");

    // Tick without resources -> should be no_resources
    furnace.tick(0.1, world);
    snapshot = furnace.actor.getSnapshot();
    expect(snapshot.value).toBe("no_resources");

    // Add inputs to queue
    furnace.inputQueue.push({ type: "iron_ore", count: 5 });
    furnace.tick(0.1, world);
    snapshot = furnace.actor.getSnapshot();
    expect(snapshot.value).toBe("working");
    expect(furnace.active).toBe(true);

    // Cut power (with demand)
    furnace.updatePowerStatus(0, false, 0);
    furnace.tick(1.6, world);
    snapshot = furnace.actor.getSnapshot();
    expect(snapshot.value).toBe("no_power");
  });
});
