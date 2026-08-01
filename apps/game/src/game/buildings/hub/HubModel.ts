import * as THREE from "three";
import {
  PALETTE,
  createConcreteMaterial,
  createDarkMetalMaterial,
  createEmissiveMaterial,
  createFrameMaterial,
  createHazardMaterial,
  createPaintedMaterial,
  createSteelMaterial,
  enableShadows,
} from "../../visuals/materials/BuildingMaterials";
import {
  createLadderGeometry,
  createLouverGeometry,
  createPipeGeometry,
  createRivetRowGeometry,
} from "../../visuals/helpers/DetailGeometry";

/**
 * The Hub — the player's starting base, on a 2x2 footprint.
 *
 * Model origin is the **centre of the footprint**, so it spans x/z in [-1, 1]
 * (see `getFootprintCenter` in `BuildingFootprint.ts`).
 *
 * Shape language: an asymmetric silhouette — a tall control block with a
 * corrugated roof, a lower service wing, and a radio mast off-centre. The mast
 * being off the middle is what tells you at a glance which way the hub faces.
 */

/** Half-extent of the 2x2 footprint, with a small margin so tiles stay visible. */
const HALF = 0.95;
/** Height of the radio mast tip above ground. */
const MAST_TOP = 2.6;

/** Concrete pad the whole structure sits on. */
function addFoundation(group: THREE.Group): void {
  const slab = new THREE.Mesh(
    new THREE.BoxGeometry(HALF * 2, 0.18, HALF * 2),
    createConcreteMaterial(),
  );
  slab.position.y = 0.09;
  group.add(slab);

  // Hazard-striped kerb around the pad edge, front and back only: it frames the
  // building without boxing in the I/O sides.
  const kerbMat = createHazardMaterial();
  for (const side of [-1, 1]) {
    const kerb = new THREE.Mesh(
      new THREE.BoxGeometry(HALF * 2, 0.06, 0.1),
      kerbMat,
    );
    kerb.position.set(0, 0.21, side * (HALF - 0.05));
    group.add(kerb);
  }
}

/** Tall control block: the main volume, back-left of the pad. */
function addControlBlock(group: THREE.Group): void {
  const wallMat = createPaintedMaterial(PALETTE.rust);

  const block = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.0, 1.5), wallMat);
  block.position.set(-0.35, 0.68, -0.1);
  group.add(block);

  // Corrugated roof: ribs merged into one mesh, laid flat over the block.
  const ribs = new THREE.Mesh(
    createLouverGeometry({
      count: 9,
      width: 1.2,
      height: 1.6,
      depth: 0.06,
      tilt: 0,
    }),
    createFrameMaterial(),
  );
  ribs.rotation.x = -Math.PI / 2;
  ribs.position.set(-0.35, 1.2, -0.1);
  group.add(ribs);

  // Roof cap that the ribs sit on, so you never see through the gaps.
  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 0.06, 1.6),
    createDarkMetalMaterial(),
  );
  roof.position.set(-0.35, 1.16, -0.1);
  group.add(roof);

  // Cooling vents on the outward-facing wall.
  const vents = new THREE.Mesh(
    createLouverGeometry({ count: 5, width: 0.5, height: 0.4, depth: 0.04 }),
    createDarkMetalMaterial(),
  );
  vents.position.set(-0.91, 0.85, -0.1);
  vents.rotation.y = -Math.PI / 2;
  group.add(vents);

  // Panel seam rivets along the top of the front wall.
  const rivets = new THREE.Mesh(
    createRivetRowGeometry({
      count: 9,
      from: new THREE.Vector3(-0.85, 1.06, 0.66),
      to: new THREE.Vector3(0.15, 1.06, 0.66),
    }),
    createSteelMaterial(),
  );
  group.add(rivets);
}

/** Low service wing with the entrance, front-right of the pad. */
function addServiceWing(group: THREE.Group): void {
  const wing = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.62, 1.5),
    createPaintedMaterial(PALETTE.frame),
  );
  wing.position.set(0.5, 0.49, -0.1);
  group.add(wing);

  // Flat roof lip.
  const lip = new THREE.Mesh(
    new THREE.BoxGeometry(0.78, 0.05, 1.58),
    createDarkMetalMaterial(),
  );
  lip.position.set(0.5, 0.82, -0.1);
  group.add(lip);

  // Entrance: recessed door with a hazard-yellow frame.
  const doorFrame = new THREE.Mesh(
    new THREE.BoxGeometry(0.46, 0.5, 0.06),
    createHazardMaterial(),
  );
  doorFrame.position.set(0.5, 0.43, 0.64);
  group.add(doorFrame);

  const door = new THREE.Mesh(
    new THREE.BoxGeometry(0.36, 0.4, 0.06),
    createDarkMetalMaterial(),
  );
  door.position.set(0.5, 0.4, 0.66);
  group.add(door);

  // Maintenance ladder up to the control block roof.
  const ladder = new THREE.Mesh(
    createLadderGeometry({ height: 1.14 }),
    createSteelMaterial(),
  );
  ladder.position.set(0.5, 0.18, -0.88);
  group.add(ladder);
}

/** Radio mast with a crossarm, insulators and the beacon at the top. */
function addMast(group: THREE.Group): void {
  const steelMat = createSteelMaterial();
  const mastX = -0.35;
  const mastZ = 0.6;

  const shaft = new THREE.Mesh(
    // Tapered: reads as a mast rather than a pipe.
    new THREE.CylinderGeometry(0.045, 0.08, MAST_TOP - 0.15, 8),
    steelMat,
  );
  shaft.position.set(mastX, (MAST_TOP - 0.15) / 2, mastZ);
  group.add(shaft);

  // Guy struts bracing the mast down to the roof.
  for (const side of [-1, 1]) {
    const strut = new THREE.Mesh(
      new THREE.BoxGeometry(0.035, 0.7, 0.035),
      createFrameMaterial(),
    );
    strut.position.set(mastX + side * 0.16, 1.2, mastZ - 0.16);
    strut.rotation.z = side * 0.35;
    strut.rotation.x = 0.35;
    group.add(strut);
  }

  const crossarm = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 0.06, 0.08),
    createFrameMaterial(),
  );
  crossarm.position.set(mastX, MAST_TOP - 0.35, mastZ);
  group.add(crossarm);

  // Ceramic insulators the power cables hook onto.
  const insulatorMat = createPaintedMaterial(0xdddddd);
  for (const side of [-1, 1]) {
    const insulator = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.055, 0.1, 8),
      insulatorMat,
    );
    insulator.position.set(mastX + side * 0.32, MAST_TOP - 0.27, mastZ);
    group.add(insulator);
  }

  // Beacon: named so `HubView` can pulse it instead of hunting for a material
  // by colour. Emissive (not `MeshBasicMaterial`) so intensity is animatable.
  const beacon = new THREE.Mesh(
    new THREE.SphereGeometry(0.09, 12, 10),
    createEmissiveMaterial(0xffa500, 1.4),
  );
  beacon.name = "hub_beacon";
  beacon.position.set(mastX, MAST_TOP, mastZ);
  group.add(beacon);
}

/** Pipework running from the service wing down into the pad. */
function addPipework(group: THREE.Group): void {
  const pipe = new THREE.Mesh(
    createPipeGeometry(
      [
        new THREE.Vector3(0.5, 0.78, -0.5),
        new THREE.Vector3(0.86, 0.72, -0.5),
        new THREE.Vector3(0.86, 0.3, -0.5),
        new THREE.Vector3(0.86, 0.2, -0.2),
      ],
      0.05,
    ),
    createSteelMaterial(PALETTE.brass),
  );
  group.add(pipe);
}

export function createHubModel(): THREE.Group {
  const group = new THREE.Group();
  group.name = "hub_model";

  addFoundation(group);
  addControlBlock(group);
  addServiceWing(group);
  addMast(group);
  addPipework(group);

  enableShadows(group);

  return group;
}
