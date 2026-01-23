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
  const terrainData = useMemo(() => {
    // Create temp materials just for batch generation signatures
    const tempGrass = createGrassShaderMaterial();
    // Helpers for Sand/Water materials
    const tempSand = new SandShaderController({
      worldWidth: WORLD_WIDTH,
      worldHeight: WORLD_HEIGHT,
    }).material;
    const tempWater = new ToonWaterController({}).material;

    const data = createBatchedTerrain(
      world.grid,
      tempGrass,
      tempSand,
      tempWater,
    );

    // Dispose temp materials?
    // createBatchedTerrain assigns them to the meshes.
    // We will overwrite them in the sub-components with the "Real" controller-managed materials.
    // So this is fine.

    return data;
  }, [world]);

  return (
    <group name="TerrainSystem">
      <GroundLayer
        grassMesh={terrainData.grassMesh}
        sandMesh={terrainData.sandMesh}
      />
      <WaterLayer waterMesh={terrainData.waterMesh} />
      <NatureLayer
        rockPositions={terrainData.rockPositions}
        treePositions={terrainData.treePositions}
      />
    </group>
  );
}
