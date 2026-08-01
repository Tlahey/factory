import { setup } from "xstate";
import type { Extractor } from "./Extractor";
import type { IWorld } from "../../entities/types";
import { updateBuildingConnectivity } from "../BuildingIOHelper";
import { ResourceTile } from "../../environment/ResourceTile";

export const extractorMachine = setup({
  types: {
    context: {} as {
      building: Extractor;
      stabilityTimer: number;
    },
    input: {} as { building: Extractor },
    events: {} as { type: "TICK"; delta: number; world: IWorld },
  },
  actions: {
    tickExtractor: ({ context, event }) => {
      const { building } = context;
      const { delta, world } = event;

      // Update connectivity visuals
      updateBuildingConnectivity(building, world);

      const tile = world.getTile(building.x, building.y);
      const resourceTile = tile instanceof ResourceTile ? tile : null;
      const hasResources = !!resourceTile && resourceTile.resourceAmount > 0;
      building.hasDemand = hasResources;

      const canOutput = building.checkOutputClear(world);
      const interval = building.getExtractionInterval();

      let currentStored = 0;
      if (building.slots.length > 0) {
        currentStored = building.slots[0].count;
      }
      const isBufferFull = currentStored >= building.BUFFER_CAPACITY;
      const isBufferEmpty = currentStored <= 0;

      // Determine "Logical" Status
      let logicalStatus: typeof building.operationStatus = "working";
      if (!hasResources && isBufferEmpty) {
        logicalStatus = "no_resources";
      } else if (isBufferFull && !canOutput) {
        logicalStatus = "blocked";
      } else if (!building.hasPowerSource) {
        logicalStatus = "no_power";
      }

      // Status Debouncing:
      if (logicalStatus === "blocked" || logicalStatus === "no_power") {
        context.stabilityTimer += delta;
      } else {
        context.stabilityTimer = 0;
      }

      const oldStatus = building.operationStatus;
      const STABILITY_THRESHOLD = 1.5;
      if (
        (logicalStatus !== "blocked" && logicalStatus !== "no_power") ||
        context.stabilityTimer >= STABILITY_THRESHOLD
      ) {
        building.operationStatus = logicalStatus;
      }

      if (building.operationStatus !== oldStatus) {
        console.log(
          `[Extractor] machine at ${building.x},${building.y} status change: ${oldStatus} -> ${building.operationStatus} (Timer: ${context.stabilityTimer.toFixed(2)})`,
        );
      }

      // Check Power Status
      const powerFactor = building.hasPowerSource
        ? building.powerSatisfaction
        : 0;
      const oldActive = building.active;

      const canMine = hasResources && !isBufferFull;
      const isWorking = canMine && powerFactor > 0;

      if (isWorking) {
        building.accumTime += delta * powerFactor;
        building.active = true;
      } else {
        building.active = false;
      }

      if (building.active !== oldActive) {
        console.log(
          `[Extractor] machine at ${building.x},${building.y} active flag change: ${oldActive} -> ${building.active} (Factor: ${powerFactor.toFixed(3)}, Status: ${building.operationStatus})`,
        );
      }

      // Mining Step
      if (canMine && building.accumTime >= interval) {
        if (resourceTile) {
          resourceTile.deplete(1);
          const resourceType = resourceTile.getResourceType();
          building.addToBuffer(resourceType, 1);

          import("../../events/GameEventManager").then(
            ({ gameEventManager }) => {
              gameEventManager.emit("RESOURCE_MINED", {
                resource: resourceType,
                amount: 1,
                position: { x: building.x, y: building.y },
              });
            },
          );
        }
        building.accumTime -= interval;
      }

      // Output Step
      if (building.slots.length > 0 && building.slots[0].count > 0) {
        if (building.tryOutput(world)) {
          building.removeFromBuffer(1);
        }
      }
    },
  },
}).createMachine({
  id: "extractor",
  context: ({ input }) => ({
    building: input.building,
    stabilityTimer: 0,
  }),
  initial: "idle",
  states: {
    idle: {
      on: {
        TICK: {
          actions: ["tickExtractor"],
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
          actions: ["tickExtractor"],
          target: "evalState",
        },
      },
    },
    no_resources: {
      on: {
        TICK: {
          actions: ["tickExtractor"],
          target: "evalState",
        },
      },
    },
    no_power: {
      on: {
        TICK: {
          actions: ["tickExtractor"],
          target: "evalState",
        },
      },
    },
    blocked: {
      on: {
        TICK: {
          actions: ["tickExtractor"],
          target: "evalState",
        },
      },
    },
  },
});
