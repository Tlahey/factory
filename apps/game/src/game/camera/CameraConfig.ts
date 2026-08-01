import { WORLD_WIDTH, WORLD_HEIGHT } from "@/game/constants";

/**
 * Hard limits applied to the camera rig after every gesture.
 */
export const CAMERA_LIMITS = {
  minDistance: 6,
  maxDistance: 110,
  /** Straight-down view (radians from +Y). */
  minPolar: 0.15,
  /** Lowest allowed camera, kept above the horizon. */
  maxPolar: Math.PI / 2 - 0.12,
} as const;

export interface CameraBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

/** How far outside the map the focus point may travel. */
const BOUNDS_MARGIN = 8;

export const CAMERA_BOUNDS: CameraBounds = {
  minX: -BOUNDS_MARGIN,
  maxX: WORLD_WIDTH + BOUNDS_MARGIN,
  minZ: -BOUNDS_MARGIN,
  maxZ: WORLD_HEIGHT + BOUNDS_MARGIN,
};

export const DEFAULT_CAMERA_TARGET = {
  x: WORLD_WIDTH / 2,
  z: WORLD_HEIGHT / 2,
} as const;

export const DEFAULT_CAMERA_DISTANCE = 32;
export const DEFAULT_CAMERA_AZIMUTH = Math.PI / 4;
export const DEFAULT_CAMERA_POLAR = Math.PI / 3;

/**
 * Gesture sensitivities.
 *
 * Wheel-based values are per raw pixel of `WheelEvent` delta (already
 * normalized to pixels by `normalizeWheelDelta`), drag values are per CSS
 * pixel of pointer movement, key values are per second.
 */
export const CAMERA_SENSITIVITY = {
  /** Two-finger scroll pan: 1 = the ground follows the fingers exactly. */
  scrollPan: 1,
  /** Pinch (ctrl+wheel synthesized by macOS/Windows browsers). */
  pinchZoom: 0.012,
  /** Option + two-finger scroll, and classic mouse wheel. */
  wheelZoom: 0.0022,
  /** Shift/Cmd + two-finger scroll. */
  scrollOrbitAzimuth: 0.005,
  scrollOrbitPolar: 0.004,
  /** Drag with the primary button (or one finger) to pan. */
  dragPan: 1,
  /** Option + drag / secondary button drag to orbit. */
  dragOrbitAzimuth: 0.006,
  dragOrbitPolar: 0.005,
  /** Safari trackpad `gesturechange` two-finger twist. */
  twistOrbit: 1,
  keyPan: 22,
  keyOrbitAzimuth: 1.6,
  keyOrbitPolar: 1.1,
  keyZoom: 1.1,
} as const;

/**
 * Exponential smoothing rates (higher = snappier, lower = more glide).
 */
export const CAMERA_DAMPING = {
  target: 14,
  distance: 12,
  angle: 16,
} as const;

/** Pointer travel (px) before a press turns into a camera drag. */
export const DRAG_THRESHOLD_PX = 4;

/** Below this delta the rig is considered settled and stops requesting frames. */
export const SETTLE_EPSILON = 0.0005;
