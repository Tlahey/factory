import { BuildingEntity } from "../../entities/BuildingEntity";
import { Direction, IWorld } from "../../entities/types";
import { IIOBuilding, PowerConfig } from "../BuildingConfig";
import { ConveyorSplitterConfigType } from "./ConveyorSplitterConfig";
import type { ResourceType } from "../../data/Items";
import { ItemSink, createItemId, pushItem } from "../ItemTransfer";
import {
  canInputFromConfig,
  getConfiguredInputPosition,
  getConfiguredInputPositions,
  getConfiguredOutputPosition,
  getConfiguredOutputPositions,
} from "../BuildingIOHelper";
import { getSidePorts } from "../BuildingFootprint";

import { createActor } from "xstate";
import { conveyorSplitterMachine } from "./ConveyorSplitterMachine";

/** Possible output sides for the splitter */
export type SplitterOutputSide = "front" | "left" | "right";

/** Fixed round-robin order. */
const OUTPUT_ORDER: SplitterOutputSide[] = ["front", "left", "right"];

export class ConveyorSplitter
  extends BuildingEntity
  implements IIOBuilding, ItemSink
{
  public currentItem: string | null = null;
  public itemId: number | null = null;
  public transportProgress: number = 0;

  /**
   * Tracks the last side to which an item was sent for round-robin fairness.
   */
  private lastOutputSide: SplitterOutputSide | "none" = "none";
  public lastWorld: IWorld | null = null;

  /**
   * Per-port resource-type filter, configured by the player. `null` means
   * "any resource" (today's unfiltered round-robin behavior).
   */
  public outputFilters: Record<SplitterOutputSide, ResourceType | null> = {
    front: null,
    left: null,
    right: null,
  };

  public setOutputFilter(
    side: SplitterOutputSide,
    type: ResourceType | null,
  ): void {
    this.outputFilters[side] = type;
  }

  constructor(x: number, y: number, direction: Direction = "north") {
    super(x, y, "conveyor_splitter", direction);
    this.actor = createActor(conveyorSplitterMachine, {
      input: { building: this },
    });
    this.actor.start();
  }

  public get transportSpeed(): number {
    return ((this.getConfig() as ConveyorSplitterConfigType).speed ?? 60) / 60;
  }

  public tick(delta: number, world: IWorld): void {
    this.actor?.send({ type: "TICK", delta, world });
  }

  /**
   * Send the held item to the next output in round-robin order, skipping any
   * side that is missing, blocked, or does not accept input from us.
   */
  public tryOutput(world: IWorld): boolean {
    const item = this.currentItem;
    if (!item) return false;

    const startIndex =
      this.lastOutputSide === "none"
        ? 0
        : (OUTPUT_ORDER.indexOf(this.lastOutputSide) + 1) % OUTPUT_ORDER.length;

    for (let i = 0; i < OUTPUT_ORDER.length; i++) {
      const side = OUTPUT_ORDER[(startIndex + i) % OUTPUT_ORDER.length];
      const filter = this.outputFilters[side];
      if (filter && filter !== item) continue; // Wrong resource for this port

      const pos = this.getPortPosition(side);

      if (pushItem(world, this, pos.x, pos.y, item, 1)) {
        this.currentItem = null;
        this.itemId = null;
        this.transportProgress = 0;
        this.lastOutputSide = side;
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
    return getConfiguredInputPosition(this);
  }

  public getInputPositions(): { x: number; y: number }[] {
    return getConfiguredInputPositions(this);
  }

  public getOutputPosition(): { x: number; y: number } | null {
    // Canonical output is front, first of the configured output sides.
    return getConfiguredOutputPosition(this);
  }

  public getOutputPositions(): { x: number; y: number }[] {
    return getConfiguredOutputPositions(this);
  }

  private getPortPosition(side: SplitterOutputSide): { x: number; y: number } {
    const ports = getSidePorts(this.x, this.y, side, this.direction, 1, 1);
    return ports[0].outer;
  }

  /** Structural check: the splitter only takes items through its back. */
  public canInput(fromX: number, fromY: number): boolean {
    return canInputFromConfig(this, fromX, fromY);
  }

  /** A splitter holds a single item at a time. */
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
      outputFilters: this.outputFilters,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public deserialize(data: any): void {
    this.currentItem = data.currentItem || null;
    this.itemId = data.itemId || null;
    this.transportProgress = data.transportProgress || 0;
    this.lastOutputSide = data.lastOutputSide || "none";
    this.outputFilters = data.outputFilters || {
      front: null,
      left: null,
      right: null,
    };
  }
}
