import * as THREE from "three";
import {
  Direction,
  SplineSegment,
  SplineSegmentConfig,
} from "../SplineSegment";

/**
 * SPLINE CONFIG FACTORY
 *
 * Factory functions for creating spline curves for different conveyor types.
 * Used to create properly configured SplineSegments.
 */

let segmentIdCounter = 0;

/**
 * Generate a unique segment ID
 */
export function generateSegmentId(gridX: number, gridY: number): string {
  return `segment_${gridX}_${gridY}_${++segmentIdCounter}`;
}

/**
 * Create a straight conveyor segment
 */
export function createStraightSegment(
  gridX: number,
  gridY: number,
  direction: Direction,
  speed?: number,
): SplineSegment {
  const config: SplineSegmentConfig = {
    id: generateSegmentId(gridX, gridY),
    gridX,
    gridY,
    direction,
    type: "straight",
    speed,
  };

  return new SplineSegment(config);
}

/**
 * Create a left-turn conveyor segment
 */
export function createLeftTurnSegment(
  gridX: number,
  gridY: number,
  direction: Direction,
  speed?: number,
): SplineSegment {
  const config: SplineSegmentConfig = {
    id: generateSegmentId(gridX, gridY),
    gridX,
    gridY,
    direction,
    type: "left",
    speed,
  };

  return new SplineSegment(config);
}

/**
 * Create a right-turn conveyor segment
 */
export function createRightTurnSegment(
  gridX: number,
  gridY: number,
  direction: Direction,
  speed?: number,
): SplineSegment {
  const config: SplineSegmentConfig = {
    id: generateSegmentId(gridX, gridY),
    gridX,
    gridY,
    direction,
    type: "right",
    speed,
  };

  return new SplineSegment(config);
}

/**
 * Create a segment based on detected turn type
 */
export function createSegmentByType(
  gridX: number,
  gridY: number,
  direction: Direction,
  type: "straight" | "left" | "right",
  speed?: number,
): SplineSegment {
  switch (type) {
    case "left":
      return createLeftTurnSegment(gridX, gridY, direction, speed);
    case "right":
      return createRightTurnSegment(gridX, gridY, direction, speed);
    default:
      return createStraightSegment(gridX, gridY, direction, speed);
  }
}

/**
 * Direction helpers
 */
export const DIRECTION_OFFSETS: Record<Direction, { dx: number; dz: number }> =
  {
    north: { dx: 0, dz: -1 },
    south: { dx: 0, dz: 1 },
    east: { dx: 1, dz: 0 },
    west: { dx: -1, dz: 0 },
  };

export const OPPOSITE_DIRECTION: Record<Direction, Direction> = {
  north: "south",
  south: "north",
  east: "west",
  west: "east",
};

/**
 * Convert grid coordinates to world position (center of tile)
 */
export function gridToWorld(
  gridX: number,
  gridY: number,
  height: number = 0.2,
): THREE.Vector3 {
  return new THREE.Vector3(gridX, height, gridY);
}

/**
 * Get the output position for a segment (next grid cell in direction)
 */
export function getOutputGridPosition(
  gridX: number,
  gridY: number,
  direction: Direction,
): { x: number; y: number } {
  const offset = DIRECTION_OFFSETS[direction];
  return { x: gridX + offset.dx, y: gridY + offset.dz };
}

/**
 * Get the input position for a segment (previous grid cell)
 */
export function getInputGridPosition(
  gridX: number,
  gridY: number,
  direction: Direction,
): { x: number; y: number } {
  const opposite = OPPOSITE_DIRECTION[direction];
  return getOutputGridPosition(gridX, gridY, opposite);
}

/**
 * Reset segment ID counter (for testing)
 */
export function resetSegmentIdCounter(): void {
  segmentIdCounter = 0;
}
