import * as THREE from "three";
import { createRockTexture } from "./RockTexture";

export function createRockModel(): THREE.Group {
  const group = new THREE.Group();

  const texture = createRockTexture();
  const material = new THREE.MeshLambertMaterial({
    map: texture,
    flatShading: true,
  });

  // Create 3-5 random rocks in a small cluster
  const numRocks = 3 + Math.floor(Math.random() * 3);

  for (let i = 0; i < numRocks; i++) {
    // Random rock shape (low poly icosahedron)
    const radius = 0.2 + Math.random() * 0.3;
    const detail = 0; // Low-poly look
    const geometry = new THREE.IcosahedronGeometry(radius, detail);

    // Randomly deform geometry slightly?
    // For simplicity, just random scale and rotation
    const mesh = new THREE.Mesh(geometry, material);

    // Random position within the tile
    mesh.position.set(
      (Math.random() - 0.5) * 0.4,
      radius * 0.5, // Sit on the ground
      (Math.random() - 0.5) * 0.4,
    );

    mesh.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI,
    );

    mesh.scale.set(
      0.8 + Math.random() * 0.4,
      0.5 + Math.random() * 1.0, // Some are flatter, some taller
      0.8 + Math.random() * 0.4,
    );

    group.add(mesh);
  }

  return group;
}

export function createItemRockModel(): THREE.Group {
  const group = new THREE.Group();
  const texture = createRockTexture();
  const material = new THREE.MeshLambertMaterial({
    map: texture,
    flatShading: true,
  });

  // Create a pool of generic chunks inside the group
  // We will procedurally scramble them based on seed
  const maxChunks = 5;
  for (let i = 0; i < maxChunks; i++) {
    // Use different geometries for variety? Or just one.
    // Let's use 2 types: Icosahedron(0) and Dodecahedron? Just Ico is fine.
    const geo = new THREE.IcosahedronGeometry(0.1, 0);
    const mesh = new THREE.Mesh(geo, material);
    group.add(mesh);
  }

  // Default state: hidden or standard
  updateRockVisuals(group, 0);
  return group;
}

// Deterministic Pseudo-Random Number Generator
function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

export function updateRockVisuals(group: THREE.Group, seed: number) {
  const chunkCount = group.children.length;

  // Use seed to determine how many chunks are active (1 to count)
  // We mix seed with a prime to avoid patterns
  let s = seed * 1234.5678;

  const activeCount = 3 + Math.floor(seededRandom(s++) * (chunkCount - 2)); // 3 to 5 chunks

  group.children.forEach((child, i) => {
    if (i < activeCount) {
      child.visible = true;

      // Deterministic randoms
      const r1 = seededRandom(s + i * 11);
      const r2 = seededRandom(s + i * 23);
      const r3 = seededRandom(s + i * 37);
      const r4 = seededRandom(s + i * 41);

      // Position: Cluster around 0,0, but grounded
      // Spread X/Z: -0.15 to 0.15
      const x = (r1 - 0.5) * 0.3;
      const z = (r2 - 0.5) * 0.3;

      // Scale: Randomize proportions
      const sx = 0.8 + r3 * 0.8;
      const sy = 0.6 + r4 * 0.6;
      const sz = 0.8 + r1 * 0.8;

      // Rotation
      child.rotation.set(r2 * 6, r3 * 6, r1 * 6);
      child.scale.set(sx, sy, sz);

      // Height: Sit on belt manually.
      // Radius approx 0.1 * scale.
      // Center Y of mesh is at 0. Bottom is -0.1*sy.
      // We want Bottom at 0 (local).
      // So Y = 0.1 * sy.
      // But we also want to stack them slightly?
      // For now just flat cluster.
      child.position.set(x, 0.1 * sy, z);
    } else {
      child.visible = false;
    }
  });

  // Global Scale Check (reduced as per request)
  group.scale.set(1.0, 1.0, 1.0);
}
