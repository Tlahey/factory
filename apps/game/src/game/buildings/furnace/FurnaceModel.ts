import * as THREE from "three";

export function createFurnaceModel(): THREE.Group {
  const group = new THREE.Group();
  group.name = "furnace_model";

  // 1. Base Geometry (Dark box)
  const baseGeo = new THREE.BoxGeometry(0.9, 1.2, 0.9);
  const baseMat = new THREE.MeshStandardMaterial({
    color: 0x333333,
    roughness: 0.8,
    metalness: 0.2,
  });
  const base = new THREE.Mesh(baseGeo, baseMat);
  base.position.y = 0.6; // Sit on ground
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);

  // 2. Core (Glowing part)
  const coreGeo = new THREE.BoxGeometry(0.5, 0.5, 0.6); // Slightly sticking out front/back
  const coreMat = new THREE.MeshStandardMaterial({
    color: 0x222222,
    emissive: 0xff4400,
    emissiveIntensity: 0,
  });
  const coreMesh = new THREE.Mesh(coreGeo, coreMat);
  coreMesh.name = "core_mesh"; // For easy access in Visual
  coreMesh.position.y = 0.5;
  coreMesh.position.z = 0.25;
  group.add(coreMesh);

  // 3. Status Light
  const lightGeo = new THREE.SphereGeometry(0.1, 8, 8);
  const lightMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
  const statusLight = new THREE.Mesh(lightGeo, lightMat);
  statusLight.name = "status_light"; // For easy access
  statusLight.position.set(0.35, 1.3, 0.35);
  group.add(statusLight);

  return group;
}
