import { BiomassPlant } from "./BiomassPlant";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { skillTreeManager } from "../hub/skill-tree/SkillTreeManager";

// Mock the SkillTreeManager singleton
vi.mock("../hub/skill-tree/SkillTreeManager", () => ({
  skillTreeManager: {
    getStatMultiplier: vi.fn(),
    getStatAdditive: vi.fn(),
  },
}));

describe("BiomassPlant", () => {
  beforeEach(() => {
    // Default mocks
    vi.mocked(skillTreeManager.getStatMultiplier).mockReturnValue(1.0);
    vi.mocked(skillTreeManager.getStatAdditive).mockReturnValue(0);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("initialization", () => {
    it("should initialize with default values", () => {
      const plant = new BiomassPlant(0, 0, "north");

      expect(plant.fuelAmount).toBe(0);
      expect(plant.combustionProgress).toBe(0);
      expect(plant.isEnabled).toBe(true);
      expect(plant.isBurning).toBe(false);
      expect(plant.buildingType).toBe("biomass_plant");
    });

    it("should accept direction parameter", () => {
      const plant = new BiomassPlant(5, 3, "south");

      expect(plant.x).toBe(5);
      expect(plant.y).toBe(3);
      expect(plant.direction).toBe("south");
    });
  });

  describe("fuel management", () => {
    it("should accept wood as fuel", () => {
      const plant = new BiomassPlant(0, 0);

      const result = plant.addItem("wood", 1);

      expect(result).toBe(true);
      expect(plant.fuelAmount).toBe(1);
    });

    it("should reject non-wood items", () => {
      const plant = new BiomassPlant(0, 0);

      expect(plant.addItem("stone", 1)).toBe(false);
      expect(plant.addItem("iron_ore", 1)).toBe(false);
      expect(plant.addItem("iron_ingot", 1)).toBe(false);
      expect(plant.fuelAmount).toBe(0);
    });

    it("should respect fuel capacity", () => {
      const plant = new BiomassPlant(0, 0);
      const capacity = plant.getFuelCapacity();

      // Fill to capacity
      for (let i = 0; i < capacity; i++) {
        plant.addItem("wood", 1);
      }

      expect(plant.fuelAmount).toBe(capacity);

      // Should reject additional fuel
      const result = plant.addItem("wood", 1);
      expect(result).toBe(false);
      expect(plant.fuelAmount).toBe(capacity);
    });

    it("should increase capacity with upgrades", () => {
      const plant = new BiomassPlant(0, 0);

      // Default capacity is 20
      expect(plant.getFuelCapacity()).toBe(20);

      // Mock upgrade active (+10)
      vi.mocked(skillTreeManager.getStatAdditive).mockReturnValue(10);

      // New capacity should be 30
      expect(plant.getFuelCapacity()).toBe(30);

      // Should handle fill to new capacity
      plant.fuelAmount = 20;
      expect(plant.addItem("wood", 5)).toBe(true);
      expect(plant.fuelAmount).toBe(25);
    });
  });

  describe("upgrades handling", () => {
    it("should apply consumption time multiplier", () => {
      const plant = new BiomassPlant(0, 0);
      // Default is 5s
      expect(plant.getConsumptionTime()).toBe(5);

      // Mock 20% speed boost (0.8x time)
      vi.mocked(skillTreeManager.getStatMultiplier).mockReturnValue(0.8);

      expect(plant.getConsumptionTime()).toBe(4);
    });

    it("should apply power rate multiplier", () => {
      const plant = new BiomassPlant(0, 0);
      // Default is 20
      expect(plant.getBasePowerRate()).toBe(20);

      // Mock 25% power boost (1.25x)
      vi.mocked(skillTreeManager.getStatMultiplier).mockReturnValue(1.25);

      expect(plant.getBasePowerRate()).toBe(25);
    });
  });

  describe("breaker control", () => {
    it("should toggle breaker state", () => {
      const plant = new BiomassPlant(0, 0);

      expect(plant.isEnabled).toBe(true);

      plant.toggleBreaker();
      expect(plant.isEnabled).toBe(false);

      plant.toggleBreaker();
      expect(plant.isEnabled).toBe(true);
    });

    it("should not generate power when disabled", () => {
      const plant = new BiomassPlant(0, 0);
      plant.addItem("wood", 5);
      plant.isBurning = true;

      plant.toggleBreaker(); // Disable

      expect(plant.getPowerGeneration()).toBe(0);
    });
  });

  describe("power generation", () => {
    it("should generate power when burning", () => {
      const plant = new BiomassPlant(0, 0);
      plant.addItem("wood", 5);
      plant.isBurning = true;
      plant.isEnabled = true;

      const power = plant.getPowerGeneration();

      expect(power).toBeGreaterThan(0);
      // Base is ~20, fluctuation is ±3
      expect(power).toBeGreaterThanOrEqual(15);
      expect(power).toBeLessThanOrEqual(25);
    });

    it("should not generate power when not burning", () => {
      const plant = new BiomassPlant(0, 0);
      plant.addItem("wood", 5);
      plant.isBurning = false;

      expect(plant.getPowerGeneration()).toBe(0);
    });

    it("should have zero power demand (producer)", () => {
      const plant = new BiomassPlant(0, 0);

      expect(plant.getPowerDemand()).toBe(0);
    });
  });

  describe("serialization", () => {
    it("should serialize state correctly", () => {
      const plant = new BiomassPlant(0, 0);
      plant.fuelAmount = 10;
      plant.combustionProgress = 0.5;
      plant.isEnabled = false;

      const serialized = plant.serialize();

      expect(serialized.fuelAmount).toBe(10);
      expect(serialized.combustionProgress).toBe(0.5);
      expect(serialized.isEnabled).toBe(false);
    });

    it("should deserialize state correctly", () => {
      const plant = new BiomassPlant(0, 0);

      plant.deserialize({
        fuelAmount: 15,
        combustionProgress: 0.75,
        isEnabled: false,
      });

      expect(plant.fuelAmount).toBe(15);
      expect(plant.combustionProgress).toBe(0.75);
      expect(plant.isEnabled).toBe(false);
    });
  });

  describe("I/O configuration", () => {
    it("should have input but no output", () => {
      const plant = new BiomassPlant(0, 0);

      expect(plant.io.hasInput).toBe(true);
      expect(plant.io.hasOutput).toBe(false);
    });

    it("should not be able to output", () => {
      const plant = new BiomassPlant(0, 0);

      expect(plant.canOutput()).toBe(false);
      expect(plant.tryOutput()).toBe(false);
    });

    it("should return null for output position", () => {
      const plant = new BiomassPlant(0, 0);

      expect(plant.getOutputPosition()).toBeNull();
    });
  });
});
