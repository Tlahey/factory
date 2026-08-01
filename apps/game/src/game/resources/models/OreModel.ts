import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import {
  createOreMatrixMaterial,
  createOreVeinMaterial,
} from "../../visuals/materials/ResourceMaterials";
import { createSeedStream } from "../../utils/SeededRandom";
import { createChunkGeometry } from "./ChunkGeometry";

/**
 * ORE CHUNK
 *
 * A lump of ore is host rock with metal showing through it, so the model is
 * two merged meshes: a chipped boulder with two smaller lumps welded onto it,
 * and a handful of crystal shards poking out of its surface in the pure ore
 * colour. That contrast is what makes iron, copper and gold tell each other
 * apart at belt scale — the old single-colour icosahedron didn't.
 *
 * Everything is baked at build time into two geometries; per-item variety comes
 * from the rotation and scale applied by `updateOreVisuals`, which runs every
 * frame and therefore may not touch geometry.
 */

/** Radius of the main lump, before the root group's 0.375 scale. */
const BODY_RADIUS = 0.26;

/** Satellite lumps: [direction x, y, z, radius]. */
const SATELLITES: Array<[number, number, number, number]> = [
  [0.62, -0.35, 0.7, 0.13],
  [-0.72, 0.3, -0.6, 0.1],
];

/**
 * Where the exposed veins sit, as directions out of the body centre.
 *
 * Spread over the whole sphere on purpose: the chunk is rotated to an arbitrary
 * pose per item, so veins clustered on one side would leave half the seeds
 * showing a plain rock.
 */
const VEIN_DIRECTIONS: Array<[number, number, number]> = [
  [0.0, 1.0, 0.15],
  [0.85, 0.2, -0.5],
  [-0.6, 0.45, 0.65],
  [0.25, -0.5, 0.83],
  [-0.5, -0.7, -0.5],
  [0.55, -0.35, -0.75],
  [-0.9, -0.1, 0.25],
];

/** Half-height of a vein crystal, and how deep it is seated in the matrix. */
const VEIN_SIZE = 0.075;
const VEIN_SEAT = 0.68;

function createBodyGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [
    createChunkGeometry(BODY_RADIUS, 1, 0.34, 3.7),
  ];

  SATELLITES.forEach(([x, y, z, radius], index) => {
    const lump = createChunkGeometry(radius, 0, 0.5, 11.3 + index);
    // Seated *into* the body (0.78 of the body radius) so the pair reads as one
    // broken rock rather than two spheres touching.
    const seat = new THREE.Vector3(x, y, z)
      .normalize()
      .multiplyScalar(BODY_RADIUS * 0.78);
    lump.translate(seat.x, seat.y, seat.z);
    parts.push(lump);
  });

  const merged = mergeGeometries(parts, false);
  parts.forEach((part) => part.dispose());
  if (!merged) throw new Error("OreModel: failed to merge the body geometry");
  return merged;
}

function createVeinGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const up = new THREE.Vector3(0, 1, 0);

  VEIN_DIRECTIONS.forEach(([x, y, z]) => {
    // Octahedra, stretched along their axis: a crystal, not a pebble.
    const shard = new THREE.OctahedronGeometry(VEIN_SIZE, 0);
    shard.scale(0.85, 1.7, 0.85);

    const direction = new THREE.Vector3(x, y, z).normalize();
    shard.applyQuaternion(
      new THREE.Quaternion().setFromUnitVectors(up, direction),
    );
    // Seated below the surface, so each shard looks embedded in the matrix
    // rather than glued to it.
    shard.translate(
      direction.x * BODY_RADIUS * VEIN_SEAT,
      direction.y * BODY_RADIUS * VEIN_SEAT,
      direction.z * BODY_RADIUS * VEIN_SEAT,
    );
    parts.push(shard);
  });

  const merged = mergeGeometries(parts, false);
  parts.forEach((part) => part.dispose());
  if (!merged) throw new Error("OreModel: failed to merge the vein geometry");
  return merged;
}

/**
 * Creates an ore chunk tinted by `color`.
 */
export function createOreModel(color: number): THREE.Group {
  const group = new THREE.Group();

  // One node holds both meshes so `updateOreVisuals` can pose the whole chunk
  // with a single transform.
  const chunk = new THREE.Group();
  chunk.name = "ore_mesh";

  chunk.add(
    new THREE.Mesh(createBodyGeometry(), createOreMatrixMaterial(color)),
  );
  chunk.add(new THREE.Mesh(createVeinGeometry(), createOreVeinMaterial(color)));

  group.add(chunk);

  updateOreVisuals(group, 0);
  return group;
}

/**
 * Poses an ore chunk deterministically from its item id.
 */
export function updateOreVisuals(group: THREE.Group, seed: number): void {
  const chunk = group.getObjectByName("ore_mesh");
  if (!chunk) return;

  const random = createSeedStream(seed);

  chunk.rotation.set(
    random() * Math.PI * 2,
    random() * Math.PI * 2,
    random() * Math.PI * 2,
  );

  const scale = 0.9 + random() * 0.2;
  chunk.scale.set(scale, scale, scale);

  group.scale.set(0.375, 0.375, 0.375);
}
