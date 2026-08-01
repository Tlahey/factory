import { BuildingEntity } from "../../entities/BuildingEntity";
import { Direction } from "../../entities/types";
import { STACK_SIZE } from "../../constants";
import { IWorld } from "../../entities/types";
import { IIOBuilding, IStorage } from "../BuildingConfig";
import { ChestConfigType } from "./ChestConfig";
import { skillTreeManager } from "../hub/skill-tree/SkillTreeManager";
import { pushItemToOutput } from "../ItemTransfer";
import {
  canInputFromConfig,
  getConfiguredInputPosition,
  getConfiguredInputPositions,
  getConfiguredOutputPosition,
  getConfiguredOutputPositions,
} from "../BuildingIOHelper";
import { createActor } from "xstate";
import { chestMachine } from "./ChestMachine";

export class Chest extends BuildingEntity implements IIOBuilding, IStorage {
  public slots: { type: string; count: number }[] = [];
  public bonusSlots: number = 0;

  constructor(x: number, y: number, direction: Direction = "north") {
    super(x, y, "chest", direction);
    this.actor = createActor(chestMachine, {
      input: { building: this },
    });
    this.actor.start();
  }

  public tick(delta: number, world?: IWorld): void {
    if (!world) return;
    this.actor?.send({ type: "TICK", delta, world });
  }

  public isFull(): boolean {
    return this.slots.length >= this.maxSlots;
  }

  // --- Traits Implementation ---

  public get maxSlots(): number {
    const baseSlots = (this.getConfig() as ChestConfigType)?.maxSlots ?? 5;
    // Apply skill tree additive bonus
    const skillBonus = skillTreeManager.getStatAdditive("chest", "maxSlots");
    return baseSlots + this.bonusSlots + skillBonus;
  }

  public get io() {
    return (this.getConfig() as ChestConfigType).io;
  }

  public get powerConfig() {
    return undefined;
  }

  /** Capacity check used by the shared transfer layer (ItemTransfer). */
  public hasSpaceFor(type: string, amount: number = 1): boolean {
    if (!this.isFull()) return true;
    // Full on slots, but an existing stack may still have room.
    return this.slots.some(
      (slot) => slot.type === type && STACK_SIZE - slot.count >= amount,
    );
  }

  /**
   * Returns true if at least part of the stack was accepted.
   *
   * When called with source coordinates (i.e. pushed by a belt or a machine)
   * the chest only accepts through its declared input port, so what the arrows
   * show and what actually works stay in sync. Calls without coordinates are
   * internal/UI transfers and bypass that check.
   */
  public addItem(
    type: string,
    amount: number = 1,
    fromX?: number,
    fromY?: number,
  ): boolean {
    if (fromX !== undefined && fromY !== undefined) {
      if (!this.canInput(fromX, fromY)) return false;
    }

    let remaining = amount;

    // 1. Try to stack
    for (const slot of this.slots) {
      if (remaining <= 0) break;
      if (slot.type === type && slot.count < STACK_SIZE) {
        const space = STACK_SIZE - slot.count;
        const toAdd = Math.min(space, remaining);
        slot.count += toAdd;
        remaining -= toAdd;
      }
    }

    // 2. Try new slot
    if (remaining > 0 && this.slots.length < this.maxSlots) {
      // Loop to fill multiple slots if needed?
      // For now, let's just add one new slot with remainder if possible,
      // but strictly Chests usually just fill up.
      // If stack size is 100, and we add 200, we need 2 slots.

      while (remaining > 0 && this.slots.length < this.maxSlots) {
        const toAdd = Math.min(STACK_SIZE, remaining);
        this.slots.push({ type, count: toAdd });
        remaining -= toAdd;
      }
    }

    return remaining < amount; // Return true if AT LEAST some was added? Or only if all?
    // Standard game logic: return true if accepted ANY. Or return amount remaining?
    // For simple boolean check, let's say true if we added anything.
  }

  // --- IIOBuilding ---
  // Ports come from ChestConfig.io (input front, output back) expanded over the
  // footprint by the shared helper, so nothing here has to know about rotation.
  public getInputPosition(): { x: number; y: number } | null {
    return getConfiguredInputPosition(this);
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

  public canInput(fromX: number, fromY: number): boolean {
    // Structural check only; capacity is answered by hasSpaceFor().
    return canInputFromConfig(this, fromX, fromY);
  }

  public canOutput(): boolean {
    // Chest can output when it has items
    return this.slots.length > 0;
  }

  public tryOutput(world: IWorld): boolean {
    return this.tryOutputResource(world);
  }

  /**
   * Push one item from the first slot to whatever sits at the output port.
   * Uses the shared transfer layer, so belts, mergers, splitters and machines
   * are all valid targets.
   */
  public tryOutputResource(world: IWorld): boolean {
    if (this.slots.length === 0) return false;

    if (!pushItemToOutput(world, this, this.slots[0].type)) return false;

    this.slots[0].count -= 1;
    if (this.slots[0].count <= 0) {
      this.slots.splice(0, 1);
    }
    return true;
  }

  public removeSlot(index: number): void {
    if (index >= 0 && index < this.slots.length) {
      this.slots.splice(index, 1);
    }
  }

  public upgradeCapacity(): void {
    this.bonusSlots += 1;
  }

  public getColor(): number {
    return 0x8b4513; // Brown
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public serialize(): any {
    return {
      slots: this.slots,
      bonusSlots: this.bonusSlots,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public deserialize(data: any): void {
    if (data.slots) this.slots = data.slots;
    if (data.bonusSlots !== undefined) this.bonusSlots = data.bonusSlots;
  }
}
