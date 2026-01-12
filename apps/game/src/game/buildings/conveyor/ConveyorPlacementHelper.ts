import { IWorld } from "../../entities/types";
import { Direction, getDirectionOffset } from "./ConveyorLogicSystem";

/**
 * CONVEYOR PLACEMENT HELPER
 *
 * Determines conveyor direction at PLACEMENT TIME based on context.
 * Once placed, direction is fixed (no runtime recalculation).
 *
 * IMPORTANT: Each IO port can only connect to ONE thing.
 * - Extractor output → 1 conveyor
 * - Conveyor input → 1 source (extractor or conveyor)
 * - Conveyor output → 1 target (conveyor or chest)
 */

interface InputSource {
  direction: Direction;
  type: "extractor" | "conveyor";
}

interface OutputTarget {
  direction: Direction;
  type: "chest" | "hub" | "conveyor";
}

/**
 * Determine the direction a conveyor should face when placed at (x, y).
 *
 * Priority:
 * 1. If both input AND output context: point toward output (creates turn)
 * 2. If output context only (Chest/Hub): point toward it
 * 3. If at Extractor output only: continue extractor direction
 * 4. Default: user rotation (scroll wheel)
 */
export function determineConveyorDirection(
  x: number,
  y: number,
  world: IWorld,
  userRotation: Direction,
): Direction {
  // Check what's around us (only AVAILABLE connections)
  const inputSource = findAvailableInputSource(x, y, world); // Something feeding INTO us
  const outputTarget = findAvailableOutputTarget(x, y, world); // Something we should feed INTO

  // Case 1: Both input AND output found = Turn required
  // Point toward the output (direction should go toward destination)
  if (inputSource && outputTarget) {
    return outputTarget.direction;
  }

  // Case 2: Only output target (Chest/Hub)
  // Point toward it
  if (
    outputTarget &&
    (outputTarget.type === "chest" || outputTarget.type === "hub")
  ) {
    return outputTarget.direction;
  }

  // Case 3: Only input source (Extractor feeding us)
  // Continue the extractor direction
  if (inputSource && inputSource.type === "extractor") {
    return inputSource.direction;
  }

  // Default: Use user rotation (scroll wheel)
  return userRotation;
}

/**
 * Find if something is feeding INTO our position (x, y) AND is available.
 * Checks that the source isn't already connected to another conveyor.
 */
function findAvailableInputSource(
  x: number,
  y: number,
  world: IWorld,
): InputSource | null {
  const directions: Direction[] = ["north", "south", "east", "west"];

  for (const checkDir of directions) {
    const offset = getDirectionOffset(checkDir);
    const neighborX = x + offset.dx;
    const neighborY = y + offset.dy;
    const neighbor = world.getBuilding(neighborX, neighborY);

    if (!neighbor) continue;

    const neighborType = neighbor.getType();
    const neighborDir = neighbor.direction as Direction;

    // Check if neighbor's output points at our position
    const outputOffset = getDirectionOffset(neighborDir);
    const outputX = neighborX + outputOffset.dx;
    const outputY = neighborY + outputOffset.dy;

    if (outputX === x && outputY === y) {
      // Check if this output is AVAILABLE (not already connected)
      if (neighborType === "extractor") {
        // Extractor output available if isOutputConnected is false
        if (
          "isOutputConnected" in neighbor &&
          !(neighbor as { isOutputConnected: boolean }).isOutputConnected
        ) {
          return { direction: neighborDir, type: "extractor" };
        }
        // If we can't check, assume available
        if (!("isOutputConnected" in neighbor)) {
          return { direction: neighborDir, type: "extractor" };
        }
      }
      if (neighborType === "conveyor") {
        // Conveyor output available if isOutputConnected is false
        if (
          "isOutputConnected" in neighbor &&
          !(neighbor as { isOutputConnected: boolean }).isOutputConnected
        ) {
          return { direction: neighborDir, type: "conveyor" };
        }
        // If we can't check, assume available
        if (!("isOutputConnected" in neighbor)) {
          return { direction: neighborDir, type: "conveyor" };
        }
      }
    }
  }

  return null;
}

/**
 * Find if there's something we should output TO adjacent to (x, y) AND is available.
 * Checks that the target isn't already receiving input from another source.
 */
function findAvailableOutputTarget(
  x: number,
  y: number,
  world: IWorld,
): OutputTarget | null {
  const directions: Direction[] = ["north", "south", "east", "west"];

  for (const checkDir of directions) {
    const offset = getDirectionOffset(checkDir);
    const neighborX = x + offset.dx;
    const neighborY = y + offset.dy;
    const neighbor = world.getBuilding(neighborX, neighborY);

    if (!neighbor) continue;

    const neighborType = neighbor.getType();

    // Chest or Hub: We should point toward it (always available for input)
    if (neighborType === "chest" || neighborType === "hub") {
      return { direction: checkDir, type: neighborType as "chest" | "hub" };
    }

    // Conveyor: We can output to its input (back side)
    // A conveyor's input is on the BACK side (opposite of its direction)
    if (neighborType === "conveyor") {
      const neighborDir = neighbor.direction as Direction;

      // We can feed into this conveyor if we're at its INPUT position
      // Conveyor input is at the back, so we check if WE would be at its back
      const backOffset = getDirectionOffset(getOppositeDir(neighborDir));
      const inputX = neighborX + backOffset.dx;
      const inputY = neighborY + backOffset.dy;

      if (inputX === x && inputY === y) {
        // Check if this conveyor's input is AVAILABLE (not already connected)
        if (
          "isInputConnected" in neighbor &&
          !(neighbor as { isInputConnected: boolean }).isInputConnected
        ) {
          return { direction: checkDir, type: "conveyor" };
        }
        // If we can't check, assume available
        if (!("isInputConnected" in neighbor)) {
          return { direction: checkDir, type: "conveyor" };
        }
      }
    }
  }

  return null;
}

/**
 * Get opposite direction
 */
function getOppositeDir(dir: Direction): Direction {
  switch (dir) {
    case "north":
      return "south";
    case "south":
      return "north";
    case "east":
      return "west";
    case "west":
      return "east";
  }
}

/**
 * Check if a conveyor direction is valid (not outputting backwards toward its input source).
 * Returns false if the direction would make the conveyor face backwards toward an input source.
 */
export function isValidConveyorDirection(
  x: number,
  y: number,
  direction: Direction,
  world: IWorld,
): boolean {
  // Find if there's an input source (conveyor/extractor outputting to us)
  const inputSource = findAvailableInputSource(x, y, world);

  if (!inputSource) {
    // No input source, any direction is valid
    return true;
  }

  // Get the position of the input source
  const oppositeDir = getOppositeDir(inputSource.direction);

  // If the chosen direction points back toward the input source, it's invalid
  // The output would face the same direction as going back to the source
  if (direction === oppositeDir) {
    return false;
  }

  return true;
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
