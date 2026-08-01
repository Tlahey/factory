import * as THREE from "three";
import type { BuildingEntity } from "../../entities/BuildingEntity";
import type {
  IIOBuilding,
  IOConfig,
  BuildingConfig,
  IOSide,
} from "../../buildings/BuildingConfig";
import type { Direction } from "../../entities/types";
import {
  getIOArrowDefinitions,
  type IOArrowDefinition,
} from "../../buildings/BuildingIOHelper";
import {
  getBaseSize,
  getPortKey,
  getPortLocalPosition,
} from "../../buildings/BuildingFootprint";

/**
 * IO Arrow Helper
 *
 * Creates visual arrow indicators for building input/output ports.
 * - Input arrows: Green, point toward building (items coming IN)
 * - Output arrows: Red, point away from building (items going OUT)
 */

const ARROW_HEAD_SIZE = 0.15;
const ARROW_SHAFT_LENGTH = 0.2;
const ARROW_SHAFT_RADIUS = 0.04;
const ARROW_HEIGHT = 0.3;
const INPUT_COLOR = 0x00ff88; // Bright vivid green
const OUTPUT_COLOR = 0xff4444; // Bright vivid red

/**
 * Create an arrow mesh that points in +Z direction (outward from center by default)
 * The arrow group will be rotated to face the correct direction
 */
function createArrowMesh(color: number, pointsInward: boolean): THREE.Group {
  const arrowGroup = new THREE.Group();

  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.95,
  });

  // Arrow head (cone) - default cone points +Y, we rotate to point +Z
  const headGeometry = new THREE.ConeGeometry(
    ARROW_HEAD_SIZE,
    ARROW_HEAD_SIZE * 1.8,
    8,
  );
  const head = new THREE.Mesh(headGeometry, material);

  // Arrow shaft (cylinder)
  const shaftGeometry = new THREE.CylinderGeometry(
    ARROW_SHAFT_RADIUS,
    ARROW_SHAFT_RADIUS,
    ARROW_SHAFT_LENGTH,
    8,
  );
  const shaft = new THREE.Mesh(shaftGeometry, material);

  // Rotate both to point along Z axis
  head.rotation.x = Math.PI / 2; // Now points toward +Z
  shaft.rotation.x = Math.PI / 2; // Now aligns with Z axis

  if (pointsInward) {
    // Arrow points INWARD (toward center) = tip at negative Z
    head.rotation.x = -Math.PI / 2; // Flip to point toward -Z
    head.position.z = -ARROW_HEAD_SIZE * 0.8;
    shaft.position.z = ARROW_SHAFT_LENGTH / 2 + ARROW_HEAD_SIZE * 0.2;
  } else {
    // Arrow points OUTWARD (away from center) = tip at positive Z
    head.position.z = ARROW_HEAD_SIZE * 0.8;
    shaft.position.z = -(ARROW_SHAFT_LENGTH / 2 + ARROW_HEAD_SIZE * 0.2);
  }

  arrowGroup.add(head);
  arrowGroup.add(shaft);

  return arrowGroup;
}

/**
 * Calculate the actual world direction from a relative side and building direction
 */
function getSideDirection(
  side: "front" | "back" | "left" | "right",
): Direction {
  // Return relative direction assuming building faces 'north'
  // Remember:
  // - Front = North
  // - Back = South
  // - Left = West
  // - Right = East
  switch (side) {
    case "front":
      return "north";
    case "back":
      return "south";
    case "right":
      return "east";
    case "left":
      return "west";
  }
}

/** Y rotation that makes the base arrow (authored pointing +Z) face `dir`. */
const ROTATION_FOR_DIRECTION: Record<Direction, number> = {
  north: Math.PI, // Points North (-Z)
  south: 0, // Points South (+Z)
  east: -Math.PI / 2, // Points East (+X)
  west: Math.PI / 2, // Points West (-X)
};

const OPPOSITE_DIRECTION: Record<Direction, Direction> = {
  north: "south",
  south: "north",
  east: "west",
  west: "east",
};

/**
 * Rotation for an arrow sitting on `sideDirection` of the building.
 *
 * - INPUT (green): points INWARD, toward the building centre — "items enter here".
 * - OUTPUT (red): points OUTWARD, away from the centre — "items leave here".
 *
 * Both axes are handled by the same rule; the previous version pointed
 * north/south inputs inward but east/west inputs outward, so side ports of
 * mergers/splitters read backwards.
 */
function getArrowRotation(sideDirection: Direction, isInput: boolean): number {
  const facing = isInput ? OPPOSITE_DIRECTION[sideDirection] : sideDirection;
  return ROTATION_FOR_DIRECTION[facing];
}

/**
 * Mesh name for a port's arrow.
 *
 * The index suffix is omitted for port 0 so single-port sides keep the
 * historical `input_arrow_back` naming.
 */
export function getArrowName(
  type: "input" | "output",
  side: IOSide,
  index: number,
): string {
  const base = `${type}_arrow_${side}`;
  return index === 0 ? base : `${base}_${index}`;
}

const ARROW_MARGIN = 0.2;

/**
 * Create IO arrows from a configuration object (static).
 * Used for ghosts/previews where no entity exists.
 *
 * Arrows live in the building's base (north-facing) frame, centred on the
 * footprint, so the parent group's rotation carries them along. Wide sides get
 * one arrow per tile.
 */
export function createIOArrowsFromConfig(
  io: IOConfig,
  width: number,
  height: number,
): THREE.Group {
  const group = new THREE.Group();
  group.name = "io_arrows";

  if (!io || !io.showArrow) return group;

  const dummyConfig = { io, width, height } as unknown as BuildingConfig;
  const defs = getIOArrowDefinitions(dummyConfig);

  defs.forEach((def) => {
    const isInput = def.type === "input";
    const sideDir = getSideDirection(def.side);
    const rotation = getArrowRotation(sideDir, isInput);
    const pos = getPortLocalPosition(
      def.side,
      def.index,
      width,
      height,
      ARROW_MARGIN,
    );

    // createArrowMesh(color, false) points +Z (south) locally; getArrowRotation
    // returns the Y angle that turns that into the direction we want.
    const color = isInput ? INPUT_COLOR : OUTPUT_COLOR;
    const arrow = createArrowMesh(color, false);

    arrow.position.set(pos.x, ARROW_HEIGHT, pos.z);
    arrow.rotation.y = rotation;
    arrow.name = getArrowName(def.type, def.side, def.index);
    arrow.visible = true;

    group.add(arrow);
  });

  return group;
}

/**
 * Create IO arrows for a building element.
 */
export function createIOArrows(
  building: BuildingEntity & IIOBuilding,
): THREE.Group {
  const base = getBaseSize(building.getConfig());
  const group = createIOArrowsFromConfig(building.io, base.width, base.height);

  // Initial update
  updateIOArrows(group, building);

  return group;
}

/**
 * Update IO arrows to reflect current connectivity.
 *
 * Per-port flags win when available so a wide building can hide the arrow on
 * the tile a belt docked to while the neighbouring tile keeps advertising.
 */
export function updateIOArrows(
  arrowGroup: THREE.Group,
  building: BuildingEntity & IIOBuilding,
): void {
  const config = building.getConfig();
  if (!config) return;

  getIOArrowDefinitions(config).forEach((def) => {
    const arrow = arrowGroup.getObjectByName(
      getArrowName(def.type, def.side, def.index),
    );
    if (!arrow) return;

    arrow.visible = !isArrowPortConnected(building, def);
  });
}

function isArrowPortConnected(
  building: BuildingEntity & IIOBuilding,
  def: IOArrowDefinition,
): boolean {
  const isInput = def.type === "input";
  const portKeys = isInput
    ? (building as BuildingEntity).connectedInputPorts
    : (building as BuildingEntity).connectedOutputPorts;

  // Empty means "nothing connected on any port", which the coarser flags below
  // agree with — so only trust the port list when it actually has entries.
  if (portKeys?.length) {
    return portKeys.includes(getPortKey(def.side, def.index));
  }

  const sides = isInput
    ? building.connectedInputSides
    : building.connectedOutputSides;
  if (sides?.length) return sides.includes(def.side);

  return !!(isInput ? building.isInputConnected : building.isOutputConnected);
}
