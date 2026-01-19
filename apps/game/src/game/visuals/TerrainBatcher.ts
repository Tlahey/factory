import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { Tile } from "../core/Tile";
import { WORLD_HEIGHT, WORLD_WIDTH } from "../constants";

/**
 * Creates batched terrain meshes using ONLY top faces.
 * No sides, no thickness. Just a flat surface at y=-0.5.
 */
export function createBatchedTerrain(
  grid: Tile[][],
  grassMaterial: THREE.Material,
  sandMaterial: THREE.Material,
  waterMaterial: THREE.Material,
): {
  grassMesh: THREE.Mesh | null;
  sandMesh: THREE.Mesh | null;
  waterMesh: THREE.Mesh | null;
  rockPositions: { x: number; y: number }[];
} {
  const grassGeometries: THREE.BufferGeometry[] = [];
  const sandGeometries: THREE.BufferGeometry[] = [];
  const waterGeometries: THREE.BufferGeometry[] = [];
  const rockPositions: { x: number; y: number }[] = [];

  // Helper to get height based on distance from edge (for sand slope)
  const getHeightAt = (x: number, z: number) => {
    const dx = Math.min(x, WORLD_WIDTH - 1 - x);
    const dz = Math.min(z, WORLD_HEIGHT - 1 - z);
    const d = Math.min(dx, dz);
    return Math.min(0, Math.max(-0.6, (d - 6.5) * 0.3));
  };

  // Base geometry for a flat tile (Plane facing UP)
  // PlaneGeometry(1, 1) is centered at origin, facing +Z. We rotate it to face +Y.
  const basePlane = new THREE.PlaneGeometry(1, 1);
  basePlane.rotateX(-Math.PI / 2); // Now facing +Y

  const addFlatTile = (
    x: number,
    y: number,
    offsetY: number,
    targetArray: THREE.BufferGeometry[],
  ) => {
    const geo = basePlane.clone();
    geo.translate(x, offsetY, y);
    targetArray.push(geo);
  };

  const addSlopedSand = (x: number, y: number) => {
    // For sand, we still want the slope effect on the top face,
    // but absolutely NO SIDES.
    const geo = basePlane.clone();
    const pos = geo.attributes.position;

    // PlaneGeometry has vertices that we can manipulate
    // Since we rotated -PI/2, Y is UP.
    // Vertex order for PlaneGeometry(1,1):
    // 0: -0.5, 0, -0.5 (Top Left)
    // 1: 0.5, 0, -0.5 (Top Right)
    // 2: -0.5, 0, 0.5 (Bottom Left)
    // 3: 0.5, 0, 0.5 (Bottom Right)

    for (let i = 0; i < pos.count; i++) {
      // We moved the geometry to (x, y) via translation, but here we modify original vertices
      // Wait, logic is: Translate first? No, modify first then translate is easier?
      // Actually, if we use world coordinates for height calculation:

      // Let's modify relative to x,y
      const worldX = x + pos.getX(i);
      const worldZ = y + pos.getZ(i);

      const h = getHeightAt(worldX, worldZ);
      pos.setY(i, h); // Set height relative to 0
    }

    geo.translate(x, 0, y); // Move to position, base at 0 (slope goes down from here)
    sandGeometries.push(geo);
  };

  for (let y = 0; y < WORLD_HEIGHT; y++) {
    for (let x = 0; x < WORLD_WIDTH; x++) {
      const tile = grid[y][x];

      if (tile.isWater()) {
        // Water lower than grass (-0.6)
        addFlatTile(x, y, -0.6, waterGeometries);
      } else if (tile.isSand()) {
        // Sand starts at 0 and slopes down to water depth
        addSlopedSand(x, y);
      } else {
        // Grass at 0 (Ground Level)
        addFlatTile(x, y, 0, grassGeometries);
        if (tile.isStone()) {
          rockPositions.push({ x, y });
        }
      }
    }
  }

  const grassMesh = mergeAndCreateMesh(grassGeometries, grassMaterial);
  const sandMesh = mergeAndCreateMesh(sandGeometries, sandMaterial);
  const waterMesh = mergeAndCreateMesh(waterGeometries, waterMaterial);

  return { grassMesh, sandMesh, waterMesh, rockPositions };
}

function mergeAndCreateMesh(
  geometries: THREE.BufferGeometry[],
  material: THREE.Material,
): THREE.Mesh | null {
  if (geometries.length === 0) return null;
  const merged = mergeGeometries(geometries, false);
  if (!merged) return null;
  geometries.forEach((g) => g.dispose());
  const mesh = new THREE.Mesh(merged, material);
  mesh.receiveShadow = true;
  // mesh.castShadow = true; // Ground usually doesn't need to cast shadows on itself
  return mesh;
}
