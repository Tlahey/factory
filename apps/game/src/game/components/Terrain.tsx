import React, { useMemo } from "react";
import { useGameContext } from "../providers/GameProvider";
import { createBatchedTerrain } from "../visuals/shaders/TerrainBatcher";
import { createGrassShaderMaterial } from "../visuals/shaders/GrassShader";
import { SandShaderController } from "../visuals/shaders/SandShader";
import { ToonWaterController } from "../visuals/shaders/ToonWaterShader";
import { WORLD_WIDTH, WORLD_HEIGHT } from "../constants";
import { GroundLayer } from "./terrain/GroundLayer";
import { WaterLayer } from "./terrain/WaterLayer";
import { NatureLayer } from "./terrain/NatureLayer";

import { useGameStore } from "../state/store";
import { useEffect } from "react";

/**
 * Terrain Component
 *
 * Orchestrates rendering of:
 * - Ground (Grass, Sand)
 * - Water (Water plane, Waterfalls)
 * - Nature (Rocks, Trees)
 */
export function Terrain() {
  const { world } = useGameContext();

  // 1. Generate Foundation Meshes (Batched)
  // We do this once here to share the data across layers or just pass data down.
  // createBatchedTerrain creates 3 big meshes: Grass, Sand, Water.
  // We need temporary materials for the batcher to work,
  // but the Layers will manage the live materials/controllers.
  // 1. Generate Foundation Meshes (Batched)
  const terrainData = useMemo(() => {
    // Create materials synchronously so meshes are born with them (Prevents White Blink)
    const grassMat = createGrassShaderMaterial();
    const sandController = new SandShaderController({
      worldWidth: WORLD_WIDTH,
      worldHeight: WORLD_HEIGHT,
    });
    const waterController = new ToonWaterController({});

    const data = createBatchedTerrain(
      world.grid,
      grassMat,
      sandController.material,
      waterController.material,
    );

    return {
      ...data,
      sandController,
      waterController,
    };
  }, [world]);

  // Signal that the heaviest part of the scene is mounted/ready
  useEffect(() => {
    // Small timeout to ensure at least one frame has passed?
    // Usually useEffect fires after layout/paint.
    // Let's set it immediately, it's better than arbitrary 500ms.
    useGameStore.getState().setSceneReady(true);

    return () => {
      useGameStore.getState().setSceneReady(false);
    };
  }, []);

  return (
    <group name="TerrainSystem">
      <GroundLayer
        grassMesh={terrainData.grassMesh}
        sandMesh={terrainData.sandMesh}
        sandController={terrainData.sandController}
      />
      <WaterLayer
        waterMesh={terrainData.waterMesh}
        waterController={terrainData.waterController}
      />
      <NatureLayer natureAssets={terrainData.natureAssets} />
    </group>
  );
}
