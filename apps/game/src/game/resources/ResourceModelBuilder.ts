import * as THREE from "three";

/**
 * Deterministic Pseudo-Random Number Generator
 */
function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

/**
 * Creates a simple icosahedron model for ores.
 */
export function createOreModel(color: number): THREE.Group {
  const group = new THREE.Group();
  const material = new THREE.MeshLambertMaterial({
    color: color,
    flatShading: true,
  });

  const geometry = new THREE.IcosahedronGeometry(0.3, 0);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = "ore_mesh";
  group.add(mesh);

  updateOreVisuals(group, 0);
  return group;
}

/**
 * Updates an ore model visuals with deterministic rotation based on seed.
 */
export function updateOreVisuals(group: THREE.Group, seed: number) {
  const mesh = group.getObjectByName("ore_mesh");
  if (!mesh) return;

  let s = seed * 1234.5678;

  // Random rotation for variety
  mesh.rotation.set(
    seededRandom(s++) * Math.PI * 2,
    seededRandom(s++) * Math.PI * 2,
    seededRandom(s++) * Math.PI * 2,
  );

  // Random slight scale variety
  const scale = 0.9 + seededRandom(s++) * 0.2;
  mesh.scale.set(scale, scale, scale);

  group.scale.set(0.375, 0.375, 0.375);
}

/**
 * Creates an "ingot" (bar) model with a trapezoidal shape.
 */
export function createIngotModel(color: number): THREE.Group {
  const group = new THREE.Group();

  // Create a box geometry and deform the top vertices to make it trapezoidal
  const width = 0.5;
  const height = 0.15;
  const depth = 0.25;
  const geometry = new THREE.BoxGeometry(width, height, depth);

  const positionAttribute = geometry.getAttribute("position");
  const topScale = 0.7; // Scale factor for the top face

  for (let i = 0; i < positionAttribute.count; i++) {
    const y = positionAttribute.getY(i);
    // If the vertex is on the top face (y > 0)
    if (y > 0) {
      positionAttribute.setX(i, positionAttribute.getX(i) * topScale);
      positionAttribute.setZ(i, positionAttribute.getZ(i) * topScale);
    }
  }
  positionAttribute.needsUpdate = true;
  geometry.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({
    color: color,
    metalness: 0.8,
    roughness: 0.3,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.y = height / 2;
  group.add(mesh);

  group.scale.set(0.75, 0.75, 0.75);
  return group;
}

/**
 * Updates an ingot model visuals (maybe slight rotation variety).
 */
export function updateIngotVisuals(group: THREE.Group, seed: number) {
  const s = seed * 567.89;
  group.rotation.y = seededRandom(s) * Math.PI * 2;
}
