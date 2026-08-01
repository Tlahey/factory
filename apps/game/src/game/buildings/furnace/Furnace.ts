import { BuildingEntity } from "../../entities/BuildingEntity";
import { IWorld, Direction } from "../../entities/types";
import { IIOBuilding, IPowered, PowerConfig, Recipe } from "../BuildingConfig";
import { FURNACE_RECIPES, FurnaceConfigType } from "./FurnaceConfig";
import {
  canInputFromConfig,
  getConfiguredInputPosition,
  getConfiguredInputPositions,
  getConfiguredOutputPosition,
  getConfiguredOutputPositions,
} from "../BuildingIOHelper";
import { skillTreeManager } from "../hub/skill-tree/SkillTreeManager";
import { canPushItemToOutput, pushItemToOutput } from "../ItemTransfer";
import { createActor } from "xstate";
import { furnaceMachine } from "./FurnaceMachine";

type ProcessingJob = {
  recipeId: string;
  progress: number; // 0 to 1
  elapsed: number; // Seconds
};

export class Furnace extends BuildingEntity implements IPowered, IIOBuilding {
  public active: boolean = false;
  // IO State
  public inputQueue: { type: string; count: number }[] = [];
  public outputSlot: { type: string; count: number } | null = null;
  public readonly OUTPUT_CAPACITY = 20;

  // Processing State
  public selectedRecipeId: string | null = null;
  public activeJobs: ProcessingJob[] = []; // Supports parallel processing

  // Power State
  public currentPowerDraw: number = 0;
  public currentPowerSatisfied: number = 0;

  constructor(x: number, y: number, direction: Direction = "north") {
    super(x, y, "furnace", direction);
    this.actor = createActor(furnaceMachine, {
      input: { building: this },
    });
    this.actor.start();
  }

  public setRecipe(recipeId: string | null): void {
    this.selectedRecipeId = recipeId;
  }

  public tick(delta: number, world?: IWorld): void {
    if (!world) return;
    this.actor?.send({ type: "TICK", delta, world });
  }

  public getRecipe(id: string): Recipe | undefined {
    return FURNACE_RECIPES.find((r) => r.id === id);
  }

  // --- Configuration & Upgrades ---

  public getProcessingSpeed(): number {
    const config = this.getConfig() as FurnaceConfigType;
    const base = config?.processingSpeed ?? 1.0;
    const multiplier = skillTreeManager.getStatMultiplier(
      "furnace",
      "processingSpeed",
    );
    return base * multiplier;
  }

  public getQueueSize(): number {
    const config = this.getConfig() as FurnaceConfigType;
    const base = config?.queueSize ?? 5;
    const extra = skillTreeManager.getStatAdditive("furnace", "queueSize");
    return base + extra;
  }

  public getParallelProcessing(): number {
    const config = this.getConfig() as FurnaceConfigType;
    const base = config?.parallelProcessing ?? 1;
    const extra = skillTreeManager.getStatAdditive(
      "furnace",
      "parallelProcessing",
    );
    return base + extra;
  }

  public getColor(): number {
    return 0xff8800; // Orange-red for furnace
  }

  // --- IPowered ---

  public get powerConfig(): PowerConfig {
    return (this.getConfig() as FurnaceConfigType).powerConfig;
  }

  public getPowerDemand(): number {
    if (!this.hasDemand) return 0;
    return this.powerConfig.rate;
  }

  public getPowerGeneration(): number {
    return 0;
  }

  public updatePowerStatus(
    satisfaction: number,
    hasSource: boolean,
    gridId: number,
  ): void {
    this.powerSatisfaction = satisfaction;
    this.hasPowerSource = hasSource;
    this.currentGridId = gridId;

    // Status visual
    if (this.powerStatus === "active") {
      if (satisfaction < 0.95) this.powerStatus = "warn";
    } else {
      if (satisfaction >= 0.99) this.powerStatus = "active";
    }
  }

  // --- IIOBuilding ---

  public get io() {
    return (this.getConfig() as FurnaceConfigType).io;
  }

  // The furnace is 1x2: its ports sit on the far tile for half the rotations,
  // which the shared helper derives from the footprint.
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

  /**
   * Capacity check used by the shared transfer layer (ItemTransfer).
   * Kept separate from `canInput` so upstream buildings can report "blocked"
   * without mutating anything.
   */
  public hasSpaceFor(type: string, amount: number = 1): boolean {
    if (!this.selectedRecipeId) return false;
    const recipe = this.getRecipe(this.selectedRecipeId);
    if (!recipe || recipe.input !== type) return false;

    const currentItems = this.inputQueue.reduce(
      (acc, item) => acc + item.count,
      0,
    );
    return currentItems + amount <= this.getQueueSize();
  }

  public addItem(
    type: string,
    amount: number = 1,
    fromX?: number,
    fromY?: number,
  ): boolean {
    // 1. Explicit check of input position if coordinates are provided
    if (fromX !== undefined && fromY !== undefined) {
      if (!this.canInput(fromX, fromY)) return false;
    }

    // 2. Check Capacity
    const currentItems = this.inputQueue.reduce(
      (acc, item) => acc + item.count,
      0,
    );
    if (currentItems + amount > this.getQueueSize()) return false;

    // 3. Filter by Recipe
    if (!this.selectedRecipeId) return false;
    const recipe = this.getRecipe(this.selectedRecipeId);
    if (!recipe || recipe.input !== type) return false;

    // 4. Add to Queue
    // Check if we can merge with last stack
    // (Or any stack, but usually queues merge same types)
    const existing = this.inputQueue.find((i) => i.type === type);
    if (existing) {
      existing.count += amount;
    } else {
      this.inputQueue.push({ type, count: amount });
    }
    return true;
  }

  public removeItemsFromOutput(amount: number): boolean {
    if (!this.outputSlot || this.outputSlot.count < amount) return false;
    this.outputSlot.count -= amount;
    if (this.outputSlot.count <= 0) {
      this.outputSlot = null;
    }
    return true;
  }

  public addItemsToOutput(type: string, amount: number): boolean {
    if (this.outputSlot && this.outputSlot.type !== type) return false;

    const currentCount = this.outputSlot?.count || 0;
    if (currentCount + amount > this.OUTPUT_CAPACITY) return false;

    if (!this.outputSlot) {
      this.outputSlot = { type, count: amount };
    } else {
      this.outputSlot.count += amount;
    }
    return true;
  }

  public canOutput(world: IWorld): boolean {
    // Check if target is clear
    // Similar to Extractor logic
    if (!this.outputSlot || this.outputSlot.count <= 0) return false;
    return this.checkOutputClear(world, this.outputSlot.type);
  }

  public tryOutput(world: IWorld): boolean {
    if (!this.outputSlot || this.outputSlot.count <= 0) return false;
    return this.tryOutputResource(world, this.outputSlot.type);
  }

  // --- Output (shared transfer layer, see buildings/ItemTransfer.ts) ---

  private checkOutputClear(world: IWorld, itemType: string): boolean {
    return canPushItemToOutput(world, this, itemType);
  }

  private tryOutputResource(world: IWorld, itemType: string): boolean {
    return pushItemToOutput(world, this, itemType);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public serialize(): any {
    return {
      selectedRecipeId: this.selectedRecipeId,
      inputQueue: this.inputQueue,
      outputSlot: this.outputSlot,
      activeJobs: this.activeJobs,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public deserialize(data: any): void {
    if (data.selectedRecipeId) this.selectedRecipeId = data.selectedRecipeId;
    if (data.inputQueue) this.inputQueue = data.inputQueue;
    if (data.outputSlot) this.outputSlot = data.outputSlot;
    // Restore active jobs if present
    if (data.activeJobs) {
      this.activeJobs = data.activeJobs;
    }
  }
}
