import { IWorld } from "../../entities/types";

/**
 * CONVEYOR LOGIC SYSTEM
 *
 * This file centralizes all conveyor belt logic including:
 * - Turn direction calculation
 * - Flow validation
 * - Connection rules
 *
 * SPECIFICATION:
 * See CONVEYOR_SPEC.md for complete rules and requirements
 */

export type Direction = "north" | "south" | "east" | "west";
export type ConveyorTurnType = "straight" | "left" | "right";

/**
 * RULE: Turn Direction Mapping
 *
 * Given a flow input direction and output direction, determines the turn type.
 *
 * Visual Reference (Top-Down View):
 *        North (↑)
 *           |
 * West (←)--+--→ East
 *           |
 *       South (↓)
 *
 * LEFT TURN = Counter-clockwise 90°
 * RIGHT TURN = Clockwise 90°
 */

interface TurnMapping {
  [flowIn: string]: {
    left: Direction;
    right: Direction;
  };
}

const TURN_MAPPINGS: TurnMapping = {
  north: { left: "west", right: "east" },
  south: { left: "east", right: "west" },
  east: { left: "north", right: "south" },
  west: { left: "south", right: "north" },
};

/**
 * Calculate the turn type based on input and output flow directions
 *
 * @param flowIn - Direction the flow is traveling when it enters this conveyor
 * @param flowOut - Direction this conveyor outputs (this.direction)
 * @returns Turn type: 'straight', 'left', or 'right'
 *
 * Examples:
 * - flowIn='south' (coming down), flowOut='south' → 'straight'
 * - flowIn='south' (coming down), flowOut='east' (going right) → 'left' (counter-clockwise)
 * - flowIn='south' (coming down), flowOut='west' (going left) → 'right' (clockwise)
 */
export function calculateTurnType(
  flowIn: Direction,
  flowOut: Direction,
): ConveyorTurnType {
  // Same direction = straight
  if (flowIn === flowOut) {
    return "straight";
  }

  const mapping = TURN_MAPPINGS[flowIn];
  if (!mapping) {
    console.warn(`Invalid flowIn direction: ${flowIn}`);
    return "straight";
  }

  if (mapping.left === flowOut) {
    return "left";
  } else if (mapping.right === flowOut) {
    return "right";
  }

  // If neither left nor right matches, it's a 180° turn (invalid, treat as straight)
  console.warn(`Invalid turn: flowIn=${flowIn}, flowOut=${flowOut}`);
  return "straight";
}

/**
 * Get the opposite direction
 * Used for: "Extractor faces SOUTH → Conveyor flow goes SOUTH (away from extractor)"
 */
export function getOppositeDirection(dir: Direction): Direction {
  const opposites: Record<Direction, Direction> = {
    north: "south",
    south: "north",
    east: "west",
    west: "east",
  };
  return opposites[dir];
}

/**
 * Calculate the direction from one position to another
 * Returns the cardinal direction you'd travel to go from (fromX, fromY) to (toX, toY)
 */
export function getDirectionBetweenPoints(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
): Direction | null {
  const dx = toX - fromX;
  const dy = toY - fromY;

  // Must be orthogonal (not diagonal)
  if (dx !== 0 && dy !== 0) {
    return null;
  }

  if (dx > 0) return "east";
  if (dx < 0) return "west";
  if (dy > 0) return "south";
  if (dy < 0) return "north";

  return null; // Same position
}

/**
 * Get the position offset for a given direction
 */
export function getDirectionOffset(dir: Direction): { dx: number; dy: number } {
  const offsets: Record<Direction, { dx: number; dy: number }> = {
    north: { dx: 0, dy: -1 },
    south: { dx: 0, dy: 1 },
    east: { dx: 1, dy: 0 },
    west: { dx: -1, dy: 0 },
  };
  return offsets[dir];
}

/**
 * RULE: Find a valid output destination for a conveyor
 *
 * Checks all directions (except the input direction) to find:
 * - A chest (regardless of orientation)
 * - Another conveyor (regardless of resolution status)
 *
 * NOTE: We don't check isResolved for neighbors because:
 * - When a new conveyor is placed, it's not yet resolved
 * - But the previous conveyor should still form a turn to connect to it
 *
 * @param conveyorX - X position of this conveyor
 * @param conveyorY - Y position of this conveyor
 * @param excludeDirection - Direction to exclude (where input comes from)
 * @param world - World instance
 * @returns Direction to output toward, or null if none found
 */
export function findOutputDestination(
  conveyorX: number,
  conveyorY: number,
  excludeDirection: Direction | null,
  world: IWorld,
): Direction | null {
  const directions: Direction[] = ["north", "south", "east", "west"];

  for (const checkDir of directions) {
    // Don't go back toward input source
    if (
      excludeDirection &&
      checkDir === getOppositeDirection(excludeDirection)
    ) {
      continue;
    }

    const offset = getDirectionOffset(checkDir);
    const neighborX = conveyorX + offset.dx;
    const neighborY = conveyorY + offset.dy;
    const neighbor = world.getBuilding(neighborX, neighborY);

    if (!neighbor) continue;

    const neighborType = neighbor.getType();

    // Valid destinations: ANY conveyor or chest
    if (neighborType === "chest") {
      return checkDir; // Output toward chest
    } else if (neighborType === "conveyor") {
      // Don't check isResolved - we want to connect to ANY conveyor
      return checkDir; // Output toward conveyor
    }
  }

  return null; // No valid output found
}

/**
 * RULE: Determine flow input direction for a conveyor
 *
 * A conveyor receives flow from:
 * 1. An Extractor pointing toward it (flow direction = extractor's facing direction)
 * 2. Another resolved Conveyor pointing toward it (flow direction = that conveyor's direction)
 * 3. A conveyor whose output position is adjacent to us (perpendicular connection)
 *
 * NOTE: Chests are NOT flow sources by default (they are destinations/inputs)
 *       Phase 2 will add explicit output sides to chests
 *
 * @param conveyorX - X position of this conveyor
 * @param conveyorY - Y position of this conveyor
 * @param world - World instance to query neighbors
 * @returns The direction flow enters this conveyor, or null if no valid input
 */
export function determineFlowInputDirection(
  conveyorX: number,
  conveyorY: number,
  myDirection: "north" | "south" | "east" | "west",
  world: IWorld,
): "north" | "south" | "east" | "west" | null {
  const directions: Array<"north" | "south" | "east" | "west"> = [
    "north",
    "south",
    "east",
    "west",
  ];
  // We use the exported functions from this same file to avoid circular require issues
  // getDirectionOffset and getOppositeDirection are defined above in this file

  for (const checkDir of directions) {
    // Don't check the direction we are outputting to
    if (checkDir === myDirection) continue;

    const offset = getDirectionOffset(checkDir);
    const neighbor = world.getBuilding(
      conveyorX + offset.dx,
      conveyorY + offset.dy,
    );

    if (!neighbor) continue;

    const neighborType = neighbor.getType();
    const neighborDirection = neighbor.direction as
      | "north"
      | "south"
      | "east"
      | "west";

    // Calculate the direction neighbor would need to face to point at us
    const directionToUs = getOppositeDirection(checkDir);

    // Check if neighbor points at us (its output is toward us)
    if (neighborDirection === directionToUs) {
      // Valid input sources: Extractors or Resolved Conveyors
      if (neighborType === "extractor") {
        return neighborDirection;
      }

      if (neighborType === "conveyor") {
        // Check if resolved without casting to any
        // We assume if it's a conveyor, it might have isResolved property
        // But BuildingEntity doesn't have it.
        // We use a safe check.
        const isResolved = (neighbor as unknown as { isResolved: boolean })
          .isResolved;
        if (isResolved) {
          return neighborDirection;
        }
      }
    }
  }

  return null;
}
