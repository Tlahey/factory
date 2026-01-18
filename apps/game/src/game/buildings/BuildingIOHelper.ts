import { BuildingEntity } from "../entities/BuildingEntity";
import { IWorld, Direction } from "../entities/types";
import {
  IIOBuilding,
  getDirectionOffset,
  IOSide,
  BuildingConfig,
  IOConfig,
} from "./BuildingConfig";

/**
 * SIMPLIFIED ARROW VISIBILITY RULES:
 *
 * OUTPUT ARROW (red):
 * - Hide if ANY building exists at the output position
 *
 * INPUT ARROW (green):
 * - Hide if a neighbor's output points at us (conveyor/extractor facing us)
 */

/**
 * Check if output is connected (any building at output position)
 */
function isOutputConnectedInternal(
  world: IWorld,
  x: number,
  y: number,
  outputDirection: Direction,
): boolean {
  const offset = getDirectionOffset(outputDirection);
  const targetX = x + offset.dx;
  const targetY = y + offset.dy;
  const neighbor = world.getBuilding(targetX, targetY);

  // Simple rule: output connected if ANY building at output position
  return neighbor !== undefined && neighbor !== null;
}

/**
 * Check if input is connected (any neighbor's output points at us)
 * Checks ALL adjacent positions, not just the canonical input direction,
 * to handle 90° angle connections properly.
 */
function isInputConnectedInternal(
  world: IWorld,
  x: number,
  y: number,
  _inputDirection: Direction,
): boolean {
  // Check ALL adjacent positions for any building whose output points to us
  const directions: Direction[] = ["north", "south", "east", "west"];

  for (const checkDir of directions) {
    const offset = getDirectionOffset(checkDir);
    const neighborX = x + offset.dx;
    const neighborY = y + offset.dy;
    const neighbor = world.getBuilding(neighborX, neighborY);

    if (!neighbor) continue;

    // Check if neighbor has an output that targets our position
    if ("getOutputPosition" in neighbor) {
      const neighborOutput = (
        neighbor as { getOutputPosition: () => { x: number; y: number } | null }
      ).getOutputPosition();
      // Neighbor's output should equal OUR position
      if (neighborOutput && neighborOutput.x === x && neighborOutput.y === y) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Exported function for external use (e.g., PlacementVisuals)
 */
export function isPortConnected(
  world: IWorld,
  x: number,
  y: number,
  portDirection: Direction,
  isOutput: boolean,
): boolean {
  if (isOutput) {
    return isOutputConnectedInternal(world, x, y, portDirection);
  } else {
    return isInputConnectedInternal(world, x, y, portDirection);
  }
}

/**
 * Central logic to update connectivity flags for any IO building.
 */
export function updateBuildingConnectivity(
  building: BuildingEntity & IIOBuilding,
  world: IWorld,
): void {
  const io = building.io;
  const { width = 1, height = 1 } = building;

  // --- OUTPUT CONNECTIVITY ---
  const validOutputSides = io.validOutputSides ||
    (io.outputSide ? [io.outputSide] : []) || ["front"];

  const connectedOutputSides: IOSide[] = [];
  let anyOutputConnected = false;

  if (io.hasOutput) {
    for (const side of validOutputSides) {
      // We calculate the source position (edge of the building)
      // For multi-tile buildings, this logic might need refinement if ports are not centered
      // But currently we assume ports are logically at the "center" or standard offset
      // Since isOutputConnectedInternal uses standard offset from (x,y), let's stick to that for 1x1
      // For larger buildings, getIOOffset usually handles it relative to (x,y).

      // Use getIOOffset to find the external tile
      const offset = getIOOffset(side, building.direction, width, height);
      const targetX = building.x + offset.dx;
      const targetY = building.y + offset.dy;

      // Check if there is a building at target
      const neighbor = world.getBuilding(targetX, targetY);
      const isConnected = neighbor !== undefined && neighbor !== null;

      if (isConnected) {
        connectedOutputSides.push(side);
        anyOutputConnected = true;
      }
    }
  }

  building.isOutputConnected = anyOutputConnected;
  building.connectedOutputSides = connectedOutputSides;

  // --- INPUT CONNECTIVITY ---
  const validInputSides = io.validInputSides ||
    (io.inputSide ? [io.inputSide] : []) || ["back"];

  const connectedInputSides: IOSide[] = [];
  let anyInputConnected = false;

  if (io.hasInput) {
    for (const side of validInputSides) {
      const offset = getIOOffset(side, building.direction, width, height);
      const feederX = building.x + offset.dx;
      const feederY = building.y + offset.dy;

      // Check if building at feederX/Y is pointing at us
      const neighbor = world.getBuilding(feederX, feederY);
      let isConnected = false;

      if (neighbor && "getOutputPosition" in neighbor) {
        const neighborOutput = (
          neighbor as unknown as {
            getOutputPosition: () => { x: number; y: number } | null;
          }
        ).getOutputPosition();
        if (
          neighborOutput &&
          // Check if neighbor outputs to THIS exact building
          // We check basic coordinates of the building anchor
          // TODO: For multi-tile buildings, strict intersection check might be needed if they output to a specific 'part'
          neighborOutput.x === building.x &&
          neighborOutput.y === building.y
        ) {
          isConnected = true;
        }
      }

      // Special handling for Conveyor as 'building':
      // Conveyor visual logic relies on 'getInputPosition' which dynamically changes based on turn type?
      // Actually, standard Conveyor logic uses 'updateBuildingConnectivity' generic helper too.
      // But if Conveyor is Curving, its 'Input' might physically be on the side.
      // IF this generic helper says 'Back' is valid input side, but Conveyor is Curving Left,
      // then Back is NOT actually valid for data flow, but valid for structural...
      // However, for pure visual 'Arrow Hiding', if a machine is feeding into the Back, and Conveyor accepts it...

      if (isConnected) {
        connectedInputSides.push(side);
        anyInputConnected = true;
      }
    }
  }

  building.isInputConnected = anyInputConnected;
  building.connectedInputSides = connectedInputSides;
}

/**
 * Calculate the world position offset for a given relative IO side,
 * accounting for building direction and dimensions.
 *
 * @param side - The relative side ('front', 'back', 'left', 'right')
 * @param buildingDirection - The direction the building is facing
 * @param width - Building width (default 1)
 * @param height - Building height (default 1)
 * @returns The offset { dx, dy } to add to the building position
 */
export function getIOOffset(
  side: "front" | "back" | "left" | "right",
  buildingDirection: Direction,
  width: number = 1,
  height: number = 1,
): { dx: number; dy: number } {
  const clockwiseOrder: Direction[] = ["north", "east", "south", "west"];
  const currentIndex = clockwiseOrder.indexOf(buildingDirection);

  // Map relative side to absolute direction index
  let absDirIndex: number;
  switch (side) {
    case "front":
      absDirIndex = currentIndex;
      break;
    case "right":
      absDirIndex = (currentIndex + 1) % 4;
      break;
    case "back":
      absDirIndex = (currentIndex + 2) % 4;
      break;
    case "left":
      absDirIndex = (currentIndex + 3) % 4;
      break;
  }

  const absDir = clockwiseOrder[absDirIndex];

  // Adjust dimensions based on rotation
  const w =
    buildingDirection === "north" || buildingDirection === "south"
      ? width
      : height;
  const h =
    buildingDirection === "north" || buildingDirection === "south"
      ? height
      : width;

  // Return offset based on absolute direction
  switch (absDir) {
    case "north":
      return { dx: 0, dy: -1 };
    case "south":
      return { dx: 0, dy: h };
    case "east":
      return { dx: w, dy: 0 };
    case "west":
      return { dx: -1, dy: 0 };
    default: {
      // Exhaustiveness check
      const _exhaustiveCheck: never = absDir;
      return _exhaustiveCheck;
    }
  }
}

/**
 * Definition for an Arrow to be rendered
 */
export interface IOArrowDefinition {
  side: IOSide;
  type: "input" | "output";
}

/**
 * Get all required arrows for a building configuration.
 * Always returns a list of all POTENTIAL arrows (even if hidden).
 */
export function getIOArrowDefinitions(
  config: BuildingConfig,
): IOArrowDefinition[] {
  const arrows: IOArrowDefinition[] = [];
  const io = (config as unknown as { io?: IOConfig }).io;
  if (!io) return arrows;

  // Inputs
  if (io.hasInput) {
    const sides = io.validInputSides || (io.inputSide ? [io.inputSide] : []);
    // Default to back if nothing specified but hasInput is true
    if (sides.length === 0) sides.push("back");

    sides.forEach((side: IOSide) => {
      arrows.push({ side, type: "input" });
    });
  }

  // Outputs
  if (io.hasOutput) {
    const sides = io.validOutputSides || (io.outputSide ? [io.outputSide] : []);
    // Default to front if nothing specified but hasOutput is true
    if (sides.length === 0) sides.push("front");

    sides.forEach((side: IOSide) => {
      arrows.push({ side, type: "output" });
    });
  }

  return arrows;
}
