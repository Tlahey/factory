import {
  CAMERA_DAMPING,
  CAMERA_LIMITS,
  CameraBounds,
  DEFAULT_CAMERA_AZIMUTH,
  DEFAULT_CAMERA_DISTANCE,
  DEFAULT_CAMERA_POLAR,
  DEFAULT_CAMERA_TARGET,
  SETTLE_EPSILON,
} from "./CameraConfig";

/**
 * Orbit rig describing the camera as a focus point on the ground plane plus
 * spherical coordinates. All functions here are pure so the gesture math can be
 * unit tested without a WebGL context.
 *
 * Conventions match THREE.Spherical:
 *   position = target + distance * (sinφ·sinθ, cosφ, sinφ·cosθ)
 * with θ = azimuth and φ = polar (0 = straight above the target).
 */
export interface RigState {
  targetX: number;
  targetZ: number;
  distance: number;
  azimuth: number;
  polar: number;
}

export interface ScreenMetrics {
  /** Canvas height in CSS pixels. */
  viewportHeight: number;
  /** Vertical field of view, in degrees. */
  fovDegrees: number;
}

export function createDefaultRig(): RigState {
  return {
    targetX: DEFAULT_CAMERA_TARGET.x,
    targetZ: DEFAULT_CAMERA_TARGET.z,
    distance: DEFAULT_CAMERA_DISTANCE,
    azimuth: DEFAULT_CAMERA_AZIMUTH,
    polar: DEFAULT_CAMERA_POLAR,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Wraps an angle into ]-PI, PI]. */
export function wrapAngle(angle: number): number {
  const wrapped = ((angle + Math.PI) % (2 * Math.PI)) - Math.PI;
  return wrapped <= -Math.PI ? wrapped + 2 * Math.PI : wrapped;
}

/** Shortest signed rotation from `from` to `to`. */
export function shortestAngleDelta(from: number, to: number): number {
  return wrapAngle(to - from);
}

export function clampRig(rig: RigState, bounds: CameraBounds): RigState {
  return {
    targetX: clamp(rig.targetX, bounds.minX, bounds.maxX),
    targetZ: clamp(rig.targetZ, bounds.minZ, bounds.maxZ),
    distance: clamp(
      rig.distance,
      CAMERA_LIMITS.minDistance,
      CAMERA_LIMITS.maxDistance,
    ),
    azimuth: wrapAngle(rig.azimuth),
    polar: clamp(rig.polar, CAMERA_LIMITS.minPolar, CAMERA_LIMITS.maxPolar),
  };
}

/**
 * Ground-plane basis of the camera: `forward` is the view direction flattened
 * onto the ground, `right` is the on-screen right direction.
 */
export function groundBasis(azimuth: number) {
  const sin = Math.sin(azimuth);
  const cos = Math.cos(azimuth);
  return {
    forwardX: -sin,
    forwardZ: -cos,
    rightX: cos,
    rightZ: -sin,
  };
}

/**
 * World units covered by one screen pixel at the focus plane. Keeps panning
 * speed constant on screen whatever the zoom level.
 */
export function worldUnitsPerPixel(
  distance: number,
  { viewportHeight, fovDegrees }: ScreenMetrics,
): number {
  const height = Math.max(viewportHeight, 1);
  const halfFov = (fovDegrees * Math.PI) / 360;
  return (2 * distance * Math.tan(halfFov)) / height;
}

/**
 * Moves the focus point by a screen-space offset expressed in pixels, where
 * positive `dx`/`dy` mean "the view travels right / away from the viewer".
 *
 * Vertical motion is divided by sin(polar): at a shallow angle a screen pixel
 * covers much more ground, otherwise panning feels stuck near the horizon.
 */
export function panRig(
  rig: RigState,
  dx: number,
  dy: number,
  metrics: ScreenMetrics,
): RigState {
  const unit = worldUnitsPerPixel(rig.distance, metrics);
  const forwardUnit = unit / Math.max(Math.sin(rig.polar), 0.25);
  return panRigWorld(rig, dx * unit, dy * forwardUnit);
}

/**
 * Same as `panRig` but the offsets are already expressed in world units,
 * used by the keyboard where a constant speed in tiles per second is wanted.
 */
export function panRigWorld(
  rig: RigState,
  right: number,
  forward: number,
): RigState {
  const basis = groundBasis(rig.azimuth);
  return {
    ...rig,
    targetX: rig.targetX + basis.rightX * right + basis.forwardX * forward,
    targetZ: rig.targetZ + basis.rightZ * right + basis.forwardZ * forward,
  };
}

export function orbitRig(
  rig: RigState,
  deltaAzimuth: number,
  deltaPolar: number,
): RigState {
  return {
    ...rig,
    azimuth: rig.azimuth + deltaAzimuth,
    polar: clamp(
      rig.polar + deltaPolar,
      CAMERA_LIMITS.minPolar,
      CAMERA_LIMITS.maxPolar,
    ),
  };
}

/**
 * Exponential zoom: `amount > 0` pulls back, `amount < 0` moves in. Using an
 * exponential keeps each notch feeling equally strong at every scale.
 */
export function zoomRig(rig: RigState, amount: number): RigState {
  return {
    ...rig,
    distance: clamp(
      rig.distance * Math.exp(amount),
      CAMERA_LIMITS.minDistance,
      CAMERA_LIMITS.maxDistance,
    ),
  };
}

/**
 * Zoom that keeps the world point under the cursor roughly in place, which is
 * what makes pinch-to-zoom feel direct on a trackpad.
 */
export function zoomRigToPoint(
  rig: RigState,
  amount: number,
  focusX: number,
  focusZ: number,
): RigState {
  const zoomed = zoomRig(rig, amount);
  const ratio = zoomed.distance / rig.distance;
  return {
    ...zoomed,
    targetX: focusX + (rig.targetX - focusX) * ratio,
    targetZ: focusZ + (rig.targetZ - focusZ) * ratio,
  };
}

function damp(current: number, target: number, lambda: number, dt: number) {
  return current + (target - current) * (1 - Math.exp(-lambda * dt));
}

/**
 * Frame-rate independent smoothing towards the desired rig. Azimuth takes the
 * shortest path so crossing the ±PI seam doesn't spin the camera around.
 */
export function dampRig(
  current: RigState,
  desired: RigState,
  dt: number,
): RigState {
  const step = Math.max(dt, 0);
  return {
    targetX: damp(
      current.targetX,
      desired.targetX,
      CAMERA_DAMPING.target,
      step,
    ),
    targetZ: damp(
      current.targetZ,
      desired.targetZ,
      CAMERA_DAMPING.target,
      step,
    ),
    distance: damp(
      current.distance,
      desired.distance,
      CAMERA_DAMPING.distance,
      step,
    ),
    azimuth: wrapAngle(
      damp(
        current.azimuth,
        current.azimuth + shortestAngleDelta(current.azimuth, desired.azimuth),
        CAMERA_DAMPING.angle,
        step,
      ),
    ),
    polar: damp(current.polar, desired.polar, CAMERA_DAMPING.angle, step),
  };
}

/** True once the animated rig is close enough to stop requesting frames. */
export function isRigSettled(current: RigState, desired: RigState): boolean {
  return (
    Math.abs(current.targetX - desired.targetX) < SETTLE_EPSILON &&
    Math.abs(current.targetZ - desired.targetZ) < SETTLE_EPSILON &&
    Math.abs(current.distance - desired.distance) < SETTLE_EPSILON &&
    Math.abs(shortestAngleDelta(current.azimuth, desired.azimuth)) <
      SETTLE_EPSILON &&
    Math.abs(current.polar - desired.polar) < SETTLE_EPSILON
  );
}

export function rigCameraPosition(rig: RigState) {
  const sinPolar = Math.sin(rig.polar);
  return {
    x: rig.targetX + rig.distance * sinPolar * Math.sin(rig.azimuth),
    y: rig.distance * Math.cos(rig.polar),
    z: rig.targetZ + rig.distance * sinPolar * Math.cos(rig.azimuth),
  };
}
