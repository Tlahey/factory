import * as THREE from "three";
import {
  createTreeFoliageMaterial,
  createTreeTrunkMaterial,
  treeShaderController,
} from "../../visuals/TreeShader";
import {
  TREE_VISUAL_CONFIG,
  TreeVisualConfig,
  generateTreeOffset,
  generateTreeVisualParams,
} from "../EnvironmentConfig";

/**
 * Creates a low-poly stylized tree model for world placement.
 * Multiple trees are grouped together (1-3 trees per tile).
 * Uses custom shader for wind animation.
 *
 * @param treeCount Number of trees to create in this group
 * @param config Optional custom configuration (defaults to TREE_VISUAL_CONFIG)
 */
export function createTreeModel(
  treeCount: number = 1,
  config: TreeVisualConfig = TREE_VISUAL_CONFIG,
): THREE.Group {
  const group = new THREE.Group();

  for (let i = 0; i < treeCount; i++) {
    const treeGroup = new THREE.Group();

    // Generate random parameters for this tree
    const params = generateTreeVisualParams(config);
    const offset = generateTreeOffset(treeCount, config);

    // Create shader materials for this tree
    const trunkMaterial = createTreeTrunkMaterial(params.trunkColor);
    const foliageMaterial = createTreeFoliageMaterial(params.foliageColor, {
      swayStrength: params.swayStrength,
      swaySpeed: params.swaySpeed,
    });

    // Register materials with controller for time updates
    treeShaderController.addMaterial(trunkMaterial);
    treeShaderController.addMaterial(foliageMaterial);

    // Calculate trunk dimensions using config
    const trunkHeight = config.trunk.heightMultiplier * params.scale;
    const trunkGeometry = new THREE.ConeGeometry(
      config.trunk.radiusMultiplier * params.scale,
      trunkHeight,
      config.trunk.segments,
    );
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.y = trunkHeight / 2;
    trunk.name = "trunk";
    treeGroup.add(trunk);

    // Create foliage layers from config
    config.foliageLayers.forEach((layer, layerIndex) => {
      const foliageGeometry = new THREE.ConeGeometry(
        layer.radiusMultiplier * params.scale,
        layer.heightMultiplier * params.scale,
        layer.segments,
      );
      const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
      foliage.position.y = trunkHeight + layer.yOffsetMultiplier * params.scale;
      foliage.name = `foliage${layerIndex + 1}`;
      treeGroup.add(foliage);
    });

    // Position and rotate tree
    treeGroup.position.set(offset.x, 0, offset.z);
    treeGroup.rotation.y = params.rotation;
    treeGroup.name = `tree_${i}`;

    group.add(treeGroup);
  }

  return group;
}

/**
 * Creates a wood item model for conveyor transport.
 * Represents a log/wood piece.
 */
export function createWoodItemModel(): THREE.Group {
  const group = new THREE.Group();

  const woodMaterial = new THREE.MeshLambertMaterial({
    color: 0x8b5a2b,
    flatShading: true,
  });

  // Create log shapes (2-4 logs stacked)
  const maxLogs = 4;
  for (let i = 0; i < maxLogs; i++) {
    const logGeometry = new THREE.CylinderGeometry(0.04, 0.04, 0.15, 6);
    const log = new THREE.Mesh(logGeometry, woodMaterial);
    log.rotation.z = Math.PI / 2; // Horizontal log
    group.add(log);
  }

  updateWoodItemVisuals(group, 0);
  return group;
}

/**
 * Deterministic pseudo-random number generator
 */
function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

/**
 * Updates the wood item visuals based on seed for variety.
 */
export function updateWoodItemVisuals(group: THREE.Group, seed: number): void {
  let s = seed * 1234.5678;
  const activeCount = 2 + Math.floor(seededRandom(s++) * 3); // 2-4 logs

  group.children.forEach((child, i) => {
    if (i < activeCount) {
      child.visible = true;

      const r1 = seededRandom(s + i * 11);
      const r2 = seededRandom(s + i * 23);
      const r3 = seededRandom(s + i * 37);

      // Stack logs randomly
      const x = (r1 - 0.5) * 0.08;
      const y = 0.04 + i * 0.06;
      const z = (r2 - 0.5) * 0.08;

      child.position.set(x, y, z);
      child.rotation.y = r3 * Math.PI;
    } else {
      child.visible = false;
    }
  });

  group.scale.set(1.0, 1.0, 1.0);
}

/**
 * Updates tree model scale based on remaining resources.
 * Shrinks from top as resources deplete.
 * @param group The tree model group
 * @param percentRemaining Value between 0-1 representing % of resource left
 */
export function updateTreeVisualByDepletion(
  group: THREE.Group,
  percentRemaining: number,
): void {
  // Clamp between 0.2 and 1 (never fully disappear visually)
  const scale = 0.2 + percentRemaining * 0.8;

  // Apply scale - shrinking from top by scaling Y and adjusting pivot
  group.children.forEach((treeGroup) => {
    if (treeGroup instanceof THREE.Group) {
      // Scale the entire tree but keep the base grounded
      treeGroup.scale.setY(scale);

      // Also slightly reduce width for a more natural look
      const widthScale = 0.6 + percentRemaining * 0.4;
      treeGroup.scale.setX(widthScale);
      treeGroup.scale.setZ(widthScale);
    }
  });
}
