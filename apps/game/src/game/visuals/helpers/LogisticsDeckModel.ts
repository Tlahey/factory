import * as THREE from "three";
import { BELT_SURFACE_Y } from "../../buildings/conveyor/ConveyorGeometry";

/**
 * Shared model for belt-level logistics blocks (merger, splitter).
 *
 * They used to be 0.5-tall boxes dropped in the middle of a belt line, which
 * read as a wall rather than as part of the belt. This builds a low deck whose
 * top surface is exactly the belt surface, so items keep flowing at the same
 * height, plus a coloured indicator to tell the two apart at a glance.
 */

const DECK_SIZE = 0.92;
const DECK_HEIGHT = 0.16;
const FRAME_COLOR = 0x4a4e57;
const DECK_COLOR = 0x35383f;

export interface LogisticsDeckOptions {
  /** Colour of the glowing indicator on top. */
  accentColor: number;
  /** Name given to the returned group. */
  name: string;
}

export function createLogisticsDeck({
  accentColor,
  name,
}: LogisticsDeckOptions): THREE.Group {
  const group = new THREE.Group();
  group.name = name;

  // Chassis: sunk into the ground, top flush with the belt surface.
  const chassis = new THREE.Mesh(
    new THREE.BoxGeometry(DECK_SIZE, DECK_HEIGHT, DECK_SIZE),
    new THREE.MeshStandardMaterial({
      color: FRAME_COLOR,
      metalness: 0.6,
      roughness: 0.45,
    }),
  );
  chassis.position.y = BELT_SURFACE_Y - DECK_HEIGHT / 2;
  chassis.castShadow = true;
  chassis.receiveShadow = true;
  group.add(chassis);

  // Darker inset deck the items travel over.
  const deck = new THREE.Mesh(
    new THREE.BoxGeometry(DECK_SIZE - 0.14, 0.03, DECK_SIZE - 0.14),
    new THREE.MeshStandardMaterial({
      color: DECK_COLOR,
      metalness: 0.4,
      roughness: 0.7,
    }),
  );
  deck.position.y = BELT_SURFACE_Y - 0.005;
  deck.receiveShadow = true;
  group.add(deck);

  // Glowing hex indicator, flush enough not to collide with items.
  const indicator = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.16, 0.02, 6),
    new THREE.MeshStandardMaterial({
      color: accentColor,
      emissive: accentColor,
      emissiveIntensity: 0.6,
    }),
  );
  indicator.name = "indicator";
  indicator.position.y = BELT_SURFACE_Y + 0.008;
  group.add(indicator);

  return group;
}
