import { BuildingEntity } from "../../entities/BuildingEntity";
import { Direction, IWorld } from "../../entities/types";
import { IIOBuilding, PowerConfig } from "../BuildingConfig";
import { ConveyorMergerConfigType } from "./ConveyorMergerConfig";
import { updateBuildingConnectivity } from "../BuildingIOHelper";
import {
  getDirectionOffset,
  getOppositeDirection,
  hasOutputPortAt,
} from "../conveyor/ConveyorLogicSystem";
import { Conveyor } from "../conveyor/Conveyor";

/** Possible input sides for the merger */
export type MergerInputSide = "back" | "left" | "right";

export class ConveyorMerger extends BuildingEntity implements IIOBuilding {
  public currentItem: string | null = null;
  public itemId: number | null = null;
  public transportProgress: number = 0;

  /**
   * Tracks the last side from which an item was taken for round-robin fairness.
   * Using explicit sides instead of indices for better readability.
   */
  private lastInputSide: MergerInputSide | "none" = "none";
  private lastWorld: IWorld | null = null;

  constructor(x: number, y: number, direction: Direction = "north") {
    super(x, y, "conveyor_merger", direction);
  }

  public get transportSpeed(): number {
    return ((this.getConfig() as ConveyorMergerConfigType).speed ?? 60) / 60;
  }

  public tick(delta: number, world: IWorld): void {
    this.lastWorld = world;
    updateBuildingConnectivity(this, world);

    // 1. Try to output existing item
    if (this.currentItem) {
      this.tryOutputInternal(world);
    }

    // 2. If empty, try to pull
    if (!this.currentItem) {
      if (this.tryPull(world)) {
        // 3. If we just pulled an item, try to output it IMMEDIATELY (Zero-latency)
        this.tryOutputInternal(world);
      }
    }
  }

  // Extracted output logic for reuse
  private tryOutputInternal(world: IWorld): boolean {
    if (this.moveItem(world)) {
      this.currentItem = null;
      this.itemId = null;
      this.transportProgress = 0;
      return true;
    }
    return false;
  }

  private tryPull(world: IWorld): boolean {
    const ports = this.getPortPositions();
    const sidesOrder: MergerInputSide[] = ["back", "left", "right"];

    let startIndex = 0;
    if (this.lastInputSide !== "none") {
      startIndex =
        (sidesOrder.indexOf(this.lastInputSide as MergerInputSide) + 1) % 3;
    }

    for (let i = 0; i < 3; i++) {
      const idx = (startIndex + i) % 3;
      const side = sidesOrder[idx];
      const pos = ports[side];
      const neighbor = world.getBuilding(pos.x, pos.y);

      if (neighbor && this.isNeighborReadyToOutput(neighbor)) {
        if (neighbor instanceof Conveyor) {
          // Pull from Conveyor
          this.currentItem = neighbor.currentItem;
          this.itemId = neighbor.itemId;
          this.transportProgress = 0;
          this.lastInputSide = side;

          // Clear Conveyor
          neighbor.currentItem = null;
          neighbor.itemId = null;
          neighbor.transportProgress = 0;
          return true;
        }
      }
    }
    return false;
  }

  public tryOutput(world: IWorld): boolean {
    return this.tryOutputInternal(world);
  }

  private moveItem(world: IWorld): boolean {
    const outputPos = this.getOutputPosition();
    if (!outputPos) return false;

    const target = world.getBuilding(outputPos.x, outputPos.y);
    if (!target) return false;

    if (target instanceof Conveyor) {
      if (!target.currentItem) {
        target.currentItem = this.currentItem;
        target.itemId = this.itemId;
        // Optimization: Start exactly at 0 to avoid "double distance" delay (was starting at -1)
        target.transportProgress = 0;
        return true;
      }
    } else if (
      target &&
      "addItem" in target &&
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      typeof (target as any).addItem === "function"
    ) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((target as any).addItem(this.currentItem!, 1, this.x, this.y)) {
        return true;
      }
    }
    return false;
  }

  // --- IIOBuilding ---

  public get io() {
    return (this.getConfig() as ConveyorMergerConfigType).io;
  }

  public getInputPosition(): { x: number; y: number } | null {
    // Return back position as canonical input
    const backDir = getOppositeDirection(this.direction);
    const offset = getDirectionOffset(backDir);
    return { x: this.x + offset.dx, y: this.y + offset.dy };
  }

  /**
   * Helper to map sides to their respective world coordinates.
   */
  private getPortPositions(): Record<
    MergerInputSide,
    { x: number; y: number }
  > {
    const backDir = getOppositeDirection(this.direction);
    const leftDir = this.getRotatedDirection(this.direction, -1);
    const rightDir = this.getRotatedDirection(this.direction, 1);

    const backOffset = getDirectionOffset(backDir);
    const leftOffset = getDirectionOffset(leftDir);
    const rightOffset = getDirectionOffset(rightDir);

    return {
      back: { x: this.x + backOffset.dx, y: this.y + backOffset.dy },
      left: { x: this.x + leftOffset.dx, y: this.y + leftOffset.dy },
      right: { x: this.x + rightOffset.dx, y: this.y + rightOffset.dy },
    };
  }

  public getInputPositions(): { x: number; y: number }[] {
    const ports = this.getPortPositions();
    return [ports.back, ports.left, ports.right];
  }

  public getOutputPosition(): { x: number; y: number } | null {
    const offset = getDirectionOffset(this.direction);
    return { x: this.x + offset.dx, y: this.y + offset.dy };
  }

  private getRotatedDirection(dir: Direction, steps: number): Direction {
    const order: Direction[] = ["north", "east", "south", "west"];
    const index = order.indexOf(dir);
    const newIndex = (index + steps + 4) % 4;
    return order[newIndex] as Direction;
  }

  public canInput(fromX: number, fromY: number): boolean {
    if (this.currentItem) return false;

    const ports = this.getPortPositions();
    let mySide: MergerInputSide | null = null;
    if (ports.back.x === fromX && ports.back.y === fromY) mySide = "back";
    else if (ports.left.x === fromX && ports.left.y === fromY) mySide = "left";
    else if (ports.right.x === fromX && ports.right.y === fromY)
      mySide = "right";

    if (!mySide) return false;

    // FAIRNESS CHECK:
    // If we have access to the world, check if any input that is "next" in order has an item.
    // Order: BACK -> LEFT -> RIGHT -> BACK
    if (this.lastWorld && this.lastInputSide !== "none") {
      const sidesOrder: MergerInputSide[] = ["back", "left", "right"];
      const lastIdx = sidesOrder.indexOf(this.lastInputSide as MergerInputSide);
      const myIdx = sidesOrder.indexOf(mySide);

      for (let i = 1; i < 3; i++) {
        const checkIdx = (lastIdx + i) % 3;
        if (checkIdx === myIdx) break; // We are the next most prioritized with an item

        const checkSide = sidesOrder[checkIdx];
        const pos = ports[checkSide];
        const neighbor = this.lastWorld.getBuilding(pos.x, pos.y);

        if (neighbor && this.isNeighborReadyToOutput(neighbor)) {
          // A more prioritized neighbor is ready! We should wait.
          return false;
        }
      }
    }

    return true;
  }

  private isNeighborReadyToOutput(neighbor: BuildingEntity): boolean {
    // Check if neighbor has an output port pointing to us
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!hasOutputPortAt(neighbor as any, this.x, this.y)) return false;

    // If it's a conveyor, check if it has an item at the end
    if (neighbor instanceof Conveyor) {
      return neighbor.currentItem !== null && neighbor.transportProgress >= 1;
    }

    // For other buildings like Extractor or Furnace, they usually try to push when ready.
    if ("canOutput" in neighbor && typeof neighbor.canOutput === "function") {
      return neighbor.canOutput(this.lastWorld!);
    }

    return false;
  }

  public addItem(
    type: string,
    _amount: number = 1,
    fromX?: number,
    fromY?: number,
  ): boolean {
    if (this.currentItem) return false;

    if (fromX !== undefined && fromY !== undefined) {
      const ports = this.getPortPositions();
      let mySide: MergerInputSide | null = null;
      if (ports.back.x === fromX && ports.back.y === fromY) mySide = "back";
      else if (ports.left.x === fromX && ports.left.y === fromY)
        mySide = "left";
      else if (ports.right.x === fromX && ports.right.y === fromY)
        mySide = "right";

      if (mySide) {
        // Double check fairness in case canInput wasn't called or state changed
        if (!this.canInput(fromX, fromY)) return false;

        this.currentItem = type;
        this.itemId = Math.floor(Math.random() * 1000000);
        this.transportProgress = 0;
        this.lastInputSide = mySide;

        // Immediate pass-through if possible
        if (this.lastWorld) {
          this.tryOutputInternal(this.lastWorld);
        }
        return true;
      }
    }

    // Fallback if no coordinates
    this.currentItem = type;
    this.itemId = Math.floor(Math.random() * 1000000);
    this.transportProgress = 0; // Not used but good to reset

    // Immediate pass-through
    if (this.lastWorld) {
      this.tryOutputInternal(this.lastWorld);
    }
    return true;
  }

  public canOutput(): boolean {
    // Ready immediately if we have an item
    return this.currentItem !== null;
  }

  public getColor(): number {
    return 0x555555; // Dark Gray
  }

  /**
   * NOTE: merger does NOT use electricity.
   * returning undefined as it's required by the BuildingEntity abstract class.
   */
  public get powerConfig(): PowerConfig | undefined {
    return undefined;
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
