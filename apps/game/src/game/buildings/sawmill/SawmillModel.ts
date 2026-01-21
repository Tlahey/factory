import * as THREE from "three";

/**
 * Creates a sawmill 3D model with:
 * - Low profile hollow structure
 * - Horizontal rotating saw blade that moves horizontally
 */
export function createSawmillModel(): THREE.Group {
  const group = new THREE.Group();

  // Materials
  const woodMaterial = new THREE.MeshStandardMaterial({
    color: 0x8b5a2b,
    roughness: 0.9,
    metalness: 0.0,
  });

  const metalMaterial = new THREE.MeshStandardMaterial({
    color: 0x555555,
    roughness: 0.4,
    metalness: 0.7,
  });

  const sawBladeMaterial = new THREE.MeshStandardMaterial({
    color: 0xcccccc,
    roughness: 0.3,
    metalness: 0.9,
    side: THREE.DoubleSide,
  });

  // Base Params
  const width = 0.9;
  const depth = 0.9;

  // === LOW BASE FRAME ===
  // Two parallel rails for the saw to slide on
  const railGeo = new THREE.BoxGeometry(0.1, 0.05, depth);
  const leftRail = new THREE.Mesh(railGeo, metalMaterial);
  leftRail.position.set(-0.3, 0.05, 0);
  leftRail.castShadow = true;
  group.add(leftRail);

  const rightRail = new THREE.Mesh(railGeo, metalMaterial);
  rightRail.position.set(0.3, 0.05, 0);
  rightRail.castShadow = true;
  group.add(rightRail);

  // Cross beams connecting rails
  const crossBeamGeo = new THREE.BoxGeometry(width, 0.1, 0.15);

  const frontBeam = new THREE.Mesh(crossBeamGeo, woodMaterial);
  frontBeam.position.set(0, 0.05, -0.4);
  frontBeam.castShadow = true;
  group.add(frontBeam);

  const backBeam = new THREE.Mesh(crossBeamGeo, woodMaterial);
  backBeam.position.set(0, 0.05, 0.4);
  backBeam.castShadow = true;
  group.add(backBeam);

  // === SAW BLADE ASSEMBLY (The Moving Head) ===
  const sawHead = new THREE.Group();
  sawHead.name = "saw_head";
  sawHead.position.set(0, 0.2, 0); // Start centered, low to ground

  // Main vertical shaft holding the blade
  const shaftGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.2, 8);
  const shaft = new THREE.Mesh(shaftGeo, metalMaterial);
  shaft.position.y = 0.1;
  sawHead.add(shaft);

  // Crossbar holding the shaft
  const headCrossbarGeo = new THREE.BoxGeometry(0.7, 0.05, 0.2);
  const headCrossbar = new THREE.Mesh(headCrossbarGeo, metalMaterial);
  headCrossbar.position.y = 0.22;
  sawHead.add(headCrossbar);

  // Circular Saw Blade
  const bladeRadius = 0.35;
  const bladeThickness = 0.02;
  const bladeGeo = new THREE.CylinderGeometry(
    bladeRadius,
    bladeRadius,
    bladeThickness,
    32,
  );
  const blade = new THREE.Mesh(bladeGeo, sawBladeMaterial);
  blade.name = "saw_blade";
  // blade.rotation.x = 0; // Default is horizontal (Y-axis is UP)
  blade.position.y = 0.05; // Very close to bottom
  blade.castShadow = true;
  sawHead.add(blade);

  // Saw Teeth
  const teethCount = 24;
  const toothSize = 0.05;
  for (let i = 0; i < teethCount; i++) {
    const angle = (i / teethCount) * Math.PI * 2;
    const tooth = new THREE.Mesh(
      new THREE.ConeGeometry(toothSize, toothSize * 1.5, 3),
      sawBladeMaterial,
    );

    // Position on rim
    const x = Math.cos(angle) * bladeRadius;
    const z = Math.sin(angle) * bladeRadius;
    tooth.position.set(x, 0, z); // Y is 0 relative to blade center

    // Default Cone points UP (Y+).
    // We want it to point OUTWARD horizontally.
    // 1. Rotate around X to lay flat pointing Z+? No, simpler:
    // lookAt helps.
    // But lookAt(0,0.05,0) points INWARD.
    // Let's point to a point further out:
    tooth.lookAt(x * 2, 0, z * 2);
    // Now Cone's Z-axis points to target? No, Cone's Y-axis points up.
    // lookAt orients the object's +Z axis to face the target.
    // We need to rotate geometry or the mesh so the "point" aligns with Z.
    // ConeGeometry points Y+.
    // Rotate X 90 degrees -> Y+ becomes Z+.
    tooth.rotateX(Math.PI / 2);

    blade.add(tooth); // Attach to blade so they rotate together
  }

  group.add(sawHead);

  // === OUTPUT AREA ===
  // Small ramp or chute
  const chuteGeo = new THREE.BoxGeometry(0.4, 0.02, 0.2);
  const chute = new THREE.Mesh(chuteGeo, metalMaterial);
  chute.position.set(0, 0.1, -0.5);
  chute.rotation.x = 0.2;
  group.add(chute);

  return group;
}

export function getSawBlade(model: THREE.Group): THREE.Object3D | undefined {
  // Search recursively as it might be nested deep
  let found: THREE.Object3D | undefined;
  model.traverse((child) => {
    if (child.name === "saw_blade") found = child;
  });
  return found;
}

export function getSawHead(model: THREE.Group): THREE.Object3D | undefined {
  return model.getObjectByName("saw_head");
}
