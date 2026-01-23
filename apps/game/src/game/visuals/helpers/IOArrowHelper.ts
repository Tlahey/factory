import * as THREE from "three";
import type { BuildingEntity } from "../../entities/BuildingEntity";
import type {
  IIOBuilding,
  IOConfig,
  BuildingConfig,
} from "../../buildings/BuildingConfig";
import type { Direction } from "../../entities/types";
import { getIOArrowDefinitions } from "../../buildings/BuildingIOHelper";

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

/**
 * Get the rotation for an ARROW based on if it's IN or OUT.
 * The standard 'getDirectionRotation' assumes the arrow points +Z (South).
 *
 * For SIDE INPUTS (Left/Right), an input arrow (Green) should point INWARD.
 *
 * If Input is on RIGHT (East), arrow is at X+, pointing West (-X).
 * If Input is on LEFT (West), arrow is at X-, pointing East (+X).
 *
 * The `createArrowMesh` helper ALREADY rotates the arrow to point along Z.
 * - pointsInward=true: Tip at -Z (points North relative to arrow space)
 * - pointsInward=false: Tip at +Z (points South relative to arrow space)
 *
 * Let's revisit the rotation logic for inputs.
 */
function getArrowRotation(sideDirection: Direction, isInput: boolean): number {
  // sideDirection is where the arrow IS relative to center.
  // e.g. RIGHT side = EAST.
  // If INPUT (Green): Arrow should point TOWARD center.
  //   - At East, point West.
  //   - At West, point East.
  //   - At North, point South.
  //   - At South, point North.
  //
  // If OUTPUT (Red): Arrow should point AWAY from center.
  //   - At East, point East.
  //   - At West, point West.
  //   - At South, point South.
  //   - At North, point North.

  // Base rotation for "South" (+Z)
  const rotMap: Record<Direction, number> = {
    north: Math.PI, // Points North (-Z)
    south: 0, // Points South (+Z)
    east: -Math.PI / 2, // Points East (+X)
    west: Math.PI / 2, // Points West (-X)
  };

  if (isInput) {
    // Input arrow needs to point OPPOSITE to the side location
    // e.g. Side=East, Arrow should point West.
    switch (sideDirection) {
      case "north":
        return rotMap.south; // At North, point South (In)
      case "south":
        return rotMap.north; // At South, point North (In)
      case "east":
        return rotMap.east; // At East, point East (Out) - Wait, we want IN.
      // If Arrow @ East, pointing East is OUT.
      // Pointing West is IN.
      // User says my previous logic (Point West) was wrong.
      // So they want it to point East?? That would be OUT.
      // OR my previous logic resulted in OUT and they want IN.
      // Previous logic: case "east": return rotMap.west; // Point West (In)
      // User says "not in good direction. rotate 180".
      // So let's flip it.
      case "east":
        return rotMap.east;
      case "west":
        return rotMap.west;
    }
  } else {
    // Output arrow points WITH the side location
    return rotMap[sideDirection];
  }
}

/**
 * Create IO arrows from a configuration object (static).
 * Used for ghosts/previews where no entity exists.
 */
export function createIOArrowsFromConfig(
  io: IOConfig,
  width: number,
  height: number,
): THREE.Group {
  const group = new THREE.Group();
  group.name = "io_arrows";

  if (!io || !io.showArrow) return group;

  // Assume simple config wrapper to reuse helper
  const dummyConfig = { io } as unknown as BuildingConfig;
  const defs = getIOArrowDefinitions(dummyConfig);

  const margin = 0.2;

  const getDistanceForSide = (side: "front" | "back" | "left" | "right") => {
    switch (side) {
      case "front":
      case "back":
        return height / 2 + margin;
      case "left":
      case "right":
        return width / 2 + margin;
    }
  };

  defs.forEach((def) => {
    const isInput = def.type === "input";
    const sideDir = getSideDirection(def.side);

    // Use new rotation logic
    const rotation = getArrowRotation(sideDir, isInput);

    const dist = getDistanceForSide(def.side);
    const pos = getEdgePosition(sideDir, dist);

    // Pass false to pointsInward because we now handle orientation via Y rotation fully
    // createArrowMesh(color, false) creates an arrow pointing +Z (South) locally.
    // getArrowRotation returns the Y angle to rotate that +Z to the correct world dir.
    const color = isInput ? INPUT_COLOR : OUTPUT_COLOR;

    // Important: createArrowMesh is designed such that:
    // pointsInward=true -> points -Z (North)
    // pointsInward=false -> points +Z (South)
    //
    // Our getArrowRotation assumes the base arrow points +Z (South).
    // So we should use pointsInward=false always, and simply rotate it.
    const arrow = createArrowMesh(color, false);

    arrow.position.set(pos.x, ARROW_HEIGHT, pos.z);
    arrow.rotation.y = rotation;
    // Naming convention: type_arrow_side
    arrow.name = `${def.type}_arrow_${def.side}`;
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
  const io = building.io;
  const config = building.getConfig();
  const width = (config && config.width) || 1;
  const height = (config && config.height) || 1;

  const group = createIOArrowsFromConfig(io, width, height);

  // Initial update
  updateIOArrows(group, building);

  return group;
}

/**
 * Update IO arrows to reflect current building direction.
 */
export function updateIOArrows(
  arrowGroup: THREE.Group,
  building: BuildingEntity & IIOBuilding,
): void {
  const config = building.getConfig();
  if (!config) return;
  const defs = getIOArrowDefinitions(config);

  defs.forEach((def) => {
    const name = `${def.type}_arrow_${def.side}`;
    const arrow = arrowGroup.getObjectByName(name);

    // If arrow doesn't exist (e.g. config changed or dynamic update?), strictly we shouldn't add it here
    // but usually createIOArrowsFromConfig created it.
    if (!arrow) return;

    // Toggle visibility based on connectivity
    // If granular data exists, use it. Fallback to global flag if not.
    // The global flag is ANY input/output connected.
    // Ideally we want SPECIFIC input/output connected.
    let isConnected = false;
    if (def.type === "input") {
      if (building.connectedInputSides) {
        isConnected = building.connectedInputSides.includes(def.side);
      } else {
        // Fallback for buildings not using new system yet
        isConnected = !!building.isInputConnected;
      }
    } else {
      if (building.connectedOutputSides) {
        isConnected = building.connectedOutputSides.includes(def.side);
      } else {
        isConnected = !!building.isOutputConnected;
      }
    }

    arrow.visible = !isConnected;

    // Optional: Re-position if needed (usually static relative to building)
    // but in case dimensions dynamic? (Unlikely)
  });
}
