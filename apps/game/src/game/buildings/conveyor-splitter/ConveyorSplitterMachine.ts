import { setup } from "xstate";
import type { ConveyorSplitter } from "./ConveyorSplitter";
import type { IWorld } from "../../entities/types";
import { updateBuildingConnectivity } from "../BuildingIOHelper";

export const conveyorSplitterMachine = setup({
  types: {
    context: {} as {
      building: ConveyorSplitter;
    },
    input: {} as { building: ConveyorSplitter },
    events: {} as { type: "TICK"; delta: number; world: IWorld },
  },
  actions: {
    tickConveyorSplitter: ({ context, event }) => {
      const { building } = context;
      const { world } = event;

      building.lastWorld = world;
      updateBuildingConnectivity(building, world);

      if (building.currentItem) {
        building.tryOutput(world);
      }

      // Still holding an item means every output is blocked.
      building.operationStatus = building.currentItem ? "blocked" : "idle";
      building.active = building.currentItem !== null;
    },
  },
}).createMachine({
  id: "conveyor_splitter",
  context: ({ input }) => ({
    building: input.building,
  }),
  initial: "idle",
  states: {
    idle: {
      on: {
        TICK: {
          actions: ["tickConveyorSplitter"],
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
          actions: ["tickConveyorSplitter"],
          target: "evalState",
        },
      },
    },
  },
});
