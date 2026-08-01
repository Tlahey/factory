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
  createBoltRingGeometry,
  createPipeGeometry,
} from "../../visuals/helpers/DetailGeometry";

/**
 * The Extractor — a 1x1 mining derrick.
 *
 * ## Contract with `ExtractorView`
 *
 * - `drill_container` — the sliding assembly. The view drives
 *   `position.y = 1.2 + sin(t) * 0.4`, i.e. it travels between **0.8 and 1.6**.
 *   Everything below the container is sized so the bit just breaks ground at
 *   the bottom of that travel and clears it at the top.
 * - `drill_mesh` — spun on its own Y axis, so it must be radially symmetric
 *   about the container's vertical axis.
 *
 * ## What changed
 *
 * The old rig hung its drill at `x = 0.2` off a single mast, so the bit chewed
 * the ground next to the tile centre while the particle system spawned debris
 * at the centre. It is now a four-legged derrick with the bit on the axis, and
 * the whole thing is PBR instead of `MeshLambertMaterial`.
 */

/** Height of the derrick's head frame. */
const DERRICK_HEIGHT = 2.0;
/** Leg spread at the base and at the head frame — a taper reads as a derrick. */
const BASE_SPREAD = 0.36;
const TOP_SPREAD = 0.2;

/** Concrete pad, anchor bolts and hazard kerb. */
function addBase(group: THREE.Group): void {
  const pad = new THREE.Mesh(
    new THREE.CylinderGeometry(0.44, 0.46, 0.1, 12),
    createPaintedMaterial(PALETTE.concrete),
  );
  pad.position.y = 0.05;
  group.add(pad);

  const bolts = new THREE.Mesh(
    createBoltRingGeometry({ count: 8, radius: 0.38, boltRadius: 0.03 }),
    createSteelMaterial(),
  );
  bolts.position.y = 0.11;
  group.add(bolts);

  // Hazard ring marking the drilling area.
  const kerb = new THREE.Mesh(
    new THREE.TorusGeometry(0.42, 0.022, 6, 20),
    createHazardMaterial(),
  );
  kerb.rotation.x = Math.PI / 2;
  kerb.position.y = 0.11;
  group.add(kerb);
}

/** Four tapered legs with cross bracing, plus the head frame on top. */
function addDerrick(group: THREE.Group): void {
  const frameMat = createFrameMaterial();
  const braceMat = createDarkMetalMaterial();

  const corners: Array<[number, number]> = [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ];

  const baseY = 0.08;
  const rise = DERRICK_HEIGHT - baseY;
  const run = BASE_SPREAD - TOP_SPREAD;

  for (const [sx, sz] of corners) {
    // Each leg runs from the pad corner up to the head frame corner.
    const dx = -sx * run;
    const dz = -sz * run;
    const length = Math.sqrt(dx * dx + rise * rise + dz * dz);

    const leg = new THREE.Mesh(
      new THREE.BoxGeometry(0.055, length, 0.055),
      frameMat,
    );
    leg.position.set(
      sx * (BASE_SPREAD + TOP_SPREAD) * 0.5,
      baseY + rise / 2,
      sz * (BASE_SPREAD + TOP_SPREAD) * 0.5,
    );
    // Euler angles that tip the box's local +Y onto the leg axis. With the
    // default XYZ order the Z rotation is applied first, so it accounts for the
    // X lean and the X rotation for the Z lean.
    leg.rotation.set(Math.atan2(dz, rise), 0, -Math.asin(dx / length));
    group.add(leg);
  }

  // Horizontal bracing rings at two heights — this is what makes it read as a
  // lattice tower instead of four sticks.
  for (const [height, t] of [
    [0.7, 0.31],
    [1.4, 0.7],
  ] as const) {
    const spread = THREE.MathUtils.lerp(BASE_SPREAD, TOP_SPREAD, t);
    for (const axis of ["x", "z"] as const) {
      for (const side of [-1, 1]) {
        const brace = new THREE.Mesh(
          new THREE.BoxGeometry(spread * 2, 0.03, 0.03),
          braceMat,
        );
        if (axis === "x") {
          brace.position.set(0, height, side * spread);
        } else {
          brace.position.set(side * spread, height, 0);
          brace.rotation.y = Math.PI / 2;
        }
        group.add(brace);
      }
    }
  }

  // Head frame: the deck the hoist hangs from.
  const head = new THREE.Mesh(
    new THREE.BoxGeometry(TOP_SPREAD * 2.4, 0.08, TOP_SPREAD * 2.4),
    frameMat,
  );
  head.position.y = DERRICK_HEIGHT + 0.04;
  group.add(head);

  // Crown block: two sheaves the drill line runs over.
  const sheaveGeo = new THREE.TorusGeometry(0.07, 0.02, 6, 14);
  const sheaveMat = createSteelMaterial();
  for (const side of [-1, 1]) {
    const sheave = new THREE.Mesh(sheaveGeo, sheaveMat);
    sheave.rotation.y = Math.PI / 2;
    sheave.position.set(side * 0.1, DERRICK_HEIGHT + 0.14, 0);
    group.add(sheave);
  }
}

/** Hydraulic power pack bolted to one leg, plus its hose run. */
function addPowerPack(group: THREE.Group): void {
  const pack = new THREE.Mesh(
    new THREE.BoxGeometry(0.24, 0.3, 0.2),
    createPaintedMaterial(PALETTE.hazard),
  );
  pack.position.set(0.36, 0.32, -0.3);
  group.add(pack);

  const cooler = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.06, 0.18, 10),
    createSteelMaterial(),
  );
  cooler.rotation.z = Math.PI / 2;
  cooler.position.set(0.36, 0.52, -0.3);
  group.add(cooler);

  // Hose from the pack up to the head frame.
  const hose = new THREE.Mesh(
    createPipeGeometry(
      [
        new THREE.Vector3(0.36, 0.46, -0.24),
        new THREE.Vector3(0.3, 1.0, -0.16),
        new THREE.Vector3(0.22, 1.7, -0.14),
        new THREE.Vector3(0.14, DERRICK_HEIGHT - 0.05, -0.1),
      ],
      0.028,
    ),
    createDarkMetalMaterial(),
  );
  group.add(hose);
}

/**
 * The sliding drill assembly.
 *
 * Sized against the view's 0.8 → 1.6 travel: the bit reaches y ≈ -0.05 (just
 * into the ground, where the debris particles spawn) at the bottom of the
 * stroke and lifts clear at the top.
 */
function createDrillAssembly(): THREE.Group {
  const container = new THREE.Group();
  container.name = "drill_container";
  container.position.y = 1.2;

  // Gearbox housing riding the derrick.
  const housing = new THREE.Mesh(
    new THREE.BoxGeometry(0.3, 0.22, 0.3),
    createPaintedMaterial(PALETTE.hazard),
  );
  container.add(housing);

  // Motor on top, with a bolted flange.
  const motor = new THREE.Mesh(
    new THREE.CylinderGeometry(0.11, 0.13, 0.16, 12),
    createFrameMaterial(),
  );
  motor.position.y = 0.18;
  container.add(motor);

  const flange = new THREE.Mesh(
    createBoltRingGeometry({ count: 6, radius: 0.1, boltRadius: 0.02 }),
    createSteelMaterial(),
  );
  flange.position.y = 0.27;
  container.add(flange);

  // Guide shoes gripping the front and back legs.
  const shoeMat = createDarkMetalMaterial();
  for (const sz of [-1, 1]) {
    const shoe = new THREE.Mesh(
      new THREE.BoxGeometry(0.36, 0.1, 0.06),
      shoeMat,
    );
    shoe.position.set(0, 0, sz * 0.19);
    container.add(shoe);
  }

  container.add(createDrillBit());

  return container;
}

/** Auger bit: shaft, helical flighting and a carbide tip. */
function createDrillBit(): THREE.Group {
  const bit = new THREE.Group();
  bit.name = "drill_mesh";

  const steelMat = createSteelMaterial();

  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.055, 0.075, 0.62, 10),
    steelMat,
  );
  shaft.position.y = -0.36;
  bit.add(shaft);

  // Helical flighting: a tube swept along a helix, so the auger actually looks
  // like it would move rock rather than being a smooth cone.
  const flightPoints: THREE.Vector3[] = [];
  const turns = 2.5;
  const steps = 40;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const angle = t * turns * Math.PI * 2;
    const radius = THREE.MathUtils.lerp(0.115, 0.075, t);
    flightPoints.push(
      new THREE.Vector3(
        Math.cos(angle) * radius,
        -0.1 - t * 0.55,
        Math.sin(angle) * radius,
      ),
    );
  }
  const flighting = new THREE.Mesh(
    createPipeGeometry(flightPoints, 0.022, 6),
    steelMat,
  );
  bit.add(flighting);

  const tip = new THREE.Mesh(
    new THREE.ConeGeometry(0.075, 0.2, 10),
    createSteelMaterial(PALETTE.darkMetal),
  );
  tip.position.y = -0.76;
  tip.rotation.x = Math.PI; // point down
  bit.add(tip);

  return bit;
}

export function createExtractorModel(): THREE.Group {
  const group = new THREE.Group();
  group.name = "extractor_model";

  addBase(group);
  addDerrick(group);
  addPowerPack(group);
  group.add(createDrillAssembly());

  enableShadows(group);

  return group;
}
