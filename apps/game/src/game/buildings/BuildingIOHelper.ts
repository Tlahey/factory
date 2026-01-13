import { BuildingEntity } from "../entities/BuildingEntity";
import { IWorld } from "../entities/types";
import { IIOBuilding, Direction, getDirectionOffset } from "./BuildingConfig";

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

  // Handle Output - simple: any building at output = connected
  if (io.hasOutput && "getOutputPosition" in building) {
    const outputPos = (
      building as unknown as {
        getOutputPosition: () => { x: number; y: number } | null;
      }
    ).getOutputPosition();
    if (outputPos) {
      const neighbor = world.getBuilding(outputPos.x, outputPos.y);
      building.isOutputConnected = neighbor !== undefined && neighbor !== null;
    } else {
      building.isOutputConnected = false;
    }
  } else {
    building.isOutputConnected = false;
  }

  // Handle Input - check ALL adjacent neighbors for any output pointing to us
  // This handles 90° angle connections properly
  if (io.hasInput) {
    const directions: Direction[] = ["north", "south", "east", "west"];
    let isConnected = false;

    for (const checkDir of directions) {
      const offset = getDirectionOffset(checkDir);
      const neighborX = building.x + offset.dx;
      const neighborY = building.y + offset.dy;
      const neighbor = world.getBuilding(neighborX, neighborY);

      if (!neighbor) continue;

      // Check if neighbor has an output that targets our position
      if ("getOutputPosition" in neighbor) {
        const neighborOutput = (
          neighbor as unknown as {
            getOutputPosition: () => { x: number; y: number } | null;
          }
        ).getOutputPosition();
        if (
          neighborOutput &&
          neighborOutput.x === building.x &&
          neighborOutput.y === building.y
        ) {
          isConnected = true;
          break;
        }
      }
    }

    building.isInputConnected = isConnected;
  } else {
    building.isInputConnected = false;
  }
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
  }
}
