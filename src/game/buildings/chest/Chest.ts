import { Tile } from '../../core/Tile';
import { BuildingEntity } from '../../entities/BuildingEntity';
import { STACK_SIZE } from '../../constants';

export class Chest extends BuildingEntity {
  public slots: { type: string, count: number }[] = [];
  public maxSlots: number = 5;

  constructor(x: number, y: number, direction: 'north' | 'south' | 'east' | 'west' = 'north') {
    super(x, y, 'chest', direction);
  }

  public tick(_delta: number): void {
    // Logic to store items
  }

  public isFull(): boolean {
      // Simplified check: true if no empty slots available. 
      // Ideally should check if existing stack can take more, but for generic 'full' check this is safer.
      return this.slots.length >= this.maxSlots;
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

  public removeSlot(index: number): void {
      if (index >= 0 && index < this.slots.length) {
          this.slots.splice(index, 1);
      }
  }

  public upgradeCapacity(): void {
      this.maxSlots += 1;
  }

  public getColor(): number {
      return 0x8b4513; // Brown
  }

  public isValidPlacement(tile: Tile): boolean {
      return !tile.isStone();
  }
}
