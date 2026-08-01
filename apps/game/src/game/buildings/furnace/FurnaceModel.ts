import * as THREE from "three";
import {
  PALETTE,
  createConcreteMaterial,
  createDarkMetalMaterial,
  createEmissiveMaterial,
  createFrameMaterial,
  createHazardMaterial,
  createPaintedMaterial,
  createStatusLightMaterial,
  createSteelMaterial,
  enableShadows,
} from "../../visuals/materials/BuildingMaterials";
import {
  createBoltRingGeometry,
  createLadderGeometry,
  createLouverGeometry,
  createPipeGeometry,
  createRivetRowGeometry,
} from "../../visuals/helpers/DetailGeometry";

/**
 * The Furnace — a 1x2 smelter: charging tower at the back, casting pool at the
 * front, power hammer swinging between them.
 *
 * ## Orientation (this was wrong before)
 *
 * Models are authored facing north, and north is `-Z`, so in the base frame
 * **`front` is `-Z` and `back` is `+Z`** (`getPortLocalPosition`).
 * `FURNACE_CONFIG` declares `inputSide: "back"` and `outputSide: "front"`.
 *
 * The old model had it backwards: the tower and the part labelled "input" sat
 * at `-Z` (the output face) while the lava pool and the part labelled "output"
 * sat at `+Z`. `FurnaceView` spawns smoke at `centre + front * 0.5`, i.e. over
 * `-Z`, with the comment "above the lava pool" — so the smoke was rising off
 * the wrong half of the building. Tower and pool are now swapped to match.
 *
 * ## Contract with `FurnaceView`
 *
 * - `core_mesh` — the molten surface. Must be a `MeshStandardMaterial`; the
 *   view pulses its `emissiveIntensity`.
 * - `hammer_pivot` — swung on X between `-0.5` (struck) and `0.5` (raised),
 *   resting at `-0.4`. The head hangs forward and down from the pivot so that
 *   arc lands it on the pool.
 * - `status_light` — a `MeshBasicMaterial`; the view reads/writes `color`.
 */

/** Local Z of the two tile centres: front (output) and back (input). */
const FRONT_Z = -0.5;
const BACK_Z = 0.5;
/** Top of the charging tower. */
const TOWER_TOP = 2.4;
/** Height of the molten surface. */
const POOL_SURFACE_Y = 0.72;

/** Foundation slab spanning both tiles. */
function addFoundation(group: THREE.Group): void {
  const slab = new THREE.Mesh(
    new THREE.BoxGeometry(0.95, 0.2, 1.95),
    createConcreteMaterial(),
  );
  slab.position.y = 0.1;
  group.add(slab);

  // Hazard kerb on the output face.
  const kerb = new THREE.Mesh(
    new THREE.BoxGeometry(0.95, 0.05, 0.08),
    createHazardMaterial(),
  );
  kerb.position.set(0, 0.22, -0.94);
  group.add(kerb);
}

/** Back half: the charging tower, its hopper, stack and access ladder. */
function addTower(group: THREE.Group): void {
  const shellMat = createPaintedMaterial(PALETTE.rust);
  const frameMat = createFrameMaterial();
  const steelMat = createSteelMaterial();

  const shell = new THREE.Mesh(
    new THREE.BoxGeometry(0.86, TOWER_TOP - 0.2, 0.86),
    shellMat,
  );
  shell.position.set(0, 0.2 + (TOWER_TOP - 0.2) / 2, BACK_Z);
  group.add(shell);

  // Reinforcement bands, which is what makes the shell read as riveted plate.
  for (const y of [0.75, 1.5, 2.15]) {
    const band = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.07, 0.9),
      frameMat,
    );
    band.position.set(0, y, BACK_Z);
    group.add(band);
  }

  // Rivet seams on the two side walls.
  for (const sx of [-1, 1]) {
    const rivets = new THREE.Mesh(
      createRivetRowGeometry({
        count: 7,
        from: new THREE.Vector3(sx * 0.44, 0.5, BACK_Z - 0.34),
        to: new THREE.Vector3(sx * 0.44, 0.5, BACK_Z + 0.34),
        axis: "x",
      }),
      steelMat,
    );
    group.add(rivets);
  }

  // Charging hopper on the input face (+Z): a funnel taking ore off the belt.
  // Kept inside the tile: anything poking past z = 1 would overlap the belt
  // feeding it.
  const hopper = new THREE.Mesh(
    new THREE.CylinderGeometry(0.26, 0.14, 0.34, 8),
    frameMat,
  );
  hopper.position.set(0, 1.0, BACK_Z + 0.22);
  group.add(hopper);

  const hopperRim = new THREE.Mesh(
    createBoltRingGeometry({ count: 8, radius: 0.24, boltRadius: 0.025 }),
    steelMat,
  );
  hopperRim.position.set(0, 1.17, BACK_Z + 0.22);
  group.add(hopperRim);

  // Feed throat back into the shell.
  const throat = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.22, 0.24),
    createDarkMetalMaterial(),
  );
  throat.position.set(0, 0.9, BACK_Z + 0.34);
  group.add(throat);

  // Exhaust stack.
  const stack = new THREE.Mesh(
    new THREE.CylinderGeometry(0.11, 0.14, 0.5, 10),
    createDarkMetalMaterial(),
  );
  stack.position.set(0.24, TOWER_TOP + 0.05, BACK_Z + 0.2);
  group.add(stack);

  const stackCap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.17, 0.11, 0.09, 10),
    frameMat,
  );
  stackCap.position.set(0.24, TOWER_TOP + 0.34, BACK_Z + 0.2);
  group.add(stackCap);

  // Cooling vents.
  const vents = new THREE.Mesh(
    createLouverGeometry({ count: 5, width: 0.4, height: 0.4, depth: 0.04 }),
    createDarkMetalMaterial(),
  );
  vents.rotation.y = Math.PI / 2;
  vents.position.set(-0.45, 1.75, BACK_Z);
  group.add(vents);

  // Access ladder.
  const ladder = new THREE.Mesh(
    createLadderGeometry({ height: TOWER_TOP - 0.1 }),
    steelMat,
  );
  ladder.rotation.y = Math.PI / 2;
  ladder.position.set(0.46, 0.2, BACK_Z + 0.05);
  group.add(ladder);

  // Status beacon on the roof.
  const light = new THREE.Mesh(
    new THREE.SphereGeometry(0.11, 12, 10),
    createStatusLightMaterial(0x888888),
  );
  light.name = "status_light";
  light.position.set(-0.2, TOWER_TOP + 0.12, BACK_Z);
  group.add(light);

  // Beacon post.
  const post = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.025, 0.16, 6),
    steelMat,
  );
  post.position.set(-0.2, TOWER_TOP + 0.02, BACK_Z);
  group.add(post);
}

/** Front half: refractory basin, molten surface and the pour spout. */
function addCastingPool(group: THREE.Group): void {
  // Basin walls, built as four slabs so the pool is genuinely open on top
  // instead of a lid with a plane floating over it.
  const wallMat = createPaintedMaterial(0x4a4038);
  const wallHeight = 0.62;
  const wallY = 0.2 + wallHeight / 2;

  for (const sx of [-1, 1]) {
    const wall = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, wallHeight, 0.9),
      wallMat,
    );
    wall.position.set(sx * 0.4, wallY, FRONT_Z);
    group.add(wall);
  }
  for (const sz of [-1, 1]) {
    const wall = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, wallHeight, 0.1),
      wallMat,
    );
    wall.position.set(0, wallY, FRONT_Z + sz * 0.4);
    group.add(wall);
  }

  // Basin floor.
  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.08, 0.9),
    createDarkMetalMaterial(),
  );
  floor.position.set(0, 0.24, FRONT_Z);
  group.add(floor);

  // Molten surface. Named + emissive: the view pulses `emissiveIntensity`.
  const core = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.04, 0.7),
    createEmissiveMaterial(PALETTE.molten, 1.5),
  );
  core.name = "core_mesh";
  core.position.set(0, POOL_SURFACE_Y, FRONT_Z);
  group.add(core);

  // Glowing slag crust: breaks the flat orange square into something molten.
  const crustMat = createEmissiveMaterial(0x7a2a10, 0.5);
  for (const [x, z, size] of [
    [-0.2, -0.18, 0.16],
    [0.18, 0.1, 0.2],
    [0.05, -0.24, 0.12],
  ] as const) {
    const crust = new THREE.Mesh(
      new THREE.BoxGeometry(size, 0.05, size),
      crustMat,
    );
    crust.position.set(x, POOL_SURFACE_Y + 0.01, FRONT_Z + z);
    crust.rotation.y = x + z;
    group.add(crust);
  }

  // Pour spout on the output face (-Z), tilted down toward the belt.
  const spout = new THREE.Mesh(
    new THREE.BoxGeometry(0.34, 0.06, 0.26),
    createSteelMaterial(),
  );
  spout.rotation.x = -0.4;
  spout.position.set(0, 0.6, FRONT_Z - 0.33);
  group.add(spout);

  for (const sx of [-1, 1]) {
    const lip = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.12, 0.26),
      createHazardMaterial(),
    );
    lip.rotation.x = -0.4;
    lip.position.set(sx * 0.17, 0.64, FRONT_Z - 0.33);
    group.add(lip);
  }
}

/** Hot-metal pipework linking the tower to the pool. */
function addPipework(group: THREE.Group): void {
  const pipe = new THREE.Mesh(
    createPipeGeometry(
      [
        new THREE.Vector3(-0.36, 1.3, BACK_Z - 0.4),
        new THREE.Vector3(-0.42, 1.15, 0.0),
        new THREE.Vector3(-0.42, 0.85, FRONT_Z + 0.2),
        new THREE.Vector3(-0.36, 0.78, FRONT_Z),
      ],
      0.06,
    ),
    createSteelMaterial(PALETTE.brass),
  );
  group.add(pipe);
}

/**
 * Power hammer.
 *
 * The pivot sits between the two halves; the arm reaches forward over the pool
 * so the view's X rotation drops the head onto the melt.
 */
function createHammer(): THREE.Group {
  const pivot = new THREE.Group();
  pivot.name = "hammer_pivot";
  pivot.position.set(0, 1.65, 0.15);
  pivot.rotation.x = -0.4; // resting pose, matching the view's idle value

  const arm = new THREE.Mesh(
    new THREE.BoxGeometry(0.16, 0.16, 1.0),
    createFrameMaterial(),
  );
  arm.position.set(0, 0, -0.45);
  pivot.add(arm);

  // Counterweight behind the pivot.
  const counterweight = new THREE.Mesh(
    new THREE.CylinderGeometry(0.13, 0.13, 0.2, 10),
    createDarkMetalMaterial(),
  );
  counterweight.rotation.z = Math.PI / 2;
  counterweight.position.set(0, 0, 0.2);
  pivot.add(counterweight);

  const head = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, 0.55, 0.4),
    createSteelMaterial(0x5a5f66),
  );
  head.position.set(0, -0.35, -0.92);
  pivot.add(head);

  // Hardened striking face.
  const face = new THREE.Mesh(
    new THREE.BoxGeometry(0.44, 0.06, 0.44),
    createSteelMaterial(),
  );
  face.position.set(0, -0.63, -0.92);
  pivot.add(face);

  return pivot;
}

/** Frame carrying the hammer pivot. */
function addHammerFrame(group: THREE.Group): void {
  const frameMat = createFrameMaterial();
  for (const sx of [-1, 1]) {
    const column = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.55, 0.08),
      frameMat,
    );
    column.position.set(sx * 0.3, 1.5, 0.15);
    group.add(column);
  }

  const yoke = new THREE.Mesh(
    new THREE.BoxGeometry(0.76, 0.09, 0.14),
    frameMat,
  );
  yoke.position.set(0, 1.78, 0.15);
  group.add(yoke);
}

export function createFurnaceModel(): THREE.Group {
  const group = new THREE.Group();
  group.name = "furnace_model";

  addFoundation(group);
  addTower(group);
  addCastingPool(group);
  addPipework(group);
  addHammerFrame(group);
  group.add(createHammer());

  enableShadows(group);

  return group;
}
