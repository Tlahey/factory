import * as THREE from "three";

export function createHubModel(): THREE.Object3D {
  const group = new THREE.Group();

  // -- Materials --
  const wallColor = 0x8b4513; // Rusty Brown
  // const roofColor = 0x555555; // Dark Grey
  const solarColor = 0x0044aa; // Solar Blue
  const metalColor = 0x444444; // Dark Metal
  const glowColor = 0xffa500; // Orange Glow
  const poleColor = 0x666666; // Pole Grey

  const wallMat = new THREE.MeshLambertMaterial({ color: wallColor });
  // const roofMat = new THREE.MeshLambertMaterial({ color: roofColor });
  const solarMat = new THREE.MeshLambertMaterial({
    color: solarColor,
    emissive: 0x001133,
  });
  const metalMat = new THREE.MeshLambertMaterial({ color: metalColor });
  const glowMat = new THREE.MeshBasicMaterial({ color: glowColor });
  const poleMat = new THREE.MeshLambertMaterial({ color: poleColor });

  // -- Geometry Helper --
  // Origin (0,0,0) corresponds to the center of the Top-Left tile (x,y).
  // The building is 2x2, so it covers tiles with centers (0,0), (1,0), (0,1), (1,1).
  // The center of the building footprint is at (0.5, 0, 0.5).
  const centerX = 0.5;
  const centerZ = 0.5;

  // 1. Base Slab (Concrete/Metal Foundation) - Covers 2x2
  const baseGeo = new THREE.BoxGeometry(1.9, 0.2, 1.9);
  const base = new THREE.Mesh(baseGeo, metalMat);
  base.position.set(centerX, 0.1, centerZ);
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);

  // 2. Main Structure (Block)
  const mainGeo = new THREE.BoxGeometry(1.8, 1.0, 1.8);
  const mainBldg = new THREE.Mesh(mainGeo, wallMat);
  mainBldg.position.set(centerX, 0.6, centerZ);
  mainBldg.castShadow = true;
  mainBldg.receiveShadow = true;
  group.add(mainBldg);

  // 3. Solar Panels (Flat on top)
  const panelGeo = new THREE.BoxGeometry(1.6, 0.05, 1.6);
  const panel = new THREE.Mesh(panelGeo, solarMat);
  panel.position.set(centerX, 1.12, centerZ);
  group.add(panel);

  // 4. Central Electric Pole
  // Main Pole Shaft
  const poleHeight = 2.5; // Total height from ground
  const poleGeo = new THREE.CylinderGeometry(0.15, 0.15, poleHeight);
  const pole = new THREE.Mesh(poleGeo, poleMat);
  pole.position.set(centerX, poleHeight / 2, centerZ);
  pole.castShadow = true;
  group.add(pole);

  // Crossbar for cables (T-shape)
  const crossbarGeo = new THREE.BoxGeometry(0.8, 0.1, 0.1);
  const crossbar = new THREE.Mesh(crossbarGeo, poleMat);
  crossbar.position.set(centerX, poleHeight - 0.2, centerZ);
  group.add(crossbar);

  // Insulators / Connection Points
  const insulatorGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.1);
  const insulatorL = new THREE.Mesh(insulatorGeo, glowMat);
  insulatorL.rotation.x = Math.PI / 2;
  insulatorL.position.set(centerX - 0.35, poleHeight - 0.2, centerZ);
  group.add(insulatorL);

  const insulatorR = new THREE.Mesh(insulatorGeo, glowMat);
  insulatorR.rotation.x = Math.PI / 2;
  insulatorR.position.set(centerX + 0.35, poleHeight - 0.2, centerZ);
  group.add(insulatorR);

  // Top Light / Indicator
  const topLightGeo = new THREE.SphereGeometry(0.15);
  const topLight = new THREE.Mesh(topLightGeo, glowMat);
  topLight.position.set(centerX, poleHeight, centerZ);
  group.add(topLight);

  // 5. Entrance / Details
  const doorGeo = new THREE.BoxGeometry(0.6, 0.6, 0.1);
  const door = new THREE.Mesh(doorGeo, metalMat);
  door.position.set(centerX, 0.4, centerZ + 0.91); // Front face
  group.add(door);

  return group;
}
