import * as THREE from "three";

export function createConveyorSplitterModel(): THREE.Group {
  const group = new THREE.Group();
  group.name = "conveyor_splitter_model";

  // --- Create Main Body ---
  const bodyGeom = new THREE.BoxGeometry(0.8, 0.5, 0.8);
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x555555,
    metalness: 0.8,
    roughness: 0.2,
  });
  const body = new THREE.Mesh(bodyGeom, bodyMat);
  body.position.y = 0.25;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  // Decorative Top Plate
  const topPlateGeom = new THREE.BoxGeometry(0.6, 0.05, 0.6);
  const topPlateMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
  const topPlate = new THREE.Mesh(topPlateGeom, topPlateMat);
  topPlate.position.y = 0.5;
  group.add(topPlate);

  // Center Hexagon/Indicator - BLUE for Splitter
  const logoGeom = new THREE.CylinderGeometry(0.2, 0.2, 0.02, 6);
  const logoMat = new THREE.MeshStandardMaterial({
    color: 0x00aaff,
    emissive: 0x00aaff,
    emissiveIntensity: 0.5,
  });
  const logo = new THREE.Mesh(logoGeom, logoMat);
  logo.position.y = 0.53;
  group.add(logo);

  return group;
}
