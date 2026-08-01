import { setup } from "xstate";
import type { ConveyorMerger } from "./ConveyorMerger";
import type { IWorld } from "../../entities/types";
import { updateBuildingConnectivity } from "../BuildingIOHelper";

export const conveyorMergerMachine = setup({
  types: {
    context: {} as {
      building: ConveyorMerger;
    },
    input: {} as { building: ConveyorMerger },
    events: {} as { type: "TICK"; delta: number; world: IWorld },
  },
  actions: {
    tickConveyorMerger: ({ context, event }) => {
      const { building } = context;
      const { world } = event;

      building.lastWorld = world;
      updateBuildingConnectivity(building, world);

      // 1. Free the slot first so a new item can come in this very tick.
      if (building.currentItem) {
        building.tryOutputInternal(world);
      }

      // 2. If empty, take the next item in round-robin order...
      if (!building.currentItem && building.tryPull(world)) {
        // 3. ...and forward it immediately (zero-latency pass-through).
        building.tryOutputInternal(world);
      }

      building.operationStatus = building.currentItem ? "blocked" : "idle";
      building.active = building.currentItem !== null;
    },
  },
}).createMachine({
  id: "conveyor_merger",
  context: ({ input }) => ({
    building: input.building,
  }),
  initial: "idle",
  states: {
    idle: {
      on: {
        TICK: {
          actions: ["tickConveyorMerger"],
          target: "evalState",
        },
      },
    },
    evalState: {
      always: [
        {
          guard: ({ context }) => context.building.currentItem !== null,
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
          actions: ["tickConveyorMerger"],
          target: "evalState",
        },
      },
    },
  },
});
