import * as THREE from "three";

export function createConveyorMergerModel(): THREE.Group {
  const group = new THREE.Group();
  group.name = "conveyor_merger_model";

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

  // Center Hexagon/Indicator
  const logoGeom = new THREE.CylinderGeometry(0.2, 0.2, 0.02, 6);
  const logoMat = new THREE.MeshStandardMaterial({
    color: 0xffaa00,
    emissive: 0xffaa00,
    emissiveIntensity: 0.5,
  });
  const logo = new THREE.Mesh(logoGeom, logoMat);
  logo.position.y = 0.53;
  group.add(logo);

  // --- Port "Gates" ---
  addPortGate(group, 0, -0.4, 0, 0xff4444); // FRONT (Output)
  addPortGate(group, 0, 0.4, 0, 0x00ff88); // BACK (Input)
  addPortGate(group, 0.4, 0, Math.PI / 2, 0x00ff88); // RIGHT (Input)
  addPortGate(group, -0.4, 0, Math.PI / 2, 0x00ff88); // LEFT (Input)

  return group;
}

function addPortGate(
  group: THREE.Group,
  x: number,
  z: number,
  rotation: number,
  color: number,
) {
  const gateGeom = new THREE.BoxGeometry(0.5, 0.3, 0.1);
  const gateMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
  const gate = new THREE.Mesh(gateGeom, gateMat);

  const indicatorGeom = new THREE.BoxGeometry(0.3, 0.05, 0.02);
  const indicatorMat = new THREE.MeshStandardMaterial({
    color: color,
    emissive: color,
    emissiveIntensity: 1,
  });
  const indicator = new THREE.Mesh(indicatorGeom, indicatorMat);
  indicator.position.z = 0.06 * (z > 0 ? -1 : 1);
  gate.add(indicator);

  gate.position.set(x, 0.2, z);
  gate.rotation.y = rotation;
  group.add(gate);
}
