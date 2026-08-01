import { CAMERA_SENSITIVITY } from "./CameraConfig";

/**
 * Input scheme the camera is tuned for.
 *
 * - `trackpad`: two-finger scroll pans the map, pinch zooms (the macOS way).
 * - `mouse`: the wheel zooms, like most RTS games.
 * - `auto`: detected from the shape of the incoming wheel events.
 */
export type NavigationScheme = "auto" | "trackpad" | "mouse";
export type ResolvedScheme = Exclude<NavigationScheme, "auto">;

/** Minimal shape of a `WheelEvent`, so gestures stay testable. */
export interface WheelInput {
  deltaX: number;
  deltaY: number;
  deltaMode: number;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
}

export type WheelGesture =
  | { kind: "pan"; dx: number; dy: number }
  | { kind: "zoom"; amount: number; toCursor: boolean }
  | { kind: "orbit"; azimuth: number; polar: number };

const LINE_HEIGHT_PX = 16;
const PAGE_HEIGHT_PX = 400;

/** Converts line/page wheel deltas into pixels. */
export function normalizeWheelDelta(input: WheelInput): {
  dx: number;
  dy: number;
} {
  const scale =
    input.deltaMode === 1
      ? LINE_HEIGHT_PX
      : input.deltaMode === 2
        ? PAGE_HEIGHT_PX
        : 1;
  return { dx: input.deltaX * scale, dy: input.deltaY * scale };
}

/**
 * Heuristic telling a trackpad apart from a notched wheel.
 *
 * Browsers never say which device produced a wheel event, but trackpads emit
 * pixel deltas that are small, often fractional, and frequently carry a
 * horizontal component — notched wheels emit large, integral, vertical-only
 * steps (or line/page deltas).
 */
export function looksLikeTrackpadWheel(input: WheelInput): boolean {
  // Browsers synthesize ctrl+wheel for pinch, which only a touch surface does.
  if (input.ctrlKey) return true;
  if (input.deltaMode !== 0) return false;
  if (input.deltaX !== 0) return true;
  if (!Number.isInteger(input.deltaY)) return true;
  return Math.abs(input.deltaY) > 0 && Math.abs(input.deltaY) < 40;
}

/**
 * Sticky auto-detection: a couple of consistent samples are needed to flip the
 * scheme, so a single odd event can't make navigation jump between modes.
 */
export class SchemeDetector {
  private score = 0;

  constructor(private scheme: ResolvedScheme = "trackpad") {}

  get current(): ResolvedScheme {
    return this.scheme;
  }

  /** Feeds a wheel event and returns the scheme to use for it. */
  feed(input: WheelInput): ResolvedScheme {
    // Modifier-driven gestures mean the same thing in both schemes and would
    // pollute the detection, so they are ignored.
    if (input.shiftKey || input.metaKey || input.altKey) return this.scheme;

    const vote = looksLikeTrackpadWheel(input) ? 1 : -1;
    this.score = Math.max(-3, Math.min(3, this.score + vote));

    if (this.score >= 2) this.scheme = "trackpad";
    else if (this.score <= -2) this.scheme = "mouse";

    return this.scheme;
  }

  reset(scheme: ResolvedScheme) {
    this.scheme = scheme;
    this.score = 0;
  }
}

/**
 * Maps a wheel event to a camera gesture.
 *
 * Shared by both schemes:
 *   - pinch (ctrl+wheel) → zoom to cursor
 *   - option/alt + scroll → zoom to cursor
 *   - shift or cmd + scroll → orbit (horizontal = rotate, vertical = tilt)
 *
 * Scheme specific:
 *   - trackpad: bare two-finger scroll pans
 *   - mouse: bare wheel zooms
 */
export function classifyWheelGesture(
  input: WheelInput,
  scheme: ResolvedScheme,
): WheelGesture {
  const { dx, dy } = normalizeWheelDelta(input);

  if (input.ctrlKey) {
    return {
      kind: "zoom",
      amount: dy * CAMERA_SENSITIVITY.pinchZoom,
      toCursor: true,
    };
  }

  if (input.altKey) {
    return {
      kind: "zoom",
      amount: dy * CAMERA_SENSITIVITY.wheelZoom,
      toCursor: true,
    };
  }

  if (input.shiftKey || input.metaKey) {
    return {
      kind: "orbit",
      // Fingers sliding left (dx > 0) and up (dy > 0) rotate and tilt the same
      // way as dragging the pointer right / up does.
      azimuth: dx * CAMERA_SENSITIVITY.scrollOrbitAzimuth,
      polar: dy * CAMERA_SENSITIVITY.scrollOrbitPolar,
    };
  }

  if (scheme === "mouse") {
    return {
      kind: "zoom",
      amount: dy * CAMERA_SENSITIVITY.wheelZoom,
      toCursor: true,
    };
  }

  return {
    kind: "pan",
    dx: dx * CAMERA_SENSITIVITY.scrollPan,
    dy: dy * CAMERA_SENSITIVITY.scrollPan,
  };
}

export interface PointerDragInput {
  button: number;
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  /** Space bar held: forces panning even when a build tool is armed. */
  spaceHeld: boolean;
}

export type DragMode = "pan" | "orbit" | "none";

/**
 * Decides what a pointer press does.
 *
 * `canPan` is false while a build tool is armed or an interactive entity is
 * hovered, so a click keeps meaning "place / select" — holding space or a
 * modifier is the explicit escape hatch.
 */
export function classifyPointerDrag(
  input: PointerDragInput,
  canPan: boolean,
): DragMode {
  // Secondary (two-finger click) and middle button always orbit.
  if (input.button === 1 || input.button === 2) return "orbit";
  if (input.button !== 0) return "none";
  // Cmd is the macOS "modify the view" modifier; ctrl is its mouse equivalent.
  if (input.altKey || input.metaKey || input.ctrlKey) return "orbit";
  if (input.spaceHeld) return "pan";
  return canPan ? "pan" : "none";
}
