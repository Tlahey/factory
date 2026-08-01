import { BuildingEntity } from "../../entities/BuildingEntity";
import {
  getDirectionOffset,
  getOppositeDirection,
  determineFlowInputDirection,
  calculateTurnType,
  rotateDirection,
} from "./ConveyorLogicSystem";
import { IWorld, Direction } from "../../entities/types";

import { IIOBuilding, PowerConfig } from "../BuildingConfig";
import { ConveyorConfigType } from "./ConveyorConfig";
import { skillTreeManager } from "../hub/skill-tree/SkillTreeManager";
import { ItemSink, canPushItem, createItemId, pushItem } from "../ItemTransfer";
import { updateBuildingConnectivity } from "../BuildingIOHelper";

import { createActor } from "xstate";
import { conveyorMachine } from "./ConveyorMachine";

export type ConveyorVisualType = "straight" | "left" | "right";

export class Conveyor extends BuildingEntity implements IIOBuilding, ItemSink {
  constructor(x: number, y: number, direction: Direction = "north") {
    super(x, y, "conveyor", direction);
    this.actor = createActor(conveyorMachine, {
      input: { building: this },
    });
    this.actor.start();
  }

  public currentItem: string | null = null;
  public itemId: number | null = null; // Unique ID for tracking mesh
  public transportProgress: number = 0;
  public isResolved: boolean = false; // True only if the belt leads to a real sink
  public visualType: ConveyorVisualType = "straight";

  /**
   * Topology snapshot the visual/connectivity state was computed against.
   * Recomputing every tick for every belt is by far the hottest path of the
   * simulation, and the answer only changes when a building is added/removed.
   */
  private topologySnapshot: number = -1;

  public get transportSpeed(): number {
    const baseSpeed =
      ((this.getConfig() as ConveyorConfigType).speed ?? 60) / 60; // tiles per second
    const multiplier = skillTreeManager.getStatMultiplier("conveyor", "speed");
    return baseSpeed * multiplier;
  }

  public tick(delta: number, world?: IWorld): void {
    if (!world) return;
    this.actor?.send({ type: "TICK", delta, world });
  }

  /**
   * Recompute turn visual + arrow connectivity, but only when the world
   * topology actually changed since the last time.
   * Returns true when a refresh happened.
   */
  public refreshTopology(world: IWorld): boolean {
    const version = world.topologyVersion;
    if (version !== undefined && version === this.topologySnapshot) {
      return false;
    }
    this.topologySnapshot = version ?? -1;
    this.updateVisualState(world);
    updateBuildingConnectivity(this, world);
    return true;
  }

  /** Force a refresh on the next tick (used when neighbours change). */
  public invalidateTopology(): void {
    this.topologySnapshot = -1;
  }

  /**
   * Hand the item over to whatever sits at the output tile.
   * Belt -> belt keeps the progress overflow so items keep a constant speed
   * across tiles instead of stuttering at every seam.
   */
  public moveItem(world: IWorld): void {
    const item = this.currentItem;
    if (!item) return;

    const outputPos = this.getOutputPosition();
    if (!outputPos) {
      this.transportProgress = Math.min(this.transportProgress, 1);
      return;
    }

    const target = world.getBuilding(outputPos.x, outputPos.y);

    if (target instanceof Conveyor) {
      // Never push into a belt's own output face, and never into a full belt.
      if (target.canInput(this.x, this.y) && !target.currentItem) {
        target.currentItem = item;
        target.itemId = this.itemId;
        // Preserve overflow time for a smooth transition.
        target.transportProgress = Math.max(0, this.transportProgress - 1);
        this.clearItem();
      }
    } else if (pushItem(world, this, outputPos.x, outputPos.y, item, 1)) {
      this.clearItem();
    }

    // Clamp progress: a blocked item waits at the very end of the belt.
    if (this.transportProgress > 1) this.transportProgress = 1;
  }

  private clearItem(): void {
    this.currentItem = null;
    this.itemId = null;
    this.transportProgress = 0;
  }

  /**
   * Safely removes the current item from the conveyor.
   * Used when player drags an item off the belt.
   */
  public removeItem(): void {
    this.clearItem();
  }

  // --- Traits Implementation ---

  public get io() {
    return (this.getConfig() as ConveyorConfigType).io;
  }

  public get powerConfig(): PowerConfig | undefined {
    return undefined;
  }

  // --- ItemSink ---

  /** Dynamic capacity: a belt tile holds exactly one item. */
  public hasSpaceFor(): boolean {
    return this.currentItem === null;
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
    this.itemId = createItemId();
    this.transportProgress = 0;
    return true;
  }

  // --- IIOBuilding ---

  /**
   * Canonical input port: the tile behind the belt.
   * Side loading is expressed through {@link getInputPositions}; keeping this
   * one stable avoids arrows and connectivity flipping around when the belt
   * switches between straight and curved visuals.
   */
  public getInputPosition(): { x: number; y: number } | null {
    if (!this.io.hasInput) return null;
    const offset = getDirectionOffset(getOppositeDirection(this.direction));
    return { x: this.x + offset.dx, y: this.y + offset.dy };
  }

  /** A belt accepts items from its back and from both sides — never the front. */
  public getInputPositions(): { x: number; y: number }[] {
    if (!this.io.hasInput) return [];

    const validDirs: Direction[] = [
      getOppositeDirection(this.direction), // back
      rotateDirection(this.direction, -1), // left
      rotateDirection(this.direction, 1), // right
    ];

    return validDirs.map((dir) => {
      const offset = getDirectionOffset(dir);
      return { x: this.x + offset.dx, y: this.y + offset.dy };
    });
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
    // Capacity is answered by hasSpaceFor().
    return true;
  }

  public canOutput(world: IWorld): boolean {
    const outputPos = this.getOutputPosition();
    if (!outputPos) return false;
    return canPushItem(
      world,
      this,
      outputPos.x,
      outputPos.y,
      this.currentItem ?? "",
      1,
    );
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
   * Direction is fixed at placement time, so this only updates visuals.
   */
  public updateVisualState(world: IWorld): void {
    const flowIn = determineFlowInputDirection(
      this.x,
      this.y,
      this.direction,
      world,
    );

    this.visualType = flowIn
      ? calculateTurnType(flowIn, this.direction)
      : "straight";
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
