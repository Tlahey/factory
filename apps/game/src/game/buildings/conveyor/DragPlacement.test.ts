import { describe, it, expect } from "vitest";
import {
  getSegmentDirection,
  calculateConveyorPath,
} from "./ConveyorPathHelper";
import { Direction } from "../../entities/types";

// Mock World and Conveyor needed?
// getSegmentDirection is a pure function, so we can test it directly.
// calculateConveyorPath is also pure.

describe("Conveyor Drag Placement Logic", () => {
  describe("Path Calculation", () => {
    it("should generate correct path for horizontal drag", () => {
      const path = calculateConveyorPath(0, 0, 3, 0);
      expect(path).toHaveLength(4);
      expect(path[0]).toEqual({ x: 0, y: 0 });
      expect(path[3]).toEqual({ x: 3, y: 0 });
    });

    it("should generate correct path for vertical drag", () => {
      const path = calculateConveyorPath(0, 0, 0, 3);
      expect(path).toHaveLength(4);
      expect(path[0]).toEqual({ x: 0, y: 0 });
      expect(path[3]).toEqual({ x: 0, y: 3 });
    });

    it("should generate L-shape path (horizontal first)", () => {
      const path = calculateConveyorPath(0, 0, 2, 2);
      // (0,0) -> (1,0) -> (2,0) -> (2,1) -> (2,2)
      expect(path).toHaveLength(5);
      expect(path[0]).toEqual({ x: 0, y: 0 });
      expect(path[2]).toEqual({ x: 2, y: 0 }); // Turning point
      expect(path[4]).toEqual({ x: 2, y: 2 });
    });
  });

  describe("Segment Direction Calculation", () => {
    // Tests based on the refactored logic in InputSystem/PlacementVisuals

    it("should point to next segment for middle elements", () => {
      // (0,0) -> (1,0) -> (2,0)
      // Current: (1,0), Next: (2,0), Prev: (0,0)
      const dir = getSegmentDirection(1, 0, 2, 0, 0, 0);
      expect(dir).toBe("east");
    });

    it("should point to next segment for first element", () => {
      // (0,0) -> (1,0)
      // Current: (0,0), Next: (1,0), Prev: null
      const dir = getSegmentDirection(0, 0, 1, 0, null, null);
      expect(dir).toBe("east");
    });

    // The "Last Element" logic in InputSystem overrides getSegmentDirection
    // with userRotation. We can verify that getSegmentDirection
    // without next returns a default or reliable value if we were to use it.
    it("should return direction from prev if next is null (fallback)", () => {
      // (0,0) -> (1,0)
      // Current: (1,0), Prev: (0,0), Next: null
      const dir = getSegmentDirection(1, 0, null, null, 0, 0);
      expect(dir).toBe("east");
    });
  });

  describe("Placement Logic Simulation", () => {
    // Simulate the logic in InputSystem.handleConveyorDragEnd

    const simulatePlacement = (
      path: { x: number; y: number }[],
      userRotation: Direction,
    ) => {
      const placements: { x: number; y: number; dir: Direction }[] = [];

      for (let i = 0; i < path.length; i++) {
        const current = path[i];
        const next = i < path.length - 1 ? path[i + 1] : null;
        const prev = i > 0 ? path[i - 1] : null;
        const isLast = i === path.length - 1;

        let direction: Direction;
        if (isLast) {
          direction = userRotation;
        } else {
          direction = getSegmentDirection(
            current.x,
            current.y,
            next ? next.x : null,
            next ? next.y : null,
            prev ? prev.x : null,
            prev ? prev.y : null,
          ) as Direction;
        }
        placements.push({ x: current.x, y: current.y, dir: direction });
      }
      return placements;
    };

    it("should apply user rotation ONLY to the last element", () => {
      const path = calculateConveyorPath(0, 0, 2, 0); // (0,0)->(1,0)->(2,0)
      const userRotation = "south"; // Intentionally different from path direction (east)

      const placements = simulatePlacement(path, userRotation);

      expect(placements).toHaveLength(3);

      // First element points East (towards next)
      expect(placements[0].dir).toBe("east");

      // Middle element points East (towards next)
      expect(placements[1].dir).toBe("east");

      // Last element points South (User Rotation)
      expect(placements[2].dir).toBe("south");
    });

    it("should apply user rotation to single element placement", () => {
      const path = [{ x: 0, y: 0 }];
      const userRotation = "west";

      const placements = simulatePlacement(path, userRotation);

      expect(placements).toHaveLength(1);
      expect(placements[0].dir).toBe("west");
    });

    it("should handle L-shaped path directions correctly", () => {
      const path = calculateConveyorPath(0, 0, 1, 1);
      // (0,0) -> (1,0) -> (1,1)
      const userRotation = "north";

      const placements = simulatePlacement(path, userRotation);

      // (0,0) -> Next is (1,0) so EAST
      expect(placements[0].dir).toBe("east");

      // (1,0) -> Next is (1,1) so SOUTH
      expect(placements[1].dir).toBe("south");

      // (1,1) -> Last, so USER_ROTATION (north)
      expect(placements[2].dir).toBe("north");
    });
  });
});
