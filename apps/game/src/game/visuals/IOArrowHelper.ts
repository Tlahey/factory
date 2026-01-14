import * as THREE from "three";
import type { BuildingEntity } from "../entities/BuildingEntity";
import type { IIOBuilding, Direction } from "../buildings/BuildingConfig";

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
 * Get the Y rotation to make the arrow face the given direction
 * The arrow is built to point toward +Z, so we rotate to match world direction
 */
function getDirectionRotation(direction: Direction): number {
  switch (direction) {
    case "north":
      return Math.PI; // +Z to -Z
    case "south":
      return 0; // +Z stays +Z
    case "east":
      return -Math.PI / 2; // +Z to +X
    case "west":
      return Math.PI / 2; // +Z to -X
  }
}

/**
 * Get the world position offset for placing arrow at tile edge
 */
function getEdgePosition(
  direction: Direction,
  distance: number,
): { x: number; z: number } {
  switch (direction) {
    case "north":
      return { x: 0, z: -distance };
    case "south":
      return { x: 0, z: distance };
    case "east":
      return { x: distance, z: 0 };
    case "west":
      return { x: -distance, z: 0 };
  }
}

/**
 * Calculate the actual world direction from a relative side and building direction
 */
function getSideDirection(
  side: "front" | "back" | "left" | "right",
): Direction {
  // Return relative direction assuming building faces 'north'
  // Rotation is handled by the parent mesh
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

/**
 * Create IO arrows for a building element.
 */
export function createIOArrows(
  building: BuildingEntity & IIOBuilding,
): THREE.Group {
  const group = new THREE.Group();
  group.name = "io_arrows";

  const io = building.io;
  if (!io.showArrow) return group;

  // Defaults
  const width = building.width || 1;
  const height = building.height || 1;
  const margin = 0.2; // Distance from edge

  // Helper to get distance from center to edge based on side and dimensions
  // Local Space: Center of First Tile is (0,0).
  // Front (-Z) Edge: -0.5
  // Back (+Z) Edge: Height - 0.5
  // Left (-X) Edge: -Width/2
  // Right (+X) Edge: Width/2
  const getDistanceForSide = (side: "front" | "back" | "left" | "right") => {
    switch (side) {
      case "front":
        return 0.5 + margin;
      case "back":
        return height - 0.5 + margin;
      case "left":
      case "right":
        return width / 2 + margin;
    }
  };

  // Create INPUT arrow (green, pointing toward building)
  if (io.hasInput) {
    const inputSide = io.inputSide || "front";
    const inputDir = getSideDirection(inputSide); // Relative direction (e.g. 'south' for back)

    // For arrow rotation, we align it with the input direction
    const rotation = getDirectionRotation(inputDir);

    // For position, we need the distance from the pivot (first tile center)
    const dist = getDistanceForSide(inputSide);
    const pos = getEdgePosition(inputDir, dist);

    const inputArrow = createArrowMesh(INPUT_COLOR, true); // points inward
    inputArrow.position.set(pos.x, ARROW_HEIGHT, pos.z);
    inputArrow.rotation.y = rotation;
    inputArrow.name = "input_arrow";
    inputArrow.visible = !building.isInputConnected;

    group.add(inputArrow);
  }

  // Create OUTPUT arrow (red, pointing away from building)
  if (io.hasOutput) {
    const outputSide = io.outputSide || "front";
    const outputDir = getSideDirection(outputSide);

    const rotation = getDirectionRotation(outputDir);
    const dist = getDistanceForSide(outputSide);
    const pos = getEdgePosition(outputDir, dist);

    const outputArrow = createArrowMesh(OUTPUT_COLOR, false); // points outward
    outputArrow.position.set(pos.x, ARROW_HEIGHT, pos.z);
    outputArrow.rotation.y = rotation;
    outputArrow.name = "output_arrow";
    outputArrow.visible = !building.isOutputConnected;

    group.add(outputArrow);
  }

  return group;
}

/**
 * Update IO arrows to reflect current building direction.
 */
export function updateIOArrows(
  arrowGroup: THREE.Group,
  building: BuildingEntity & IIOBuilding,
): void {
  const io = building.io;

  // Reuse logic: Distance from center to edge based on side and dimensions
  const width = building.width || 1;
  const height = building.height || 1;
  const margin = 0.2;

  const getDistanceForSide = (side: "front" | "back" | "left" | "right") => {
    switch (side) {
      case "front":
        return 0.5 + margin;
      case "back":
        return height - 0.5 + margin;
      case "left":
      case "right":
        return width / 2 + margin;
    }
  };

  // Update input arrow
  const inputArrow = arrowGroup.getObjectByName("input_arrow");
  if (inputArrow && io.hasInput) {
    const inputSide = io.inputSide || "front";
    const inputDir = getSideDirection(inputSide);
    const rotation = getDirectionRotation(inputDir);
    const dist = getDistanceForSide(inputSide);
    const pos = getEdgePosition(inputDir, dist);

    inputArrow.position.set(pos.x, ARROW_HEIGHT, pos.z);
    inputArrow.rotation.y = rotation;
    inputArrow.visible = !building.isInputConnected;
  }

  // Update output arrow
  const outputArrow = arrowGroup.getObjectByName("output_arrow");
  if (outputArrow && io.hasOutput) {
    const outputSide = io.outputSide || "front";
    const outputDir = getSideDirection(outputSide);
    const rotation = getDirectionRotation(outputDir);
    const dist = getDistanceForSide(outputSide);
    const pos = getEdgePosition(outputDir, dist);

    outputArrow.position.set(pos.x, ARROW_HEIGHT, pos.z);
    outputArrow.rotation.y = rotation;
    outputArrow.visible = !building.isOutputConnected;
  }
}
