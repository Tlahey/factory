/**
 * Helper utility for calculating conveyor paths during drag-and-drop placement.
 * Provides path calculation using Bresenham's line algorithm and direction detection.
 */

type Direction = "north" | "south" | "east" | "west";
type PathSegment = { x: number; y: number };

/**
 * Calculate the direction from one position to another
 */
export function getDirection(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
): Direction {
  const dx = toX - fromX;
  const dy = toY - fromY;

  // Prioritize horizontal/vertical, handle diagonals by choosing dominant axis
  if (Math.abs(dx) > Math.abs(dy)) {
    return dx > 0 ? "east" : "west";
  } else {
    return dy > 0 ? "south" : "north";
  }
}

/**
 * Calculate path from start to end using right-angle path (no diagonals)
 * Returns array of grid positions from start to end (inclusive)
 * Path moves horizontally first, then vertically to create 90-degree turns only
 */
export function calculateConveyorPath(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
): PathSegment[] {
  const path: PathSegment[] = [];

  // Right-angle path: horizontal first, then vertical
  const dx = endX - startX;
  const dy = endY - startY;
  const sx = dx > 0 ? 1 : -1;
  const sy = dy > 0 ? 1 : -1;

  // Move horizontally
  let x = startX;
  let y = startY;

  while (x !== endX) {
    path.push({ x, y });
    x += sx;
  }

  // Move vertically
  while (y !== endY) {
    path.push({ x, y });
    y += sy;
  }

  // Add final position
  path.push({ x: endX, y: endY });

  return path;
}

/**
 * Determine the conveyor type (straight, left turn, right turn) based on
 * the direction from previous, current, and next positions
 */
export function detectConveyorType(
  prevX: number | null,
  prevY: number | null,
  currentX: number,
  currentY: number,
  nextX: number | null,
  nextY: number | null,
): "straight" | "left" | "right" {
  // If no previous or next, it's straight
  if (prevX === null || prevY === null || nextX === null || nextY === null) {
    return "straight";
  }

  const inDir = getDirection(prevX, prevY, currentX, currentY);
  const outDir = getDirection(currentX, currentY, nextX, nextY);

  // If same direction, it's straight
  if (inDir === outDir) {
    return "straight";
  }

  // Determine if it's a left or right turn
  const lefts: Record<Direction, Direction> = {
    north: "west",
    west: "south",
    south: "east",
    east: "north",
  };

  const rights: Record<Direction, Direction> = {
    north: "east",
    east: "south",
    south: "west",
    west: "north",
  };

  if (lefts[inDir] === outDir) {
    return "left";
  } else if (rights[inDir] === outDir) {
    return "right";
  }

  // Default to straight for opposite directions (U-turn, shouldn't happen in normal flow)
  return "straight";
}

/**
 * Calculate the direction a conveyor segment should face based on the next position in the path.
 * Used during path placement to orient each conveyor correctly.
 */
export function getSegmentDirection(
  currentX: number,
  currentY: number,
  nextX: number | null,
  nextY: number | null,
  prevX: number | null = null,
  prevY: number | null = null,
): Direction {
  // If we have a next position, look ahead
  if (nextX !== null && nextY !== null) {
    const dx = nextX - currentX;
    const dy = nextY - currentY;
    if (dx > 0) return "east";
    if (dx < 0) return "west";
    if (dy > 0) return "south";
    if (dy < 0) return "north";
  }

  // If no next position (end of path), maintain flow from previous
  if (prevX !== null && prevY !== null) {
    const dx = currentX - prevX;
    const dy = currentY - prevY;
    if (dx > 0) return "east";
    if (dx < 0) return "west";
    if (dy > 0) return "south";
    if (dy < 0) return "north";
  }

  // Fallback default
  return "north";
}
