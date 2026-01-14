import * as THREE from "three";

export function createFurnaceModel(): THREE.Group {
  const group = new THREE.Group();
  group.name = "furnace_model";

  // --- 1. Base Platform (1x2 footprint) ---
  // Shifted Z+0.5 so Back is at (0,0) Pivot
  const baseGeo = new THREE.BoxGeometry(0.95, 0.2, 1.95);
  const baseMat = new THREE.MeshStandardMaterial({
    color: 0x888888, // Lighter Grey
    roughness: 0.8,
    metalness: 0.4,
  });
  const base = new THREE.Mesh(baseGeo, baseMat);
  base.position.set(0, 0.1, 0.5); // Z shifted from 0 to 0.5
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);

  // --- 2. Vertical Tower (Back half) ---
  // Was z=-0.5. Shift +0.5 => z=0 (Pivot)
  const towerGeo = new THREE.BoxGeometry(0.9, 2.5, 0.9);
  const towerMat = new THREE.MeshStandardMaterial({
    color: 0x555555, // Dark Grey but not black
    roughness: 0.7,
    metalness: 0.6,
  });
  const tower = new THREE.Mesh(towerGeo, towerMat);
  tower.position.set(0, 1.35, 0);
  tower.castShadow = true;
  tower.receiveShadow = true;
  group.add(tower);

  // Tower details (pipes/vents)
  // Shift z by +0.5
  const pipeGeo = new THREE.CylinderGeometry(0.1, 0.1, 2.4);
  const pipeMat = new THREE.MeshStandardMaterial({
    color: 0xaaaaaa,
    metalness: 0.8,
  });
  const pipe1 = new THREE.Mesh(pipeGeo, pipeMat);
  pipe1.position.set(0.35, 1.25, 0.4); // Was -0.1 -> +0.4
  group.add(pipe1);

  // --- 3. Lava Pool (Front half) ---
  // Was z=0.5. Shift +0.5 => z=1.0
  const poolWallGeo = new THREE.BoxGeometry(0.9, 0.6, 0.9);
  const poolMat = new THREE.MeshStandardMaterial({ color: 0x666666 });
  const pool = new THREE.Mesh(poolWallGeo, poolMat);
  pool.position.set(0, 0.4, 1.0);
  group.add(pool);

  // Lava Surface
  const lavaGeo = new THREE.PlaneGeometry(0.7, 0.7);
  const lavaMat = new THREE.MeshStandardMaterial({
    color: 0xff3300,
    emissive: 0xff4400,
    emissiveIntensity: 2.0,
    side: THREE.DoubleSide,
  });
  const lava = new THREE.Mesh(lavaGeo, lavaMat);
  lava.rotation.x = -Math.PI / 2;
  lava.position.set(0, 0.71, 1.0);
  lava.name = "core_mesh"; // Reuse core_mesh for glow effect
  group.add(lava);

  // --- 4. Hammer Mechanism ---
  // Pivot point on the tower
  const hammerPivot = new THREE.Group();
  hammerPivot.name = "hammer_pivot";
  hammerPivot.position.set(0, 1.8, 0.4); // Was -0.1 -> +0.4
  group.add(hammerPivot);

  // Arm
  const armGeo = new THREE.BoxGeometry(0.2, 0.2, 1.2);
  const armMat = new THREE.MeshStandardMaterial({ color: 0x999999 });
  const arm = new THREE.Mesh(armGeo, armMat);
  arm.position.set(0, 0, 0.4); // Extending forward
  hammerPivot.add(arm);

  // Hammer Head
  const headGeo = new THREE.BoxGeometry(0.6, 0.8, 0.6);
  const headMat = new THREE.MeshStandardMaterial({
    color: 0x333333,
    metalness: 0.8,
    roughness: 0.4,
  });
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.set(0, -0.4, 0.9); // End of arm, hanging down
  hammerPivot.add(head);

  // --- 5. Status Light ---
  const lightGeo = new THREE.SphereGeometry(0.15, 8, 8);
  const lightMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
  const statusLight = new THREE.Mesh(lightGeo, lightMat);
  statusLight.name = "status_light";
  statusLight.position.set(0, 2.4, 0); // Tower top
  group.add(statusLight);

  // --- 6. IO Indicators ---
  // Input (Back) - On Tower Back Face (Z = -0.45) -> No, Back is +Z?
  // Wait. If reverted to "South Facing", Tower is at 0. Pool at +1.
  // Input Port should be on TOWER.
  // Output Port should be on POOL.
  // We need to decide which side "Input" is.
  // Previous (Step 879) had Input at -0.4 (North side of Tower?).
  // Output at +1.4 (South side of Pool?).
  // If Game Logic expects "Input Back". "Back" is usually +Z? No, -Z is Front. +Z is Back.
  // So Input at +Z.
  // If Input at +Z side of Tower: Z = +0.4.
  // If Output at -Z side of Pool: Z = 0.6. (Pool 1.0. -0.4 = 0.6).
  // This would mean Output faces "Inside"?
  // If Output is Front. Front is -Z?
  // If Model faces South (+Z).
  // It effectively faces "Backwards".
  // If user wants Model to stay as is (Tower 0, Pool +1).
  // AND arrows to match.
  // Input "Back" Arrow is usually South (+Z).
  // Output "Front" Arrow is usually North (-Z).
  // If Model faces South (+Z).
  // Output PORT should be at South (+Z)?
  // User says: "Le modèle doit revenir comme avant."
  // Step 879 Model state: Tower 0. Pool +1.
  // Input Port -0.4. Output Port +1.4.
  // I will revert to EXACTLY Step 879 state.

  const ioGeo = new THREE.BoxGeometry(0.6, 0.6, 0.2);
  const inputMat = new THREE.MeshStandardMaterial({
    color: 0x222222,
    emissive: 0x00aa00,
    emissiveIntensity: 0.2,
  });
  const inputPort = new THREE.Mesh(ioGeo, inputMat);
  inputPort.position.set(0, 0.8, -0.4);
  group.add(inputPort);

  const outputMat = new THREE.MeshStandardMaterial({
    color: 0x222222,
    emissive: 0xaa0000,
    emissiveIntensity: 0.2,
  });
  const outputPort = new THREE.Mesh(ioGeo, outputMat);
  outputPort.position.set(0, 0.4, 1.4);
  group.add(outputPort);

  return group;
}
