"use client";

import { useRef, useEffect } from "react";
import { useFrame, useThree, invalidate } from "@react-three/fiber";
import { useGameContext } from "../providers/GameProvider";
import { treeShaderController } from "../visuals/shaders/TreeShader";
import { useGameStore } from "../state/store";

/**
 * GameLoop Component
 *
 * Orchestrates the game simulation loop.
 * - Ticks World
 * - Updates Systems (Factory, Power, Guidance)
 * - Updates Global Shaders
 * - Tracks FPS
 */
export function GameLoop() {
  const { world, factorySystem, powerSystem, guidanceSystem, isPaused } =
    useGameContext();

  const { gl } = useThree();
  const statsTimerRef = useRef(0);
  const STATS_UPDATE_INTERVAL = 0.5; // Configurable interval (seconds)

  const fpsLimit = useGameStore((state) => state.fpsLimit);

  // Manual Render Loop for FPS Limiting
  useEffect(() => {
    if (fpsLimit <= 0) return;

    let frameId: number;
    let lastTime = performance.now();
    const interval = 1000 / fpsLimit;

    const loop = (time: number) => {
      frameId = requestAnimationFrame(loop);
      const delta = time - lastTime;

      if (delta >= interval) {
        lastTime = time - (delta % interval);
        invalidate(); // Trigger R3F Frame
      }
    };

    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, [fpsLimit]);

  useFrame((_, delta) => {
    if (isPaused) return;

    // 1. Simulation Tick
    world.tick(delta);

    // 2. Systems Update
    factorySystem.update(delta);
    powerSystem.update(delta);
    guidanceSystem.update(delta);

    // 3. Visual Shaders (Global)
    treeShaderController.update(delta);

    // 4. Performance Metrics (Throttled but running every actual frame for stats)
    statsTimerRef.current += delta;
    if (statsTimerRef.current >= STATS_UPDATE_INTERVAL) {
      // If we are artificially limiting FPS, the 'delta' is still the monitor refresh rate (e.g. 144hz).
      // But we want to report the effective FPS or the "Render" FPS?
      // "Render Stats" reports webgl calls. If we didn't tick logic, objects didn't move, but webgl might still draw static frame.
      // But usually FPS metric is "How many frames rendered per second".
      // Since we can't easily skip R3F render, we report the loop rate.

      const currentFPS = Math.round(1 / Math.max(delta, 0.001));

      // Collect Render Stats from Three.js WebGLRenderer
      const stats = {
        drawCalls: gl.info.render.calls,
        triangles: gl.info.render.triangles,
        geometries: gl.info.memory.geometries,
        textures: gl.info.memory.textures,
      };

      useGameStore.getState().setCurrentFPS(currentFPS);
      useGameStore.getState().setRenderStats(stats);

      statsTimerRef.current = 0;
    }
  });

  return null;
}
