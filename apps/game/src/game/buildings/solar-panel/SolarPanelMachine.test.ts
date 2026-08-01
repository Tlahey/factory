import { describe, it, expect } from "vitest";
import { SolarPanel } from "./SolarPanel";
import { World } from "../../core/World";

describe("SolarPanel XState Machine", () => {
  it("should evaluate sunlight intensity and change active state", () => {
    const world = new World();
    const panel = new SolarPanel(5, 5);

    expect(panel.actor).toBeDefined();
    let snapshot = panel.actor.getSnapshot();
    expect(snapshot.value).toBe("idle");

    // Tick to evaluate solar sunlight
    panel.tick(1.0, world);
    snapshot = panel.actor.getSnapshot();

    // The state matches sunlight intensity (intensity > 0 -> working, else idle)
    const expectedState = panel.sunlightIntensity > 0 ? "working" : "idle";
    expect(snapshot.value).toBe(expectedState);
  });
});
