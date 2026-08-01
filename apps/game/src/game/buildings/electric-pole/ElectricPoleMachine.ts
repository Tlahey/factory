import { setup } from "xstate";
import type { ElectricPole } from "./ElectricPole";

export const electricPoleMachine = setup({
  types: {
    context: {} as {
      building: ElectricPole;
    },
    input: {} as { building: ElectricPole },
    events: {} as {
      type: "UPDATE_POWER";
      satisfaction: number;
      hasSource: boolean;
      gridId: number;
    },
  },
  actions: {
    updatePower: ({ context, event }) => {
      const { building } = context;
      const { satisfaction, hasSource, gridId } = event;

      building.powerSatisfaction = satisfaction;
      building.hasPowerSource = hasSource;
      building.currentGridId = gridId;

      if (satisfaction >= 0.99) {
        building.powerStatus = "active";
      } else if (satisfaction > 0.01) {
        building.powerStatus = "warn";
      } else {
        building.powerStatus = "idle";
      }

      building.operationStatus =
        hasSource && satisfaction > 0.01 ? "working" : "idle";
      building.active = hasSource && satisfaction > 0.01;
    },
  },
}).createMachine({
  id: "electric_pole",
  context: ({ input }) => ({
    building: input.building,
  }),
  initial: "idle",
  states: {
    idle: {
      on: {
        UPDATE_POWER: {
          actions: ["updatePower"],
          target: "evalState",
        },
      },
    },
    evalState: {
      always: [
        {
          guard: ({ context }) =>
            context.building.hasPowerSource &&
            context.building.powerSatisfaction > 0.01,
          target: "working",
        },
        {
          target: "idle",
        },
      ],
    },
    working: {
      on: {
        UPDATE_POWER: {
          actions: ["updatePower"],
          target: "evalState",
        },
      },
    },
  },
});
