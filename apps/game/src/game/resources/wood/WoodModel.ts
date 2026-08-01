import * as THREE from "three";
import {
  createBarkMaterial,
  createEndGrainMaterial,
} from "../../visuals/materials/ResourceMaterials";
import { createSeedStream } from "../../utils/SeededRandom";

/**
 * LOG BUNDLE
 *
 * Two to four cut logs, stacked the way logs actually stack: a bottom row
 * resting on the belt and one nestled in the groove above it.
 *
 * The previous version scattered logs at random offsets *and* random heights,
 * so the upper ones floated with nothing under them. Here the layout is a fixed
 * pyramid per log count and the seed only jitters yaw, length and roll.
 *
 * Each log is one mesh with two materials: `CylinderGeometry` emits three
 * groups (side, top cap, bottom cap), which lets the sawn faces be pale end
 * grain against dark bark — the contrast that makes a log read as a log at
 * belt scale.
 */

const LOG_RADIUS = 0.045;
const LOG_LENGTH = 0.18;
/** Centre-to-centre gap in the bottom row: logs just touching. */
const ROW_SPACING = LOG_RADIUS * 2;
/**
 * Height of a log nestled in the groove above two touching ones: the apex of
 * an equilateral triangle of side `ROW_SPACING`, lifted by one radius.
 */
const SECOND_ROW_Y =
  LOG_RADIUS + Math.sqrt(ROW_SPACING ** 2 - (ROW_SPACING / 2) ** 2);

const MAX_LOGS = 4;

/** Stack layouts as [z, y] per log, indexed by how many logs are shown. */
const LAYOUTS: Record<number, Array<[number, number]>> = {
  2: [
    [-LOG_RADIUS, LOG_RADIUS],
    [LOG_RADIUS, LOG_RADIUS],
  ],
  3: [
    [-LOG_RADIUS, LOG_RADIUS],
    [LOG_RADIUS, LOG_RADIUS],
    [0, SECOND_ROW_Y],
  ],
  4: [
    [-ROW_SPACING, LOG_RADIUS],
    [0, LOG_RADIUS],
    [ROW_SPACING, LOG_RADIUS],
    [-LOG_RADIUS, SECOND_ROW_Y],
  ],
};

/**
 * Creates the pool of logs. All four exist up front; `updateWoodItemVisuals`
 * hides the ones the seed doesn't use, so no geometry is built per frame.
 */
export function createWoodItemModel(): THREE.Group {
  const group = new THREE.Group();

  // One pair of materials for the whole bundle: four logs, two draw materials.
  const bark = createBarkMaterial();
  const endGrain = createEndGrainMaterial();

  for (let i = 0; i < MAX_LOGS; i++) {
    // Slightly tapered and slightly different per log — no two trunks are the
    // same width, and 8 sides is enough to read as round at this size.
    const radius = LOG_RADIUS * (0.9 + i * 0.05);
    const geometry = new THREE.CylinderGeometry(
      radius * 0.94,
      radius,
      LOG_LENGTH,
      8,
      1,
    );
    // Lay the log down along +X; the stack offsets then work in z.
    geometry.rotateZ(Math.PI / 2);

    const log = new THREE.Mesh(geometry, [bark, endGrain, endGrain]);
    log.name = `log_${i}`;
    group.add(log);
  }

  updateWoodItemVisuals(group, 0);
  return group;
}

/**
 * Poses the bundle deterministically from its item id.
 */
export function updateWoodItemVisuals(group: THREE.Group, seed: number): void {
  const random = createSeedStream(seed);
  const count = 2 + Math.floor(random() * 3); // 2, 3 or 4 logs
  const layout = LAYOUTS[count];

  group.children.forEach((log, i) => {
    log.visible = i < count;
    if (!log.visible) return;

    const [z, y] = layout[i];
    // Ends never line up perfectly in a real pile.
    const stagger = (random() - 0.5) * 0.03;

    log.position.set(stagger, y, z);
    // Yaw only jitters: a log rolled onto its end would fall over. Roll (x)
    // is free — it just turns the bark around the trunk.
    log.rotation.set(random() * Math.PI * 2, (random() - 0.5) * 0.25, 0);
    const length = 0.9 + random() * 0.15;
    log.scale.set(length, 1, 1);
  });
}
