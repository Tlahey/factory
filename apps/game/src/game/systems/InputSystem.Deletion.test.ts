import { describe, expect, vi, beforeEach, test } from "vitest";
import { InputSystem } from "./InputSystem";

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
      selectedBuilding: "delete",
      cameraAzimuth: 0,
      cameraElevation: 0,
      viewMode: "3D",
      setCameraAngles: vi.fn(),
      openedEntityKey: null,
      setOpenedEntityKey: vi.fn(),
      addItem: vi.fn(),
    })),
    subscribe: vi.fn(() => vi.fn()),
  },
}));

describe("InputSystem Deletion Tests", () => {
  let inputSystem: InputSystem;
  let mockWorld: any;
  let mockCamera: any;
  let mockDomElement: any;
  let onHoverMock: any;
  let removeBuildingSpy: any;

  beforeEach(() => {
    removeBuildingSpy = vi.fn();

    mockWorld = {
      getBuilding: vi.fn(() => ({ getType: () => "conveyor" })), // Always return a building
      removeBuilding: removeBuildingSpy,
      getTile: () => ({ isStone: () => false }),
      cables: [],
      removeCable: vi.fn(),
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

    // Mock global window
    global.window = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as any;

    mockCamera = {
      position: { x: 0, y: 0, z: 0, set: vi.fn() },
      lookAt: vi.fn(),
    } as any;

    onHoverMock = vi.fn();

    inputSystem = new InputSystem(
      mockDomElement,
      mockCamera,
      mockWorld,
      undefined,
      onHoverMock,
    );

    // Mock getIntersection to always return 5,5
    (inputSystem as any).getIntersection = () => ({ x: 5, y: 5 });
  });

  test("onPointerDown in delete mode starts deletion and removes building", () => {
    const event = { button: 0, clientX: 10, clientY: 10 } as any;

    (inputSystem as any).onPointerDown(event);

    // Should set isDeleting
    expect((inputSystem as any).isDeleting).toBe(true);
    // Should remove building immediately
    expect(removeBuildingSpy).toHaveBeenCalledWith(5, 5);
    // Should NOT start camera drag
    expect((inputSystem as any).isDragging).toBe(false);
  });

  test("onPointerMove while deleting removes building", () => {
    // Setup state
    (inputSystem as any).isDeleting = true;

    const event = { clientX: 20, clientY: 20 } as any;
    (inputSystem as any).onPointerMove(event);

    expect(removeBuildingSpy).toHaveBeenCalledWith(5, 5);
  });

  test("onPointerUp stops deletion", () => {
    (inputSystem as any).isDeleting = true;

    const event = { clientX: 10, clientY: 10 } as any;
    (inputSystem as any).onPointerUp(event);

    expect((inputSystem as any).isDeleting).toBe(false);
  });

  test("Click does not double delete", () => {
    // Spy on handleClick to ensure it's NOT called or handles double delete gracefully
    // Actually we want to check that handleGameAction is not called via handleClick path
    // But since performDelete is private, we check side effects (removeBuildingSpy)

    const eventDown = { button: 0, clientX: 10, clientY: 10 } as any;
    (inputSystem as any).onPointerDown(eventDown);

    expect(removeBuildingSpy).toHaveBeenCalledTimes(1);

    const eventUp = { clientX: 10, clientY: 10 } as any; // Short distance -> Click
    (inputSystem as any).onPointerUp(eventUp);

    // Should NOT have been called again
    expect(removeBuildingSpy).toHaveBeenCalledTimes(1);
    expect((inputSystem as any).isDeleting).toBe(false);
  });
});
