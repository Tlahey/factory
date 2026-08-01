import { setup } from "xstate";
import type { Hub } from "./Hub";

export const hubMachine = setup({
  types: {
    context: {} as {
      building: Hub;
    },
    input: {} as { building: Hub },
    events: {} as { type: "TICK"; delta: number },
  },
  actions: {
    tickHub: ({ context }) => {
      const { building } = context;
      building.updateFluctuation();
      building.operationStatus = building.isEnabled ? "working" : "idle";
      building.active = building.isEnabled;
    },
  },
}).createMachine({
  id: "hub",
  context: ({ input }) => ({
    building: input.building,
  }),
  initial: "idle",
  states: {
    idle: {
      on: {
        TICK: {
          actions: ["tickHub"],
          target: "evalState",
        },
      },
    },
    evalState: {
      always: [
        {
          guard: ({ context }) => context.building.isEnabled,
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
          actions: ["tickHub"],
          target: "evalState",
        },
      },
    },
  },
});
