import * as THREE from "three";
import {
  PALETTE,
  createDarkMetalMaterial,
  createFrameMaterial,
  createHazardMaterial,
  createPaintedMaterial,
  createSteelMaterial,
  createWoodMaterial,
  enableShadows,
} from "../../visuals/materials/BuildingMaterials";
import {
  createBoltRingGeometry,
  createLouverGeometry,
  createSawTeethGeometry,
} from "../../visuals/helpers/DetailGeometry";

/**
 * The Sawmill — a 1x1 gantry rip saw.
 *
 * ## Contract with `SawmillView`
 *
 * - `saw_head` — the carriage. The view drives `position.x = sin(t) * 0.25`, so
 *   it travels **along X** and its Y/Z must be baked into the model.
 * - `saw_blade` — spun on Y, so the blade is horizontal.
 *
 * ## What changed
 *
 * The rails used to run along **Z** while the carriage slid along **X**: the
 * head travelled sideways across its own rails. They now run along the travel
 * axis, the carriage hangs from a gantry, and there is a log on the deck for it
 * to actually cut. `SAWMILL_CONFIG` outputs on `front`, which is `-Z` in the
 * base frame, so the discharge chute is on that face.
 *
 * The 24 saw teeth used to be 24 separate meshes — 24 draw calls per sawmill.
 * They are now one merged geometry (`createSawTeethGeometry`).
 */

/** Height of the gantry rails the carriage hangs from. */
const RAIL_Y = 0.5;
/** Half-distance between the two rails. */
const RAIL_SPREAD = 0.28;
/** Half-length of the deck along the travel axis. */
const DECK_HALF = 0.44;
/**
 * Bounded by the carriage's travel: the view slides the head to x = ±0.25, so
 * the blade, its teeth and its guard all have to fit within 0.5 - 0.25 of the
 * head's own axis or they overhang the neighbouring tile at the end of a pass.
 */
const BLADE_RADIUS = 0.2;

/** Skid beams, cross ties and the hazard-marked deck edge. */
function addDeck(group: THREE.Group): void {
  const frameMat = createFrameMaterial();
  const darkMat = createDarkMetalMaterial();

  // Longitudinal skids, outboard of the rails.
  for (const sz of [-1, 1]) {
    const skid = new THREE.Mesh(
      new THREE.BoxGeometry(DECK_HALF * 2, 0.08, 0.1),
      frameMat,
    );
    skid.position.set(0, 0.04, sz * 0.36);
    group.add(skid);
  }

  // Cross ties.
  for (const sx of [-1, 0, 1]) {
    const tie = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.06, 0.8), darkMat);
    tie.position.set(sx * 0.3, 0.03, 0);
    group.add(tie);
  }

  // Hazard strip along the operator side.
  const strip = new THREE.Mesh(
    new THREE.BoxGeometry(DECK_HALF * 2, 0.03, 0.06),
    createHazardMaterial(),
  );
  strip.position.set(0, 0.09, -0.42);
  group.add(strip);
}

/** Four posts carrying the two rails the carriage rides. */
function addGantry(group: THREE.Group): void {
  const frameMat = createFrameMaterial();
  const steelMat = createSteelMaterial();

  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const post = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, RAIL_Y, 0.06),
        frameMat,
      );
      post.position.set(sx * DECK_HALF, RAIL_Y / 2, sz * RAIL_SPREAD);
      group.add(post);
    }
  }

  // Rails, running along the travel axis.
  for (const sz of [-1, 1]) {
    const rail = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.025, DECK_HALF * 2, 8),
      steelMat,
    );
    rail.rotation.z = Math.PI / 2;
    rail.position.set(0, RAIL_Y, sz * RAIL_SPREAD);
    group.add(rail);
  }

  // End stops, so the carriage looks like it can't run off the rails.
  for (const sx of [-1, 1]) {
    const stop = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.1, RAIL_SPREAD * 2 + 0.1),
      createHazardMaterial(),
    );
    stop.position.set(sx * DECK_HALF, RAIL_Y, 0);
    group.add(stop);
  }
}

/** The log being cut, resting in two cradle blocks. */
function addLogDeck(group: THREE.Group): void {
  const cradleMat = createDarkMetalMaterial();
  for (const sx of [-1, 1]) {
    const cradle = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.14, 0.26),
      cradleMat,
    );
    cradle.position.set(sx * 0.32, 0.14, 0);
    group.add(cradle);
  }

  // Log lies along the travel axis: the carriage rips it end to end.
  const log = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.1, 0.72, 10),
    createWoodMaterial(0x9a6a3a),
  );
  log.rotation.z = Math.PI / 2;
  log.position.set(0, 0.21, 0);
  group.add(log);

  // Cut end, exposing paler heartwood.
  const cutEnd = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.1, 0.02, 10),
    createWoodMaterial(0xd8b98a),
  );
  cutEnd.rotation.z = Math.PI / 2;
  cutEnd.position.set(-0.37, 0.21, 0);
  group.add(cutEnd);
}

/** `-Z` face: plank discharge chute and the sawdust bin beside it. */
function addOutput(group: THREE.Group): void {
  const chute = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.02, 0.24),
    createSteelMaterial(),
  );
  chute.rotation.x = -0.35;
  chute.position.set(0, 0.16, -0.37);
  group.add(chute);

  // Side walls, so it reads as a chute rather than a flap.
  const wallMat = createDarkMetalMaterial();
  for (const sx of [-1, 1]) {
    const wall = new THREE.Mesh(
      new THREE.BoxGeometry(0.02, 0.1, 0.24),
      wallMat,
    );
    wall.rotation.x = -0.35;
    wall.position.set(sx * 0.25, 0.2, -0.37);
    group.add(wall);
  }

  const bin = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.22, 0.18),
    createPaintedMaterial(PALETTE.rust),
  );
  bin.position.set(0.34, 0.19, -0.38);
  group.add(bin);
}

/** Control box on a stalk, next to the operator side. */
function addControlBox(group: THREE.Group): void {
  const stalk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.02, 0.34, 6),
    createSteelMaterial(),
  );
  stalk.position.set(-0.36, 0.17, -0.36);
  group.add(stalk);

  const box = new THREE.Mesh(
    new THREE.BoxGeometry(0.16, 0.18, 0.08),
    createPaintedMaterial(PALETTE.hazard),
  );
  box.position.set(-0.36, 0.42, -0.36);
  group.add(box);

  const vents = new THREE.Mesh(
    createLouverGeometry({ count: 3, width: 0.1, height: 0.09, depth: 0.02 }),
    createDarkMetalMaterial(),
  );
  vents.position.set(-0.36, 0.42, -0.41);
  group.add(vents);
}

/**
 * The carriage: motor, spindle, blade and guard.
 *
 * Positioned at the rail height; the view only overwrites `position.x`, so the
 * Y and Z baked in here are preserved.
 */
function createSawHead(): THREE.Group {
  const head = new THREE.Group();
  head.name = "saw_head";
  head.position.set(0, RAIL_Y, 0);

  const frameMat = createFrameMaterial();
  const steelMat = createSteelMaterial();

  // Carriage plate spanning the two rails.
  const plate = new THREE.Mesh(
    new THREE.BoxGeometry(0.24, 0.05, RAIL_SPREAD * 2 + 0.12),
    frameMat,
  );
  head.add(plate);

  // Roller blocks gripping each rail.
  for (const sz of [-1, 1]) {
    const roller = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 0.06, 10),
      createDarkMetalMaterial(),
    );
    roller.rotation.x = Math.PI / 2;
    roller.position.set(0, 0.045, sz * RAIL_SPREAD);
    head.add(roller);
  }

  // Motor sitting on the carriage, driving the spindle below.
  const motor = new THREE.Mesh(
    new THREE.CylinderGeometry(0.075, 0.075, 0.16, 12),
    createPaintedMaterial(PALETTE.hazard),
  );
  motor.rotation.z = Math.PI / 2;
  motor.position.set(0, 0.13, 0);
  head.add(motor);

  const motorFlange = new THREE.Mesh(
    createBoltRingGeometry({
      count: 6,
      radius: 0.06,
      boltRadius: 0.016,
      axis: "x",
    }),
    steelMat,
  );
  motorFlange.position.set(0.08, 0.13, 0);
  head.add(motorFlange);

  // Spindle down to the blade.
  const spindle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.03, 0.26, 8),
    steelMat,
  );
  spindle.position.y = -0.14;
  head.add(spindle);

  head.add(createBlade());

  // Guard covering the back half of the blade — a bare spinning blade at head
  // height reads as unfinished, and it hides the teeth from the camera side.
  const guard = new THREE.Mesh(
    new THREE.CylinderGeometry(
      BLADE_RADIUS + 0.04,
      BLADE_RADIUS + 0.04,
      0.07,
      16,
      1,
      false,
      0,
      Math.PI,
    ),
    createPaintedMaterial(PALETTE.frame),
  );
  guard.position.y = -0.24;
  head.add(guard);

  return head;
}

/** Horizontal blade with merged teeth, spun by the view on its Y axis. */
function createBlade(): THREE.Group {
  const blade = new THREE.Group();
  blade.name = "saw_blade";
  blade.position.y = -0.28;

  const bladeMat = createSteelMaterial(0xd8dde2);

  const disc = new THREE.Mesh(
    new THREE.CylinderGeometry(BLADE_RADIUS, BLADE_RADIUS, 0.02, 32),
    bladeMat,
  );
  blade.add(disc);

  const teeth = new THREE.Mesh(
    createSawTeethGeometry({ count: 24, radius: BLADE_RADIUS, size: 0.04 }),
    bladeMat,
  );
  blade.add(teeth);

  // Arbor collar at the centre.
  const collar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.05, 0.04, 10),
    createDarkMetalMaterial(),
  );
  collar.position.y = 0.02;
  blade.add(collar);

  return blade;
}

export function createSawmillModel(): THREE.Group {
  const group = new THREE.Group();
  group.name = "sawmill_model";

  addDeck(group);
  addGantry(group);
  addLogDeck(group);
  addOutput(group);
  addControlBox(group);
  group.add(createSawHead());

  enableShadows(group);

  return group;
}

export function getSawBlade(model: THREE.Group): THREE.Object3D | undefined {
  return model.getObjectByName("saw_blade");
}

export function getSawHead(model: THREE.Group): THREE.Object3D | undefined {
  return model.getObjectByName("saw_head");
}
