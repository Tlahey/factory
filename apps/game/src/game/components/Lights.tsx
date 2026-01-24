"use client";
import { WORLD_WIDTH, WORLD_HEIGHT } from "../constants";

/**
 * Lights Component
 *
 * Declarative lighting setup matching the legacy GameApp.ts lighting.
 * This replaces the imperative light creation in the constructor.
 */
export function Lights() {
  return (
    <>
      {/* Ambient light for overall scene illumination */}
      <ambientLight intensity={0.6} color={0xffffff} />

      {/* Main directional light with shadows */}
      <directionalLight
        position={[WORLD_WIDTH / 2 + 20, 40, WORLD_HEIGHT / 2 + 20]}
        intensity={0.8}
        color={0xffffff}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-WORLD_WIDTH}
        shadow-camera-right={WORLD_WIDTH}
        shadow-camera-top={WORLD_HEIGHT}
        shadow-camera-bottom={-WORLD_HEIGHT}
        shadow-camera-near={0.5}
        shadow-camera-far={200}
      />
      {/* Note: The light targets (0,0,0) by default. 
          Given the frustum size above, it should cover the world. 
          If world center is far from 0,0, we might need a target. 
          But here we've centered the light slightly around world center. */}
    </>
  );
}
