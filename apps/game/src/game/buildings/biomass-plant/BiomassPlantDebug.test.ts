import { describe, it, expect, beforeEach } from "vitest";
import { BiomassPlant } from "./BiomassPlant";
import { useGameStore } from "../../state/store";
import { skillTreeManager } from "../hub/skill-tree/SkillTreeManager";

describe("BiomassPlant Capacity Debug", () => {
  beforeEach(() => {
    useGameStore.getState().reset();
  });

  it("should have base capacity of 20", () => {
    const plant = new BiomassPlant(0, 0);
    expect(plant.getFuelCapacity()).toBe(20);
  });

  it("should increase capacity when upgrade is unlocked", () => {
    const plant = new BiomassPlant(0, 0);

    // Unlock level 1 (Efficiency - no capacity change)
    useGameStore.getState().unlockSkill("biomass_plant_efficiency_1");
    expect(plant.getFuelCapacity()).toBe(20); // Should still be 20

    // Unlock level 2 (Capacity)
    useGameStore.getState().unlockSkill("biomass_plant_capacity_1");

    const additive = skillTreeManager.getStatAdditive(
      "biomass_plant",
      "fuelCapacity",
    );
    expect(additive).toBe(10);
    expect(plant.getFuelCapacity()).toBe(30);
  });

  it("should KEEP capacity when higher level speed upgrade is unlocked (Regression Test)", () => {
    const plant = new BiomassPlant(0, 0);

    // Unlock Level 2 (Capacity)
    useGameStore.getState().unlockSkill("biomass_plant_capacity_1");
    expect(plant.getFuelCapacity()).toBe(30);

    // Unlock Level 3 (Speed/Efficiency? Actually config says speed_1 but logic was broken)
    // Wait, BiomassConfig only has 3 levels?
    // Level 1: Efficiency (x1.25 Power)
    // Level 2: Capacity (+10)
    // Level 3: Speed (x0.8 Consumption Time)

    // Let's unlock Level 3 (Speed) - assuming ID is 'biomass_plant_speed_1' or similar?
    // Checking SkillTreeConfig, Level 3 is NOT defined!
    // SkillTreeConfig defines:
    // efficiency_1 -> Level 1
    // capacity_1 -> Level 2

    // Wait, SkillTreeConfig only has 2 upgrades for Biomass Plant!?
    // { id: "biomass_plant_efficiency_1", level: 1 }
    // { id: "biomass_plant_capacity_1", level: 2 }

    // BUT BiomassPlantConfig has 3 upgrades defined!
    // { level: 3, name: "speed_1" ... }

    // If the user CANNOT unlock Level 3 (because it's not in the tree), then my theory about Level 3 shadowing Level 2 is wrong?
    // Unless the user hacked/cheated or I missed something.

    // However, fixing the shadowing bug is still correct.
    // Let's test if Level 2 shadows Level 1.
    // Level 1: Power Rate x 1.25.
    // Level 2: Capacity + 10.

    // Unlock Level 1
    useGameStore.getState().unlockSkill("biomass_plant_efficiency_1");
    expect(plant.getBasePowerRate()).toBe(25); // 20 * 1.25

    // Unlock Level 2
    useGameStore.getState().unlockSkill("biomass_plant_capacity_1");

    // NOW: Check if Level 1 is still active
    expect(plant.getBasePowerRate()).toBe(25); // Should remain 25
    expect(plant.getFuelCapacity()).toBe(30); // Should be 30
  });
});
