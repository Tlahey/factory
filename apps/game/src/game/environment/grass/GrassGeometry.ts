import * as THREE from "three";

export function getGrassGeometry(): THREE.BufferGeometry {
  const geometry = new THREE.PlaneGeometry(0.05, 0.2, 1, 4); // Added segments for bending
  geometry.translate(0, 0.1, 0); // Pivot at base
  return geometry;
}
