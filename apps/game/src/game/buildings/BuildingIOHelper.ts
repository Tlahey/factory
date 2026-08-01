import { BuildingEntity } from "../entities/BuildingEntity";
import { IWorld, Direction } from "../entities/types";
import {
  IIOBuilding,
  getDirectionOffset,
  IOSide,
  BuildingConfig,
  IOConfig,
} from "./BuildingConfig";
import {
  IOPort,
  TilePos,
  getBaseSize,
  getPortKey,
  getSideLength,
  getSidePorts,
} from "./BuildingFootprint";

/**
 * BUILDING I/O
 *
 * Ports are derived from `config.io` + the building's footprint, in one place:
 * a side declared in the config expands to one port per tile along that side
 * (see {@link getSidePorts}). Buildings only override this when their ports are
 * genuinely dynamic (belts curving, splitter fan-out).
 *
 * ARROW VISIBILITY
 * - Output arrow (red): hidden once the port's outer tile holds a building that
 *   accepts input from the port's inner tile.
 * - Input arrow (green): hidden once a neighbour's output points at the port's
 *   inner tile.
 * - A 1x1 belt draws a single back arrow but accepts back/left/right, so that
 *   arrow hides as soon as any of the three is fed.
 */

/** Minimal shape needed to derive ports. Avoids requiring a full entity. */
export interface IOBuildingLike {
  x: number;
  y: number;
  direction: Direction;
  io: IOConfig;
  getConfig(): BuildingConfig | undefined;
}

/** Sides declared for a given port kind, with the historical defaults. */
export function getIOSides(io: IOConfig, kind: "input" | "output"): IOSide[] {
  if (!io) return [];

  if (kind === "input") {
    if (!io.hasInput) return [];
    if (io.validInputSides?.length) return io.validInputSides;
    return [io.inputSide ?? "back"];
  }

  if (!io.hasOutput) return [];
  if (io.validOutputSides?.length) return io.validOutputSides;
  return [io.outputSide ?? "front"];
}

/**
 * All ports of a kind, expanded tile by tile along each declared side.
 */
export function getBuildingPorts(
  building: IOBuildingLike,
  kind: "input" | "output",
): IOPort[] {
  const base = getBaseSize(building.getConfig());
  return getIOSides(building.io, kind).flatMap((side) =>
    getSidePorts(
      building.x,
      building.y,
      side,
      building.direction,
      base.width,
      base.height,
    ),
  );
}

/** Outer tiles of every configured input port. */
export function getConfiguredInputPositions(
  building: IOBuildingLike,
): TilePos[] {
  return getBuildingPorts(building, "input").map((p) => p.outer);
}

/** Outer tiles of every configured output port. */
export function getConfiguredOutputPositions(
  building: IOBuildingLike,
): TilePos[] {
  return getBuildingPorts(building, "output").map((p) => p.outer);
}

/** Canonical (first) input port tile, or null when the building has no input. */
export function getConfiguredInputPosition(
  building: IOBuildingLike,
): TilePos | null {
  return getConfiguredInputPositions(building)[0] ?? null;
}

/** Canonical (first) output port tile, or null when the building has no output. */
export function getConfiguredOutputPosition(
  building: IOBuildingLike,
): TilePos | null {
  return getConfiguredOutputPositions(building)[0] ?? null;
}

/**
 * Structural check: is (fromX, fromY) one of this building's input port tiles?
 * Capacity is a separate question, answered by `hasSpaceFor`.
 */
export function canInputFromConfig(
  building: IOBuildingLike,
  fromX: number,
  fromY: number,
): boolean {
  return getConfiguredInputPositions(building).some(
    (p) => p.x === fromX && p.y === fromY,
  );
}

/**
 * The output port whose outer tile is (toX, toY), or null.
 * Callers need the port's `inner` tile to announce a legitimate source.
 */
export function findOutputPortTo(
  building: IOBuildingLike,
  toX: number,
  toY: number,
): IOPort | null {
  return (
    getBuildingPorts(building, "output").find(
      (p) => p.outer.x === toX && p.outer.y === toY,
    ) ?? null
  );
}

/**
 * Check if a building has its OUTPUT port at the given target position.
 */
export function hasOutputPortAt(
  building: {
    getOutputPosition?: () => { x: number; y: number } | null;
    getOutputPositions?: () => { x: number; y: number }[];
  },
  targetX: number,
  targetY: number,
): boolean {
  if (building.getOutputPositions) {
    const ports = building.getOutputPositions();
    return ports.some((p) => p.x === targetX && p.y === targetY);
  }

  if (!building.getOutputPosition) return false;

  const outputPos = building.getOutputPosition();
  if (!outputPos) return false;

  return outputPos.x === targetX && outputPos.y === targetY;
}

/**
 * Check if a building has its INPUT port at the given target position.
 */
export function hasInputPortAt(
  building: {
    getInputPosition?: () => { x: number; y: number } | null;
    getInputPositions?: () => { x: number; y: number }[];
  },
  sourceX: number,
  sourceY: number,
): boolean {
  if (building.getInputPositions) {
    const ports = building.getInputPositions();
    return ports.some((p) => p.x === sourceX && p.y === sourceY);
  }

  if (!building.getInputPosition) return false;

  const inputPos = building.getInputPosition();
  if (!inputPos) return false;

  return inputPos.x === sourceX && inputPos.y === sourceY;
}

/**
 * Does any neighbour of (x, y) point its output at (x, y)?
 * Used for the belt "fed from any side" rule; direction-agnostic on purpose.
 */
function isFedFromAnySide(world: IWorld, x: number, y: number): boolean {
  const directions: Direction[] = ["north", "south", "east", "west"];

  for (const checkDir of directions) {
    const offset = getDirectionOffset(checkDir);
    const neighbor = world.getBuilding(x + offset.dx, y + offset.dy);
    if (!neighbor) continue;

    if (hasOutputPortAt(neighbor as BuildingEntity & IIOBuilding, x, y)) {
      return true;
    }
  }

  return false;
}

/**
 * Central logic to update connectivity flags for any IO building.
 * Flags are stored per port (`side#index`) and aggregated per side, so a wide
 * building can have one edge tile connected and the other still advertising.
 */
export function updateBuildingConnectivity(
  building: BuildingEntity & IIOBuilding,
  world: IWorld,
): void {
  const outputs = resolveConnectedPorts(building, world, "output");
  building.connectedOutputPorts = outputs.portKeys;
  building.connectedOutputSides = outputs.sides;
  building.isOutputConnected = outputs.portKeys.length > 0;

  const inputs = resolveConnectedPorts(building, world, "input");
  let inputPortKeys = inputs.portKeys;
  let inputSides = inputs.sides;

  // A 1x1 belt draws a single back arrow but accepts back, left and right.
  // Hide that arrow as soon as anything feeds the belt, from any side.
  if (
    building.buildingType === "conveyor" &&
    inputPortKeys.length === 0 &&
    isFedFromAnySide(world, building.x, building.y)
  ) {
    inputPortKeys = [getPortKey("back", 0)];
    inputSides = ["back"];
  }

  building.connectedInputPorts = inputPortKeys;
  building.connectedInputSides = inputSides;
  building.isInputConnected = inputPortKeys.length > 0;
}

function resolveConnectedPorts(
  building: BuildingEntity & IIOBuilding,
  world: IWorld,
  kind: "input" | "output",
): { portKeys: string[]; sides: IOSide[] } {
  const portKeys: string[] = [];
  const sides = new Set<IOSide>();

  for (const port of getBuildingPorts(building, kind)) {
    const neighbor = world.getBuilding(port.outer.x, port.outer.y);
    if (!neighbor || neighbor === building) continue;

    const connected =
      kind === "output"
        ? hasInputPortAt(
            neighbor as BuildingEntity & IIOBuilding,
            port.inner.x,
            port.inner.y,
          )
        : hasOutputPortAt(
            neighbor as BuildingEntity & IIOBuilding,
            port.inner.x,
            port.inner.y,
          );

    if (!connected) continue;

    portKeys.push(getPortKey(port.side, port.index));
    sides.add(port.side);
  }

  return { portKeys, sides: [...sides] };
}

/**
 * Calculate the world position offset for a given relative IO side.
 *
 * Legacy single-port accessor kept for callers that only ever deal with the
 * canonical port. Prefer {@link getSidePorts} for anything multi-tile: it
 * returns the whole edge plus the inner tile carrying each port.
 */
export function getIOOffset(
  side: IOSide,
  buildingDirection: Direction,
  width: number = 1,
  height: number = 1,
): { dx: number; dy: number } {
  const port = getSidePorts(0, 0, side, buildingDirection, width, height)[0];
  return { dx: port.outer.x, dy: port.outer.y };
}

/**
 * Definition for an Arrow to be rendered
 */
export interface IOArrowDefinition {
  side: IOSide;
  type: "input" | "output";
  /** Index of the port along its side, in the base (north-facing) frame. */
  index: number;
}

/**
 * Get all required arrows for a building configuration.
 * One arrow per port tile: a two-tile-wide input side gets two arrows.
 */
export function getIOArrowDefinitions(
  config: BuildingConfig | undefined,
): IOArrowDefinition[] {
  const io = (config as unknown as { io?: IOConfig } | undefined)?.io;
  if (!io) return [];

  const base = getBaseSize(config);
  const arrows: IOArrowDefinition[] = [];

  (["input", "output"] as const).forEach((type) => {
    getIOSides(io, type).forEach((side) => {
      const count = getSideLength(side, base.width, base.height);
      for (let index = 0; index < count; index++) {
        arrows.push({ side, type, index });
      }
    });
  });

  return arrows;
}
