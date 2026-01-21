import * as THREE from "three";

/**
 * Creates a 3D model for the Biomass Power Plant
 *
 * Design: Industrial burner with chimney and wood storage
 * - Main body: Furnace-like structure
 * - Chimney: Tall pipe for smoke
 * - Fire chamber: Glowing orange when active
 * - Wood storage: Side compartment
 */
export function createBiomassPlantModel(): THREE.Group {
  const group = new THREE.Group();
  group.name = "biomass_plant_model";

  // --- 1. Base Platform ---
  const baseGeo = new THREE.BoxGeometry(0.95, 0.15, 0.95);
  const baseMat = new THREE.MeshStandardMaterial({
    color: 0x666666,
    roughness: 0.9,
    metalness: 0.3,
  });
  const base = new THREE.Mesh(baseGeo, baseMat);
  base.position.set(0, 0.075, 0);
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);

  // --- 2. Main Furnace Body ---
  const bodyGeo = new THREE.BoxGeometry(0.7, 0.9, 0.7);
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x8b4513, // SaddleBrown - wood/biomass theme
    roughness: 0.8,
    metalness: 0.2,
  });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.set(0, 0.6, 0);
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  // --- 3. Chimney ---
  const chimneyGeo = new THREE.CylinderGeometry(0.12, 0.15, 1.2, 8);
  const chimneyMat = new THREE.MeshStandardMaterial({
    color: 0x555555,
    roughness: 0.7,
    metalness: 0.5,
  });
  const chimney = new THREE.Mesh(chimneyGeo, chimneyMat);
  chimney.position.set(0.2, 1.6, -0.2);
  chimney.castShadow = true;
  group.add(chimney);

  // Chimney cap
  const capGeo = new THREE.CylinderGeometry(0.18, 0.12, 0.1, 8);
  const cap = new THREE.Mesh(capGeo, chimneyMat);
  cap.position.set(0.2, 2.25, -0.2);
  group.add(cap);

  // --- 4. Fire Chamber (Front) ---
  const chamberGeo = new THREE.BoxGeometry(0.4, 0.4, 0.1);
  const chamberMat = new THREE.MeshStandardMaterial({
    color: 0x222222,
    roughness: 0.5,
  });
  const chamber = new THREE.Mesh(chamberGeo, chamberMat);
  chamber.position.set(0, 0.4, 0.35);
  group.add(chamber);

  // Fire glow (visible when active)
  const fireGeo = new THREE.PlaneGeometry(0.35, 0.35);
  const fireMat = new THREE.MeshStandardMaterial({
    color: 0xff4400,
    emissive: 0xff2200,
    emissiveIntensity: 1.0,
    side: THREE.DoubleSide,
  });
  const fire = new THREE.Mesh(fireGeo, fireMat);
  fire.name = "fire_glow";
  fire.position.set(0, 0.4, 0.31);
  group.add(fire);

  // --- 5. Wood Storage (Side) ---
  const storageGeo = new THREE.BoxGeometry(0.25, 0.5, 0.5);
  const storageMat = new THREE.MeshStandardMaterial({
    color: 0x654321, // Darker brown
    roughness: 0.9,
  });
  const storage = new THREE.Mesh(storageGeo, storageMat);
  storage.position.set(-0.35, 0.4, 0);
  group.add(storage);

  // Wood logs inside storage (decorative)
  const logGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.2, 6);
  const logMat = new THREE.MeshStandardMaterial({
    color: 0xa0522d, // Sienna
    roughness: 1.0,
  });

  for (let i = 0; i < 3; i++) {
    const log = new THREE.Mesh(logGeo, logMat);
    log.rotation.z = Math.PI / 2;
    log.position.set(-0.35, 0.25 + i * 0.12, -0.05 + i * 0.08);
    log.name = `wood_log_${i}`;
    group.add(log);
  }

  // --- 6. Control Panel ---
  const panelGeo = new THREE.BoxGeometry(0.25, 0.2, 0.05);
  const panelMat = new THREE.MeshStandardMaterial({
    color: 0x333333,
    metalness: 0.6,
  });
  const panel = new THREE.Mesh(panelGeo, panelMat);
  panel.position.set(0.25, 0.7, 0.35);
  group.add(panel);

  // --- 7. Status Light ---
  const lightGeo = new THREE.SphereGeometry(0.06, 8, 8);
  const lightMat = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
  const statusLight = new THREE.Mesh(lightGeo, lightMat);
  statusLight.name = "status_light";
  statusLight.position.set(0.25, 0.75, 0.37);
  group.add(statusLight);

  // --- 8. Breaker Switch (Visual) ---
  const switchGeo = new THREE.BoxGeometry(0.08, 0.12, 0.03);
  const switchMat = new THREE.MeshStandardMaterial({
    color: 0xcc0000,
    emissive: 0x440000,
    emissiveIntensity: 0.3,
  });
  const breakerSwitch = new THREE.Mesh(switchGeo, switchMat);
  breakerSwitch.name = "breaker_switch";
  breakerSwitch.position.set(0.25, 0.62, 0.37);
  group.add(breakerSwitch);

  // --- 9. Input Port (Back) ---
  const inputGeo = new THREE.BoxGeometry(0.3, 0.3, 0.1);
  const inputMat = new THREE.MeshStandardMaterial({
    color: 0x222222,
    emissive: 0x00aa00,
    emissiveIntensity: 0.2,
  });
  const inputPort = new THREE.Mesh(inputGeo, inputMat);
  inputPort.position.set(0, 0.5, -0.45);
  group.add(inputPort);

  return group;
}
