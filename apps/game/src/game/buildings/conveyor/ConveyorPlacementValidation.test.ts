import { describe, test, expect, beforeEach } from "vitest";
import { World } from "../../core/World";
import { Conveyor } from "./Conveyor";
import { Extractor } from "../extractor/Extractor";
import { TileFactory } from "../../TileFactory";
import { TileType } from "../../constants";
import { getNextValidConveyorRotation } from "./ConveyorPlacementHelper";

// Mock minimal config to avoid full factory dependencies if possible
// But World uses real BuildingFactory.
// We rely on the fact that 'extractor' and 'conveyor' are standard.

describe("Conveyor Placement Validation", () => {
  let world: World;
  const CX = 25;
  const CY = 25;

  beforeEach(() => {
    world = new World();
    world.reset();

    // Explicitly set test area to Grass to ensure placement validity
    // We need (CX, CY) and neighbors to be valid
    world.setTile(CX, CY, TileFactory.createTile(TileType.GRASS));
    world.setTile(CX + 1, CY, TileFactory.createTile(TileType.GRASS));
    world.setTile(CX - 1, CY, TileFactory.createTile(TileType.GRASS));
    world.setTile(CX, CY + 1, TileFactory.createTile(TileType.GRASS));
    world.setTile(CX, CY - 1, TileFactory.createTile(TileType.GRASS));
  });

  test("Allows placement facing AWAY from input source", () => {
    // Setup: Extractor at (CX,CY) facing East (Outputs to CX+1,CY)
    const extractor = new Extractor(CX, CY, "east");
    world.buildings.set(`${CX},${CY}`, extractor);

    // Test: Place Conveyor at (CX+1,CY) facing East (Continuing flow)
    const canPlace = world.canPlaceBuilding(CX + 1, CY, "conveyor", "east");
    expect(canPlace).toBe(true);
  });

  test("Allows placement facing SIDEWAYS from input source (Turn)", () => {
    // Setup: Extractor at (CX,CY) facing East
    const extractor = new Extractor(CX, CY, "east");
    world.buildings.set(`${CX},${CY}`, extractor);

    // Test: Place Conveyor at (CX+1,CY) facing South (Right Turn)
    const canPlaceRight = world.canPlaceBuilding(
      CX + 1,
      CY,
      "conveyor",
      "south",
    );
    expect(canPlaceRight).toBe(true);

    // Test: Place Conveyor at (CX+1,CY) facing North (Left Turn)
    const canPlaceLeft = world.canPlaceBuilding(
      CX + 1,
      CY,
      "conveyor",
      "north",
    );
    expect(canPlaceLeft).toBe(true);
  });

  test("BLOCKS placement facing INTO input source (Reverse Flow)", () => {
    // Setup: Extractor at (CX,CY) facing East
    const extractor = new Extractor(CX, CY, "east");
    world.buildings.set(`${CX},${CY}`, extractor);

    // Test: Place Conveyor at (CX+1,CY) facing West (Pointing back at Extractor)
    // This creates a head-to-head collision: Extractor -> <- Conveyor
    const canPlaceReverse = world.canPlaceBuilding(
      CX + 1,
      CY,
      "conveyor",
      "west",
    );
    expect(canPlaceReverse).toBe(false);
  });

  test("BLOCKS placement facing INTO another Conveyor's output", () => {
    // Setup: Conveyor1 at (CX,CY) facing East (Outputs to CX+1,CY)
    const c1 = new Conveyor(CX, CY, "east");
    world.buildings.set(`${CX},${CY}`, c1);

    // Test: Place Conveyor2 at (CX+1,CY) facing West (Pointing back at C1)
    const canPlaceReverse = world.canPlaceBuilding(
      CX + 1,
      CY,
      "conveyor",
      "west",
    );
    expect(canPlaceReverse).toBe(false);
  });

  test("Allows placement if not facing neighbor output", () => {
    // Setup: Conveyor1 at (CX,CY) facing South (Outputs to CX,CY+1)
    const c1 = new Conveyor(CX, CY, "south");
    world.buildings.set(`${CX},${CY}`, c1);

    // Test: Place Conveyor2 at (CX+1,CY).
    // C1 is NOT outputting to (CX+1,CY). So any direction should be valid relative to C1.
    // (CX+1,CY) is East of (CX,CY). C1 output is South.

    // Facing West (Towards C1) - Valid because C1 doesn't output to us.
    // We are feeding C1's side.
    const canPlaceSideFeed = world.canPlaceBuilding(
      CX + 1,
      CY,
      "conveyor",
      "west",
    );
    expect(canPlaceSideFeed).toBe(true);
  });

  describe("Rotation Skipping (getNextValidConveyorRotation)", () => {
    test("Cycles normally when no restrictions apply", () => {
      // Free space at CX+1, CY
      const next = getNextValidConveyorRotation(
        "north",
        CX + 1,
        CY,
        world,
        true,
      ); // Clockwise
      expect(next).toBe("east");

      const prev = getNextValidConveyorRotation(
        "north",
        CX + 1,
        CY,
        world,
        false,
      ); // Counter-Clockwise
      expect(prev).toBe("west");
    });

    test("Skips invalid Reverse direction", () => {
      // Setup: Extractor at (CX,CY) facing East
      const extractor = new Extractor(CX, CY, "east");
      world.buildings.set(`${CX},${CY}`, extractor);

      // We are at (CX+1, CY).
      // Invalid direction is "west" (facing INTO extractor).

      // Start from "south". Clockwise -> "west" (Invalid) -> "north" (Valid).
      const next = getNextValidConveyorRotation(
        "south",
        CX + 1,
        CY,
        world,
        true,
      );
      expect(next).toBe("north"); // Should skip West

      // Start from "north". Counter-Clockwise -> "west" (Invalid) -> "south" (Valid).
      const prev = getNextValidConveyorRotation(
        "north",
        CX + 1,
        CY,
        world,
        false,
      );
      expect(prev).toBe("south"); // Should skip West
    });
  });
});
