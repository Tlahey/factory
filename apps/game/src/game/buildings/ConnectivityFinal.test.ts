import { describe, it, expect, beforeEach } from "vitest";
import { World } from "../core/World";
import { Conveyor } from "./conveyor/Conveyor";
import { Chest } from "./chest/Chest";
import { Extractor } from "./extractor/Extractor";
import { Furnace } from "./furnace/Furnace";
import { updateBuildingConnectivity } from "./BuildingIOHelper";

describe("Connectivity Final Validation", () => {
  let world: World;

  beforeEach(() => {
    world = new World();
  });

  describe("Conveyor Input Arrow Hiding", () => {
    it("should hide input arrow when receiving from the side (Angle)", () => {
      // Extractor (10, 10, East) -> Conveyor (11, 10, North)
      // Conveyor faces North, receives from West (its Left side)
      const extractor = new Extractor(10, 10, "east");
      const conveyor = new Conveyor(11, 10, "north");

      world.buildings.set("10,10", extractor);
      world.buildings.set("11,10", conveyor);

      updateBuildingConnectivity(conveyor, world);

      // Even though 'back' (South) has no neighbor,
      // the conveyor should report as input connected to hide the green arrow.
      expect(conveyor.isInputConnected).toBe(true);
      expect(conveyor.connectedInputSides).toContain("back");
    });

    it("should hide input arrow when receiving from multiple sides (Merger style)", () => {
      // Two conveyors pointing to one conveyor
      // C1 (10, 10, East) \
      //                    -> C3 (11, 10, East)
      // C2 (11, 11, North) /

      const c1 = new Conveyor(10, 10, "east");
      const c2 = new Conveyor(11, 11, "north");
      const c3 = new Conveyor(11, 10, "east");

      world.buildings.set("10,10", c1);
      world.buildings.set("11,11", c2);
      world.buildings.set("11,10", c3);

      updateBuildingConnectivity(c3, world);

      // C3 receives from West (C1) and South (C2).
      // South is its Back. West is its Right? No, if facing East, North is Left, South is Right.
      // Wait, North is -Y, South is +Y. If facing East (+X), North is Left (-Y), South is Right (+Y).
      // So C2 is at the RIGHT side of C3.
      expect(c3.isInputConnected).toBe(true);
      expect(c3.connectedInputSides).toContain("back");
    });
  });

  describe("Output Arrow Hiding (Strict canInput check)", () => {
    it("should STAY VISIBLE (isOutputConnected=false) when pointing at building side that doesn't accept input", () => {
      // Conveyor (10, 10, East) -> Extractor (11, 10, North)
      // Extractor faces North, has NO input.
      const conveyor = new Conveyor(10, 10, "east");
      const extractor = new Extractor(11, 10, "north");

      world.buildings.set("10,10", conveyor);
      world.buildings.set("11,10", extractor);

      updateBuildingConnectivity(conveyor, world);

      // Output points to Extractor, but Extractor says NO to input.
      expect(conveyor.isOutputConnected).toBe(false);
    });

    it("should HIDE (isOutputConnected=true) when pointing at building's valid input port", () => {
      // Conveyor (10, 10, East) -> Chest (11, 10, West)
      // Chest faces West, input is FRONT (West of anchor, so (10, 10)).
      // Wait, if Chest is at (11, 10) facing West, its front is (10, 10).
      // So Conveyor at (10, 10) facing East points to (11, 10).
      // Chest at (11, 10) facing West has input at (10, 10). Correct.

      const conveyor = new Conveyor(10, 10, "east");
      const chest = new Chest(11, 10, "west");

      world.buildings.set("10,10", conveyor);
      world.buildings.set("11,10", chest);

      updateBuildingConnectivity(conveyor, world);

      expect(conveyor.isOutputConnected).toBe(true);
    });
  });

  describe("Multi-tile Output Connectivity", () => {
    it("should hide Furnace output arrow when pointing to a conveyor", () => {
      // Furnace is 1x2.
      // Facing North. Anchor (10, 10). Occupies (10, 10) and (10, 11).
      // Output is Front (North) -> (10, 9).
      const furnace = new Furnace(10, 10, "north");
      const conveyor = new Conveyor(10, 9, "north");

      world.buildings.set("10,10", furnace);
      world.buildings.set("10,11", furnace); // Register both tiles
      world.buildings.set("10,9", conveyor);

      updateBuildingConnectivity(furnace, world);

      expect(furnace.isOutputConnected).toBe(true);
    });

    it("should hide Furnace output arrow when rotated East", () => {
      // Furnace 1x2, rotated East.
      // Width=2, Height=1. Anchor (10, 10). Occupies (10, 10) and (11, 10).
      // Output is Front (East) -> (12, 10).
      const furnace = new Furnace(10, 10, "east");
      const conveyor = new Conveyor(12, 10, "east");

      world.buildings.set("10,10", furnace);
      world.buildings.set("11,10", furnace);
      world.buildings.set("12,10", conveyor);

      updateBuildingConnectivity(furnace, world);

      expect(furnace.isOutputConnected).toBe(true);
    });
  });
});
