import { IWorld, Direction } from "../../entities/types";
import { getDirectionOffset } from "./ConveyorLogicSystem";

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
  /** 'building' = producer (extractor, chest, furnace, etc.), 'conveyor' = transporter */
  type: "building" | "conveyor";
}

interface OutputTarget {
  direction: Direction;
  /** 'building' = sink (chest, hub, furnace, etc.), 'conveyor' = chained belt */
  type: "building" | "conveyor";
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

  // Case 2: Only output target (building that accepts input)
  // Point toward it if it's a "sink" building (not a conveyor)
  if (outputTarget && outputTarget.type === "building") {
    return outputTarget.direction;
  }

  // Case 3: Only input source (building producing flow)
  // Continue the building's output direction
  if (inputSource && inputSource.type === "building") {
    return inputSource.direction;
  }

  // Default: Use user rotation (scroll wheel)
  return userRotation;
}

/**
 * Find if something is feeding INTO our position (x, y) AND is available.
 * Checks that the source isn't already connected to another conveyor.
 *
 * Uses the IIOBuilding interface generically - any building with an output
 * port pointing at us is a valid input source.
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

    // GENERIC: Check if this building implements IIOBuilding with an output port
    // that points to our position
    const hasGetOutputPosition =
      "getOutputPosition" in neighbor &&
      typeof (
        neighbor as {
          getOutputPosition?: () => { x: number; y: number } | null;
        }
      ).getOutputPosition === "function";

    if (!hasGetOutputPosition) continue;

    const outputPos = (
      neighbor as { getOutputPosition: () => { x: number; y: number } | null }
    ).getOutputPosition();

    // Check if neighbor's output points at our position
    if (!outputPos || outputPos.x !== x || outputPos.y !== y) continue;

    // Check if this output is AVAILABLE (not already connected)
    const isOutputConnected =
      "isOutputConnected" in neighbor &&
      (neighbor as { isOutputConnected: boolean }).isOutputConnected === true;

    if (isOutputConnected) continue;

    // Get the flow direction from the neighbor
    // IMPORANT: Instead of using neighbor.direction (which might be North while output is South for a Chest),
    // we calculate the direction from the neighbor TO us. This ensures we always point AWAY from the source.
    let flowDir = neighbor.direction as Direction; // Default for conveyors

    // For non-conveyor buildings (producers), the flow direction is the direction of the output port
    // which corresponds to the vector from neighbor(x,y) to us(x,y)
    const dx = x - neighborX;
    const dy = y - neighborY;

    if (dy === -1) flowDir = "north";
    else if (dy === 1) flowDir = "south";
    else if (dx === 1) flowDir = "east";
    else if (dx === -1) flowDir = "west";

    const neighborType = neighbor.getType();

    // Distinguish between conveyors (which just transport) and other buildings
    // (which "produce" flow direction). This affects auto-orientation logic.
    if (neighborType === "conveyor") {
      // For conveyors, we stick to their direction for now (chaining)
      return { direction: neighbor.direction as Direction, type: "conveyor" };
    } else {
      // All other IO buildings (extractor, chest, furnace, etc.)
      // are treated as "building" sources that set the initial flow direction
      return { direction: flowDir, type: "building" };
    }
  }

  return null;
}

/**
 * Find if there's something we should output TO adjacent to (x, y) AND is available.
 * Checks that the target isn't already receiving input from another source.
 *
 * Uses the IIOBuilding interface generically - any building with an input
 * port at our position is a valid output target.
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

    // GENERIC: Check if this building has an input port at our position
    // This works for any building implementing IIOBuilding (chest, furnace, etc.)
    const hasGetInputPosition =
      "getInputPosition" in neighbor &&
      typeof (
        neighbor as { getInputPosition?: () => { x: number; y: number } | null }
      ).getInputPosition === "function";

    if (hasGetInputPosition) {
      const inputPos = (
        neighbor as { getInputPosition: () => { x: number; y: number } | null }
      ).getInputPosition();

      // Check if the building's input port is at OUR position
      if (inputPos && inputPos.x === x && inputPos.y === y) {
        // Check if input is available (not already connected)
        const isInputConnected =
          "isInputConnected" in neighbor &&
          (neighbor as { isInputConnected: boolean }).isInputConnected === true;

        if (!isInputConnected) {
          // Distinguish between conveyors and other buildings for orientation logic
          if (neighborType === "conveyor") {
            return { direction: checkDir, type: "conveyor" };
          } else {
            return { direction: checkDir, type: "building" };
          }
        }
      }
    }

    // Special case: Conveyor input check (back side of conveyor)
    // Conveyors accept input from the back, which getInputPosition() handles
    // but let's also support legacy check for conveyors without getInputPosition
    if (neighborType === "conveyor" && !hasGetInputPosition) {
      const neighborDir = neighbor.direction as Direction;
      const backOffset = getDirectionOffset(getOppositeDir(neighborDir));
      const inputX = neighborX + backOffset.dx;
      const inputY = neighborY + backOffset.dy;

      if (inputX === x && inputY === y) {
        const isInputConnected =
          "isInputConnected" in neighbor &&
          (neighbor as { isInputConnected: boolean }).isInputConnected === true;

        if (!isInputConnected) {
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
