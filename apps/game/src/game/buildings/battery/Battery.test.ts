import { describe, it, expect, beforeEach } from "vitest";
import { Battery } from "./Battery";

describe("Battery Entity", () => {
  let battery: Battery;

  beforeEach(() => {
    battery = new Battery(0, 0, "north");
  });

  it("should initialize with 0 charge", () => {
    expect(battery.currentCharge).toBe(0);
    expect(battery.capacity).toBeGreaterThan(0);
  });

  it("should charge correctly", () => {
    const amount = 40; // Below maxChargeRate of 50
    const charged = battery.charge(amount);

    expect(charged).toBe(amount);
    expect(battery.currentCharge).toBe(amount);
  });

  it("should cap charge at capacity", () => {
    battery.capacity = 500;
    battery.maxChargeRate = 1000; // Allow instant fill for this test
    const amount = 600;
    const charged = battery.charge(amount);

    expect(charged).toBe(500); // Only what fits
    expect(battery.currentCharge).toBe(500);
  });

  it("should discharge correctly", () => {
    battery.currentCharge = 200;
    const discharged = battery.discharge(50);

    expect(discharged).toBe(50);
    expect(battery.currentCharge).toBe(150);
  });

  it("should limit discharge to available charge", () => {
    battery.currentCharge = 50;
    const discharged = battery.discharge(100);

    expect(discharged).toBe(50);
    expect(battery.currentCharge).toBe(0);
  });

  it("should respect max charge rate", () => {
    battery.maxChargeRate = 50;
    const charged = battery.charge(100);

    expect(charged).toBe(50);
    expect(battery.currentCharge).toBe(50);
  });

  it("should respect max discharge rate", () => {
    battery.currentCharge = 200;
    battery.maxDischargeRate = 50;
    const discharged = battery.discharge(100);

    expect(discharged).toBe(50);
    expect(battery.currentCharge).toBe(150);
  });

  it("should not charge/discharge when disabled (breaker)", () => {
    battery.toggleBreaker(); // Disable
    expect(battery.isEnabled).toBe(false);

    const charged = battery.charge(100);
    expect(charged).toBe(0);
    expect(battery.currentCharge).toBe(0);

    battery.isEnabled = true;
    battery.currentCharge = 100;
    battery.toggleBreaker();

    const discharged = battery.discharge(50);
    expect(discharged).toBe(0);
    expect(battery.currentCharge).toBe(100);
  });

  it("should update active state based on flow", () => {
    // Charge
    battery.charge(10);
    // Tick to update active
    battery.tick(1);
    expect(battery.active).toBe(true);

    // Idle
    battery.tick(1);
    expect(battery.active).toBe(false);

    // Discharge
    battery.discharge(10);
    battery.tick(1);
    expect(battery.active).toBe(true);
  });
});
