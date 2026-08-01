import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import {
  createIngotMaterial,
  createIngotStampMaterial,
} from "../../visuals/materials/ResourceMaterials";
import { createSeedStream } from "../../utils/SeededRandom";

/**
 * INGOT
 *
 * A cast bar: wide at the base, drafted inwards on all four sides so it would
 * actually release from a mould, with a shoulder two thirds up and a foundry
 * mark stamped into the top face.
 *
 * The old model tapered only along its length — the ends stayed vertical, which
 * read as a squashed box from the isometric camera.
 *
 * The bar is authored at its final world size and shrunk by the root group's
 * 0.75 scale, exactly like the version it replaces:
 * 0.375 x 0.1125 x 0.1875 world units, sitting on y = 0.
 */

/** Authored footprint, before the root group's 0.75 scale. */
const LENGTH = 0.5;
const DEPTH = 0.25;
const HEIGHT = 0.15;
/** How much of the height the stamp is allowed to take. */
const STAMP_RELIEF = 0.006;

/**
 * Scales a geometry so its bounding box matches `size` exactly, then rests it
 * on y = 0 centred on x/z.
 *
 * Frusta are authored on a unit square and fitted here, so the finished bar's
 * dimensions are guaranteed regardless of how the draft angles are tuned.
 */
function fitToBox(geometry: THREE.BufferGeometry, size: THREE.Vector3): void {
  geometry.computeBoundingBox();
  const bounds = geometry.boundingBox!;
  const current = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());

  geometry.translate(-center.x, -bounds.min.y, -center.z);
  geometry.scale(size.x / current.x, size.y / current.y, size.z / current.z);
}

/**
 * A square frustum: a four-sided cone, turned so its faces are axis-aligned.
 */
function createDraftedBlock(
  bottomRadius: number,
  topRadius: number,
  height: number,
): THREE.BufferGeometry {
  const block = new THREE.CylinderGeometry(
    topRadius,
    bottomRadius,
    height,
    4,
    1,
  );
  // A 4-segment cylinder puts a corner on +X; a 45 degree turn puts a face
  // there instead, which is what makes it a bar rather than a diamond.
  block.rotateY(Math.PI / 4);
  return block;
}

function createBodyGeometry(): THREE.BufferGeometry {
  // Base -> shoulder -> top, with the draft getting steeper as it rises.
  const lower = createDraftedBlock(1.0, 0.9, 0.6);
  lower.translate(0, 0.3, 0);
  const upper = createDraftedBlock(0.9, 0.68, 0.34);
  upper.translate(0, 0.77, 0);
  // A shallow chamfer instead of a knife-edge rim on the top face.
  const rim = createDraftedBlock(0.68, 0.6, 0.06);
  rim.translate(0, 0.97, 0);

  const parts = [lower, upper, rim];
  const merged = mergeGeometries(parts, false);
  parts.forEach((part) => part.dispose());
  if (!merged) throw new Error("IngotModel: failed to merge the body geometry");

  fitToBox(merged, new THREE.Vector3(LENGTH, HEIGHT - STAMP_RELIEF, DEPTH));
  return merged;
}

/**
 * The foundry mark: two raised bars across the top face.
 *
 * Sunk slightly into the body so the two meshes never fight over the same
 * plane, and sized to stay inside the (drafted, therefore narrower) top face.
 */
function createStampGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const top = HEIGHT - STAMP_RELIEF;

  for (const z of [-0.035, 0.035]) {
    const bar = new THREE.BoxGeometry(0.16, STAMP_RELIEF * 2, 0.022);
    bar.translate(0, top, z);
    parts.push(bar);
  }

  const merged = mergeGeometries(parts, false);
  parts.forEach((part) => part.dispose());
  if (!merged)
    throw new Error("IngotModel: failed to merge the stamp geometry");
  return merged;
}

/**
 * Creates an ingot cast in `color`.
 */
export function createIngotModel(color: number): THREE.Group {
  const group = new THREE.Group();

  group.add(new THREE.Mesh(createBodyGeometry(), createIngotMaterial(color)));
  group.add(
    new THREE.Mesh(createStampGeometry(), createIngotStampMaterial(color)),
  );

  group.scale.set(0.75, 0.75, 0.75);
  return group;
}

/**
 * Spins the bar around its vertical axis so a queue of ingots isn't a queue of
 * identically aligned bars.
 */
export function updateIngotVisuals(group: THREE.Group, seed: number): void {
  group.rotation.y = createSeedStream(seed)() * Math.PI * 2;
}
