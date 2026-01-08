/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, vi, beforeEach, test } from "vitest";
import { InputSystem } from "./InputSystem";
import { useGameStore } from "../state/store";
// import * as THREE from 'three';
// import { World } from '../core/World';

// Mock THREE
vi.mock("three", async () => {
  const actual = (await vi.importActual("three")) as any;
  return {
    ...actual,
    Raycaster: class {
      setFromCamera() {}
      intersectObjects() {
        return [];
      }
      ray = { intersectPlane: () => false };
    },
    Vector2: class {
      x = 0;
      y = 0;
    },
    Vector3: class {
      x = 0;
      y = 0;
      z = 0;
    },
    Plane: class {},
  };
});

vi.mock("../state/store", () => ({
  useGameStore: {
    getState: vi.fn(() => ({
      selectedBuilding: "extractor",
      setCameraAngles: vi.fn(),
    })),
    subscribe: vi.fn(() => vi.fn()), // returns unsubscribe fn
  },
}));

describe("InputSystem Rotation Tests", () => {
  let inputSystem: InputSystem;
  let mockWorld: any;
  let mockCamera: any;
  let mockDomElement: any;
  let onHoverMock: any;

  beforeEach(() => {
    mockWorld = {
      getBuilding: () => null,
      canPlaceBuilding: () => true,
    } as any;

    // Mock window
    global.window = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as any;

    mockCamera = {
      position: { x: 0, y: 0, z: 0, set: vi.fn() },
      lookAt: vi.fn(),
    } as any;

    mockDomElement = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      getBoundingClientRect: () => ({
        left: 0,
        top: 0,
        width: 100,
        height: 100,
      }),
    } as any;

    onHoverMock = vi.fn();

    inputSystem = new InputSystem(
      mockDomElement,
      mockCamera,
      mockWorld,
      undefined, // onWorldChange
      onHoverMock,
    );
  });

  test("Initial rotation is north", () => {
    // Access private property via casting
    expect((inputSystem as any).currentRotation).toBe("north");
  });

  test("rotateSelection cycles through directions", () => {
    // Clockwise
    (inputSystem as any).rotateSelection(true);
    expect((inputSystem as any).currentRotation).toBe("east");

    (inputSystem as any).rotateSelection(true);
    expect((inputSystem as any).currentRotation).toBe("south");

    (inputSystem as any).rotateSelection(true);
    expect((inputSystem as any).currentRotation).toBe("west");

    (inputSystem as any).rotateSelection(true);
    expect((inputSystem as any).currentRotation).toBe("north");

    // Counter-Clockwise
    (inputSystem as any).rotateSelection(false);
    expect((inputSystem as any).currentRotation).toBe("west");
  });

  test("onWheel triggers rotation and updates ghost visual via onHover", () => {
    // Setup scenarios
    // 1. Simulate a hover first to set lastHoverPosition
    const hoverEvent = { clientX: 50, clientY: 50 } as any;

    // Mock raycaster intersection to return valid point
    (inputSystem as any).getIntersection = () => ({ x: 5, y: 5 });
    (inputSystem as any).onPointerMove(hoverEvent);

    // Check onHover called initially
    // The mock might be called with different args depending on implementation details I might have missed
    // But based on my changes: this.onHover(intersection.x, intersection.y, isValid, ghost, this.currentRotation);
    expect(onHoverMock).toHaveBeenCalled();
    const lastCall = onHoverMock.mock.calls[onHoverMock.mock.calls.length - 1];
    expect(lastCall[0]).toBe(5); // x
    expect(lastCall[1]).toBe(5); // y
    expect(lastCall[3]).toBe("extractor"); // ghost
    expect(lastCall[4]).toBe("north"); // rotation

    onHoverMock.mockClear();

    // 2. Simulate Scroll (Up = negative deltaY = clockwise)
    const wheelEvent = {
      preventDefault: vi.fn(),
      deltaY: -100,
    } as any;

    (inputSystem as any).onWheel(wheelEvent);

    // Verify:
    // 1. Rotation changed
    expect((inputSystem as any).currentRotation).toBe("east");

    // 2. onHover called again with NEW rotation
    expect(onHoverMock).toHaveBeenCalled();
    const lastWheelCall =
      onHoverMock.mock.calls[onHoverMock.mock.calls.length - 1];
    expect(lastWheelCall[3]).toBe("extractor");
    expect(lastWheelCall[4]).toBe("east"); // Rotation changed to east
  });

  test("onWheel defaults to zoom if no building selected", () => {
    // Mock store to return null selection
    (useGameStore.getState as any).mockReturnValue({ selectedBuilding: null });

    const wheelEvent = {
      preventDefault: vi.fn(),
      deltaY: -100,
    } as any;

    const initialRadius = (inputSystem as any).radius;
    (inputSystem as any).onWheel(wheelEvent);

    // Rotation should NOT change (stays north default)
    expect((inputSystem as any).currentRotation).toBe("north");

    // Zoom (radius) should change
    expect((inputSystem as any).radius).not.toBe(initialRadius);
  });
});
