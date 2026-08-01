import type { BuildingEntity } from "../entities/BuildingEntity";
import type { IWorld } from "../entities/types";
import { getAdjacentInnerTile, TilePos } from "./BuildingFootprint";

/**
 * ITEM TRANSFER
 *
 * Single entry point for "a building pushes one item onto the tile in front of
 * it". Every producer (extractor, furnace, sawmill, chest) and every logistic
 * building (conveyor, splitter, merger) goes through here, so a new sink only
 * has to implement {@link ItemSink} once to be reachable from all of them.
 *
 * Two questions are deliberately kept separate:
 * - `canInput(from)`   STRUCTURAL: "is that tile one of my input ports?".
 *                      Used by connectivity/arrows, independent of capacity.
 * - `hasSpaceFor(...)` DYNAMIC: "do I have room right now?".
 *
 * A transfer only happens when both are true. Mixing the two is what made
 * belts accept items through their output face and made producers ignore
 * mergers/splitters entirely.
 */

export interface ItemSink {
  /** Structural check: is (fromX, fromY) one of this building's input ports? */
  canInput(fromX: number, fromY: number): boolean;
  /** Accept an item. Implementations must re-check their own constraints. */
  addItem(
    type: string,
    amount?: number,
    fromX?: number,
    fromY?: number,
  ): boolean;
  /** Capacity check, without mutating anything. Defaults to `true` if absent. */
  hasSpaceFor?(type: string, amount: number): boolean;
}

type PartialSink = {
  canInput?: unknown;
  addItem?: unknown;
  hasSpaceFor?: unknown;
};

/**
 * Narrow a building to an {@link ItemSink}, or null when it cannot receive
 * items at all (extractor, electric pole, ...).
 */
export function asItemSink(
  building: BuildingEntity | undefined | null,
): (BuildingEntity & ItemSink) | null {
  if (!building) return null;
  const candidate = building as unknown as PartialSink;
  if (typeof candidate.addItem !== "function") return null;
  if (typeof candidate.canInput !== "function") return null;
  return building as BuildingEntity & ItemSink;
}

/**
 * Resolve the sink occupying (x, y), ignoring `source` so a multi-tile
 * building never pushes into itself.
 */
export function getItemSinkAt(
  world: IWorld,
  x: number,
  y: number,
  source?: BuildingEntity,
): (BuildingEntity & ItemSink) | null {
  const building = world.getBuilding(x, y);
  if (!building || building === source) return null;
  return asItemSink(building);
}

/**
 * The tile of `source` a receiver at (toX, toY) actually sees.
 *
 * Sinks validate "is the sender next to me?", so a multi-tile building must
 * announce the occupied tile that touches the receiver, not its anchor. A 1x2
 * furnace facing south outputs from its second tile: sending the anchor made
 * every belt reject the item.
 */
export function getSourcePortTile(
  source: BuildingEntity,
  toX: number,
  toY: number,
): TilePos {
  const anchor = { x: source.x, y: source.y };
  if (source.width === 1 && source.height === 1) return anchor;

  return (
    getAdjacentInnerTile(
      source.x,
      source.y,
      { width: source.width, height: source.height },
      toX,
      toY,
    ) ?? anchor
  );
}

/**
 * Can `source` push `type` onto the tile (toX, toY) right now?
 * Answers both the structural and the capacity question.
 */
export function canPushItem(
  world: IWorld,
  source: BuildingEntity,
  toX: number,
  toY: number,
  type: string,
  amount: number = 1,
): boolean {
  const sink = getItemSinkAt(world, toX, toY, source);
  if (!sink) return false;
  const from = getSourcePortTile(source, toX, toY);
  if (!sink.canInput(from.x, from.y)) return false;
  if (typeof sink.hasSpaceFor === "function") {
    return sink.hasSpaceFor(type, amount);
  }
  return true;
}

/**
 * Push one item from `source` onto the tile (toX, toY).
 * Returns true only when the sink actually took it.
 */
export function pushItem(
  world: IWorld,
  source: BuildingEntity,
  toX: number,
  toY: number,
  type: string,
  amount: number = 1,
): boolean {
  const sink = getItemSinkAt(world, toX, toY, source);
  if (!sink) return false;
  const from = getSourcePortTile(source, toX, toY);
  if (!sink.canInput(from.x, from.y)) return false;
  if (typeof sink.hasSpaceFor === "function" && !sink.hasSpaceFor(type, amount))
    return false;
  return sink.addItem(type, amount, from.x, from.y);
}

/**
 * Push to the building's own output port. Convenience wrapper used by every
 * producer, so the "where do I output?" question has a single answer.
 */
export function pushItemToOutput(
  world: IWorld,
  source: BuildingEntity & {
    getOutputPosition(): { x: number; y: number } | null;
  },
  type: string,
  amount: number = 1,
): boolean {
  const pos = source.getOutputPosition();
  if (!pos) return false;
  return pushItem(world, source, pos.x, pos.y, type, amount);
}

/**
 * Capacity/structure check against the building's own output port.
 */
export function canPushItemToOutput(
  world: IWorld,
  source: BuildingEntity & {
    getOutputPosition(): { x: number; y: number } | null;
  },
  type: string,
  amount: number = 1,
): boolean {
  const pos = source.getOutputPosition();
  if (!pos) return false;
  return canPushItem(world, source, pos.x, pos.y, type, amount);
}

/** Generate a unique-enough id used to keep item meshes stable across belts. */
export function createItemId(): number {
  return Math.floor(Math.random() * 1000000);
}
