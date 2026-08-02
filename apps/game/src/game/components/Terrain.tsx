import React, { useMemo } from "react";
import * as THREE from "three";
import { useGameContext } from "../providers/GameProvider";
import { createBatchedTerrain } from "../visuals/shaders/TerrainBatcher";
import { createGrassShaderMaterial } from "../visuals/shaders/GrassShader";
import { SandShaderController } from "../visuals/shaders/SandShader";
import { WaterController } from "../visuals/shaders/WaterShader";
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
  const { world, worldRevision } = useGameContext();

  // 1. Generate Foundation Meshes (Batched)
  // We do this once here to share the data across layers or just pass data down.
  // createBatchedTerrain creates 4 big meshes: Grass, Sand, Water, Fog.
  // We need temporary materials for the batcher to work,
  // but the Layers will manage the live materials/controllers.
  // Depends on `worldRevision` (not just `world`, whose identity is stable for
  // the whole session) so that `world.revealArea(...)` actually triggers a
  // rebatch instead of silently doing nothing visually.
  const terrainData = useMemo(() => {
    // Create materials synchronously so meshes are born with them (Prevents White Blink)
    const grassMat = createGrassShaderMaterial();
    const sandController = new SandShaderController({
      worldWidth: WORLD_WIDTH,
      worldHeight: WORLD_HEIGHT,
    });
    const waterController = new WaterController({});
    const fogMaterial = new THREE.MeshStandardMaterial({
      color: 0x1c1f26,
      roughness: 1,
    });

    const data = createBatchedTerrain(
      world.grid,
      world.discovered,
      grassMat,
      sandController.material,
      waterController.material,
      fogMaterial,
    );

    return {
      ...data,
      grassMat,
      sandController,
      waterController,
      fogMaterial,
    };
    // worldRevision isn't read directly, but it's bumped whenever
    // world.revealArea(...) changes `world.discovered` in place, and is the
    // only way this memo knows to rebatch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [world, worldRevision]);

  // This useMemo now re-runs on every reveal (not just once at mount), so the
  // previous batch's geometries/materials must be disposed or they leak GPU
  // memory on every reveal.
  useEffect(() => {
    return () => {
      terrainData.grassMesh?.geometry.dispose();
      terrainData.sandMesh?.geometry.dispose();
      terrainData.waterMesh?.geometry.dispose();
      terrainData.fogMesh?.geometry.dispose();
      terrainData.grassMat.dispose();
      terrainData.fogMaterial.dispose();
      terrainData.sandController.dispose();
      terrainData.waterController.dispose();
    };
  }, [terrainData]);

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
        fogMesh={terrainData.fogMesh}
      />
      <WaterLayer
        waterMesh={terrainData.waterMesh}
        waterController={terrainData.waterController}
      />
      <NatureLayer natureAssets={terrainData.natureAssets} />
    </group>
  );
}
