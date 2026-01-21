import { BiomassPlant } from "./BiomassPlant";

describe("BiomassPlant", () => {
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
