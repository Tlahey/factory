import { describe, expect, it } from "vitest";
import {
  RigState,
  ScreenMetrics,
  clampRig,
  createDefaultRig,
  dampRig,
  groundBasis,
  isRigSettled,
  orbitRig,
  panRig,
  panRigWorld,
  rigCameraPosition,
  shortestAngleDelta,
  worldUnitsPerPixel,
  wrapAngle,
  zoomRig,
  zoomRigToPoint,
} from "./CameraRig";
import { CAMERA_BOUNDS, CAMERA_LIMITS } from "./CameraConfig";

const METRICS: ScreenMetrics = { viewportHeight: 800, fovDegrees: 45 };

const rig = (overrides: Partial<RigState> = {}): RigState => ({
  ...createDefaultRig(),
  ...overrides,
});

describe("wrapAngle / shortestAngleDelta", () => {
  it("wraps angles into ]-PI, PI]", () => {
    expect(wrapAngle(0)).toBeCloseTo(0);
    expect(wrapAngle(3 * Math.PI)).toBeCloseTo(Math.PI);
    expect(wrapAngle(-3 * Math.PI)).toBeCloseTo(Math.PI);
    expect(wrapAngle(Math.PI + 0.1)).toBeCloseTo(-Math.PI + 0.1);
  });

  it("takes the short way around the seam", () => {
    expect(shortestAngleDelta(Math.PI - 0.1, -Math.PI + 0.1)).toBeCloseTo(0.2);
    expect(shortestAngleDelta(-Math.PI + 0.1, Math.PI - 0.1)).toBeCloseTo(-0.2);
  });
});

describe("clampRig", () => {
  it("keeps the focus point inside the world bounds", () => {
    const clamped = clampRig(
      rig({ targetX: 9999, targetZ: -9999 }),
      CAMERA_BOUNDS,
    );
    expect(clamped.targetX).toBe(CAMERA_BOUNDS.maxX);
    expect(clamped.targetZ).toBe(CAMERA_BOUNDS.minZ);
  });

  it("keeps the camera above the horizon and within zoom limits", () => {
    const tooLow = clampRig(
      rig({ polar: Math.PI, distance: 1e6 }),
      CAMERA_BOUNDS,
    );
    expect(tooLow.polar).toBe(CAMERA_LIMITS.maxPolar);
    expect(tooLow.distance).toBe(CAMERA_LIMITS.maxDistance);

    const tooHigh = clampRig(rig({ polar: -1, distance: 0 }), CAMERA_BOUNDS);
    expect(tooHigh.polar).toBe(CAMERA_LIMITS.minPolar);
    expect(tooHigh.distance).toBe(CAMERA_LIMITS.minDistance);
  });
});

describe("groundBasis", () => {
  it("points the screen-right axis towards +X when facing -Z", () => {
    const basis = groundBasis(0);
    expect(basis.rightX).toBeCloseTo(1);
    expect(basis.rightZ).toBeCloseTo(0);
    expect(basis.forwardX).toBeCloseTo(0);
    expect(basis.forwardZ).toBeCloseTo(-1);
  });

  it("stays orthonormal when rotated", () => {
    const basis = groundBasis(Math.PI / 3);
    const dot = basis.rightX * basis.forwardX + basis.rightZ * basis.forwardZ;
    expect(dot).toBeCloseTo(0);
    expect(Math.hypot(basis.rightX, basis.rightZ)).toBeCloseTo(1);
  });
});

describe("panRig", () => {
  it("scales screen pixels with the zoom level", () => {
    const near = worldUnitsPerPixel(10, METRICS);
    const far = worldUnitsPerPixel(40, METRICS);
    expect(far).toBeCloseTo(near * 4);
  });

  it("moves the focus point along the screen axes", () => {
    const start = rig({
      azimuth: 0,
      targetX: 25,
      targetZ: 25,
      polar: Math.PI / 2,
    });
    const panned = panRig(start, 100, 0, METRICS);
    // Facing -Z with a null azimuth, screen-right is +X.
    expect(panned.targetX).toBeGreaterThan(start.targetX);
    expect(panned.targetZ).toBeCloseTo(start.targetZ);
  });

  it("pans away from the viewer on a positive vertical delta", () => {
    const start = rig({ azimuth: 0, targetX: 25, targetZ: 25 });
    const panned = panRig(start, 0, 100, METRICS);
    expect(panned.targetZ).toBeLessThan(start.targetZ);
  });

  it("is reversible", () => {
    const start = rig({ azimuth: 1.2, targetX: 20, targetZ: 30 });
    const roundTrip = panRig(panRig(start, 37, -12, METRICS), -37, 12, METRICS);
    expect(roundTrip.targetX).toBeCloseTo(start.targetX);
    expect(roundTrip.targetZ).toBeCloseTo(start.targetZ);
  });

  it("moves a constant world distance from the keyboard, whatever the zoom", () => {
    const near = panRigWorld(rig({ azimuth: 0, distance: 8 }), 5, 0);
    const far = panRigWorld(rig({ azimuth: 0, distance: 90 }), 5, 0);
    expect(near.targetX).toBeCloseTo(far.targetX);
  });
});

describe("orbitRig", () => {
  it("adds to the azimuth and clamps the tilt", () => {
    const orbited = orbitRig(rig({ azimuth: 1, polar: 1 }), 0.5, 0.25);
    expect(orbited.azimuth).toBeCloseTo(1.5);
    expect(orbited.polar).toBeCloseTo(1.25);

    expect(orbitRig(rig(), 0, 10).polar).toBe(CAMERA_LIMITS.maxPolar);
    expect(orbitRig(rig(), 0, -10).polar).toBe(CAMERA_LIMITS.minPolar);
  });
});

describe("zoomRig", () => {
  it("is exponential and symmetric", () => {
    const start = rig({ distance: 40 });
    expect(zoomRig(start, 0).distance).toBeCloseTo(40);
    expect(zoomRig(start, 0.5).distance).toBeGreaterThan(40);
    expect(zoomRig(start, -0.5).distance).toBeLessThan(40);
    expect(zoomRig(zoomRig(start, 0.3), -0.3).distance).toBeCloseTo(40);
  });

  it("respects the distance limits", () => {
    expect(zoomRig(rig(), 100).distance).toBe(CAMERA_LIMITS.maxDistance);
    expect(zoomRig(rig(), -100).distance).toBe(CAMERA_LIMITS.minDistance);
  });

  it("keeps the cursor point anchored when zooming towards it", () => {
    const start = rig({ targetX: 30, targetZ: 30, distance: 40 });
    const zoomed = zoomRigToPoint(start, -0.5, 10, 10);
    const ratio = zoomed.distance / start.distance;

    expect(zoomed.targetX).toBeCloseTo(10 + (30 - 10) * ratio);
    expect(zoomed.targetZ).toBeCloseTo(10 + (30 - 10) * ratio);
    // Zooming in walks the focus point towards the cursor.
    expect(zoomed.targetX).toBeLessThan(start.targetX);
  });

  it("does not move the focus point when the cursor is already on it", () => {
    const start = rig({ targetX: 12, targetZ: 8 });
    const zoomed = zoomRigToPoint(start, -0.4, 12, 8);
    expect(zoomed.targetX).toBeCloseTo(12);
    expect(zoomed.targetZ).toBeCloseTo(8);
  });
});

describe("dampRig", () => {
  it("converges towards the desired rig", () => {
    const desired = rig({ targetX: 10, targetZ: 10, distance: 60, azimuth: 1 });
    let current = rig({ targetX: 0, targetZ: 0, distance: 20, azimuth: 0 });

    for (let i = 0; i < 200; i++) current = dampRig(current, desired, 1 / 60);

    expect(isRigSettled(current, desired)).toBe(true);
  });

  it("is frame-rate independent", () => {
    const desired = rig({ targetX: 10 });
    const start = rig({ targetX: 0 });

    let smallSteps = start;
    for (let i = 0; i < 20; i++)
      smallSteps = dampRig(smallSteps, desired, 0.005);
    const bigSteps = dampRig(dampRig(start, desired, 0.05), desired, 0.05);

    expect(smallSteps.targetX).toBeCloseTo(bigSteps.targetX, 3);
  });

  it("crosses the azimuth seam the short way", () => {
    const desired = rig({ azimuth: -Math.PI + 0.05 });
    const current = dampRig(rig({ azimuth: Math.PI - 0.05 }), desired, 1 / 60);
    // Going the long way would leave the angle near zero.
    expect(Math.abs(current.azimuth)).toBeGreaterThan(3);
  });
});

describe("rigCameraPosition", () => {
  it("places the camera above the target when looking straight down", () => {
    const position = rigCameraPosition(
      rig({ targetX: 5, targetZ: 7, distance: 30, polar: 0 }),
    );
    expect(position.x).toBeCloseTo(5);
    expect(position.z).toBeCloseTo(7);
    expect(position.y).toBeCloseTo(30);
  });

  it("keeps the camera at `distance` from the focus point", () => {
    const state = rig({
      targetX: 5,
      targetZ: 7,
      distance: 30,
      polar: 1.1,
      azimuth: 2,
    });
    const position = rigCameraPosition(state);
    const distance = Math.hypot(
      position.x - state.targetX,
      position.y,
      position.z - state.targetZ,
    );
    expect(distance).toBeCloseTo(30);
  });

  it("never goes below the ground", () => {
    const position = rigCameraPosition(
      rig({
        polar: CAMERA_LIMITS.maxPolar,
        distance: CAMERA_LIMITS.minDistance,
      }),
    );
    expect(position.y).toBeGreaterThan(0);
  });
});
