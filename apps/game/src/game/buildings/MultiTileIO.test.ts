import { describe, it, expect, beforeEach } from "vitest";
import { World } from "../core/World";
import { Conveyor } from "./conveyor/Conveyor";
import { Furnace } from "./furnace/Furnace";
import { Direction } from "../entities/types";
import { canPushItem, getSourcePortTile, pushItem } from "./ItemTransfer";
import { updateBuildingConnectivity } from "./BuildingIOHelper";

/**
 * The furnace is the only 1x2 building today, and every rotation puts its
 * ports on a different tile of the footprint. These tests walk all four.
 */
describe("Multi-tile building I/O", () => {
  let world: World;

  beforeEach(() => {
    world = new World();
  });

  /** Register a 1x2 furnace on both of its tiles. */
  function placeFurnace(x: number, y: number, direction: Direction): Furnace {
    const furnace = new Furnace(x, y, direction);
    furnace.getOccupiedTiles().forEach((t) => {
      world.buildings.set(`${t.x},${t.y}`, furnace);
    });
    return furnace;
  }

  function placeConveyor(x: number, y: number, direction: Direction): Conveyor {
    const conveyor = new Conveyor(x, y, direction);
    world.buildings.set(`${x},${y}`, conveyor);
    return conveyor;
  }

  describe("footprint", () => {
    it("occupies two tiles along its facing axis", () => {
      expect(placeFurnace(10, 10, "north").getOccupiedTiles()).toEqual([
        { x: 10, y: 10 },
        { x: 10, y: 11 },
      ]);
      expect(placeFurnace(20, 20, "east").getOccupiedTiles()).toEqual([
        { x: 20, y: 20 },
        { x: 21, y: 20 },
      ]);
    });
  });

  describe("output to a belt", () => {
    // Anchor, direction, output tile, belt direction (pointing away).
    const cases: {
      direction: Direction;
      output: { x: number; y: number };
    }[] = [
      { direction: "north", output: { x: 10, y: 9 } },
      { direction: "south", output: { x: 10, y: 12 } },
      { direction: "east", output: { x: 12, y: 10 } },
      { direction: "west", output: { x: 9, y: 10 } },
    ];

    cases.forEach(({ direction, output }) => {
      it(`hands an item to the belt in front of it when facing ${direction}`, () => {
        const furnace = placeFurnace(10, 10, direction);
        expect(furnace.getOutputPosition()).toEqual(output);

        const belt = placeConveyor(output.x, output.y, direction);

        // The furnace must announce the tile touching the belt, not its anchor,
        // or the belt rejects the item as coming from a non-adjacent building.
        const from = getSourcePortTile(furnace, output.x, output.y);
        expect(Math.abs(from.x - output.x) + Math.abs(from.y - output.y)).toBe(
          1,
        );

        expect(
          canPushItem(world, furnace, output.x, output.y, "iron_ingot"),
        ).toBe(true);
        expect(pushItem(world, furnace, output.x, output.y, "iron_ingot")).toBe(
          true,
        );
        expect(belt.currentItem).toBe("iron_ingot");
      });
    });
  });

  describe("input from a belt", () => {
    const cases: {
      direction: Direction;
      input: { x: number; y: number };
      beltDirection: Direction;
    }[] = [
      { direction: "north", input: { x: 10, y: 12 }, beltDirection: "north" },
      { direction: "south", input: { x: 10, y: 9 }, beltDirection: "south" },
      { direction: "east", input: { x: 9, y: 10 }, beltDirection: "east" },
      { direction: "west", input: { x: 12, y: 10 }, beltDirection: "west" },
    ];

    cases.forEach(({ direction, input, beltDirection }) => {
      it(`accepts items on its back tile when facing ${direction}`, () => {
        const furnace = placeFurnace(10, 10, direction);
        expect(furnace.getInputPosition()).toEqual(input);

        const belt = placeConveyor(input.x, input.y, beltDirection);
        belt.currentItem = "iron_ore";
        belt.transportProgress = 1;

        furnace.selectedRecipeId = "iron_ingot";

        expect(furnace.canInput(input.x, input.y)).toBe(true);
        expect(furnace.addItem("iron_ore", 1, input.x, input.y)).toBe(true);
        expect(furnace.inputQueue).toEqual([{ type: "iron_ore", count: 1 }]);
      });

      it(`refuses items pushed onto its output face when facing ${direction}`, () => {
        const furnace = placeFurnace(10, 10, direction);
        const outputTile = furnace.getOutputPosition()!;
        furnace.selectedRecipeId = "iron_ingot";

        expect(furnace.canInput(outputTile.x, outputTile.y)).toBe(false);
        expect(furnace.addItem("iron_ore", 1, outputTile.x, outputTile.y)).toBe(
          false,
        );
      });
    });
  });

  describe("connectivity flags", () => {
    it("marks the output connected only when the neighbour accepts us", () => {
      const furnace = placeFurnace(10, 10, "south");
      // Output of a south-facing furnace at (10,10) is (10,12).
      placeConveyor(10, 12, "south");

      updateBuildingConnectivity(furnace, world);
      expect(furnace.isOutputConnected).toBe(true);
      expect(furnace.connectedOutputPorts).toEqual(["front#0"]);
    });

    it("leaves the output arrow up when the belt points back at us", () => {
      const furnace = placeFurnace(10, 10, "south");
      // A belt facing north outputs to (10,11) and refuses input on its front.
      placeConveyor(10, 12, "north");

      updateBuildingConnectivity(furnace, world);
      expect(furnace.isOutputConnected).toBe(false);
    });

    it("marks the input connected when a belt feeds the back tile", () => {
      const furnace = placeFurnace(10, 10, "north");
      // Back tile of a north-facing furnace at (10,10) is (10,11); feeder (10,12).
      placeConveyor(10, 12, "north");

      updateBuildingConnectivity(furnace, world);
      expect(furnace.isInputConnected).toBe(true);
      expect(furnace.connectedInputPorts).toEqual(["back#0"]);
    });

    it("never counts itself as its own neighbour", () => {
      const furnace = placeFurnace(10, 10, "north");
      updateBuildingConnectivity(furnace, world);
      expect(furnace.isOutputConnected).toBe(false);
      expect(furnace.isInputConnected).toBe(false);
    });
  });
});
