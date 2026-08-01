import * as THREE from "three";
import {
  PALETTE,
  createDarkMetalMaterial,
  createFrameMaterial,
  createHazardMaterial,
  createPaintedMaterial,
  createSteelMaterial,
  enableShadows,
} from "../../visuals/materials/BuildingMaterials";
import {
  createLouverGeometry,
  createRivetRowGeometry,
} from "../../visuals/helpers/DetailGeometry";

/**
 * The Chest — a 1x1 riveted storage crate.
 *
 * ## Which way is the front
 *
 * The old model carried an unanswered comment ("Assuming Front is South (Z+)?
 * Or North (Z-)?") and put its only detail on the wrong face. Settled here:
 * models are authored **facing north**, and north is `-Z`
 * (`getDirectionOffset`). `CHEST_CONFIG.io` declares `inputSide: "front"` and
 * `outputSide: "back"`, so:
 *
 * - `-Z` is the **input** face — loading hatch with an intake grille.
 * - `+Z` is the **output** face — discharge chute with a hazard-striped lip.
 *
 * The two faces are now visually different, so the crate reads as directional
 * even before the I/O arrows appear.
 */

const SIZE = 0.8;
const HEIGHT = 0.72;
const HALF = SIZE / 2;

/** Skid the crate rests on, with feet at the corners. */
function addSkid(group: THREE.Group): void {
  const darkMat = createDarkMetalMaterial();

  const skid = new THREE.Mesh(
    new THREE.BoxGeometry(SIZE, 0.07, SIZE * 0.9),
    darkMat,
  );
  skid.position.y = 0.035;
  group.add(skid);

  const footGeo = new THREE.BoxGeometry(0.1, 0.05, 0.1);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const foot = new THREE.Mesh(footGeo, darkMat);
      foot.position.set(sx * (HALF - 0.07), 0.025, sz * (HALF - 0.07));
      group.add(foot);
    }
  }
}

/** Main crate body plus its corner posts and rivet seams. */
function addBody(group: THREE.Group): void {
  const bodyHeight = HEIGHT - 0.16;

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(SIZE - 0.08, bodyHeight, SIZE - 0.08),
    createPaintedMaterial(0x3d6c8f),
  );
  body.position.y = 0.07 + bodyHeight / 2;
  group.add(body);

  // Corner posts, slightly proud of the panels.
  const postGeo = new THREE.BoxGeometry(0.07, bodyHeight, 0.07);
  const postMat = createFrameMaterial();
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const post = new THREE.Mesh(postGeo, postMat);
      post.position.set(
        sx * (HALF - 0.035),
        0.07 + bodyHeight / 2,
        sz * (HALF - 0.035),
      );
      group.add(post);
    }
  }

  // Rivet seams down the two side panels.
  const rivetMat = createSteelMaterial();
  for (const sx of [-1, 1]) {
    const rivets = new THREE.Mesh(
      createRivetRowGeometry({
        count: 5,
        from: new THREE.Vector3(sx * (HALF - 0.03), 0.14, -0.28),
        to: new THREE.Vector3(sx * (HALF - 0.03), 0.14, 0.28),
        axis: "x",
        radius: 0.018,
      }),
      rivetMat,
    );
    group.add(rivets);
  }
}

/** Hinged lid with a hazard stripe, so the top isn't a flat blank. */
function addLid(group: THREE.Group): void {
  const lid = new THREE.Mesh(
    new THREE.BoxGeometry(SIZE, 0.08, SIZE),
    createFrameMaterial(),
  );
  lid.position.y = HEIGHT - 0.04;
  group.add(lid);

  // Diagonal hazard stripe across the lid — the standard "this is a container"
  // marking, and it makes chests pop against grass from a top-down camera.
  const stripe = new THREE.Mesh(
    new THREE.BoxGeometry(SIZE * 0.95, 0.02, 0.14),
    createHazardMaterial(),
  );
  stripe.position.y = HEIGHT + 0.01;
  stripe.rotation.y = Math.PI / 4;
  group.add(stripe);

  // Hinges on the output side.
  const hingeGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.12, 8);
  const hingeMat = createSteelMaterial();
  for (const sx of [-1, 1]) {
    const hinge = new THREE.Mesh(hingeGeo, hingeMat);
    hinge.rotation.z = Math.PI / 2;
    hinge.position.set(sx * 0.22, HEIGHT - 0.04, HALF - 0.02);
    group.add(hinge);
  }
}

/** `-Z` face: intake grille behind a recessed frame. */
function addInputFace(group: THREE.Group): void {
  const recess = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 0.32, 0.04),
    createDarkMetalMaterial(),
  );
  recess.position.set(0, 0.36, -HALF - 0.01);
  group.add(recess);

  const grille = new THREE.Mesh(
    createLouverGeometry({ count: 4, width: 0.34, height: 0.26, depth: 0.03 }),
    createSteelMaterial(),
  );
  grille.position.set(0, 0.36, -HALF - 0.03);
  group.add(grille);
}

/** `+Z` face: discharge chute with a hazard lip. */
function addOutputFace(group: THREE.Group): void {
  const chute = new THREE.Mesh(
    new THREE.BoxGeometry(0.38, 0.2, 0.1),
    createDarkMetalMaterial(),
  );
  chute.position.set(0, 0.24, HALF + 0.02);
  group.add(chute);

  const lip = new THREE.Mesh(
    new THREE.BoxGeometry(0.44, 0.05, 0.14),
    createHazardMaterial(),
  );
  // Tilted down, so items visibly "pour" toward the belt. Kept inside the tile
  // so it never intersects whatever is placed on the output side.
  lip.rotation.x = -0.3;
  lip.position.set(0, 0.16, HALF + 0.02);
  group.add(lip);

  // Latch above the chute.
  const latch = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.12, 0.05),
    createSteelMaterial(PALETTE.brass),
  );
  latch.position.set(0, 0.46, HALF + 0.01);
  group.add(latch);
}

export function createChestModel(): THREE.Group {
  const group = new THREE.Group();
  group.name = "chest_model";

  addSkid(group);
  addBody(group);
  addLid(group);
  addInputFace(group);
  addOutputFace(group);

  enableShadows(group);

  return group;
}
