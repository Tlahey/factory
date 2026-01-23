"use client";

import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import { GameContextProvider } from "@/game/providers/GameProvider";
import { GameLoop } from "@/game/components/GameLoop";
import { GameCamera } from "@/game/components/GameCamera";
import { GameInput } from "@/game/components/GameInput";
import { Terrain } from "@/game/components/Terrain";
import { BuildingsRenderer } from "@/game/components/BuildingsRenderer";
import { SelectionView } from "@/game/components/visuals/SelectionView";
import { CablesView } from "@/game/components/visuals/CablesView";
import { useGameStore } from "@/game/state/store";
import { WORLD_WIDTH, WORLD_HEIGHT } from "@/game/constants";

/**
 * R3FCanvas
 *
 * The main entry point for the 3D scene.
 * It sets up the Canvas, Context Provider, and core systems.
 */
export default function R3FCanvas() {
  const fpsLimit = useGameStore((state) => state.fpsLimit);

  return (
    <div className="w-full h-full relative bg-gray-900">
      <Canvas
        shadows
        frameloop={fpsLimit > 0 ? "demand" : "always"}
        camera={{
          position: [WORLD_WIDTH / 2, 20, WORLD_HEIGHT / 2 + 20],
          fov: 45,
        }}
      >
        <Suspense fallback={null}>
          <GameContextProvider>
            {/* Systems */}
            <GameLoop />
            <GameCamera />
            <GameInput />

            {/* Lighting */}
            <ambientLight intensity={0.5} />
            <directionalLight
              position={[50, 50, 25]}
              intensity={1.0}
              castShadow
              shadow-mapSize={[2048, 2048]}
            />

            {/* Declarative Visuals */}
            <Terrain />
            <BuildingsRenderer />
            <CablesView />
            <SelectionView />
          </GameContextProvider>
        </Suspense>
      </Canvas>
    </div>
  );
}
