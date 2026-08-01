import * as THREE from "three";
import { injectCloudShadows } from "../../visuals/shaders/CloudShadowPatcher";
import {
  PALETTE,
  createDarkMetalMaterial,
  createFrameMaterial,
  createPaintedMaterial,
  createStatusLightMaterial,
  createSteelMaterial,
  enableShadows,
} from "../../visuals/materials/BuildingMaterials";
import {
  createBoltRingGeometry,
  createPipeGeometry,
  createRivetRowGeometry,
} from "../../visuals/helpers/DetailGeometry";

/**
 * The Solar Panel — a 1x1 ballasted tilt-frame array.
 *
 * ## Contract with `SolarPanelView`
 *
 * - `solar_cell` — every cell mesh. The view lerps their `emissive` /
 *   `emissiveIntensity` with the sunlight level, so they must share a
 *   `MeshStandardMaterial`.
 * - `status_light` — a `MeshBasicMaterial`; the view writes `color` directly.
 * - Non-preview instances get `injectCloudShadows` on **every** standard
 *   material, because the view walks the whole model looking for
 *   `material.userData.shader` to advance `uTime`.
 *
 * ## What changed
 *
 * The array was tilted 45° — steep enough to read as a billboard — on a plate
 * (0.9) wider than the stand holding it (0.8), edged with flat cyan
 * `MeshBasicMaterial` strips. It is now a 30° tilt on a proper torque tube
 * between two ballast blocks, with a junction box and conduit. The
 * `console.log` that fired on every instantiation is gone.
 */

/** Tilt measured from horizontal. 30° is the usual fixed-array angle. */
const TILT = Math.PI / 6;
/** Height of the torque tube above the pad. */
const TUBE_Y = 0.44;
const PANEL_WIDTH = 0.82;
const PANEL_DEPTH = 0.78;

/** Two concrete ballast blocks and the pad between them. */
function addBallast(group: THREE.Group, materials: THREE.Material[]): void {
  const blockMat = createPaintedMaterial(PALETTE.concrete);
  materials.push(blockMat);

  for (const sx of [-1, 1]) {
    const block = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.12, 0.6),
      blockMat,
    );
    block.position.set(sx * 0.32, 0.06, 0);
    group.add(block);
  }

  const tie = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.12), blockMat);
  tie.position.set(0, 0.025, 0);
  group.add(tie);
}

/** A-frame legs plus the torque tube the array pivots on. */
function addStand(group: THREE.Group, materials: THREE.Material[]): void {
  const frameMat = createFrameMaterial();
  const steelMat = createSteelMaterial();
  materials.push(frameMat, steelMat);

  for (const sx of [-1, 1]) {
    // Rear (tall) leg.
    const rear = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, TUBE_Y, 0.05),
      frameMat,
    );
    rear.position.set(sx * 0.32, TUBE_Y / 2, -0.18);
    group.add(rear);

    // Front strut, braced back to the tube: the "A" of the A-frame.
    const strutLength = 0.42;
    const strut = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, strutLength, 0.04),
      frameMat,
    );
    strut.position.set(sx * 0.32, TUBE_Y / 2 - 0.02, 0.06);
    strut.rotation.x = -0.6;
    group.add(strut);
  }

  const tube = new THREE.Mesh(
    new THREE.CylinderGeometry(0.032, 0.032, 0.72, 10),
    steelMat,
  );
  tube.rotation.z = Math.PI / 2;
  tube.position.set(0, TUBE_Y, -0.1);
  group.add(tube);

  // Pivot flanges at each end of the tube.
  for (const sx of [-1, 1]) {
    const flange = new THREE.Mesh(
      createBoltRingGeometry({
        count: 6,
        radius: 0.045,
        boltRadius: 0.014,
        axis: "x",
      }),
      steelMat,
    );
    flange.position.set(sx * 0.3, TUBE_Y, -0.1);
    group.add(flange);
  }
}

/**
 * The tilted array: frame rails, cells, busbars and the junction box.
 *
 * Built inside a group rotated about X. At `rotation.x = -PI/2` the panel would
 * be flat, so the tilt from horizontal is `PI/2 - |rotation.x|`.
 */
function createArray(materials: THREE.Material[]): THREE.Group {
  const array = new THREE.Group();
  array.position.set(0, TUBE_Y + 0.03, -0.1);
  array.rotation.x = -(Math.PI / 2 - TILT);

  const frameMat = createFrameMaterial();
  const cellMat = new THREE.MeshStandardMaterial({
    color: PALETTE.photovoltaic,
    // Glass-over-silicon: smooth, but not a mirror.
    roughness: 0.15,
    metalness: 0.55,
    emissive: 0x000033,
    emissiveIntensity: 0.2,
  });
  const busbarMat = createSteelMaterial(0xdfe3e8);
  materials.push(frameMat, cellMat, busbarMat);

  // Backing sheet.
  const backing = new THREE.Mesh(
    new THREE.BoxGeometry(PANEL_WIDTH, PANEL_DEPTH, 0.035),
    frameMat,
  );
  backing.position.z = -0.02;
  array.add(backing);

  // Frame rails around the edge — the aluminium extrusion of a real module.
  const railMat = createSteelMaterial(0xb8bec6);
  materials.push(railMat);
  for (const sx of [-1, 1]) {
    const rail = new THREE.Mesh(
      new THREE.BoxGeometry(0.035, PANEL_DEPTH + 0.03, 0.06),
      railMat,
    );
    rail.position.set((sx * (PANEL_WIDTH + 0.035)) / 2, 0, 0.01);
    array.add(rail);
  }
  for (const sy of [-1, 1]) {
    const rail = new THREE.Mesh(
      new THREE.BoxGeometry(PANEL_WIDTH + 0.07, 0.035, 0.06),
      railMat,
    );
    rail.position.set(0, (sy * (PANEL_DEPTH + 0.035)) / 2, 0.01);
    array.add(rail);
  }

  // 2x2 cell grid.
  const cellW = 0.36;
  const cellH = 0.34;
  const gap = 0.035;
  const cellGeo = new THREE.BoxGeometry(cellW, cellH, 0.014);
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 2; col++) {
      const cell = new THREE.Mesh(cellGeo, cellMat);
      cell.name = "solar_cell";
      cell.position.set(
        (col === 0 ? -1 : 1) * (cellW / 2 + gap / 2),
        (row === 0 ? 1 : -1) * (cellH / 2 + gap / 2),
        0.012,
      );
      array.add(cell);
    }
  }

  // Busbars: the thin silver ribbons crossing the cells.
  for (const sx of [-1, 1]) {
    const busbar = new THREE.Mesh(
      new THREE.BoxGeometry(0.012, PANEL_DEPTH - 0.06, 0.004),
      busbarMat,
    );
    busbar.position.set(sx * 0.19, 0, 0.021);
    array.add(busbar);
  }
  const crossbar = new THREE.Mesh(
    new THREE.BoxGeometry(PANEL_WIDTH - 0.06, 0.012, 0.004),
    busbarMat,
  );
  crossbar.position.set(0, 0, 0.021);
  array.add(crossbar);

  // Rivet seam along the top rail.
  const rivets = new THREE.Mesh(
    createRivetRowGeometry({
      count: 7,
      from: new THREE.Vector3(-0.34, PANEL_DEPTH / 2, 0.045),
      to: new THREE.Vector3(0.34, PANEL_DEPTH / 2, 0.045),
      radius: 0.012,
      depth: 0.01,
    }),
    railMat,
  );
  array.add(rivets);

  return array;
}

/** Junction box, conduit down to the ground, and the status LED. */
function addElectrical(group: THREE.Group, materials: THREE.Material[]): void {
  const boxMat = createDarkMetalMaterial();
  const conduitMat = createSteelMaterial(PALETTE.brass);
  materials.push(boxMat, conduitMat);

  const box = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.08), boxMat);
  box.position.set(0.22, 0.3, -0.24);
  group.add(box);

  const conduit = new THREE.Mesh(
    createPipeGeometry(
      [
        new THREE.Vector3(0.22, 0.26, -0.24),
        new THREE.Vector3(0.28, 0.14, -0.22),
        new THREE.Vector3(0.3, 0.05, -0.1),
      ],
      0.022,
    ),
    conduitMat,
  );
  group.add(conduit);

  // Status LED on the junction box; the view drives its colour.
  const light = new THREE.Mesh(
    new THREE.SphereGeometry(0.035, 10, 8),
    createStatusLightMaterial(0x000000),
  );
  light.name = "status_light";
  light.position.set(0.22, 0.3, -0.19);
  group.add(light);
}

/**
 * @param isPreview Skip the cloud-shadow shader patch. The shop preview renders
 * in its own scene with no cloud uniforms driving it.
 */
export function createSolarPanelModel(isPreview: boolean = false): THREE.Group {
  const group = new THREE.Group();
  group.name = "solar_panel_model";

  // Materials are collected as they are created so the cloud-shadow patch can
  // be applied to all of them at once. Missing one leaves a patch of the panel
  // lit while the rest sits under a cloud.
  const materials: THREE.Material[] = [];

  addBallast(group, materials);
  addStand(group, materials);
  group.add(createArray(materials));
  addElectrical(group, materials);

  if (!isPreview) {
    for (const material of materials) {
      material.onBeforeCompile = injectCloudShadows;
    }
  }

  enableShadows(group);

  return group;
}
