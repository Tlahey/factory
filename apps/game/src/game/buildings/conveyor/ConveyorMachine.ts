import { setup } from "xstate";
import type { Conveyor } from "./Conveyor";
import type { IWorld } from "../../entities/types";

export const conveyorMachine = setup({
  types: {
    context: {} as {
      building: Conveyor;
    },
    input: {} as { building: Conveyor },
    events: {} as { type: "TICK"; delta: number; world: IWorld },
  },
  actions: {
    tickConveyor: ({ context, event }) => {
      const { building } = context;
      const { delta, world } = event;

      if (world) {
        // Cheap no-op unless the world topology changed since last tick.
        building.refreshTopology(world);
      }

      if (!building.currentItem) {
        building.operationStatus = "idle";
        building.active = false;
        return;
      }

      building.transportProgress += building.transportSpeed * delta;

      if (building.transportProgress >= 1 && world) {
        building.moveItem(world);
      }

      // An item stuck at the end of the belt means the downstream is blocked.
      if (building.currentItem) {
        building.operationStatus =
          building.transportProgress >= 1 ? "blocked" : "working";
        building.active = true;
      } else {
        building.operationStatus = "idle";
        building.active = false;
      }
    },
  },
}).createMachine({
  id: "conveyor",
  context: ({ input }) => ({
    building: input.building,
  }),
  initial: "idle",
  states: {
    idle: {
      on: {
        TICK: {
          actions: ["tickConveyor"],
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
          actions: ["tickConveyor"],
          target: "evalState",
        },
      },
    },
  },
});
