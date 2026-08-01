import { describe, it, expect } from "vitest";
import { ElectricPole } from "./ElectricPole";

describe("ElectricPole XState Machine", () => {
  it("should transition between idle and working depending on power status", () => {
    const pole = new ElectricPole(5, 5);

    expect(pole.actor).toBeDefined();
    let snapshot = pole.actor.getSnapshot();
    expect(snapshot.value).toBe("idle");

    // Send update power event with satisfaction
    pole.updatePowerStatus(1.0, true, 1);
    snapshot = pole.actor.getSnapshot();
    expect(snapshot.value).toBe("working");

    // Remove power
    pole.updatePowerStatus(0, false, 0);
    snapshot = pole.actor.getSnapshot();
    expect(snapshot.value).toBe("idle");
  });
});
