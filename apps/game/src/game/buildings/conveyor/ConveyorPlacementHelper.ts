import { BuildingEntity } from "../../entities/BuildingEntity";
import { IWorld, Direction, DIRECTIONS } from "../../entities/types";
import { IIOBuilding } from "../BuildingConfig";
import { hasInputPortAt, hasOutputPortAt } from "../BuildingIOHelper";
import {
  getDirectionOffset,
  getOppositeDirection,
} from "./ConveyorLogicSystem";

/**
 * CONVEYOR PLACEMENT HELPER
 *
 * Determines conveyor direction at PLACEMENT TIME based on context.
 * Once placed, direction is fixed (no runtime recalculation).
 *
 * Everything here is expressed in terms of IO *ports* (`getInputPositions` /
 * `getOutputPositions` when available, singular otherwise), never in terms of
 * building types. That is what lets a belt auto-orient off a splitter's side
 * output or into a merger's side input — those buildings have several ports
 * and `direction` alone says nothing about which one faces us.
 */

interface Connection {
  /** Direction from the conveyor tile toward the neighbour. */
  direction: Direction;
  /** 'building' = machine (extractor, chest, furnace...), 'conveyor' = belt. */
  type: "building" | "conveyor";
}

/** Is that neighbour's port already taken by someone else? */
function isPortBusy(
  neighbor: BuildingEntity,
  flag: "isInputConnected" | "isOutputConnected",
  world: IWorld,
  x: number,
  y: number,
): boolean {
  const connected = (neighbor as unknown as Record<string, unknown>)[flag];
  if (connected !== true) return false;

  // Lenient: if the thing already connected sits at OUR tile (ghost preview,
  // re-placement over an existing belt), the port is still ours to use.
  return world.getBuilding(x, y)?.getType() !== "conveyor";
}

/**
 * Find a neighbour that feeds INTO (x, y) through one of its output ports.
 */
function findAvailableInputSource(
  x: number,
  y: number,
  world: IWorld,
): Connection | null {
  for (const checkDir of DIRECTIONS) {
    const offset = getDirectionOffset(checkDir);
    const neighborX = x + offset.dx;
    const neighborY = y + offset.dy;
    const neighbor = world.getBuilding(neighborX, neighborY);
    if (!neighbor) continue;

    // Does one of the neighbour's output ports target our tile?
    if (!hasOutputPortAt(neighbor as BuildingEntity & IIOBuilding, x, y)) {
      continue;
    }

    if (isPortBusy(neighbor, "isOutputConnected", world, x, y)) continue;

    // The flow direction is the vector neighbour -> us, NOT neighbour.direction:
    // a chest facing north outputs southwards, and a splitter outputs on three
    // different sides.
    const flowDir = getOppositeDirection(checkDir);

    return {
      direction: flowDir,
      type: neighbor.getType() === "conveyor" ? "conveyor" : "building",
    };
  }

  return null;
}

/**
 * Find a neighbour that (x, y) should feed, i.e. one that exposes an input
 * port on our tile.
 */
function findAvailableOutputTarget(
  x: number,
  y: number,
  world: IWorld,
): Connection | null {
  for (const checkDir of DIRECTIONS) {
    const offset = getDirectionOffset(checkDir);
    const neighborX = x + offset.dx;
    const neighborY = y + offset.dy;
    const neighbor = world.getBuilding(neighborX, neighborY);
    if (!neighbor) continue;

    if (!hasInputPortAt(neighbor as BuildingEntity & IIOBuilding, x, y)) {
      continue;
    }

    if (isPortBusy(neighbor, "isInputConnected", world, x, y)) continue;

    return {
      direction: checkDir,
      type: neighbor.getType() === "conveyor" ? "conveyor" : "building",
    };
  }

  return null;
}

/**
 * Determine the direction a conveyor should face when placed at (x, y).
 *
 * Priority:
 * 1. If both input AND output context: point toward output (creates turn)
 * 2. If output context only (Chest/Hub): point toward it
 * 3. If at a producer's output only: continue the flow
 * 4. Default: user rotation (R key)
 */
export function determineConveyorDirection(
  x: number,
  y: number,
  world: IWorld,
  userRotation: Direction,
): Direction {
  const inputSource = findAvailableInputSource(x, y, world);
  const outputTarget = findAvailableOutputTarget(x, y, world);

  // Case 1: Both input AND output found = turn required.
  // Point toward the output so the flow continues to the destination.
  if (inputSource && outputTarget) {
    return outputTarget.direction;
  }

  // Case 2: Only an output target that is a real sink (not another belt).
  if (outputTarget && outputTarget.type === "building") {
    return outputTarget.direction;
  }

  // Case 3: Only a producer feeding us. Respect the user's rotation as long as
  // it does not point straight back into the source.
  if (inputSource && inputSource.type === "building") {
    if (isValidConveyorDirection(x, y, userRotation, world)) {
      return userRotation;
    }
    return inputSource.direction;
  }

  // Default: use the user's rotation (R key).
  return userRotation;
}

/**
 * Check that a direction does not point straight back into the tile that feeds
 * us (head-to-head belts / belt facing an extractor's output).
 */
export function isValidConveyorDirection(
  x: number,
  y: number,
  direction: Direction,
  world: IWorld,
): boolean {
  const inputSource = findAvailableInputSource(x, y, world);
  if (!inputSource) return true;

  // inputSource.direction is the direction the flow travels toward us.
  // Facing the opposite way means facing the source.
  return direction !== getOppositeDirection(inputSource.direction);
}

/**
 * Calculate direction for a conveyor segment in a drag path.
 * Direction points from current position toward next position,
 * or continues from previous if at end of path.
 */
export function getSegmentDirection(
  currentX: number,
  currentY: number,
  nextX: number | null,
  nextY: number | null,
  prevX: number | null,
  prevY: number | null,
): Direction {
  // If we have a next segment, point toward it
  if (nextX !== null && nextY !== null) {
    const dx = nextX - currentX;
    const dy = nextY - currentY;

    if (dx > 0) return "east";
    if (dx < 0) return "west";
    if (dy > 0) return "south";
    if (dy < 0) return "north";
  }

  // End of path: maintain direction from previous segment
  if (prevX !== null && prevY !== null) {
    const dx = currentX - prevX;
    const dy = currentY - prevY;

    if (dx > 0) return "east";
    if (dx < 0) return "west";
    if (dy > 0) return "south";
    if (dy < 0) return "north";
  }

  // Single point: default north
  return "north";
}

/**
 * Get the next valid rotation for a conveyor at (x, y), skipping invalid "reverse flow" directions.
 * @param currentRotation The current rotation direction
 * @param x World X position
 * @param y World Y position
 * @param world World instance
 * @param clockwise Rotation direction (true = clockwise)
 * @returns The next valid direction, or the standard next direction if finding a valid one fails
 */
export function getNextValidConveyorRotation(
  currentRotation: Direction,
  x: number,
  y: number,
  world: IWorld,
  clockwise: boolean = true,
): Direction {
  const clockwiseOrder: Direction[] = ["north", "east", "south", "west"];
  const currentIndex = clockwiseOrder.indexOf(currentRotation);

  // Try to find the next valid rotation (up to 4 steps)
  for (let step = 1; step <= 4; step++) {
    const nextIndex = clockwise
      ? (currentIndex + step) % 4
      : (currentIndex - step + 4) % 4; // handle negative modulo

    const candidateDir = clockwiseOrder[nextIndex];

    if (isValidConveyorDirection(x, y, candidateDir, world)) {
      return candidateDir;
    }
  }

  // Fallback (e.g. if surrounded by inputs on all sides, shouldn't happen usually)
  // Just return standard next rotation
  const fallbackIndex = clockwise
    ? (currentIndex + 1) % 4
    : (currentIndex + 3) % 4;
  return clockwiseOrder[fallbackIndex];
}
