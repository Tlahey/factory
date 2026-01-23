"use client";

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
        position={[20, 30, 20]}
        intensity={0.8}
        color={0xffffff}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-50}
        shadow-camera-right={50}
        shadow-camera-top={50}
        shadow-camera-bottom={-50}
        shadow-camera-near={0.5}
        shadow-camera-far={100}
      />
    </>
  );
}
