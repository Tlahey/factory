import { BuildingEntity } from "../../entities/BuildingEntity";
import {
  getDirectionOffset,
  getOppositeDirection,
  determineFlowInputDirection,
  calculateTurnType,
} from "./ConveyorLogicSystem";
import { IWorld, Direction } from "../../entities/types";

import { IIOBuilding, PowerConfig } from "../BuildingConfig";
import { ConveyorConfigType } from "./ConveyorConfig";
import { updateBuildingConnectivity } from "../BuildingIOHelper";
import { skillTreeManager } from "../hub/skill-tree/SkillTreeManager";

export class Conveyor extends BuildingEntity implements IIOBuilding {
  constructor(x: number, y: number, direction: Direction = "north") {
    super(x, y, "conveyor", direction);
  }

  public currentItem: string | null = null;
  public itemId: number | null = null; // Unique ID for tracking mesh
  public transportProgress: number = 0;
  public isResolved: boolean = false; // True only if connected to a valid destination (chest)
  public visualType: "straight" | "left" | "right" = "straight";

  public get transportSpeed(): number {
    const baseSpeed =
      ((this.getConfig() as ConveyorConfigType).speed ?? 60) / 60; // tiles per second
    const multiplier = skillTreeManager.getStatMultiplier("conveyor", "speed");
    return baseSpeed * multiplier;
  }

  public tick(delta: number, world?: IWorld): void {
    if (world) {
      this.updateVisualState(world);
      updateBuildingConnectivity(this, world);
    }

    if (!this.currentItem) return;

    this.transportProgress += this.transportSpeed * delta;

    if (this.transportProgress >= 1) {
      if (world) this.moveItem(world);
    }
  }

  private moveItem(world: IWorld): void {
    // Determine target coordinates based on direction
    let tx = this.x;
    let ty = this.y;

    if (this.direction === "north") ty -= 1;
    else if (this.direction === "south") ty += 1;
    else if (this.direction === "east") tx += 1;
    else if (this.direction === "west") tx -= 1;

    const targetBuilding = world.getBuilding(tx, ty);

    if (targetBuilding instanceof Conveyor) {
      if (!targetBuilding.currentItem) {
        targetBuilding.currentItem = this.currentItem;
        targetBuilding.itemId = this.itemId;
        // Preserve overflow time for smooth transition
        targetBuilding.transportProgress = this.transportProgress - 1;
        this.currentItem = null;
        this.itemId = null;
        this.transportProgress = 0;
      }
    } else if (
      targetBuilding &&
      "addItem" in targetBuilding &&
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      typeof (targetBuilding as any).addItem === "function"
    ) {
      // Pass coordinates to support round-robin in Mergers
      if (
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (targetBuilding as any).addItem(this.currentItem!, 1, this.x, this.y)
      ) {
        this.currentItem = null;
        this.itemId = null;
        this.transportProgress = 0;
      }
    }

    // Clamp progress
    if (this.transportProgress > 1) this.transportProgress = 1;
  }

  /**
   * Safely removes the current item from the conveyor.
   * Used when player drags an item off the belt.
   */
  public removeItem(): void {
    this.currentItem = null;
    this.itemId = null;
    this.transportProgress = 0;
  }

  // --- Traits Implementation ---

  public get io() {
    return (this.getConfig() as ConveyorConfigType).io;
  }

  public get powerConfig(): PowerConfig | undefined {
    return undefined;
  }

  // --- IIOBuilding ---
  public getInputPosition(): { x: number; y: number } | null {
    if (!this.io.hasInput) return null;

    // For turns, input comes from a side, not the back
    // - Straight: input from back (opposite of direction)
    // - Left turn: input from the right side (90° clockwise from direction)
    // - Right turn: input from the left side (90° counter-clockwise from direction)
    let inputDir: "north" | "south" | "east" | "west";

    if (this.visualType === "left") {
      // Left turn: input from left side of output direction (90° counter-clockwise)
      inputDir = this.getRotatedDirection(this.direction, -1); // -90°
    } else if (this.visualType === "right") {
      // Right turn: input from right side of output direction (90° clockwise)
      inputDir = this.getRotatedDirection(this.direction, 1); // +90°
    } else {
      // Straight: input from back
      inputDir = getOppositeDirection(this.direction);
    }

    const offset = getDirectionOffset(inputDir);
    return { x: this.x + offset.dx, y: this.y + offset.dy };
  }

  public getInputPositions(): { x: number; y: number }[] {
    if (!this.io.hasInput) return [];

    // Conveyor accepts inputs from Back, Left, and Right (all except Front)
    const validDirs: Direction[] = [];

    // Back
    validDirs.push(getOppositeDirection(this.direction));

    // Left (-90)
    validDirs.push(this.getRotatedDirection(this.direction, -1));

    // Right (+90)
    validDirs.push(this.getRotatedDirection(this.direction, 1));

    return validDirs.map((dir) => {
      const offset = getDirectionOffset(dir);
      return { x: this.x + offset.dx, y: this.y + offset.dy };
    });
  }

  /** Rotate direction by 90° increments. steps > 0 = clockwise */
  private getRotatedDirection(dir: Direction, steps: number): Direction {
    const order: Direction[] = ["north", "east", "south", "west"];
    const index = order.indexOf(dir);
    const newIndex = (index + steps + 4) % 4;
    return order[newIndex];
  }

  public getOutputPosition(): { x: number; y: number } | null {
    if (!this.io.hasOutput) return null;
    // Conveyor output is in its direction (front)
    const offset = getDirectionOffset(this.direction);
    return { x: this.x + offset.dx, y: this.y + offset.dy };
  }

  public canInput(fromX: number, fromY: number): boolean {
    const dx = fromX - this.x;
    const dy = fromY - this.y;

    // Check if neighbor is adjacent
    if (Math.abs(dx) + Math.abs(dy) !== 1) return false;

    // Conveyor accepts input from any side EXCEPT the front (output direction)
    const outputOffset = getDirectionOffset(this.direction);
    if (dx === outputOffset.dx && dy === outputOffset.dy) return false;

    // Structural check only: return true even if full.
    // Logic for item transfer handles the 'full' state separately.
    return true;
  }

  public canOutput(world: IWorld): boolean {
    let tx = this.x;
    let ty = this.y;
    if (this.direction === "north") ty -= 1;
    else if (this.direction === "south") ty += 1;
    else if (this.direction === "east") tx += 1;
    else if (this.direction === "west") tx -= 1;

    const target = world.getBuilding(tx, ty);
    if (!target) return false;

    if (target instanceof Conveyor) {
      return !target.currentItem;
    }

    if (
      "canInput" in target &&
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      typeof (target as any).canInput === "function"
    ) {
      return (target as unknown as IIOBuilding).canInput(this.x, this.y);
    }

    return false;
  }

  public tryOutput(world: IWorld): boolean {
    this.moveItem(world);
    return this.currentItem === null; // Success if item moved
  }

  public getColor(): number {
    return 0xaaaaaa; // Light Gray
  }

  /**
   * Update visual type (straight/left/right) based on flow direction.
   * Direction is now fixed at placement time, so this only updates visuals.
   */
  public updateVisualState(world: IWorld): void {
    const flowIn = determineFlowInputDirection(
      this.x,
      this.y,
      this.direction,
      world,
    );

    if (flowIn) {
      this.visualType = calculateTurnType(flowIn, this.direction) as
        | "straight"
        | "left"
        | "right";
    } else {
      this.visualType = "straight";
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public serialize(): any {
    return {
      currentItem: this.currentItem,
      itemId: this.itemId,
      transportProgress: this.transportProgress,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public deserialize(data: any): void {
    this.currentItem = data.currentItem || null;
    this.itemId = data.itemId || null;
    this.transportProgress = data.transportProgress || 0;
  }
}
