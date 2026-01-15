import { Tile } from "../../core/Tile";
import { BuildingEntity } from "../../entities/BuildingEntity";
import { Direction } from "../../entities/types";
import { STACK_SIZE } from "../../constants";
import { IWorld } from "../../entities/types";
import { IIOBuilding, IStorage, ChestConfigType } from "../BuildingConfig";
import { updateBuildingConnectivity } from "../BuildingIOHelper";
import { skillTreeManager } from "../hub/skill-tree/SkillTreeManager";

export class Chest extends BuildingEntity implements IIOBuilding, IStorage {
  public slots: { type: string; count: number }[] = [];
  public bonusSlots: number = 0;
  public isInputConnected: boolean = false;
  public isOutputConnected: boolean = false;

  constructor(x: number, y: number, direction: Direction = "north") {
    super(x, y, "chest", direction);
  }

  public tick(_delta: number, world?: IWorld): void {
    // Logic to store items
    if (world) {
      updateBuildingConnectivity(this, world);
    }
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

  // Returns true if item was accepted
  public addItem(type: string, amount: number = 1): boolean {
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
  public getInputPosition(): { x: number; y: number } | null {
    if (!this.io.hasInput) return null;
    // Input is on front of chest (direction it faces)
    const offset = this.getIOOffset("front");
    return { x: this.x + offset.dx, y: this.y + offset.dy };
  }

  public getOutputPosition(): { x: number; y: number } | null {
    if (!this.io.hasOutput) return null;
    // Output is on back of chest (opposite of direction it faces)
    const offset = this.getIOOffset("back");
    return { x: this.x + offset.dx, y: this.y + offset.dy };
  }

  private getIOOffset(side: "front" | "back" | "left" | "right"): {
    dx: number;
    dy: number;
  } {
    const clockwiseOrder: Array<"north" | "east" | "south" | "west"> = [
      "north",
      "east",
      "south",
      "west",
    ];
    const currentIndex = clockwiseOrder.indexOf(this.direction);
    let targetDir: "north" | "east" | "south" | "west";

    switch (side) {
      case "front":
        targetDir = this.direction;
        break;
      case "back":
        targetDir = clockwiseOrder[(currentIndex + 2) % 4];
        break;
      case "right":
        targetDir = clockwiseOrder[(currentIndex + 1) % 4];
        break;
      case "left":
        targetDir = clockwiseOrder[(currentIndex + 3) % 4];
        break;
    }

    const offsets = {
      north: { dx: 0, dy: -1 },
      south: { dx: 0, dy: 1 },
      east: { dx: 1, dy: 0 },
      west: { dx: -1, dy: 0 },
    };
    return offsets[targetDir];
  }

  public canInput(fromX: number, fromY: number): boolean {
    if (this.isFull()) return false;
    // Validate that input comes from correct position
    const inputPos = this.getInputPosition();
    if (!inputPos) return false;
    return fromX === inputPos.x && fromY === inputPos.y;
  }

  public canOutput(): boolean {
    return false; // For now Chests don't output by themselves
  }

  public tryOutput(): boolean {
    return false;
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

  public isValidPlacement(tile: Tile): boolean {
    return !tile.isStone() && !tile.isWater();
  }
}
