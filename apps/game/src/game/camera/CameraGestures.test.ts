import { describe, expect, it } from "vitest";
import {
  SchemeDetector,
  WheelInput,
  classifyPointerDrag,
  classifyWheelGesture,
  looksLikeTrackpadWheel,
  normalizeWheelDelta,
} from "./CameraGestures";

const wheel = (overrides: Partial<WheelInput> = {}): WheelInput => ({
  deltaX: 0,
  deltaY: 0,
  deltaMode: 0,
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
  altKey: false,
  ...overrides,
});

/** A notched mouse wheel: one large, integral, vertical step. */
const mouseWheel = (deltaY = 120) => wheel({ deltaY });
/** A trackpad: small fractional deltas, often with a horizontal component. */
const trackpadWheel = (deltaX = 0, deltaY = 3.5) => wheel({ deltaX, deltaY });

describe("normalizeWheelDelta", () => {
  it("passes pixel deltas through", () => {
    expect(normalizeWheelDelta(wheel({ deltaX: 4, deltaY: -8 }))).toEqual({
      dx: 4,
      dy: -8,
    });
  });

  it("converts line and page deltas to pixels", () => {
    expect(normalizeWheelDelta(wheel({ deltaY: 3, deltaMode: 1 })).dy).toBe(48);
    expect(normalizeWheelDelta(wheel({ deltaY: 1, deltaMode: 2 })).dy).toBe(
      400,
    );
  });
});

describe("looksLikeTrackpadWheel", () => {
  it("recognises trackpad-shaped events", () => {
    expect(looksLikeTrackpadWheel(trackpadWheel(0, 2.5))).toBe(true);
    expect(looksLikeTrackpadWheel(trackpadWheel(12, 0))).toBe(true);
    // Pinch is synthesized as ctrl+wheel and only a touch surface produces it.
    expect(looksLikeTrackpadWheel(wheel({ deltaY: 120, ctrlKey: true }))).toBe(
      true,
    );
  });

  it("recognises notched wheels", () => {
    expect(looksLikeTrackpadWheel(mouseWheel(120))).toBe(false);
    expect(looksLikeTrackpadWheel(mouseWheel(-100))).toBe(false);
    expect(looksLikeTrackpadWheel(wheel({ deltaY: 3, deltaMode: 1 }))).toBe(
      false,
    );
  });
});

describe("SchemeDetector", () => {
  it("needs a couple of consistent samples before switching", () => {
    const detector = new SchemeDetector("trackpad");
    expect(detector.feed(mouseWheel())).toBe("trackpad");
    expect(detector.feed(mouseWheel())).toBe("mouse");
  });

  it("does not flip on a single odd event", () => {
    const detector = new SchemeDetector("trackpad");
    detector.feed(trackpadWheel(0, 2));
    detector.feed(trackpadWheel(0, 2));
    expect(detector.feed(mouseWheel())).toBe("trackpad");
  });

  it("ignores modifier gestures, which look the same on both devices", () => {
    const detector = new SchemeDetector("trackpad");
    detector.feed(wheel({ deltaY: 120, shiftKey: true }));
    detector.feed(wheel({ deltaY: 120, shiftKey: true }));
    expect(detector.current).toBe("trackpad");
  });
});

describe("classifyWheelGesture", () => {
  it("pans on a bare two-finger scroll in trackpad mode", () => {
    const gesture = classifyWheelGesture(trackpadWheel(6, -4), "trackpad");
    expect(gesture.kind).toBe("pan");
    if (gesture.kind !== "pan") return;
    expect(gesture.dx).toBeGreaterThan(0);
    expect(gesture.dy).toBeLessThan(0);
  });

  it("zooms on a bare wheel in mouse mode", () => {
    const gesture = classifyWheelGesture(mouseWheel(120), "mouse");
    expect(gesture.kind).toBe("zoom");
    if (gesture.kind !== "zoom") return;
    // Scrolling down pulls the camera back.
    expect(gesture.amount).toBeGreaterThan(0);
  });

  it("zooms towards the cursor on pinch, in both schemes", () => {
    for (const scheme of ["trackpad", "mouse"] as const) {
      const pinchIn = classifyWheelGesture(
        wheel({ deltaY: -20, ctrlKey: true }),
        scheme,
      );
      expect(pinchIn.kind).toBe("zoom");
      if (pinchIn.kind !== "zoom") return;
      expect(pinchIn.amount).toBeLessThan(0);
      expect(pinchIn.toCursor).toBe(true);
    }
  });

  it("zooms on option + scroll", () => {
    const gesture = classifyWheelGesture(trackpadWheel(0, 10), "trackpad");
    expect(gesture.kind).toBe("pan");
    const alt = classifyWheelGesture(
      wheel({ deltaY: 10, altKey: true }),
      "trackpad",
    );
    expect(alt.kind).toBe("zoom");
  });

  it("orbits on shift or cmd + scroll", () => {
    for (const modifier of [{ shiftKey: true }, { metaKey: true }]) {
      const gesture = classifyWheelGesture(
        wheel({ deltaX: 10, deltaY: 5, ...modifier }),
        "trackpad",
      );
      expect(gesture.kind).toBe("orbit");
      if (gesture.kind !== "orbit") return;
      expect(gesture.azimuth).not.toBe(0);
      expect(gesture.polar).not.toBe(0);
    }
  });

  it("gives pinch priority over every other modifier", () => {
    const gesture = classifyWheelGesture(
      wheel({ deltaY: 10, ctrlKey: true, shiftKey: true, altKey: true }),
      "trackpad",
    );
    expect(gesture.kind).toBe("zoom");
  });
});

describe("classifyPointerDrag", () => {
  const press = (
    overrides: Partial<Parameters<typeof classifyPointerDrag>[0]> = {},
  ) => ({
    button: 0,
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    spaceHeld: false,
    ...overrides,
  });

  it("pans with the left button when nothing else wants the click", () => {
    expect(classifyPointerDrag(press(), true)).toBe("pan");
  });

  it("leaves the click to the world while a tool is armed", () => {
    expect(classifyPointerDrag(press(), false)).toBe("none");
  });

  it("still pans while a tool is armed when space is held", () => {
    expect(classifyPointerDrag(press({ spaceHeld: true }), false)).toBe("pan");
  });

  it("orbits with option, the secondary button and the middle button", () => {
    expect(classifyPointerDrag(press({ altKey: true }), false)).toBe("orbit");
    expect(classifyPointerDrag(press({ button: 2 }), false)).toBe("orbit");
    expect(classifyPointerDrag(press({ button: 1 }), false)).toBe("orbit");
  });

  it("ignores exotic buttons", () => {
    expect(classifyPointerDrag(press({ button: 4 }), true)).toBe("none");
  });
});
