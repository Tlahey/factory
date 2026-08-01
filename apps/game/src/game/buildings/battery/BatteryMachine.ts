import { setup } from "xstate";
import type { Battery } from "./Battery";
import type { IWorld } from "../../entities/types";
import { updateBuildingConnectivity } from "../BuildingIOHelper";
import { skillTreeManager } from "../hub/skill-tree/SkillTreeManager";

export const batteryMachine = setup({
  types: {
    context: {} as {
      building: Battery;
    },
    input: {} as { building: Battery },
    events: {} as { type: "TICK"; delta: number; world: IWorld },
  },
  actions: {
    tickBattery: ({ context, event }) => {
      const { building } = context;
      const { delta, world } = event;

      // Calculate flow rate from accumulated flow
      if (delta > 0) {
        building.lastFlowRate = building.currentFlow / delta;
      }

      // Determine active state based on flow
      building.active = Math.abs(building.currentFlow) > 0.001;
      building.currentFlow = 0; // Reset for next accumulated frame

      if (world) {
        updateBuildingConnectivity(building, world);
      }

      // Update flow history (every 1 second)
      building.flowHistoryTimer += delta;
      if (building.flowHistoryTimer >= 1.0) {
        building.flowHistoryTimer = 0;
        building.flowHistory.push({
          time: Date.now(),
          flow: building.lastFlowRate,
        });
        if (building.flowHistory.length > 60) {
          building.flowHistory.shift();
        }
      }

      // Apply upgrades
      const upgradeLevel = skillTreeManager.getBuildingUpgradeLevel("battery");
      if (upgradeLevel > 0) {
        const BATTERY_CONFIG = building.getConfig();
        let cap = BATTERY_CONFIG.capacity;
        let cRate = BATTERY_CONFIG.maxChargeRate;
        let dRate = BATTERY_CONFIG.maxDischargeRate;

        BATTERY_CONFIG.upgrades.forEach((u) => {
          if (u.level <= upgradeLevel) {
            u.effects.forEach((e) => {
              if (e.type === "multiplier") {
                if (e.stat === "capacity") cap *= e.value;
                if (e.stat === "maxChargeRate") cRate *= e.value;
                if (e.stat === "maxDischargeRate") dRate *= e.value;
              }
            });
          }
        });

        building.capacity = cap;
        building.maxChargeRate = cRate;
        building.maxDischargeRate = dRate;
      }

      // Sync operationStatus
      if (!building.isEnabled) {
        building.operationStatus = "idle";
      } else if (
        building.lastFlowRate > 0.001 ||
        building.lastFlowRate < -0.001
      ) {
        building.operationStatus = "working";
      } else {
        building.operationStatus = "idle";
      }
    },
  },
}).createMachine({
  id: "battery",
  context: ({ input }) => ({
    building: input.building,
  }),
  initial: "idle",
  states: {
    idle: {
      on: {
        TICK: {
          actions: ["tickBattery"],
          target: "evalState",
        },
      },
    },
    evalState: {
      always: [
        {
          guard: ({ context }) => !context.building.isEnabled,
          target: "idle",
        },
        {
          guard: ({ context }) => context.building.lastFlowRate > 0.001,
          target: "charging",
        },
        {
          guard: ({ context }) => context.building.lastFlowRate < -0.001,
          target: "discharging",
        },
        {
          target: "idle",
        },
      ],
    },
    charging: {
      on: {
        TICK: {
          actions: ["tickBattery"],
          target: "evalState",
        },
      },
    },
    discharging: {
      on: {
        TICK: {
          actions: ["tickBattery"],
          target: "evalState",
        },
      },
    },
  },
});
