import * as THREE from "three";
import { createRockTexture } from "./RockTexture";
import {
  ROCK_VISUAL_CONFIG,
  RockVisualConfig,
  generateRockChunkParams,
  generateRockOffset,
  getRockChunkCount,
} from "../EnvironmentConfig";

/**
 * Creates a rock cluster model for world placement.
 * Uses configuration from EnvironmentConfig for sizes and variations.
 *
 * @param config Optional custom configuration (defaults to ROCK_VISUAL_CONFIG)
 */
export function createRockModel(
  config: RockVisualConfig = ROCK_VISUAL_CONFIG,
): THREE.Group {
  const group = new THREE.Group();

  const texture = createRockTexture();
  const material = new THREE.MeshStandardMaterial({
    map: texture,
    flatShading: true,
    roughness: 0.9,
    metalness: 0,
  });

  // Get number of rock chunks from config
  const numRocks = getRockChunkCount(config);

  for (let i = 0; i < numRocks; i++) {
    // Generate random parameters from config
    const params = generateRockChunkParams(config);
    const offset = generateRockOffset(config);

    // Create rock geometry
    const geometry = new THREE.IcosahedronGeometry(
      params.radius,
      params.detail,
    );
    const mesh = new THREE.Mesh(geometry, material);

    // Position within tile
    mesh.position.set(
      offset.x,
      params.radius * 0.5, // Sit on the ground
      offset.z,
    );

    // Random rotation
    mesh.rotation.set(params.rotation.x, params.rotation.y, params.rotation.z);

    // Apply axis scale variation for natural shapes
    mesh.scale.set(params.scaleX, params.scaleY, params.scaleZ);

    group.add(mesh);
  }

  return group;
}
