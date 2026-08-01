import { setup } from "xstate";
import type { Chest } from "./Chest";
import type { IWorld } from "../../entities/types";
import { updateBuildingConnectivity } from "../BuildingIOHelper";

export const chestMachine = setup({
  types: {
    context: {} as {
      building: Chest;
    },
    input: {} as { building: Chest },
    events: {} as { type: "TICK"; delta: number; world: IWorld },
  },
  actions: {
    tickChest: ({ context, event }) => {
      const { building } = context;
      const { world } = event;

      updateBuildingConnectivity(building, world);
      if (building.isOutputConnected && building.slots.length > 0) {
        building.tryOutputResource(world);
      }

      building.operationStatus = building.slots.length > 0 ? "working" : "idle";
      building.active = building.slots.length > 0;
    },
  },
}).createMachine({
  id: "chest",
  context: ({ input }) => ({
    building: input.building,
  }),
  initial: "idle",
  states: {
    idle: {
      on: {
        TICK: {
          actions: ["tickChest"],
          target: "evalState",
        },
      },
    },
    evalState: {
      always: [
        {
          guard: ({ context }) => context.building.slots.length > 0,
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
          actions: ["tickChest"],
          target: "evalState",
        },
      },
    },
  },
});
