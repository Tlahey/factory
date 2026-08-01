import { describe, it, expect } from "vitest";
import {
  getAbsoluteSideDirection,
  getAdjacentInnerTile,
  getFootprintCenter,
  getFootprintSize,
  getOccupiedTiles,
  getPlacementAnchor,
  getPortLocalPosition,
  getSidePorts,
} from "./BuildingFootprint";
import { Direction } from "../entities/types";

const ALL_DIRECTIONS: Direction[] = ["north", "east", "south", "west"];

describe("getFootprintSize", () => {
  it("keeps dimensions for north/south and swaps them for east/west", () => {
    expect(getFootprintSize(1, 2, "north")).toEqual({ width: 1, height: 2 });
    expect(getFootprintSize(1, 2, "south")).toEqual({ width: 1, height: 2 });
    expect(getFootprintSize(1, 2, "east")).toEqual({ width: 2, height: 1 });
    expect(getFootprintSize(1, 2, "west")).toEqual({ width: 2, height: 1 });
  });
});

describe("getFootprintCenter", () => {
  it("centres a 1x1 on its tile", () => {
    expect(getFootprintCenter(5, 5, { width: 1, height: 1 })).toEqual({
      x: 5,
      y: 5,
    });
  });

  it("centres a 1x2 on the seam between its two tiles", () => {
    expect(getFootprintCenter(5, 5, { width: 1, height: 2 })).toEqual({
      x: 5,
      y: 5.5,
    });
  });

  it("centres a 2x2 on its middle corner", () => {
    expect(getFootprintCenter(5, 5, { width: 2, height: 2 })).toEqual({
      x: 5.5,
      y: 5.5,
    });
  });
});

describe("getPlacementAnchor", () => {
  it("is the cursor itself for 1x1 buildings", () => {
    ALL_DIRECTIONS.forEach((dir) => {
      expect(getPlacementAnchor(7, 3, 1, 1, dir)).toEqual({ x: 7, y: 3 });
    });
  });

  it("keeps a 1x2 rotating around the hovered tile", () => {
    // The hovered tile must stay inside the footprint in every rotation,
    // otherwise the ghost jumps off the cursor when the player presses R.
    ALL_DIRECTIONS.forEach((dir) => {
      const anchor = getPlacementAnchor(10, 10, 1, 2, dir);
      const size = getFootprintSize(1, 2, dir);
      const tiles = getOccupiedTiles(anchor.x, anchor.y, size);
      expect(tiles).toContainEqual({ x: 10, y: 10 });
    });
  });

  it("keeps a 2x2 rotating around the hovered tile", () => {
    ALL_DIRECTIONS.forEach((dir) => {
      const anchor = getPlacementAnchor(10, 10, 2, 2, dir);
      const tiles = getOccupiedTiles(anchor.x, anchor.y, {
        width: 2,
        height: 2,
      });
      expect(tiles).toContainEqual({ x: 10, y: 10 });
    });
  });

  it("places the 1x2 body on the opposite side of the cursor when flipped", () => {
    // North: body extends south of the cursor. South: it extends north.
    expect(getPlacementAnchor(10, 10, 1, 2, "north")).toEqual({ x: 10, y: 10 });
    expect(getPlacementAnchor(10, 10, 1, 2, "south")).toEqual({ x: 10, y: 9 });
    expect(getPlacementAnchor(10, 10, 1, 2, "west")).toEqual({ x: 10, y: 10 });
    expect(getPlacementAnchor(10, 10, 1, 2, "east")).toEqual({ x: 9, y: 10 });
  });
});

describe("getAbsoluteSideDirection", () => {
  it("maps relative sides through the building rotation", () => {
    expect(getAbsoluteSideDirection("front", "north")).toBe("north");
    expect(getAbsoluteSideDirection("back", "north")).toBe("south");
    expect(getAbsoluteSideDirection("left", "north")).toBe("west");
    expect(getAbsoluteSideDirection("right", "north")).toBe("east");

    expect(getAbsoluteSideDirection("front", "east")).toBe("east");
    expect(getAbsoluteSideDirection("back", "east")).toBe("west");
    expect(getAbsoluteSideDirection("left", "east")).toBe("north");
    expect(getAbsoluteSideDirection("right", "east")).toBe("south");
  });
});

describe("getSidePorts", () => {
  it("puts a 1x1 port on the adjacent tile", () => {
    const [port] = getSidePorts(5, 5, "front", "north", 1, 1);
    expect(port.inner).toEqual({ x: 5, y: 5 });
    expect(port.outer).toEqual({ x: 5, y: 4 });
  });

  it("anchors a 1x2 back port on the far tile, in every rotation", () => {
    // North: occupies (5,5)+(5,6), back tile is (5,6), feeder is (5,7).
    const north = getSidePorts(5, 5, "back", "north", 1, 2);
    expect(north).toHaveLength(1);
    expect(north[0].inner).toEqual({ x: 5, y: 6 });
    expect(north[0].outer).toEqual({ x: 5, y: 7 });

    // South: occupies (5,5)+(5,6), the building faces south so its back tile
    // is (5,5) and the feeder is (5,4).
    const south = getSidePorts(5, 5, "back", "south", 1, 2);
    expect(south[0].inner).toEqual({ x: 5, y: 5 });
    expect(south[0].outer).toEqual({ x: 5, y: 4 });

    // East: occupies (5,5)+(6,5), back is west.
    const east = getSidePorts(5, 5, "back", "east", 1, 2);
    expect(east[0].inner).toEqual({ x: 5, y: 5 });
    expect(east[0].outer).toEqual({ x: 4, y: 5 });

    // West: occupies (5,5)+(6,5), back is east.
    const west = getSidePorts(5, 5, "back", "west", 1, 2);
    expect(west[0].inner).toEqual({ x: 6, y: 5 });
    expect(west[0].outer).toEqual({ x: 7, y: 5 });
  });

  it("anchors a 1x2 front port on the facing tile, in every rotation", () => {
    expect(getSidePorts(5, 5, "front", "north", 1, 2)[0]).toMatchObject({
      inner: { x: 5, y: 5 },
      outer: { x: 5, y: 4 },
    });
    expect(getSidePorts(5, 5, "front", "south", 1, 2)[0]).toMatchObject({
      inner: { x: 5, y: 6 },
      outer: { x: 5, y: 7 },
    });
    expect(getSidePorts(5, 5, "front", "east", 1, 2)[0]).toMatchObject({
      inner: { x: 6, y: 5 },
      outer: { x: 7, y: 5 },
    });
    expect(getSidePorts(5, 5, "front", "west", 1, 2)[0]).toMatchObject({
      inner: { x: 5, y: 5 },
      outer: { x: 4, y: 5 },
    });
  });

  it("exposes every tile of a wide side", () => {
    // 2x2 anchored at (5,5): the north edge has two ports, not one.
    const ports = getSidePorts(5, 5, "front", "north", 2, 2);
    expect(ports).toHaveLength(2);
    expect(ports.map((p) => p.outer)).toEqual([
      { x: 5, y: 4 },
      { x: 6, y: 4 },
    ]);
    expect(ports.map((p) => p.inner)).toEqual([
      { x: 5, y: 5 },
      { x: 6, y: 5 },
    ]);
  });

  it("keeps port indices attached to the same physical port across rotations", () => {
    // Port 0 of the 1x2 left side is the tile next to the front half.
    const north = getSidePorts(5, 5, "left", "north", 1, 2);
    const east = getSidePorts(5, 5, "left", "east", 1, 2);
    expect(north[0].inner).toEqual({ x: 5, y: 5 }); // front tile
    expect(east[0].inner).toEqual({ x: 6, y: 5 }); // front tile again
  });

  it("always puts inner and outer on adjacent tiles", () => {
    ALL_DIRECTIONS.forEach((dir) => {
      (["front", "back", "left", "right"] as const).forEach((side) => {
        getSidePorts(5, 5, side, dir, 1, 2).forEach((port) => {
          const dist =
            Math.abs(port.inner.x - port.outer.x) +
            Math.abs(port.inner.y - port.outer.y);
          expect(dist).toBe(1);
        });
      });
    });
  });
});

describe("getPortLocalPosition", () => {
  it("places a 1x1 arrow just outside the tile edge", () => {
    expect(getPortLocalPosition("front", 0, 1, 1)).toEqual({ x: 0, z: -0.7 });
    expect(getPortLocalPosition("back", 0, 1, 1)).toEqual({ x: 0, z: 0.7 });
  });

  it("places 1x2 arrows relative to the footprint centre", () => {
    // Centre sits between the two tiles: front edge is 1.2 away, back too.
    expect(getPortLocalPosition("front", 0, 1, 2)).toEqual({ x: 0, z: -1.2 });
    expect(getPortLocalPosition("back", 0, 1, 2)).toEqual({ x: 0, z: 1.2 });
  });

  it("spreads the arrows of a wide side over its tiles", () => {
    expect(getPortLocalPosition("front", 0, 2, 2)).toEqual({
      x: -0.5,
      z: -1.2,
    });
    expect(getPortLocalPosition("front", 1, 2, 2)).toEqual({ x: 0.5, z: -1.2 });
  });
});

describe("getAdjacentInnerTile", () => {
  it("returns the occupied tile that touches the target", () => {
    // 1x2 at (5,5): only (5,6) touches (5,7).
    expect(getAdjacentInnerTile(5, 5, { width: 1, height: 2 }, 5, 7)).toEqual({
      x: 5,
      y: 6,
    });
  });

  it("returns null when nothing is adjacent", () => {
    expect(
      getAdjacentInnerTile(5, 5, { width: 1, height: 2 }, 9, 9),
    ).toBeNull();
  });
});
