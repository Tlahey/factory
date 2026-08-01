import * as THREE from "three";
import { seededRandom } from "../../utils/SeededRandom";

/**
 * Turns a sphere-like polyhedron into an angular, hand-chipped chunk.
 *
 * The displacement is hashed from each vertex's **direction**, not from its
 * index. `IcosahedronGeometry` is non-indexed — every face carries its own copy
 * of its three corners — so an index-based hash would push shared corners to
 * different places and split the mesh open along every edge.
 *
 * @param geometry A polyhedron centred on the origin; mutated in place.
 * @param radius   The radius it was built at.
 * @param amount   Peak displacement, as a fraction of the radius.
 * @param seed     Varies the chunk's shape.
 */
export function chipGeometry(
  geometry: THREE.BufferGeometry,
  radius: number,
  amount: number,
  seed = 0,
): THREE.BufferGeometry {
  const positions = geometry.getAttribute("position");
  const direction = new THREE.Vector3();

  for (let i = 0; i < positions.count; i++) {
    direction
      .fromBufferAttribute(positions as THREE.BufferAttribute, i)
      .normalize();

    const hash = seededRandom(
      direction.x * 127.1 + direction.y * 311.7 + direction.z * 74.7 + seed,
    );
    const scale = radius * (1 + (hash - 0.5) * amount);

    positions.setXYZ(
      i,
      direction.x * scale,
      direction.y * scale,
      direction.z * scale,
    );
  }

  positions.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * A single irregular rock chunk, ready to be merged or placed.
 */
export function createChunkGeometry(
  radius: number,
  detail = 1,
  amount = 0.35,
  seed = 0,
): THREE.BufferGeometry {
  return chipGeometry(
    new THREE.IcosahedronGeometry(radius, detail),
    radius,
    amount,
    seed,
  );
}
