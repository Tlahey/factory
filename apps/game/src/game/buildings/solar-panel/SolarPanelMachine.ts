import { setup } from "xstate";
import type { SolarPanel } from "./SolarPanel";
import type { IWorld } from "../../entities/types";
import { noise2D } from "../../utils/Noise";

export const solarPanelMachine = setup({
  types: {
    context: {} as {
      building: SolarPanel;
    },
    input: {} as { building: SolarPanel },
    events: {} as { type: "TICK"; delta: number; world: IWorld },
  },
  actions: {
    tickSolarPanel: ({ context }) => {
      const { building } = context;

      // Simulate Day/Night Cycle
      const cycleDuration = 60000; // 60s
      const time = Date.now();
      const progress = (time % cycleDuration) / cycleDuration;

      // Simple intensity curve: sin wave clamped to 0..1 (Night is 0)
      const rawSin = Math.sin(progress * Math.PI * 2);
      let intensity = Math.max(0, rawSin);

      // Cloud Simulation Matching ShaderUtils
      if (intensity > 0) {
        const windX = 0.98;
        const windY = 0.19;
        const speed = 0.15;
        const scale = 0.05;
        const tSec = time / 1000;

        const offsetX = tSec * speed * windX;
        const offsetY = tSec * speed * windY;

        const nx = building.x * scale + offsetX;
        const ny = building.y * scale + offsetY;

        const rawNoise = noise2D(nx, ny);

        if (rawNoise > 0.5) {
          const cloudDensity = (rawNoise - 0.5) * 2;
          intensity *= 1 - cloudDensity * 0.8;
        }
      }

      building.sunlightIntensity = intensity;
      building.currentOutput =
        building.getPeakPowerRate() * building.sunlightIntensity;

      building.operationStatus = intensity > 0 ? "working" : "idle";
      building.active = intensity > 0;
    },
  },
}).createMachine({
  id: "solar_panel",
  context: ({ input }) => ({
    building: input.building,
  }),
  initial: "idle",
  states: {
    idle: {
      on: {
        TICK: {
          actions: ["tickSolarPanel"],
          target: "evalState",
        },
      },
    },
    evalState: {
      always: [
        {
          guard: ({ context }) => context.building.sunlightIntensity > 0,
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
          actions: ["tickSolarPanel"],
          target: "evalState",
        },
      },
    },
  },
});
