import { setup } from "xstate";
import type { Furnace } from "./Furnace";
import type { IWorld } from "../../entities/types";
import { updateBuildingConnectivity } from "../BuildingIOHelper";

export const furnaceMachine = setup({
  types: {
    context: {} as {
      building: Furnace;
      statusStabilityTimer: number;
    },
    input: {} as { building: Furnace },
    events: {} as { type: "TICK"; delta: number; world: IWorld },
  },
  actions: {
    tickFurnace: ({ context, event }) => {
      const { building } = context;
      const { delta, world } = event;

      // 1. Update Connectivity
      updateBuildingConnectivity(building, world);

      // 2. Determine Operation Status
      let logicalStatus: typeof building.operationStatus = "idle";

      const hasPower =
        building.hasPowerSource && building.powerSatisfaction > 0.1;
      const isOutputFull =
        building.outputSlot !== null &&
        building.outputSlot.count >= building.OUTPUT_CAPACITY;
      const hasJobs = building.activeJobs.length > 0;
      const canProcess =
        hasPower && !isOutputFull && building.selectedRecipeId !== null;

      // Update Demand
      const hasItemsToProcess = building.inputQueue.length > 0;
      building.hasDemand =
        (hasJobs || hasItemsToProcess) &&
        !isOutputFull &&
        !!building.selectedRecipeId;

      if (!building.selectedRecipeId) {
        logicalStatus = "idle";
      } else if (!hasPower && building.hasDemand) {
        logicalStatus = "no_power";
      } else if (isOutputFull) {
        logicalStatus = "blocked";
      } else if (hasJobs || (hasItemsToProcess && canProcess)) {
        logicalStatus = "working";
      } else if (!hasItemsToProcess && !hasJobs) {
        logicalStatus = "no_resources";
      }

      // Status Debouncing
      if (logicalStatus === "blocked" || logicalStatus === "no_power") {
        context.statusStabilityTimer += delta;
      } else {
        context.statusStabilityTimer = 0;
      }

      const STABILITY_THRESHOLD = 1.5;
      if (
        (logicalStatus !== "blocked" && logicalStatus !== "no_power") ||
        context.statusStabilityTimer >= STABILITY_THRESHOLD
      ) {
        building.operationStatus = logicalStatus;
      }

      building.active = building.operationStatus === "working";

      // 3. Process Active Jobs
      if (building.active) {
        const speedMultiplier = building.getProcessingSpeed();
        const powerFactor = building.powerSatisfaction;

        // Advance existing jobs
        for (let i = building.activeJobs.length - 1; i >= 0; i--) {
          const job = building.activeJobs[i];
          const recipe = building.getRecipe(job.recipeId);

          if (!recipe) {
            building.activeJobs.splice(i, 1);
            continue;
          }

          // Advance progress
          const step = delta * speedMultiplier * powerFactor;
          job.elapsed += step;
          job.progress = Math.min(job.elapsed / recipe.duration, 1.0);

          // Check completion
          if (job.progress >= 1.0) {
            // Output to buffer
            if (!building.outputSlot) {
              building.outputSlot = { type: recipe.output, count: 0 };
            }

            if (building.outputSlot.type === recipe.output) {
              building.outputSlot.count++;
              building.activeJobs.splice(i, 1); // Job done
            }
          }
        }

        // Start new jobs if we have capacity and resources
        const maxParallel = building.getParallelProcessing();
        const availableSlots = maxParallel - building.activeJobs.length;

        if (availableSlots > 0 && building.selectedRecipeId) {
          const recipe = building.getRecipe(building.selectedRecipeId);

          if (recipe) {
            if (building.inputQueue.length > 0) {
              const itemIndex = building.inputQueue.findIndex(
                (item) => item.type === recipe.input,
              );

              if (itemIndex !== -1) {
                const item = building.inputQueue[itemIndex];
                const requiredCount = recipe.inputCount;
                if (item.count >= requiredCount) {
                  // Consume inputCount items
                  item.count -= requiredCount;
                  if (item.count <= 0) {
                    building.inputQueue.splice(itemIndex, 1);
                  }

                  // Start Job
                  building.activeJobs.push({
                    recipeId: recipe.id,
                    progress: 0,
                    elapsed: 0,
                  });
                }
              }
            }
          }
        }
      }

      // 4. Output Logic
      if (
        building.outputSlot &&
        building.outputSlot.count > 0 &&
        building.isOutputConnected
      ) {
        if (building.tryOutput(world)) {
          building.outputSlot.count--;
          if (building.outputSlot.count <= 0) {
            building.outputSlot = null;
          }
        }
      }
    },
  },
}).createMachine({
  id: "furnace",
  context: ({ input }) => ({
    building: input.building,
    statusStabilityTimer: 0,
  }),
  initial: "idle",
  states: {
    idle: {
      on: {
        TICK: {
          actions: ["tickFurnace"],
          target: "evalState",
        },
      },
    },
    evalState: {
      always: [
        {
          guard: ({ context }) =>
            context.building.operationStatus === "no_resources",
          target: "no_resources",
        },
        {
          guard: ({ context }) =>
            context.building.operationStatus === "blocked",
          target: "blocked",
        },
        {
          guard: ({ context }) =>
            context.building.operationStatus === "no_power",
          target: "no_power",
        },
        {
          guard: ({ context }) =>
            context.building.operationStatus === "working",
          target: "working",
        },
        {
          target: "idle",
        },
      ],
    },
    working: {
      on: {
        TICK: {
          actions: ["tickFurnace"],
          target: "evalState",
        },
      },
    },
    no_resources: {
      on: {
        TICK: {
          actions: ["tickFurnace"],
          target: "evalState",
        },
      },
    },
    no_power: {
      on: {
        TICK: {
          actions: ["tickFurnace"],
          target: "evalState",
        },
      },
    },
    blocked: {
      on: {
        TICK: {
          actions: ["tickFurnace"],
          target: "evalState",
        },
      },
    },
  },
});
