import { describe, it, expect } from "vitest";
import { BiomassPlant } from "./BiomassPlant";
import { World } from "../../core/World";

describe("BiomassPlant XState Machine", () => {
  it("should handle working, no_resources, and disabled states", () => {
    const world = new World();
    const plant = new BiomassPlant(5, 5);

    expect(plant.actor).toBeDefined();
    let snapshot = plant.actor.getSnapshot();
    expect(snapshot.value).toBe("idle");

    // Tick without fuel -> should go to no_resources_or_disabled
    plant.tick(0.1, world);
    snapshot = plant.actor.getSnapshot();
    expect(snapshot.value).toBe("no_resources_or_disabled");

    // Add fuel
    plant.fuelAmount = 5;
    plant.tick(0.1, world);
    snapshot = plant.actor.getSnapshot();
    expect(snapshot.value).toBe("working");
    expect(plant.active).toBe(true);

    // Disable plant (toggle breaker)
    plant.isEnabled = false;
    plant.tick(0.1, world);
    snapshot = plant.actor.getSnapshot();
    expect(snapshot.value).toBe("no_resources_or_disabled");
    expect(plant.active).toBe(false);
  });
});
