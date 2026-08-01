import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/**
 * MECHANICAL DETAIL HELPERS
 *
 * Bolts, rivets, vents and pipework are what make a box read as machinery
 * rather than as a box. The naive way to add them is one `THREE.Mesh` per
 * detail — the old sawmill did exactly that with its 24 saw teeth, which is 24
 * extra draw calls for *every* sawmill on the map.
 *
 * Every helper here bakes its details into a **single merged geometry**, so an
 * entire ring of bolts or a full vent grille costs one mesh. Same look, one
 * draw call.
 *
 * All geometries are returned in local space around the origin; position them
 * by placing the resulting mesh.
 */

/** Collapses a list of transformed parts into one geometry. */
function merge(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const merged = mergeGeometries(parts, false);
  parts.forEach((part) => part.dispose());
  if (!merged) {
    throw new Error("DetailGeometry: failed to merge geometries");
  }
  return merged;
}

/** Rotates a geometry built along +Y so it points along the requested axis. */
function orient(geometry: THREE.BufferGeometry, axis: "x" | "y" | "z"): void {
  if (axis === "x") geometry.rotateZ(-Math.PI / 2);
  else if (axis === "z") geometry.rotateX(Math.PI / 2);
}

export interface BoltRingOptions {
  /** Number of bolts around the ring. */
  count: number;
  /** Distance from the centre to each bolt. */
  radius: number;
  /** Radius of an individual bolt head. */
  boltRadius?: number;
  /** How far each bolt head stands proud of the surface. */
  boltHeight?: number;
  /** Axis the bolt heads stick out along. */
  axis?: "x" | "y" | "z";
}

/**
 * A ring of hex bolt heads — flange joints, hatch covers, turret bases.
 */
export function createBoltRingGeometry({
  count,
  radius,
  boltRadius = 0.025,
  boltHeight = 0.02,
  axis = "y",
}: BoltRingOptions): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    // 6 radial segments: a hex head, which is what a bolt actually looks like.
    const bolt = new THREE.CylinderGeometry(
      boltRadius,
      boltRadius,
      boltHeight,
      6,
    );
    // Built along +Y, then swung onto the plane perpendicular to `axis`.
    if (axis === "y") {
      bolt.translate(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
    } else if (axis === "z") {
      bolt.rotateX(Math.PI / 2);
      bolt.translate(Math.cos(angle) * radius, Math.sin(angle) * radius, 0);
    } else {
      bolt.rotateZ(-Math.PI / 2);
      bolt.translate(0, Math.sin(angle) * radius, Math.cos(angle) * radius);
    }
    parts.push(bolt);
  }

  return merge(parts);
}

export interface RivetRowOptions {
  /** Number of rivets in the row. */
  count: number;
  /** First rivet position. */
  from: THREE.Vector3;
  /** Last rivet position. */
  to: THREE.Vector3;
  /** Radius of a rivet head. */
  radius?: number;
  /** How far each head stands proud of the panel. */
  depth?: number;
  /** Axis the heads stick out along. */
  axis?: "x" | "y" | "z";
}

/**
 * An evenly spaced line of dome rivets along a panel seam.
 */
export function createRivetRowGeometry({
  count,
  from,
  to,
  radius = 0.022,
  depth = 0.014,
  axis = "z",
}: RivetRowOptions): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  // `count - 1` gaps between `count` rivets; a single rivet just sits at `from`.
  const steps = Math.max(count - 1, 1);

  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0 : i / steps;
    const rivet = new THREE.CylinderGeometry(radius, radius * 0.8, depth, 6);
    orient(rivet, axis);
    rivet.translate(
      THREE.MathUtils.lerp(from.x, to.x, t),
      THREE.MathUtils.lerp(from.y, to.y, t),
      THREE.MathUtils.lerp(from.z, to.z, t),
    );
    parts.push(rivet);
  }

  return merge(parts);
}

export interface LouverOptions {
  /** Number of slats. */
  count: number;
  /** Total width of the grille. */
  width: number;
  /** Total height the slats are spread over. */
  height: number;
  /** How far the slats stand out of the panel. */
  depth?: number;
  /** Tilt of each slat, in radians. */
  tilt?: number;
}

/**
 * A stack of angled slats — cooling vents and air intakes.
 */
export function createLouverGeometry({
  count,
  width,
  height,
  depth = 0.03,
  tilt = 0.5,
}: LouverOptions): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const spacing = height / count;
  const slatHeight = spacing * 0.7;

  for (let i = 0; i < count; i++) {
    const slat = new THREE.BoxGeometry(width, slatHeight, depth);
    slat.rotateX(tilt);
    // Centre the stack on the origin.
    slat.translate(0, height / 2 - spacing * (i + 0.5), 0);
    parts.push(slat);
  }

  return merge(parts);
}

/**
 * A smooth pipe run through the given waypoints.
 *
 * Uses a Catmull-Rom curve so elbows come out rounded instead of the
 * hand-placed straight cylinders the old furnace used.
 */
export function createPipeGeometry(
  points: THREE.Vector3[],
  radius = 0.05,
  radialSegments = 8,
): THREE.BufferGeometry {
  if (points.length < 2) {
    throw new Error("DetailGeometry: a pipe needs at least two points");
  }
  const curve = new THREE.CatmullRomCurve3(points);
  // ~8 tube segments per waypoint keeps elbows smooth without wasting vertices.
  const tubularSegments = Math.max(8, points.length * 8);
  return new THREE.TubeGeometry(
    curve,
    tubularSegments,
    radius,
    radialSegments,
    false,
  );
}

export interface LadderOptions {
  /** Height of the ladder. */
  height: number;
  /** Distance between the two rails. */
  width?: number;
  /** Radius of the rails and rungs. */
  barRadius?: number;
  /** Vertical gap between rungs. */
  rungSpacing?: number;
}

/**
 * A maintenance ladder: two vertical rails plus rungs, merged into one mesh.
 * Its base sits at y = 0.
 */
export function createLadderGeometry({
  height,
  width = 0.16,
  barRadius = 0.012,
  rungSpacing = 0.12,
}: LadderOptions): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];

  for (const side of [-1, 1]) {
    const rail = new THREE.CylinderGeometry(barRadius, barRadius, height, 6);
    rail.translate((side * width) / 2, height / 2, 0);
    parts.push(rail);
  }

  const rungCount = Math.max(1, Math.floor(height / rungSpacing) - 1);
  for (let i = 0; i < rungCount; i++) {
    const rung = new THREE.CylinderGeometry(
      barRadius * 0.8,
      barRadius * 0.8,
      width,
      6,
    );
    rung.rotateZ(Math.PI / 2);
    rung.translate(0, rungSpacing * (i + 1), 0);
    parts.push(rung);
  }

  return merge(parts);
}

export interface SawToothOptions {
  /** Number of teeth. */
  count: number;
  /** Radius the teeth sit at. */
  radius: number;
  /** Size of one tooth. */
  size?: number;
  /** Thickness of the blade the teeth belong to. */
  thickness?: number;
}

/**
 * Saw teeth pointing outward around a horizontal blade.
 *
 * Replaces the old per-tooth `THREE.Mesh` loop (24 draw calls per sawmill).
 */
export function createSawTeethGeometry({
  count,
  radius,
  size = 0.05,
  thickness = 0.02,
}: SawToothOptions): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const tooth = new THREE.ConeGeometry(size * 0.5, size, 3);
    // Cones point along +Y; lay one flat so it points along +X...
    tooth.rotateZ(-Math.PI / 2);
    // ...and squash it vertically, because the blade lies in the XZ plane and
    // spins about Y: the teeth have to be thin in Y, not in Z.
    tooth.scale(1, thickness / size, 1);
    // ...then swing it around the blade so it points outward.
    tooth.translate(radius, 0, 0);
    tooth.rotateY(-angle);
    parts.push(tooth);
  }

  return merge(parts);
}
