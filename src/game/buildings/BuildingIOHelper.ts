import { BuildingEntity } from "../entities/BuildingEntity";
import { IWorld } from "../entities/types";
import { IIOBuilding, IOSide, Direction, getDirectionFromSide, getDirectionOffset } from "./BuildingConfig";

/**
 * Checks if a port is physically connected to another compatible port.
 */
export function isPortConnected(
  world: IWorld,
  x: number,
  y: number,
  portDirection: Direction,
  isOutput: boolean
): boolean {
  const offset = getDirectionOffset(portDirection);
  const targetX = x + offset.dx;
  const targetY = y + offset.dy;
  const neighbor = world.getBuilding(targetX, targetY);

  if (!neighbor) return false;

  if (isOutput) {
    // We are checking our output. Neighbor must have an input at our location.
    
    // 1. Structural Check: Coordinate match with getInputPosition
    // We check this FIRST because it confirms physical alignment regardless of logic state (e.g. full inventory)
    if ("getInputPosition" in neighbor) {
      const neighborInput = (neighbor as { getInputPosition: () => { x: number; y: number } | null }).getInputPosition();
      if (neighborInput && neighborInput.x === x && neighborInput.y === y) {
        return true;
      }
    }

    // 2. Logic Check: Generic canInput (Fallback for multi-tile/variable inputs like Hub)
    if ("canInput" in neighbor && typeof (neighbor as any).canInput === 'function') {
      try {
        if ((neighbor as any).canInput(x, y)) return true;
      } catch (e) { /* ignore */ }
    }
    
    return false;
  } else {
    // We are checking our input. Neighbor must have an output at our location.

    // 1. Structural Check
    if ("getOutputPosition" in neighbor) {
      const neighborOutput = (neighbor as { getOutputPosition: () => { x: number; y: number } | null }).getOutputPosition();
      if (neighborOutput && neighborOutput.x === x && neighborOutput.y === y) {
        return true;
      }
    }
    
    // 2. Logic warning: We don't have a standard canOutput(x,y) yet, but if we did, it would go here.
    
    return false;
  }
}

/**
 * Central logic to update connectivity flags for any IO building.
 */
export function updateBuildingConnectivity(
  building: BuildingEntity & IIOBuilding,
  world: IWorld
): void {
  const io = building.io;

  // Handle Input
  if (io.hasInput) {
    const side: IOSide = io.inputSide || "front";
    const absoluteDir = getDirectionFromSide(side, building.direction);
    building.isInputConnected = isPortConnected(world, building.x, building.y, absoluteDir, false);
  } else {
    building.isInputConnected = false;
  }

  // Handle Output
  if (io.hasOutput) {
    const side: IOSide = io.outputSide || "front";
    const absoluteDir = getDirectionFromSide(side, building.direction);
    building.isOutputConnected = isPortConnected(world, building.x, building.y, absoluteDir, true);
  } else {
    building.isOutputConnected = false;
  }
}
