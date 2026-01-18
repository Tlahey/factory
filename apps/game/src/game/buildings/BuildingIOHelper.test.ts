import { describe, it, expect, beforeEach, vi } from "vitest";
import { updateBuildingConnectivity, getIOOffset } from "./BuildingIOHelper";
import { BuildingEntity } from "../entities/BuildingEntity";
import { IWorld, Direction } from "../entities/types";
import { IIOBuilding, BuildingId } from "./BuildingConfig";

// Simple concrete class for testing
class TestBuilding extends BuildingEntity implements IIOBuilding {
  public io = {
    hasInput: true,
    hasOutput: true,
    inputSide: "back" as const,
    outputSide: "front" as const,
  };
  public isInputConnected = false;
  public isOutputConnected = false;
  public connectedInputSides: any[] = [];
  public connectedOutputSides: any[] = [];

  constructor(
    x: number,
    y: number,
    type: BuildingId,
    direction: Direction,
    w: number,
    h: number,
  ) {
    super(x, y, type, direction);
    // Force dimensions as if from config
    this.width = direction === "east" || direction === "west" ? h : w;
    this.height = direction === "east" || direction === "west" ? w : h;
  }
  public get powerConfig() {
    return undefined;
  }
  public getColor() {
    return 0;
  }
  public serialize() {
    return {};
  }
  public deserialize() {}
  public isValidPlacement() {
    return true;
  }
  public getInputPosition() {
    return null;
  }
  public getOutputPosition() {
    return null;
  }
  public canInput() {
    return true;
  }
  public canOutput() {
    return true;
  }
  public tryOutput() {
    return true;
  }

  // Mock getConfig to return our dimensions
  public getConfig() {
    const config: any = super.getConfig() || {};
    const isRot = this.direction === "east" || this.direction === "west";
    return {
      ...config,
      width: isRot ? this.height : this.width,
      height: isRot ? this.width : this.height,
    };
  }
}

describe("BuildingIOHelper", () => {
  let world: IWorld;

  beforeEach(() => {
    const buildings = new Map<string, any>();
    world = {
      getBuilding: vi.fn((x, y) => buildings.get(`${x},${y}`)),
      placeBuilding: vi.fn((x, y, b) => {
        buildings.set(`${x},${y}`, b);
      }),
    } as any;
  });

  describe("getIOOffset", () => {
    it("should calculate correct offset for 1x1 building", () => {
      // North, Front -> (0, -1)
      expect(getIOOffset("front", "north", 1, 1)).toEqual({ dx: 0, dy: -1 });
      // North, Back -> (0, 1)
      expect(getIOOffset("back", "north", 1, 1)).toEqual({ dx: 0, dy: 1 });
    });

    it("should calculate correct offset for 1x2 building (Furnace style)", () => {
      // North faces front. Anchor 0,0. Occupies (0,0) and (0,1).
      // Front is North -> (0, -1)
      expect(getIOOffset("front", "north", 1, 2)).toEqual({ dx: 0, dy: -1 });
      // Back is South -> (0, 2)
      expect(getIOOffset("back", "north", 1, 2)).toEqual({ dx: 0, dy: 2 });

      // Rotate East. Anchor 0,0. Occupies (0,0) and (1,0).
      // Front is East -> (2, 0)
      expect(getIOOffset("front", "east", 1, 2)).toEqual({ dx: 2, dy: 0 });
      // Back is West -> (-1, 0)
      expect(getIOOffset("back", "east", 1, 2)).toEqual({ dx: -1, dy: 0 });
    });
  });

  describe("updateBuildingConnectivity", () => {
    it("should detect input from conveyor pointing at multi-tile building", () => {
      // Furnace at (10, 10), 1x2, facing West
      // Occupies (10, 10) and (11, 10)
      const furnace = new TestBuilding(10, 10, "furnace", "west", 1, 2);
      // West: width=2, height=1.

      // Conveyor pointing East at the second tile (11, 10)
      const conveyor = {
        buildingType: "conveyor",
        x: 12,
        y: 10,
        getOutputPosition: () => ({ x: 11, y: 10 }),
      };

      (world.getBuilding as any).mockImplementation((x: number, y: number) => {
        if (x === 10 && y === 10) return furnace;
        if (x === 11 && y === 10) return furnace;
        if (x === 12 && y === 10) return conveyor;
        return null;
      });

      updateBuildingConnectivity(furnace, world);

      // Furnace facing West. Input is "Back" (East).
      // Back tile for West 1x2 is (12, 10).
      expect(furnace.isInputConnected).toBe(true);
      expect(furnace.connectedInputSides).toContain("back");
    });

    it("should not connect building to itself on output", () => {
      const furnace = new TestBuilding(10, 10, "furnace", "north", 1, 2);
      // Occupies 10,10 and 10,11.
      // Output is Front (North) -> 10,9.

      (world.getBuilding as any).mockImplementation((x: number, y: number) => {
        if (x === 10 && (y === 10 || y === 11)) return furnace;
        return null;
      });

      updateBuildingConnectivity(furnace, world);
      expect(furnace.isOutputConnected).toBe(false);
    });
  });
});
