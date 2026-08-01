import { BuildingEntity } from "../../entities/BuildingEntity";
import { Direction, IWorld } from "../../entities/types";
import { IIOBuilding, PowerConfig } from "../BuildingConfig";
import { ConveyorMergerConfigType } from "./ConveyorMergerConfig";
import {
  getConfiguredInputPositions,
  getConfiguredOutputPosition,
  getConfiguredOutputPositions,
  hasOutputPortAt,
} from "../BuildingIOHelper";
import { getSidePorts } from "../BuildingFootprint";
import { Conveyor } from "../conveyor/Conveyor";
import { ItemSink, createItemId, pushItemToOutput } from "../ItemTransfer";

import { createActor } from "xstate";
import { conveyorMergerMachine } from "./ConveyorMergerMachine";

/** Possible input sides for the merger */
export type MergerInputSide = "back" | "left" | "right";

/** Fixed round-robin order. */
const INPUT_ORDER: MergerInputSide[] = ["back", "left", "right"];

export class ConveyorMerger
  extends BuildingEntity
  implements IIOBuilding, ItemSink
{
  public currentItem: string | null = null;
  public itemId: number | null = null;
  public transportProgress: number = 0;

  /**
   * Last side an item was taken from, for round-robin fairness.
   * Explicit sides instead of indices so the intent stays readable.
   */
  private lastInputSide: MergerInputSide | "none" = "none";

  /**
   * World reference captured on tick. Used by `canInput` (which has no world
   * parameter in IIOBuilding) to answer the fairness question. Everything
   * reading it must tolerate `null`: `canInput` can be called by a neighbour
   * before this merger has ever ticked.
   */
  public lastWorld: IWorld | null = null;

  constructor(x: number, y: number, direction: Direction = "north") {
    super(x, y, "conveyor_merger", direction);
    this.actor = createActor(conveyorMergerMachine, {
      input: { building: this },
    });
    this.actor.start();
  }

  public get transportSpeed(): number {
    return ((this.getConfig() as ConveyorMergerConfigType).speed ?? 60) / 60;
  }

  public tick(delta: number, world: IWorld): void {
    this.actor?.send({ type: "TICK", delta, world });
  }

  // --- Item flow ---

  /** Push the held item to the output tile. */
  public tryOutputInternal(world: IWorld): boolean {
    const item = this.currentItem;
    if (!item) return false;
    if (!pushItemToOutput(world, this, item)) return false;

    this.currentItem = null;
    this.itemId = null;
    this.transportProgress = 0;
    return true;
  }

  /**
   * Actively take the item waiting at the end of an input belt.
   * Pulling (rather than waiting to be pushed) is what lets the merger run at
   * full belt speed instead of losing a tick per hand-off.
   */
  public tryPull(world: IWorld): boolean {
    if (this.currentItem) return false;

    const ports = this.getPortPositions();
    const startIndex =
      this.lastInputSide === "none"
        ? 0
        : (INPUT_ORDER.indexOf(this.lastInputSide) + 1) % INPUT_ORDER.length;

    for (let i = 0; i < INPUT_ORDER.length; i++) {
      const side = INPUT_ORDER[(startIndex + i) % INPUT_ORDER.length];
      const pos = ports[side];
      const neighbor = world.getBuilding(pos.x, pos.y);
      if (!neighbor || !(neighbor instanceof Conveyor)) continue;
      if (!this.isNeighborReadyToOutput(neighbor, world)) continue;

      this.currentItem = neighbor.currentItem;
      this.itemId = neighbor.itemId;
      this.transportProgress = 0;
      this.lastInputSide = side;

      neighbor.removeItem();
      return true;
    }
    return false;
  }

  public tryOutput(world: IWorld): boolean {
    return this.tryOutputInternal(world);
  }

  // --- IIOBuilding ---

  public get io() {
    return (this.getConfig() as ConveyorMergerConfigType).io;
  }

  public getInputPosition(): { x: number; y: number } | null {
    // Back is the canonical input; getInputPositions() exposes all three.
    return this.getPortPositions().back;
  }

  /**
   * Helper to map sides to their respective world coordinates.
   */
  private getPortPositions(): Record<
    MergerInputSide,
    { x: number; y: number }
  > {
    const outerFor = (side: MergerInputSide) =>
      getSidePorts(this.x, this.y, side, this.direction, 1, 1)[0].outer;

    return {
      back: outerFor("back"),
      left: outerFor("left"),
      right: outerFor("right"),
    };
  }

  public getInputPositions(): { x: number; y: number }[] {
    return getConfiguredInputPositions(this);
  }

  public getOutputPosition(): { x: number; y: number } | null {
    return getConfiguredOutputPosition(this);
  }

  public getOutputPositions(): { x: number; y: number }[] {
    return getConfiguredOutputPositions(this);
  }

  /** Which side does (fromX, fromY) correspond to, if any? */
  private getSideFor(fromX: number, fromY: number): MergerInputSide | null {
    const ports = this.getPortPositions();
    for (const side of INPUT_ORDER) {
      if (ports[side].x === fromX && ports[side].y === fromY) return side;
    }
    return null;
  }

  public canInput(fromX: number, fromY: number): boolean {
    const mySide = this.getSideFor(fromX, fromY);
    if (!mySide) return false;

    // FAIRNESS: yield to a side that comes earlier in the round-robin and
    // already has an item waiting, so one saturated belt cannot starve the
    // other two. Skipped when we have no world reference yet.
    const world = this.lastWorld;
    if (world && this.lastInputSide !== "none") {
      const ports = this.getPortPositions();
      const lastIdx = INPUT_ORDER.indexOf(this.lastInputSide);
      const myIdx = INPUT_ORDER.indexOf(mySide);

      for (let i = 1; i < INPUT_ORDER.length; i++) {
        const checkIdx = (lastIdx + i) % INPUT_ORDER.length;
        if (checkIdx === myIdx) break; // We are the most prioritized waiting side

        const pos = ports[INPUT_ORDER[checkIdx]];
        const neighbor = world.getBuilding(pos.x, pos.y);
        if (neighbor && this.isNeighborReadyToOutput(neighbor, world)) {
          return false; // A higher-priority neighbour is ready: wait our turn.
        }
      }
    }

    return true;
  }

  private isNeighborReadyToOutput(
    neighbor: BuildingEntity,
    world: IWorld,
  ): boolean {
    // Only neighbours whose output port targets this merger count.
    if (
      !hasOutputPortAt(neighbor as BuildingEntity & IIOBuilding, this.x, this.y)
    )
      return false;

    // A belt is "ready" once its item reached the end of the tile.
    if (neighbor instanceof Conveyor) {
      return neighbor.currentItem !== null && neighbor.transportProgress >= 1;
    }

    // Other buildings (extractor, furnace, ...) push when they are ready.
    const producer = neighbor as BuildingEntity & Partial<IIOBuilding>;
    if (typeof producer.canOutput === "function") {
      return producer.canOutput(world);
    }

    return false;
  }

  // --- ItemSink ---

  /** A merger holds a single item at a time. */
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

    let side: MergerInputSide | null = null;
    if (fromX !== undefined && fromY !== undefined) {
      side = this.getSideFor(fromX, fromY);
      if (!side) return false;
      // Re-check fairness in case canInput was skipped or state changed.
      if (!this.canInput(fromX, fromY)) return false;
    }

    this.currentItem = type;
    this.itemId = createItemId();
    this.transportProgress = 0;
    if (side) this.lastInputSide = side;

    // Immediate pass-through keeps the merger latency-free.
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
      lastInputSide: this.lastInputSide,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public deserialize(data: any): void {
    this.currentItem = data.currentItem || null;
    this.itemId = data.itemId || null;
    this.transportProgress = data.transportProgress || 0;
    this.lastInputSide = data.lastInputSide || "none";
  }
}
