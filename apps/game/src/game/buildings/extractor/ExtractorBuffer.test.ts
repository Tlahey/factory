import { describe, it, expect, beforeEach } from "vitest";
import { Extractor } from "./Extractor";
import { World } from "../../core/World";
import { ResourceTile } from "../../core/ResourceTile";
import { TileFactory } from "../../TileFactory";
import { TileType } from "../../constants";

describe("Extractor Buffer Mechanics", () => {
  let world: World;
  let extractor: Extractor;

  beforeEach(() => {
    world = new World();
    // Place a stone resource tile using TileFactory
    // Rock is the concrete class for STONE
    const resourceTile = TileFactory.createTile(TileType.STONE, 100);
    world.setTile(5, 5, resourceTile);
    
    // Place extractor using World method
    // skipValidation = true to bypass checks (we manually set the tile)
    world.placeBuilding(5, 5, "extractor", "north", true);
    extractor = world.getBuilding(5, 5) as Extractor;
    
    // Power it up safely
    extractor.updatePowerStatus(1.0, true, 1);
  });

  it("should have an internal storage initially empty", () => {
    expect(extractor.internalStorage).toBe(0);
  });

  it("should mine into internal storage when output is blocked", () => {
    // No output building placed, so output is blocked
    const extractionTime = 1.0 / extractor.getExtractionRate();
    
    // Tick enough to mine one item
    extractor.tick(extractionTime + 0.1, world);
    
    expect(extractor.internalStorage).toBe(1);
    const tile = world.getTile(5, 5) as ResourceTile;
    expect(tile.resourceAmount).toBe(99);
  });

  it("should stop mining when internal storage is full (10 items)", () => {
    const extractionTime = 1.0 / extractor.getExtractionRate();
    
    // Fill up storage (10 items)
    for (let i = 0; i < 15; i++) {
        extractor.tick(extractionTime + 0.01, world);
    }
    
    expect(extractor.internalStorage).toBe(10); // Cap at 10
    
    // Check filtered resources
    const tile = world.getTile(5, 5) as ResourceTile;
    expect(tile.resourceAmount).toBe(90); // Should have only mined 10
  });

  it("should set status to 'blocked' when full and cannot output", () => {
     const extractionTime = 1.0 / extractor.getExtractionRate();
     
     // Fill buffer
     extractor.internalStorage = 10;
     
     // Tick to trigger status update
     extractor.tick(0.1, world);
     
     // Need to tick enough for stability threshold (1.5s) if implementation uses it
     // But wait, our implementation checks buffer immediately.
     // Let's check status.
     
     // Advance time for stability threshold
     extractor.tick(2.0, world);
     
     expect(extractor.operationStatus).toBe("blocked");
  });
  
  it("should resume mining when buffer clears space", () => {
      extractor.internalStorage = 10;
      extractor.tick(0.1, world);
      
      // Manually clear some space
      extractor.internalStorage = 5;
      
      const extractionTime = 1.0 / extractor.getExtractionRate();
      extractor.tick(extractionTime + 0.1, world);
      
      expect(extractor.internalStorage).toBe(6);
  });

});
