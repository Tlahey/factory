import { setup } from "xstate";
import type { BiomassPlant } from "./BiomassPlant";
import type { IWorld } from "../../entities/types";
import { updateBuildingConnectivity } from "../BuildingIOHelper";

export const biomassPlantMachine = setup({
  types: {
    context: {} as {
      building: BiomassPlant;
    },
    input: {} as { building: BiomassPlant },
    events: {} as { type: "TICK"; delta: number; world: IWorld },
  },
  actions: {
    tickBiomassPlant: ({ context, event }) => {
      const { building } = context;
      const { delta, world } = event;

      // Update connectivity
      updateBuildingConnectivity(building, world);

      // Update fluctuation
      building.updateFluctuation();

      // Determine operational status
      let logicalStatus: typeof building.operationStatus = "idle";

      if (!building.isEnabled) {
        logicalStatus = "idle";
        building.isBurning = false;
      } else if (building.fuelAmount <= 0 && building.combustionProgress <= 0) {
        logicalStatus = "no_resources";
        building.isBurning = false;
      } else {
        logicalStatus = "working";
        building.isBurning = true;

        // Process combustion
        if (building.combustionProgress > 0 || building.fuelAmount > 0) {
          // Start new combustion if not already burning
          if (building.combustionProgress <= 0 && building.fuelAmount > 0) {
            building.fuelAmount--;
            building.combustionProgress = 1.0;
          }

          // Advance combustion
          const consumptionTime = building.getConsumptionTime();
          const progressStep = delta / consumptionTime;
          building.combustionProgress = Math.max(
            0,
            building.combustionProgress - progressStep,
          );
        }
      }

      building.operationStatus = logicalStatus;
      building.active = building.isBurning;

      // Update power status for the grid
      if (building.isBurning) {
        building.powerStatus = "active";
        building.currentPowerSatisfied = building.getPowerGeneration();
      } else {
        building.powerStatus = "idle";
        building.currentPowerSatisfied = 0;
      }
    },
  },
}).createMachine({
  id: "biomass_plant",
  context: ({ input }) => ({
    building: input.building,
  }),
  initial: "idle",
  states: {
    idle: {
      on: {
        TICK: {
          actions: ["tickBiomassPlant"],
          target: "evalState",
        },
      },
    },
    evalState: {
      always: [
        {
          guard: ({ context }) =>
            !context.building.isEnabled ||
            (context.building.fuelAmount <= 0 &&
              context.building.combustionProgress <= 0),
          target: "no_resources_or_disabled",
        },
        {
          target: "working",
        },
      ],
    },
    no_resources_or_disabled: {
      on: {
        TICK: {
          actions: ["tickBiomassPlant"],
          target: "evalState",
        },
      },
    },
    working: {
      on: {
        TICK: {
          actions: ["tickBiomassPlant"],
          target: "evalState",
        },
      },
    },
  },
});
