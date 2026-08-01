import { describe, it, expect } from "vitest";
import { Battery } from "./Battery";
import { World } from "../../core/World";

describe("Battery XState Machine", () => {
  it("should transition between idle, charging, and discharging", () => {
    const world = new World();
    const battery = new Battery(5, 5);

    expect(battery.actor).toBeDefined();
    let snapshot = battery.actor.getSnapshot();
    expect(snapshot.value).toBe("idle");

    // Charge the battery
    battery.charge(10);
    battery.tick(1.0, world); // delta=1s
    snapshot = battery.actor.getSnapshot();
    expect(snapshot.value).toBe("charging");
    expect(battery.lastFlowRate).toBeGreaterThan(0.01);

    // Discharge the battery
    battery.discharge(5);
    battery.tick(1.0, world);
    snapshot = battery.actor.getSnapshot();
    expect(snapshot.value).toBe("discharging");
    expect(battery.lastFlowRate).toBeLessThan(-0.01);
  });
});
