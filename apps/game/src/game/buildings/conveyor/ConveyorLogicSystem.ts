import { IWorld, Direction, DIRECTIONS } from "../../entities/types";

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
 * Rotate a direction by 90° increments.
 * @param steps positive = clockwise, negative = counter-clockwise
 */
export function rotateDirection(dir: Direction, steps: number): Direction {
  const clockwiseOrder: Direction[] = ["north", "east", "south", "west"];
  const index = clockwiseOrder.indexOf(dir);
  return clockwiseOrder[(index + (steps % 4) + 4) % 4];
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
  const directions = DIRECTIONS;

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

    // Valid destinations: ANY conveyor or building with an input port at this position
    if (neighborType === "conveyor") {
      // Don't check isResolved - we want to connect to ANY conveyor
      return checkDir; // Output toward conveyor
    } else if (
      hasInputPortAt(
        neighbor as unknown as {
          getInputPosition?: () => { x: number; y: number } | null;
        },
        conveyorX,
        conveyorY,
      )
    ) {
      return checkDir; // Output toward building input
    }
  }

  return null; // No valid output found
}

/**
 * RULE: Determine flow input direction for a conveyor
 *
 * A conveyor receives flow from any neighbour whose OUTPUT PORT targets its
 * tile (extractor, furnace, another belt, a splitter side output, ...).
 * Validating against explicit output ports avoids false positives from
 * adjacent entities that are not actually connected.
 *
 * PRIORITY: the tile behind the belt wins over the two sides. A straight run
 * that also receives a side merge must keep rendering (and behaving) as a
 * straight belt — otherwise it flips to a curve as soon as anything is dropped
 * next to it.
 *
 * @param conveyorX - X position of this conveyor
 * @param conveyorY - Y position of this conveyor
 * @param myDirection - This conveyor's output direction
 * @param world - World instance to query neighbors
 * @returns The direction flow enters this conveyor, or null if no valid input
 */
export function determineFlowInputDirection(
  conveyorX: number,
  conveyorY: number,
  myDirection: Direction,
  world: IWorld,
): Direction | null {
  // Back first, then the remaining sides in a stable order.
  const back = getOppositeDirection(myDirection);
  const orderedDirections: Direction[] = [
    back,
    ...DIRECTIONS.filter((d) => d !== back && d !== myDirection),
  ];

  for (const checkDir of orderedDirections) {
    const offset = getDirectionOffset(checkDir);
    const neighborX = conveyorX + offset.dx;
    const neighborY = conveyorY + offset.dy;
    const neighbor = world.getBuilding(neighborX, neighborY);

    if (!neighbor) continue;

    // GENERIC: does the neighbour have an output port pointing at us?
    // Works for any IIOBuilding (extractor, conveyor, splitter, furnace, ...).
    const hasOutput = hasOutputPortAt(
      neighbor as unknown as {
        getOutputPosition?: () => { x: number; y: number } | null;
        getOutputPositions?: () => { x: number; y: number }[];
      },
      conveyorX,
      conveyorY,
    );

    if (!hasOutput) continue;

    // Flow travels FROM the neighbour TO us, so the incoming direction is the
    // direction of the vector neighbour -> us. For a belt this is identical to
    // its own direction, but it also works for multi-output buildings whose
    // `direction` says nothing about which port fed us.
    return getOppositeDirection(checkDir);
  }

  return null;
}

/**
 * Check if a building has its OUTPUT port at the given target position.
 * This validates that the building is actually outputting TO our cell.
 *
 * @param building - The building to check
 * @param targetX - The X position we expect the output to target
 * @param targetY - The Y position we expect the output to target
 * @returns True if the building's output port targets this position
 */
export function hasOutputPortAt(
  building: {
    getOutputPosition?: () => { x: number; y: number } | null;
    getOutputPositions?: () => { x: number; y: number }[];
  },
  targetX: number,
  targetY: number,
): boolean {
  if (building.getOutputPositions) {
    const ports = building.getOutputPositions();
    return ports.some((p) => p.x === targetX && p.y === targetY);
  }

  if (!building.getOutputPosition) return false;

  const outputPos = building.getOutputPosition();
  if (!outputPos) return false;

  return outputPos.x === targetX && outputPos.y === targetY;
}

/**
 * Check if a building has its INPUT port at the given target position.
 * This validates that the building can receive input FROM our cell.
 *
 * @param building - The building to check
 * @param sourceX - The X position we're checking from
 * @param sourceY - The Y position we're checking from
 * @returns True if the building's input port is at the source position
 */
export function hasInputPortAt(
  building: {
    getInputPosition?: () => { x: number; y: number } | null;
    getInputPositions?: () => { x: number; y: number }[];
  },
  sourceX: number,
  sourceY: number,
): boolean {
  if (building.getInputPositions) {
    const ports = building.getInputPositions();
    return ports.some((p) => p.x === sourceX && p.y === sourceY);
  }

  if (!building.getInputPosition) return false;

  const inputPos = building.getInputPosition();
  if (!inputPos) return false;

  return inputPos.x === sourceX && inputPos.y === sourceY;
}
