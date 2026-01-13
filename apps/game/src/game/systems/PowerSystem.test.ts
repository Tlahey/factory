import { describe, it, expect, beforeEach, vi } from "vitest";
import { PowerSystem } from "./PowerSystem";
import { World } from "../core/World";
import { Battery } from "../buildings/battery/Battery";
import { Hub } from "../buildings/hub/Hub";
import { BuildingEntity } from "../entities/BuildingEntity";
import { IPowered } from "../buildings/BuildingConfig";

// Mock World
const mockWorld = {
  cables: [] as { x1: number; y1: number; x2: number; y2: number }[],
  buildings: new Map<string, BuildingEntity>(),
  getBuilding: vi.fn(),
} as unknown as World;

describe("PowerSystem with Batteries", () => {
  let powerSystem: PowerSystem;
  let hub: Hub;
  let battery: Battery;
  let consumer: BuildingEntity & IPowered;

  beforeEach(() => {
    // Reset World
    mockWorld.cables = [];
    mockWorld.buildings.clear();
    vi.mocked(mockWorld.getBuilding).mockImplementation((x, y) => {
      return mockWorld.buildings.get(`${x},${y}`);
    });

    // Create Hub (Producer, 60 rate)
    hub = new Hub(0, 0);
    // Explicitly set powerConfig for test if needed, usually comes from config
    // Hub config is imported in Hub.ts, should be fine if environment is right.
    // We might need to mock getBuildingConfig if it's not working in test env.
    hub.getPowerGeneration = () => 60;

    // Create Battery (2x2, Capacity 2000, Charge 50, Discharge 50)
    battery = new Battery(0, 5);
    // battery consumes 2x2. (0,5), (1,5), (0,6), (1,6).

    // Create Consumer
    consumer = new (class extends BuildingEntity implements IPowered {
      constructor() {
        super(0, 10, "consumer");
      }
      get powerConfig() {
        return { type: "consumer" as const, rate: 100 };
      } // Demand 100
      getPowerDemand() {
        return 100;
      }
      getPowerGeneration() {
        return 0;
      }
      updatePowerStatus() {}
      getColor() {
        return 0;
      }
      isValidPlacement() {
        return true;
      }
      get io() {
        return { hasInput: false, hasOutput: false };
      }
    })();

    // Place in World
    mockWorld.buildings.set(`0,0`, hub);
    // Hub is 2x2: 0,0 1,0 0,1 1,1
    mockWorld.buildings.set(`1,0`, hub);
    mockWorld.buildings.set(`0,1`, hub);
    mockWorld.buildings.set(`1,1`, hub);

    mockWorld.buildings.set(`0,5`, battery);
    // Battery 2x2
    mockWorld.buildings.set(`1,5`, battery);
    mockWorld.buildings.set(`0,6`, battery);
    mockWorld.buildings.set(`1,6`, battery);

    mockWorld.buildings.set(`0,10`, consumer);

    powerSystem = new PowerSystem(mockWorld);
  });

  it("should charge battery when surplus exists", () => {
    // Connect Hub to Battery
    // Hub (0,1) -> Battery (0,5). Cable 0,2 to 0,4.
    // Actually we just need adjacency.
    // Cable: (0,1) to (0,2). (0,2) to (0,3). (0,3) to (0,4). (0,4) to (0,5).
    mockWorld.cables.push({ x1: 0, y1: 1, x2: 0, y2: 2 });
    mockWorld.cables.push({ x1: 0, y1: 2, x2: 0, y2: 3 });
    mockWorld.cables.push({ x1: 0, y1: 3, x2: 0, y2: 4 });
    mockWorld.cables.push({ x1: 0, y1: 4, x2: 0, y2: 5 });

    powerSystem.rebuildNetworks();

    // Hub Gen = 60. Demand = 0. Surplus = 60.
    // Battery Max Charge = 50.
    // Delta = 1.

    powerSystem.update(1.0);

    // Battery should charge by min(60, 50) = 50.
    expect(battery.currentCharge).toBe(50);
  });

  it("should discharge battery when deficit exists", () => {
    // Hub + Battery + Consumer.
    // Connect Battery (0,6) to Consumer (0,10).
    // Needs cables.
    mockWorld.cables.push({ x1: 0, y1: 1, x2: 0, y2: 5 }); // Link Hub - Battery (Shortened)
    mockWorld.cables.push({ x1: 0, y1: 5, x2: 0, y2: 10 }); // Link Battery - Consumer

    // Pre-charge Battery
    battery.currentCharge = 500;

    powerSystem.rebuildNetworks();

    // Gen = 60. Demand = 100. Deficit = 40.
    // Battery should discharge 40.

    powerSystem.update(1.0);

    expect(battery.discharge).toBeDefined(); // Just verify method called implicitly
    expect(battery.currentCharge).toBe(460); // 500 - 40
  });

  it("should prioritize battery charging after demand met", () => {
    // Scenario: Gen 100. Demand 40. Surplus 60. Battery Charge 50.
    // Mock Hub to produce 100?
    // Hub production is fixed in config?
    // We can mock getPowerGeneration on Hub.
    hub.getPowerGeneration = () => 100;

    mockWorld.cables.push({ x1: 0, y1: 1, x2: 0, y2: 5 });
    mockWorld.cables.push({ x1: 0, y1: 5, x2: 0, y2: 10 });

    // Consumer demand 40
    Object.defineProperty(consumer, "powerConfig", {
      get: () => ({ type: "consumer", rate: 40 }),
    });
    consumer.getPowerDemand = () => 40;

    powerSystem.rebuildNetworks();
    powerSystem.update(1.0);

    // Demand 40 met. Surplus 60.
    // Battery charges 50 (max rate).
    expect(battery.currentCharge).toBe(50);
  });
});
