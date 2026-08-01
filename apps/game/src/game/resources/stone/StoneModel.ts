import * as THREE from "three";
import {
  ITEM_PALETTE,
  createStoneMaterial,
} from "../../visuals/materials/ResourceMaterials";
import { createSeedStream } from "../../utils/SeededRandom";
import { createChunkGeometry } from "../models/ChunkGeometry";

/**
 * STONE PILE
 *
 * Three to five broken chunks laid out in a ring around the tile centre.
 *
 * Two things changed from the version this replaces. The chunks are chipped
 * icosahedra instead of smooth ones, so they read as fractured rock rather than
 * as dice; and they use two flat-shaded PBR tones instead of a 256x256 canvas
 * texture generated *per item model* — that texture cost a canvas allocation
 * every time a belt picked up a stone, and made the model impossible to build
 * outside a browser.
 */

const CHUNK_COUNT = 5;
const CHUNK_RADIUS = 0.1;

/**
 * Creates the pool of chunks. All five exist up front; the seed decides how
 * many are shown, so no geometry is built per frame.
 */
export function createStoneItemModel(): THREE.Group {
  const group = new THREE.Group();

  // Two shared tones: a pile of identically coloured rocks reads as one blob.
  const light = createStoneMaterial(ITEM_PALETTE.stoneLight);
  const dark = createStoneMaterial(ITEM_PALETTE.stoneDark);

  for (let i = 0; i < CHUNK_COUNT; i++) {
    // A distinct seed per chunk: the pile is built from five different rocks,
    // not from one rock shown five times.
    const geometry = createChunkGeometry(CHUNK_RADIUS, 1, 0.3, 5.1 + i * 3.3);
    const chunk = new THREE.Mesh(geometry, i % 2 === 0 ? light : dark);
    chunk.name = `chunk_${i}`;
    group.add(chunk);
  }

  updateStoneItemVisuals(group, 0);
  return group;
}

/**
 * Poses the pile deterministically from its item id.
 */
export function updateStoneItemVisuals(group: THREE.Group, seed: number): void {
  const random = createSeedStream(seed);
  const count = 3 + Math.floor(random() * (CHUNK_COUNT - 2)); // 3 to 5

  group.children.forEach((chunk, i) => {
    chunk.visible = i < count;
    if (!chunk.visible) return;

    // Spread around a ring rather than at free random positions: independent
    // draws regularly piled two chunks on the same spot and left a gap
    // elsewhere.
    const angle = ((i + random() * 0.6) / count) * Math.PI * 2;
    const distance = 0.045 + random() * 0.07;

    const scaleX = 0.75 + random() * 0.55;
    const scaleY = 0.6 + random() * 0.5;
    const scaleZ = 0.75 + random() * 0.55;

    chunk.scale.set(scaleX, scaleY, scaleZ);
    chunk.rotation.set(
      random() * Math.PI * 2,
      random() * Math.PI * 2,
      random() * Math.PI * 2,
    );
    // Bedded slightly into the surface (0.85 of the radius) so the chunks look
    // dropped rather than balanced on a point.
    chunk.position.set(
      Math.cos(angle) * distance,
      CHUNK_RADIUS * scaleY * 0.85,
      Math.sin(angle) * distance,
    );
  });
}
