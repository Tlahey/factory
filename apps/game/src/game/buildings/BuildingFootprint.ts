import { Direction } from "../entities/types";
import { BuildingConfig, IOSide, getDirectionOffset } from "./BuildingConfig";

/**
 * BUILDING FOOTPRINT
 *
 * Single source of truth for "which tiles does a building occupy, where is its
 * visual centre, and which tiles are its I/O ports".
 *
 * Three coordinate conventions live here, and mixing them is what used to break
 * multi-tile buildings:
 *
 * - **Base frame**: `config.width` x `config.height`, always as authored facing
 *   north. This is the frame the 3D model and the arrows are built in.
 * - **World frame**: the base frame rotated by the building's `direction`.
 *   Width/height swap for east/west. `BuildingEntity.width/height` are already
 *   in this frame.
 * - **Anchor**: `building.x / building.y`, the min-x / min-y tile of the world
 *   frame footprint. This is what `World` keys its tile map on and what save
 *   files store.
 */

export interface TilePos {
  x: number;
  y: number;
}

export interface FootprintSize {
  width: number;
  height: number;
}

/**
 * One I/O port: the tile of the building that carries the port (`inner`) and
 * the external tile it exchanges items with (`outer`).
 *
 * Keeping both is what makes multi-tile transfers work: a 1x2 furnace facing
 * south outputs from its *second* tile, so telling a belt "I am pushing from
 * my anchor" is a lie the belt correctly rejects.
 */
export interface IOPort {
  inner: TilePos;
  outer: TilePos;
  side: IOSide;
  /**
   * Index of this port along its side, in the **base** frame — so port `i` is
   * the same physical port whatever the building's rotation.
   */
  index: number;
}

const CLOCKWISE_ORDER: Direction[] = ["north", "east", "south", "west"];

/** East/west swap a building's width and height. */
export function isRotatedDirection(direction: Direction): boolean {
  return direction === "east" || direction === "west";
}

/** Base (un-rotated) size of a building config. */
export function getBaseSize(config: BuildingConfig | undefined): FootprintSize {
  return {
    width: config?.width ?? 1,
    height: config?.height ?? 1,
  };
}

/** World-frame size for a base size rotated to `direction`. */
export function getFootprintSize(
  baseWidth: number,
  baseHeight: number,
  direction: Direction,
): FootprintSize {
  return isRotatedDirection(direction)
    ? { width: baseHeight, height: baseWidth }
    : { width: baseWidth, height: baseHeight };
}

/** World-frame size for a config rotated to `direction`. */
export function getFootprintSizeForConfig(
  config: BuildingConfig | undefined,
  direction: Direction,
): FootprintSize {
  const base = getBaseSize(config);
  return getFootprintSize(base.width, base.height, direction);
}

/** Every tile occupied by a footprint anchored at (x, y). */
export function getOccupiedTiles(
  x: number,
  y: number,
  size: FootprintSize,
): TilePos[] {
  const tiles: TilePos[] = [];
  for (let dx = 0; dx < size.width; dx++) {
    for (let dy = 0; dy < size.height; dy++) {
      tiles.push({ x: x + dx, y: y + dy });
    }
  }
  return tiles;
}

/** True when (tx, ty) is inside the footprint anchored at (x, y). */
export function footprintContains(
  x: number,
  y: number,
  size: FootprintSize,
  tx: number,
  ty: number,
): boolean {
  return tx >= x && tx < x + size.width && ty >= y && ty < y + size.height;
}

/**
 * Geometric centre of the footprint, in world units.
 *
 * Tiles are centred on integer coordinates, so a 1x2 footprint anchored at
 * (5, 5) is centred at (5, 5.5). Every view and the placement ghost must use
 * this, otherwise the model sits half a tile off the grid.
 */
export function getFootprintCenter(
  x: number,
  y: number,
  size: FootprintSize,
): TilePos {
  return {
    x: x + (size.width - 1) / 2,
    y: y + (size.height - 1) / 2,
  };
}

/**
 * Rotate a base-frame tile offset into the world-frame footprint.
 *
 * The base frame is the building as authored facing north, spanning
 * `[0, baseWidth) x [0, baseHeight)`. Rotating clockwise keeps the result
 * inside the (possibly swapped) world-frame bounding box.
 */
export function baseOffsetToWorldOffset(
  bx: number,
  by: number,
  baseWidth: number,
  baseHeight: number,
  direction: Direction,
): TilePos {
  switch (direction) {
    case "north":
      return { x: bx, y: by };
    case "east":
      return { x: baseHeight - 1 - by, y: bx };
    case "south":
      return { x: baseWidth - 1 - bx, y: baseHeight - 1 - by };
    case "west":
      return { x: by, y: baseWidth - 1 - bx };
  }
}

/**
 * Base-frame tile the building rotates around.
 *
 * Picked as the "most front-left" tile of the middle row/column so odd sizes
 * pivot on their true centre tile and even sizes pivot on a stable corner.
 */
function getPivotOffset(baseWidth: number, baseHeight: number): TilePos {
  return {
    x: Math.floor((baseWidth - 1) / 2),
    y: Math.floor((baseHeight - 1) / 2),
  };
}

/**
 * Convert the tile under the cursor into the anchor to place the building at.
 *
 * The hovered tile always stays the *same physical part* of the building, so
 * pressing R rotates the ghost around the cursor instead of making it jump to
 * the other side of it.
 */
export function getPlacementAnchor(
  hoverX: number,
  hoverY: number,
  baseWidth: number,
  baseHeight: number,
  direction: Direction,
): TilePos {
  const base = getPivotOffset(baseWidth, baseHeight);
  const pivot = baseOffsetToWorldOffset(
    base.x,
    base.y,
    baseWidth,
    baseHeight,
    direction,
  );
  return { x: hoverX - pivot.x, y: hoverY - pivot.y };
}

/** Same as {@link getPlacementAnchor} but reading dimensions off a config. */
export function getPlacementAnchorForConfig(
  hoverX: number,
  hoverY: number,
  config: BuildingConfig | undefined,
  direction: Direction,
): TilePos {
  const base = getBaseSize(config);
  return getPlacementAnchor(hoverX, hoverY, base.width, base.height, direction);
}

/** Absolute world direction of a relative side, for a building facing `direction`. */
export function getAbsoluteSideDirection(
  side: IOSide,
  direction: Direction,
): Direction {
  const currentIndex = CLOCKWISE_ORDER.indexOf(direction);
  const turns: Record<IOSide, number> = {
    front: 0,
    right: 1,
    back: 2,
    left: 3,
  };
  return CLOCKWISE_ORDER[(currentIndex + turns[side]) % 4];
}

/** Number of tiles a given side spans, in the base frame. */
export function getSideLength(
  side: IOSide,
  baseWidth: number,
  baseHeight: number,
): number {
  return side === "front" || side === "back" ? baseWidth : baseHeight;
}

/**
 * Base-frame tile carrying port `index` of `side`.
 * Front is local -Z (north), back +Z, left -X, right +X.
 */
function getPortInnerBaseOffset(
  side: IOSide,
  index: number,
  baseWidth: number,
  baseHeight: number,
): TilePos {
  switch (side) {
    case "front":
      return { x: index, y: 0 };
    case "back":
      return { x: index, y: baseHeight - 1 };
    case "left":
      return { x: 0, y: index };
    case "right":
      return { x: baseWidth - 1, y: index };
  }
}

/**
 * Every port along one side of a building.
 *
 * A 1x1 side has one port; the north side of a 2x2 hub has two. Returning the
 * whole edge is what lets belts dock anywhere along a large building instead
 * of only at its anchor corner.
 *
 * Ports are indexed in the **base frame**, so port `i` is always the same
 * physical port whatever the rotation — which is what lets the arrow meshes
 * (authored in the same frame) map one-to-one onto them.
 */
export function getSidePorts(
  x: number,
  y: number,
  side: IOSide,
  direction: Direction,
  baseWidth: number,
  baseHeight: number,
): IOPort[] {
  const absDir = getAbsoluteSideDirection(side, direction);
  const step = getDirectionOffset(absDir);
  const count = getSideLength(side, baseWidth, baseHeight);
  const ports: IOPort[] = [];

  for (let index = 0; index < count; index++) {
    const base = getPortInnerBaseOffset(side, index, baseWidth, baseHeight);
    const offset = baseOffsetToWorldOffset(
      base.x,
      base.y,
      baseWidth,
      baseHeight,
      direction,
    );
    const inner = { x: x + offset.x, y: y + offset.y };
    ports.push({
      inner,
      outer: { x: inner.x + step.dx, y: inner.y + step.dy },
      side,
      index,
    });
  }

  return ports;
}

/**
 * Local-space position of a port's arrow, in the base (north-facing) frame.
 * `margin` pushes the arrow just outside the building silhouette.
 */
export function getPortLocalPosition(
  side: IOSide,
  index: number,
  baseWidth: number,
  baseHeight: number,
  margin: number = 0.2,
): { x: number; z: number } {
  const base = getPortInnerBaseOffset(side, index, baseWidth, baseHeight);
  // Base-frame tile centres, relative to the footprint centre.
  const cx = base.x - (baseWidth - 1) / 2;
  const cz = base.y - (baseHeight - 1) / 2;
  const edge = 0.5 + margin;

  switch (side) {
    case "front":
      return { x: cx, z: cz - edge };
    case "back":
      return { x: cx, z: cz + edge };
    case "left":
      return { x: cx - edge, z: cz };
    case "right":
      return { x: cx + edge, z: cz };
  }
}

/**
 * The tile of a footprint that is orthogonally adjacent to (toX, toY).
 *
 * Used when a building hands an item to a neighbour: the receiver validates
 * "are you next to me?", so a multi-tile sender must announce the tile that is
 * actually touching, not its anchor.
 */
export function getAdjacentInnerTile(
  x: number,
  y: number,
  size: FootprintSize,
  toX: number,
  toY: number,
): TilePos | null {
  for (const tile of getOccupiedTiles(x, y, size)) {
    if (Math.abs(tile.x - toX) + Math.abs(tile.y - toY) === 1) {
      return tile;
    }
  }
  return null;
}

/** Stable identifier for a port, used to name and toggle its arrow. */
export function getPortKey(side: IOSide, index: number): string {
  return `${side}#${index}`;
}
