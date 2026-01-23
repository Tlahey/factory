import { describe, it, expect, beforeEach } from "vitest";
import { Sawmill } from "./Sawmill";
import { World } from "../../core/World";
import { ResourceTile } from "../../environment/ResourceTile";
import { TileFactory } from "../../environment/TileFactory";
import { TileType } from "../../constants";
import { Conveyor } from "../conveyor/Conveyor";

describe("Sawmill Mechanics", () => {
  let world: World;
  let sawmill: Sawmill;

  beforeEach(() => {
    world = new World();
    // Place a tree resource tile using TileFactory
    const resourceTile = TileFactory.createTile(TileType.TREE, 50);
    world.setTile(5, 5, resourceTile);

    // Place sawmill using World method
    // skipValidation = true to bypass checks (but logic validates inside tick too)
    world.placeBuilding(5, 5, "sawmill", "north", true);
    sawmill = world.getBuilding(5, 5) as Sawmill;

    if (!sawmill) {
      throw new Error("Failed to place sawmill");
    }

    // Power it up safely
    sawmill.updatePowerStatus(1.0, true, 1);
  });

  it("should have a buffer initially empty", () => {
    expect(sawmill.slots).toBeDefined();
    expect(sawmill.slots.length).toBe(0);
  });

  it("should validate placement only on TREE tiles", () => {
    const grassTile = TileFactory.createTile(TileType.GRASS);
    const treeTile = TileFactory.createTile(TileType.TREE);

    // Check manual validation method
    expect(sawmill.isValidPlacement(grassTile)).toBe(false);
    expect(sawmill.isValidPlacement(treeTile)).toBe(true);
  });

  it("should mine wood into buffer when output is blocked", () => {
    // No output building placed, so output is blocked
    const extractionTime = 1.0 / sawmill.getExtractionRate();

    // Tick enough to mine one item
    sawmill.tick(extractionTime + 0.1, world);

    expect(sawmill.slots.length).toBe(1);
    expect(sawmill.slots[0].count).toBe(1);
    expect(sawmill.slots[0].type).toBe("wood");

    // Resource should deplete
    const tile = world.getTile(5, 5) as ResourceTile;
    // initial was 50, depleted 1 -> 49
    expect(tile.resourceAmount).toBe(49);
  });

  it("should stop mining when buffer is full (20 items)", () => {
    const extractionTime = 1.0 / sawmill.getExtractionRate();

    // Fill up storage manually
    sawmill.slots = [{ type: "wood", count: 20 }];

    // Capture resource state
    const tile = world.getTile(5, 5) as ResourceTile;
    const initialAmount = tile.resourceAmount;

    // Tick to try mine
    sawmill.tick(extractionTime + 0.1, world);

    // Should still be 20
    expect(sawmill.slots[0].count).toBe(20);

    // Resource should NOT change
    expect(tile.resourceAmount).toBe(initialAmount);
  });

  it("should set status to 'blocked' when full and cannot output", () => {
    // Full buffer
    sawmill.slots = [{ type: "wood", count: 20 }];

    // Tick to trigger status update
    sawmill.tick(0.1, world);

    // Advance time for stability threshold (1.5s)
    sawmill.tick(2.0, world);

    expect(sawmill.operationStatus).toBe("blocked");
  });

  it("should resume mining when buffer clears space", () => {
    sawmill.slots = [{ type: "wood", count: 20 }];
    sawmill.tick(0.1, world);

    // Manually clear some space
    sawmill.slots[0].count = 10;

    const extractionTime = 1.0 / sawmill.getExtractionRate();
    sawmill.tick(extractionTime + 0.1, world);

    expect(sawmill.slots[0].count).toBe(11);
  });

  it("should successfully output items to a conveyor from buffer", () => {
    // Setup conveyor at output (5,4 for North Sawmill at 5,5)
    world.placeBuilding(5, 4, "conveyor", "north", true);
    const conveyor = world.getBuilding(5, 4) as Conveyor;

    expect(conveyor).toBeDefined();

    // Fill buffer
    sawmill.slots = [{ type: "wood", count: 5 }];

    // Tick to trigger output
    sawmill.tick(0.1, world);

    // Should have outputted 1 item so 5 -> 4
    expect(sawmill.slots.length).toBe(1);
    expect(sawmill.slots[0].count).toBe(4);

    // Conveyor should have the item
    expect(conveyor.currentItem).toBe("wood");
  });
});
