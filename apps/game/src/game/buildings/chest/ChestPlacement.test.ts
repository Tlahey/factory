import { describe, test, expect, beforeEach } from "vitest";
import { World } from "../../core/World";
import { Chest } from "./Chest";
import { Extractor } from "../extractor/Extractor";
import { TileFactory } from "../../environment/TileFactory";
import { TileType } from "../../constants";
import { determineConveyorDirection } from "../conveyor/ConveyorPlacementHelper";

describe("Chest Conveyor Placement", () => {
  let world: World;
  const CX = 10;
  const CY = 10;

  beforeEach(() => {
    world = new World();
    world.reset();

    // Setup grass tiles
    for (let x = CX - 2; x <= CX + 2; x++) {
      for (let y = CY - 2; y <= CY + 2; y++) {
        world.setTile(x, y, TileFactory.createTile(TileType.GRASS));
      }
    }
  });

  test("Conveyor at Chest output should point AWAY from Chest", () => {
    // Setup: Chest at (CX,CY) facing North
    // Output is at 'back', which is South (CY+1)
    const chest = new Chest(CX, CY, "north");
    world.buildings.set(`${CX},${CY}`, chest);

    // Verify Chest output position
    const outputPos = chest.getOutputPosition();
    expect(outputPos).toEqual({ x: CX, y: CY + 1 });

    // Test: Determine direction for a conveyor placed at (CX, CY+1)
    // Default user rotation is 'north' (which would point INTO the chest)
    const dir = determineConveyorDirection(CX, CY + 1, world, "north");

    // Expectation: Should point South (AWAY from Chest)
    // Current Bug: Likely points North (INTO Chest) because it uses neighbor.direction (North)
    expect(dir).toBe("south");
  });

  test("Conveyor at Extractor output should point AWAY from Extractor", () => {
    // Control test to ensure we don't break Extractor behavior
    // Extractor at (CX,CY) facing North
    // Output is at 'front', which is North (CY-1)
    const extractor = new Extractor(CX, CY, "north");
    world.buildings.set(`${CX},${CY}`, extractor);

    const outputPos = extractor.getOutputPosition();
    expect(outputPos).toEqual({ x: CX, y: CY - 1 });

    // Conveyor at (CX, CY-1).
    // Extractor faces North. Flow is North.
    // We pass "south" (User wants South).
    // South points back to Extractor (North). This is 180 degree opposition.
    // Invalid.
    // Should snap to Extractor direction (North).
    const dir = determineConveyorDirection(CX, CY - 1, world, "south");

    // Should continue flow -> North (Wait, Extractor faces North)
    // Extractor (North). Output (10,9).
    // Conveyor (10,9).
    // Flow is North.
    // User "west". North -> West is 90 deg. That IS VALID.
    // Wait, let's verify Extractor setup.
    // new Extractor(CX,CY, "north"). Output is y-1.
    // Flow is NORTH.
    // Opposite of North is South.
    // West != South.
    // So "west" is VALID.
    // So it will return "west".
    //
    // If we want to force "north", we must pass "south".
    // South is opposite of North.
    // So Conveyor South -> flowing South -> points back to Extractor.
    // That's 180.

    expect(dir).toBe("north");
    expect(dir).toBe("north");
  });
});
