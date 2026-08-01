import { describe, it, expect } from "vitest";
import * as THREE from "three";
import {
  createBoltRingGeometry,
  createLadderGeometry,
  createLouverGeometry,
  createPipeGeometry,
  createRivetRowGeometry,
  createSawTeethGeometry,
} from "./DetailGeometry";

/** Axis-aligned bounds of a geometry, for placement assertions. */
function boundsOf(geometry: THREE.BufferGeometry): THREE.Box3 {
  geometry.computeBoundingBox();
  return geometry.boundingBox!;
}

describe("createBoltRingGeometry", () => {
  it("merges every bolt into a single geometry", () => {
    const one = createBoltRingGeometry({ count: 1, radius: 0.3 });
    const eight = createBoltRingGeometry({ count: 8, radius: 0.3 });

    // One geometry, eight times the vertices — not eight geometries.
    expect(eight.getAttribute("position").count).toBe(
      one.getAttribute("position").count * 8,
    );
  });

  it("lays the bolts on the requested radius", () => {
    const geometry = createBoltRingGeometry({
      count: 8,
      radius: 0.4,
      boltRadius: 0.02,
    });
    const bounds = boundsOf(geometry);

    // Outer edge sits at radius + bolt radius, within a rounding margin.
    expect(bounds.max.x).toBeCloseTo(0.42, 2);
    expect(bounds.min.x).toBeCloseTo(-0.42, 2);
    expect(bounds.max.z).toBeCloseTo(0.42, 2);
  });

  it("stands the bolts out along the requested axis", () => {
    const alongY = boundsOf(
      createBoltRingGeometry({
        count: 6,
        radius: 0.3,
        boltHeight: 0.1,
        axis: "y",
      }),
    );
    const alongZ = boundsOf(
      createBoltRingGeometry({
        count: 6,
        radius: 0.3,
        boltHeight: 0.1,
        axis: "z",
      }),
    );

    // The head height shows up on the axis it points along...
    expect(alongY.max.y - alongY.min.y).toBeCloseTo(0.1, 4);
    expect(alongZ.max.z - alongZ.min.z).toBeCloseTo(0.1, 4);
    // ...and the ring itself moves to the plane perpendicular to that axis: a
    // Y-facing ring is flat in Y, a Z-facing one spreads into Y.
    expect(alongY.max.z).toBeGreaterThan(0.25);
    expect(alongZ.max.y).toBeGreaterThan(0.25);
    expect(alongZ.max.y).toBeLessThanOrEqual(0.325);
  });
});

describe("createRivetRowGeometry", () => {
  it("spans from the first point to the last", () => {
    const geometry = createRivetRowGeometry({
      count: 5,
      from: new THREE.Vector3(-0.4, 0.2, 0.3),
      to: new THREE.Vector3(0.4, 0.2, 0.3),
      radius: 0.02,
    });
    const bounds = boundsOf(geometry);

    expect(bounds.min.x).toBeCloseTo(-0.42, 2);
    expect(bounds.max.x).toBeCloseTo(0.42, 2);
    // The row stays centred on the seam it follows.
    expect((bounds.min.y + bounds.max.y) / 2).toBeCloseTo(0.2, 4);
    expect((bounds.min.z + bounds.max.z) / 2).toBeCloseTo(0.3, 4);
  });

  it("places a single rivet on the start point instead of dividing by zero", () => {
    const geometry = createRivetRowGeometry({
      count: 1,
      from: new THREE.Vector3(0.1, 0.5, 0),
      to: new THREE.Vector3(0.9, 0.5, 0),
    });
    const bounds = boundsOf(geometry);
    const centerX = (bounds.min.x + bounds.max.x) / 2;

    expect(centerX).toBeCloseTo(0.1, 4);
    expect(Number.isNaN(centerX)).toBe(false);
  });
});

describe("createLouverGeometry", () => {
  it("keeps every slat inside the requested height", () => {
    const geometry = createLouverGeometry({
      count: 5,
      width: 0.4,
      height: 0.5,
      tilt: 0,
    });
    const bounds = boundsOf(geometry);

    expect(bounds.max.y).toBeLessThanOrEqual(0.25 + 1e-6);
    expect(bounds.min.y).toBeGreaterThanOrEqual(-0.25 - 1e-6);
    expect(bounds.max.x).toBeCloseTo(0.2, 4);
  });

  it("scales vertex count with the slat count", () => {
    const three = createLouverGeometry({ count: 3, width: 0.4, height: 0.4 });
    const six = createLouverGeometry({ count: 6, width: 0.4, height: 0.4 });

    expect(six.getAttribute("position").count).toBe(
      three.getAttribute("position").count * 2,
    );
  });
});

describe("createPipeGeometry", () => {
  it("runs through its waypoints", () => {
    const geometry = createPipeGeometry(
      [
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 1, 0),
        new THREE.Vector3(0.5, 1, 0),
      ],
      0.05,
    );
    const bounds = boundsOf(geometry);

    expect(bounds.max.y).toBeGreaterThan(0.9);
    expect(bounds.max.x).toBeGreaterThan(0.4);
  });

  it("rejects a pipe that has no length", () => {
    expect(() => createPipeGeometry([new THREE.Vector3()])).toThrow(
      /at least two points/,
    );
  });
});

describe("createLadderGeometry", () => {
  it("stands on y = 0 and reaches the requested height", () => {
    const bounds = boundsOf(createLadderGeometry({ height: 1.5 }));

    expect(bounds.min.y).toBeCloseTo(0, 4);
    expect(bounds.max.y).toBeCloseTo(1.5, 4);
  });

  it("adds rungs proportionally to its height", () => {
    const short = createLadderGeometry({ height: 0.5, rungSpacing: 0.1 });
    const tall = createLadderGeometry({ height: 1.5, rungSpacing: 0.1 });

    expect(tall.getAttribute("position").count).toBeGreaterThan(
      short.getAttribute("position").count,
    );
  });
});

describe("createSawTeethGeometry", () => {
  it("rings the blade at the given radius", () => {
    const geometry = createSawTeethGeometry({
      count: 24,
      radius: 0.26,
      size: 0.05,
    });
    const bounds = boundsOf(geometry);

    // Teeth point outward, so the outer edge clears the blade radius.
    expect(bounds.max.x).toBeGreaterThan(0.26);
    expect(bounds.max.x).toBeLessThan(0.3);
    // Symmetric around the hub.
    expect(bounds.max.x + bounds.min.x).toBeCloseTo(0, 3);
    expect(bounds.max.z + bounds.min.z).toBeCloseTo(0, 3);
  });

  it("stays as thin as the blade it belongs to", () => {
    const geometry = createSawTeethGeometry({
      count: 12,
      radius: 0.3,
      size: 0.06,
      thickness: 0.02,
    });
    const bounds = boundsOf(geometry);

    expect(bounds.max.y - bounds.min.y).toBeLessThanOrEqual(0.02 + 1e-6);
  });
});
