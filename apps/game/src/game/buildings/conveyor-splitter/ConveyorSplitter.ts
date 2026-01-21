import { BuildingEntity } from "../../entities/BuildingEntity";
import { Direction, IWorld } from "../../entities/types";
import { IIOBuilding, PowerConfig } from "../BuildingConfig";
import { ConveyorSplitterConfigType } from "./ConveyorSplitterConfig";
import { updateBuildingConnectivity } from "../BuildingIOHelper";
import {
  getDirectionOffset,
  getOppositeDirection,
} from "../conveyor/ConveyorLogicSystem";
import { Conveyor } from "../conveyor/Conveyor";

/** Possible output sides for the splitter */
export type SplitterOutputSide = "front" | "left" | "right";

export class ConveyorSplitter extends BuildingEntity implements IIOBuilding {
  public currentItem: string | null = null;
  public itemId: number | null = null;
  public transportProgress: number = 0;

  /**
   * Tracks the last side to which an item was sent for round-robin fairness.
   */
  private lastOutputSide: SplitterOutputSide | "none" = "none";
  private lastWorld: IWorld | null = null;

  constructor(x: number, y: number, direction: Direction = "north") {
    super(x, y, "conveyor_splitter", direction);
  }

  public get transportSpeed(): number {
    return ((this.getConfig() as ConveyorSplitterConfigType).speed ?? 60) / 60;
  }

  public tick(delta: number, world: IWorld): void {
    this.lastWorld = world;
    updateBuildingConnectivity(this, world);

    // Instant processing: Try to output immediately in every tick
    if (this.currentItem) {
      if (this.tryOutput(world)) {
        // Item cleared in tryOutput
      }
    }
  }

  public tryOutput(world: IWorld): boolean {
    const sidesOrder: SplitterOutputSide[] = ["front", "left", "right"];

    // Find next indices to try in order
    let startIndex = 0;
    if (this.lastOutputSide !== "none") {
      startIndex = (sidesOrder.indexOf(this.lastOutputSide) + 1) % 3;
    }

    for (let i = 0; i < 3; i++) {
      const idx = (startIndex + i) % 3;
      const side = sidesOrder[idx];
      const pos = this.getPortPosition(side);

      if (this.moveItemToPosition(world, pos.x, pos.y)) {
        this.currentItem = null;
        this.itemId = null;
        this.transportProgress = 0;
        this.lastOutputSide = side;
        return true;
      }
    }

    return false;
  }

  private moveItemToPosition(world: IWorld, x: number, y: number): boolean {
    const target = world.getBuilding(x, y);
    if (!target) return false;

    // Check if target accepts input from this splitter's position
    if (
      target &&
      "canInput" in target &&
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      typeof (target as any).canInput === "function"
    ) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (!(target as any).canInput(this.x, this.y)) {
        return false;
      }
    }

    if (target instanceof Conveyor) {
      if (!target.currentItem) {
        target.currentItem = this.currentItem;
        target.itemId = this.itemId;
        // Optimization: Start exactly at 0 to avoid "double distance" delay
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
    return (this.getConfig() as ConveyorSplitterConfigType).io;
  }

  public getInputPosition(): { x: number; y: number } | null {
    const backDir = getOppositeDirection(this.direction);
    const offset = getDirectionOffset(backDir);
    return { x: this.x + offset.dx, y: this.y + offset.dy };
  }

  public getOutputPosition(): { x: number; y: number } | null {
    // Canonical output is front
    const offset = getDirectionOffset(this.direction);
    return { x: this.x + offset.dx, y: this.y + offset.dy };
  }

  public getOutputPositions(): { x: number; y: number }[] {
    const front = this.getPortPosition("front");
    const left = this.getPortPosition("left");
    const right = this.getPortPosition("right");
    return [front, left, right];
  }

  private getPortPosition(side: SplitterOutputSide): { x: number; y: number } {
    let dir = this.direction;
    if (side === "left") dir = this.getRotatedDirection(this.direction, -1);
    else if (side === "right")
      dir = this.getRotatedDirection(this.direction, 1);

    const offset = getDirectionOffset(dir);
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

    const inputPos = this.getInputPosition();
    return inputPos !== null && inputPos.x === fromX && inputPos.y === fromY;
  }

  public addItem(
    type: string,
    _amount: number = 1,
    fromX?: number,
    fromY?: number,
  ): boolean {
    if (this.currentItem) return false;

    if (fromX !== undefined && fromY !== undefined) {
      if (!this.canInput(fromX, fromY)) return false;
    }

    this.currentItem = type;
    this.itemId = Math.floor(Math.random() * 1000000);
    this.transportProgress = 0;

    // Immediate pass-through
    if (this.lastWorld) {
      this.tryOutput(this.lastWorld);
    }
    return true;
  }

  public canOutput(): boolean {
    // Instant ready
    return this.currentItem !== null;
  }

  public getColor(): number {
    return 0x555555; // Dark Gray
  }

  public get powerConfig(): PowerConfig | undefined {
    return undefined;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public serialize(): any {
    return {
      currentItem: this.currentItem,
      itemId: this.itemId,
      transportProgress: this.transportProgress,
      lastOutputSide: this.lastOutputSide,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public deserialize(data: any): void {
    this.currentItem = data.currentItem || null;
    this.itemId = data.itemId || null;
    this.transportProgress = data.transportProgress || 0;
    this.lastOutputSide = data.lastOutputSide || "none";
  }
}
