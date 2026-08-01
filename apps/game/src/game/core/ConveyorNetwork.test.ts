import { describe, test, expect, beforeEach } from "vitest";
import { World } from "./World";
import { Conveyor } from "../buildings/conveyor/Conveyor";
import { Chest } from "../buildings/chest/Chest";
import { ConveyorSplitter } from "../buildings/conveyor-splitter/ConveyorSplitter";
import { BuildingEntity } from "../entities/BuildingEntity";

/**
 * `isResolved` marks belts that actually lead to a real sink. It drives the
 * dimmed-belt hint in the renderer, so a stale value is directly visible.
 */
describe("World.updateConveyorNetwork", () => {
  let world: World;

  const place = (b: BuildingEntity) => {
    world.buildings.set(`${b.x},${b.y}`, b);
  };

  beforeEach(() => {
    world = new World();
    world.reset();
  });

  test("resolves a belt chain that ends in a chest", () => {
    // c1 -> c2 -> chest (chest faces east, so its input is the tile to the east)
    const c1 = new Conveyor(10, 10, "west");
    const c2 = new Conveyor(9, 10, "west");
    const chest = new Chest(8, 10, "east");

    place(c1);
    place(c2);
    place(chest);

    world.updateConveyorNetwork();

    expect(chest.getInputPosition()).toEqual({ x: 9, y: 10 });
    expect(c2.isResolved).toBe(true);
    expect(c1.isResolved).toBe(true);
  });

  test("un-resolves belts when the sink is removed", () => {
    const c1 = new Conveyor(10, 10, "west");
    const chest = new Chest(9, 10, "east");
    place(c1);
    place(chest);

    world.updateConveyorNetwork();
    expect(c1.isResolved).toBe(true);

    world.buildings.delete("9,10");
    world.updateConveyorNetwork();

    // Regression: the reset pass used to be a no-op, so belts stayed lit up
    // forever after their destination was deleted.
    expect(c1.isResolved).toBe(false);
  });

  test("resolution travels through a splitter", () => {
    // belt -> splitter -> belt -> chest
    const feeder = new Conveyor(10, 10, "west");
    const splitter = new ConveyorSplitter(9, 10, "west"); // input at (10,10)
    const outBelt = new Conveyor(8, 10, "west");
    const chest = new Chest(7, 10, "east"); // input at (8,10)

    place(feeder);
    place(splitter);
    place(outBelt);
    place(chest);

    world.updateConveyorNetwork();

    expect(outBelt.isResolved).toBe(true);
    expect(feeder.isResolved).toBe(true);
  });

  test("a belt pointing at nothing stays unresolved", () => {
    const lonely = new Conveyor(10, 10, "west");
    place(lonely);

    world.updateConveyorNetwork();

    expect(lonely.isResolved).toBe(false);
  });

  test("a belt pointing into the Hub stays unresolved (the Hub takes no items)", async () => {
    const { Hub } = await import("../buildings/hub/Hub");
    const hub = new Hub(8, 10);
    place(hub);
    world.buildings.set("9,10", hub);
    world.buildings.set("8,11", hub);
    world.buildings.set("9,11", hub);

    const belt = new Conveyor(10, 10, "west");
    place(belt);

    world.updateConveyorNetwork();

    expect(belt.isResolved).toBe(false);
  });
});
