/**
 * Conveyor Spline System - Public API
 *
 * Re-exports all public types and classes for the spline-based conveyor system.
 */

// Core classes
export { SplineSegment } from "./SplineSegment";
export type {
  SplineNode,
  SplineSegmentConfig,
  Direction,
} from "./SplineSegment";

export { SplineItem } from "./SplineItem";
export type { SplineItemConfig } from "./SplineItem";

export { SplineGraph } from "./SplineGraph";

export { ConveyorSplineSystem } from "./ConveyorSplineSystem";
export type { ConveyorSplineSystemConfig } from "./ConveyorSplineSystem";

// Factory functions
export {
  createStraightSegment,
  createLeftTurnSegment,
  createRightTurnSegment,
  createSegmentByType,
  generateSegmentId,
  gridToWorld,
  getOutputGridPosition,
  getInputGridPosition,
  DIRECTION_OFFSETS,
  OPPOSITE_DIRECTION,
} from "./config/SplineConfigFactory";
