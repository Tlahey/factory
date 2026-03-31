import * as THREE from "three";
import { injectCloudShadows } from "../../visuals/shaders/CloudShadowPatcher";

export function createSolarPanelModel(isPreview: boolean = false): THREE.Group {
  console.log(`[SolarPanelModel] Creating model. isPreview=${isPreview}`);
  const group = new THREE.Group();

  // Create fresh materials for each instance to avoid shared shader state issues
  const frameMat = new THREE.MeshStandardMaterial({
    color: 0xcccccc, // Silver/White
    roughness: 0.4,
    metalness: 0.6,
  });

  const cellMat = new THREE.MeshStandardMaterial({
    color: 0x0505aa, // Deep Blue
    roughness: 0.2,
    metalness: 0.9,
    emissive: 0x000055, // Base faint glow
    emissiveIntensity: 0.2,
  });

  if (!isPreview) {
    frameMat.onBeforeCompile = injectCloudShadows;
    cellMat.onBeforeCompile = injectCloudShadows;
  }

  // 1. Stand Group (Scaled for 1x1 tile ~4x4 units)
  // Standard tile is 4 units.
  const standGroup = new THREE.Group();
  
  // Dimensions for 1x1 (Compact - fits in < 1.0)
  const postHeight = 0.8;
  const width = 0.8; 
  const depth = 0.7;
  
  // Vertical Posts (Rear)
  const postGeo = new THREE.BoxGeometry(0.05, postHeight, 0.05);
  const postL = new THREE.Mesh(postGeo, frameMat);
  postL.position.set(-width * 0.35, postHeight / 2, -depth * 0.35);
  
  const postR = new THREE.Mesh(postGeo, frameMat);
  postR.position.set(width * 0.35, postHeight / 2, -depth * 0.35);
  
  // Angled Supports
  const supportLen = 0.8;
  const supportGeo = new THREE.BoxGeometry(0.04, supportLen, 0.04);
  const supportL = new THREE.Mesh(supportGeo, frameMat);
  supportL.position.set(-width * 0.35, postHeight * 0.4, 0); 
  supportL.rotation.x = -Math.PI / 4;
  
  const supportR = new THREE.Mesh(supportGeo, frameMat);
  supportR.position.set(width * 0.35, postHeight * 0.4, 0);
  supportR.rotation.x = -Math.PI / 4;

  standGroup.add(postL, postR, supportL, supportR);
  group.add(standGroup);

  // 2. Solar Array (Compact)
  const arrayGroup = new THREE.Group();
  arrayGroup.position.set(0, postHeight * 0.45, 0.1); 
  arrayGroup.rotation.x = -Math.PI / 4;
  
  const plateW = 0.9;
  const plateH = 0.9;
  const plateGeo = new THREE.BoxGeometry(plateW, plateH, 0.05);
  const plate = new THREE.Mesh(plateGeo, frameMat);
  plate.position.z = -0.02;
  arrayGroup.add(plate);

  // Cells (Smaller)
  const cellW = 0.38;
  const cellH = 0.38;
  const gap = 0.04;
  const cellGeo = new THREE.BoxGeometry(cellW, cellH, 0.02);

  const startX = -cellW / 2 - gap / 2;
  const startY = cellH / 2 + gap / 2;

  // 2x2 Grid
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 2; c++) {
      const cell = new THREE.Mesh(cellGeo, cellMat);
      cell.position.x = (c === 0 ? -1 : 1) * (cellW / 2 + gap / 2);
      cell.position.y = (r === 0 ? 1 : -1) * (cellH / 2 + gap / 2);
      cell.position.z = 0.02;
      cell.name = "solar_cell";
      arrayGroup.add(cell);
    }
  }
  
  // Accents
  const stripGeo = new THREE.BoxGeometry(0.02, plateH + 0.02, 0.02);
  const stripMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });
  const stripL = new THREE.Mesh(stripGeo, stripMat);
  stripL.position.set(-plateW / 2 - 0.01, 0, 0);
  const stripR = new THREE.Mesh(stripGeo, stripMat);
  stripR.position.set(plateW / 2 + 0.01, 0, 0);
  arrayGroup.add(stripL, stripR);

  group.add(arrayGroup);

  // Status Light
  const lightGeo = new THREE.SphereGeometry(0.08, 8, 8);
  const lightMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
  const light = new THREE.Mesh(lightGeo, lightMat);
  light.position.set(0, 0.2, 0.5); 
  light.name = "status_light";
  group.add(light);

  return group;
}
