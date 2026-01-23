import { describe, it, expect, beforeEach } from "vitest";
import { Extractor } from "./Extractor";
import { World } from "../../core/World";
import { ResourceTile } from "../../environment/ResourceTile";
import { TileFactory } from "../../environment/TileFactory";
import { TileType } from "../../constants";
import { Conveyor } from "../conveyor/Conveyor";

describe("Extractor Buffer Mechanics", () => {
  let world: World;
  let extractor: Extractor;

  beforeEach(() => {
    world = new World();
    // Place a stone resource tile using TileFactory
    const resourceTile = TileFactory.createTile(TileType.STONE, 100);
    world.setTile(5, 5, resourceTile);

    // Place extractor using World method
    // skipValidation = true to bypass checks
    world.placeBuilding(5, 5, "extractor", "north", true);
    extractor = world.getBuilding(5, 5) as Extractor;

    if (!extractor) {
      throw new Error("Failed to place extractor");
    }

    // Power it up safely
    extractor.updatePowerStatus(1.0, true, 1);
  });

  it("should have a buffer initially empty", () => {
    expect(extractor.slots).toBeDefined();
    expect(extractor.slots.length).toBe(0);
  });

  it("should mine into buffer when output is blocked", () => {
    // No output building placed, so output is blocked
    const extractionTime = 1.0 / extractor.getExtractionRate();

    // Tick enough to mine one item
    extractor.tick(extractionTime + 0.1, world);

    expect(extractor.slots.length).toBe(1);
    expect(extractor.slots[0].count).toBe(1);
    expect(extractor.slots[0].type).toBe("stone");

    // Resource should NOT deplete yet because logic says:
    // deplete(1) happens inside tick.
    const tile = world.getTile(5, 5) as ResourceTile;
    // initial was 100, depleted 1 -> 99
    expect(tile.resourceAmount).toBe(99);
  });

  it("should stop mining when buffer is full (20 items)", () => {
    const extractionTime = 1.0 / extractor.getExtractionRate();

    // Fill up storage manually
    extractor.slots = [{ type: "stone", count: 20 }];

    // Capture resource state
    const tile = world.getTile(5, 5) as ResourceTile;
    const initialAmount = tile.resourceAmount;

    // Tick to try mine
    extractor.tick(extractionTime + 0.1, world);

    // Should still be 20
    expect(extractor.slots[0].count).toBe(20);

    // Resource should NOT change
    expect(tile.resourceAmount).toBe(initialAmount);
  });

  it("should set status to 'blocked' when full and cannot output", () => {
    // Fill buffer
    extractor.slots = [{ type: "stone", count: 20 }];

    // Tick to trigger status update
    extractor.tick(0.1, world);

    // Advance time for stability threshold (1.5s)
    extractor.tick(2.0, world);

    expect(extractor.operationStatus).toBe("blocked");
  });

  it("should resume mining when buffer clears space", () => {
    extractor.slots = [{ type: "stone", count: 20 }];
    extractor.tick(0.1, world);

    // Manually clear some space
    extractor.slots[0].count = 10;

    const extractionTime = 1.0 / extractor.getExtractionRate();
    extractor.tick(extractionTime + 0.1, world);

    expect(extractor.slots[0].count).toBe(11);
  });

  it("should allow manual removal of slots (drag and drop API)", () => {
    extractor.slots = [{ type: "stone", count: 15 }];

    // Simulate UI calling removeSlot
    extractor.removeSlot(0);

    expect(extractor.slots.length).toBe(0);

    // Check status update next tick (should not be blocked)
    extractor.tick(0.1, world);
    expect(extractor.operationStatus).not.toBe("blocked");
  });

  it("should successfully output items to a conveyor from buffer", () => {
    // Setup conveyor at output (5,4 for North Extractor at 5,5)
    // Use skipValidation=true to ensure it places
    world.placeBuilding(5, 4, "conveyor", "north", true);
    const conveyor = world.getBuilding(5, 4) as Conveyor;

    expect(conveyor).toBeDefined();

    // Fill buffer
    extractor.slots = [{ type: "stone", count: 5 }];

    // Tick to trigger output
    extractor.tick(0.1, world);

    // Extractor should have outputted 1 item so 5 -> 4
    expect(extractor.slots.length).toBe(1);
    expect(extractor.slots[0].count).toBe(4);

    // Conveyor should have the item
    expect(conveyor.currentItem).toBe("stone");
  });
});
