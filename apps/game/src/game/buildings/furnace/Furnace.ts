import { BuildingEntity } from "../../entities/BuildingEntity";
import { IWorld, Direction } from "../../entities/types";
import { IIOBuilding, IPowered, PowerConfig, Recipe } from "../BuildingConfig";
import { FURNACE_RECIPES, FurnaceConfigType } from "./FurnaceConfig";
import { updateBuildingConnectivity, getIOOffset } from "../BuildingIOHelper";
import { skillTreeManager } from "../hub/skill-tree/SkillTreeManager";
import { Conveyor } from "../conveyor/Conveyor";
import { Chest } from "../chest/Chest";
import { Tile } from "../../core/Tile";

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
  }

  public setRecipe(recipeId: string | null): void {
    this.selectedRecipeId = recipeId;
  }

  public tick(delta: number, world?: IWorld): void {
    if (!world) return;

    // 1. Update Connectivity
    updateBuildingConnectivity(this, world);

    // 2. Determine Operation Status
    let logicalStatus: typeof this.operationStatus = "idle";

    // Check Config/Recipe status
    if (!this.selectedRecipeId) {
      logicalStatus = "working"; // Re-using working as "Needs Config" or just idle?
      // Actually, let's use 'idle' if waiting for config, but visually distinct?
      // For now, let's treat no recipe as idle.
    }

    const hasPower = this.hasPowerSource && this.powerSatisfaction > 0.1;
    const isOutputFull =
      this.outputSlot !== null && this.outputSlot.count >= this.OUTPUT_CAPACITY;
    const hasJobs = this.activeJobs.length > 0;
    const canProcess =
      hasPower && !isOutputFull && this.selectedRecipeId !== null;

    // Update Demand
    // We demand power if we have jobs running OR items to process
    const hasItemsToProcess = this.inputQueue.length > 0;
    this.hasDemand =
      (hasJobs || hasItemsToProcess) &&
      !isOutputFull &&
      !!this.selectedRecipeId;

    if (!hasPower && this.hasDemand) {
      logicalStatus = "no_power";
    } else if (isOutputFull) {
      logicalStatus = "blocked";
    } else if (hasJobs || (hasItemsToProcess && canProcess)) {
      logicalStatus = "working";
    } else if (!hasItemsToProcess && !hasJobs) {
      logicalStatus = "no_resources"; // Or idle
    }

    this.operationStatus = logicalStatus;
    this.active = logicalStatus === "working";

    // 3. Process Active Jobs
    if (this.active) {
      const speedMultiplier = this.getProcessingSpeed();
      const powerFactor = this.powerSatisfaction;

      // Advance existing jobs
      for (let i = this.activeJobs.length - 1; i >= 0; i--) {
        const job = this.activeJobs[i];
        const recipe = this.getRecipe(job.recipeId);

        if (!recipe) {
          this.activeJobs.splice(i, 1); // Invalid recipe, cancel
          continue;
        }

        // Advance progress
        const step = delta * speedMultiplier * powerFactor;
        job.elapsed += step;
        job.progress = Math.min(job.elapsed / recipe.duration, 1.0);

        // Check completion
        if (job.progress >= 1.0) {
          // Output to buffer
          if (!this.outputSlot) {
            this.outputSlot = { type: recipe.output, count: 0 };
          }

          if (this.outputSlot.type === recipe.output) {
            this.outputSlot.count++;
            this.activeJobs.splice(i, 1); // Job done
          } else {
            // Blocked
          }
        }
      }

      // Start new jobs if we have capacity and resources
      const maxParallel = this.getParallelProcessing();
      const availableSlots = maxParallel - this.activeJobs.length;

      if (availableSlots > 0 && this.selectedRecipeId) {
        const recipe = this.getRecipe(this.selectedRecipeId);

        if (recipe) {
          if (this.inputQueue.length > 0) {
            const itemIndex = this.inputQueue.findIndex(
              (item) => item.type === recipe.input,
            );

            if (itemIndex !== -1) {
              const item = this.inputQueue[itemIndex];
              // Check if we have enough input resources for this recipe
              const requiredCount = recipe.inputCount;
              if (item.count >= requiredCount) {
                // Consume inputCount items
                item.count -= requiredCount;
                if (item.count <= 0) {
                  this.inputQueue.splice(itemIndex, 1);
                }

                // Start Job
                this.activeJobs.push({
                  recipeId: recipe.id,
                  progress: 0,
                  elapsed: 0,
                });
              }
            }
          }
        }
      }
    }

    // 4. Output Logic (Always try to output if we have items in Output Buffer)
    // We only try to output if we have items AND the output is connected
    if (
      this.outputSlot &&
      this.outputSlot.count > 0 &&
      this.isOutputConnected
    ) {
      if (this.tryOutput(world)) {
        this.outputSlot.count--;
        if (this.outputSlot.count <= 0) {
          this.outputSlot = null;
        }
      }
    }
  }

  private getRecipe(id: string): Recipe | undefined {
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

  public getInputPosition(): { x: number; y: number } | null {
    if (!this.io.hasInput) return null;
    const inputSide = this.io.inputSide || "front";
    // Config: width/height
    const config = this.getConfig() as FurnaceConfigType;
    const offset = getIOOffset(
      inputSide,
      this.direction,
      config.width,
      config.height,
    );
    return { x: this.x + offset.dx, y: this.y + offset.dy };
  }

  public getOutputPosition(): { x: number; y: number } | null {
    if (!this.io.hasOutput) return null;
    const outputSide = this.io.outputSide || "front";
    const config = this.getConfig() as FurnaceConfigType;
    const offset = getIOOffset(
      outputSide,
      this.direction,
      config.width,
      config.height,
    );
    return { x: this.x + offset.dx, y: this.y + offset.dy };
  }

  public canInput(fromX: number, fromY: number): boolean {
    // 1. Check if the input is coming from the correct side/position
    const inputPos = this.getInputPosition();
    if (!inputPos || fromX !== inputPos.x || fromY !== inputPos.y) return false;

    // 2. Check if queue is full
    const currentItems = this.inputQueue.reduce(
      (acc, item) => acc + item.count,
      0,
    );
    if (currentItems >= this.getQueueSize()) return false;

    // 3. Check if we have a recipe selected (machines without recipe shouldn't accept items)
    if (!this.selectedRecipeId) return false;

    return true;
  }

  // Emulate `IStorage` for input compatibility if needed, or just specific method.
  // The Conveyor logic usually checks `transportTarget` and does something.
  // We need to ensure Conveyor can put items INTO Furnace.
  // Looking at `Conveyor.ts` (not visible but I can infer), it likely calls `addItem` if target suggests it.
  // I'll implement `addItem` to be safe and compatible with Chest-like push.

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

  // --- Copying Output Logic from Extractor (Common pattern, should be util potentially) ---

  private checkOutputClear(world: IWorld, _itemType: string): boolean {
    const pos = this.getOutputPosition();
    if (!pos) return false;

    const target = world.getBuilding(pos.x, pos.y);
    if (!target) return false;

    if (target instanceof Conveyor) {
      return !target.currentItem;
    } else if (target instanceof Chest) {
      return !target.isFull();
    }
    return false;
  }

  private tryOutputResource(world: IWorld, itemType: string): boolean {
    const pos = this.getOutputPosition();
    if (!pos) return false;

    const target = world.getBuilding(pos.x, pos.y);
    if (target && target instanceof Conveyor) {
      if (!target.currentItem) {
        target.currentItem = itemType;
        target.itemId = Math.floor(Math.random() * 1000000);
        target.transportProgress = 0;
        return true;
      }
    } else if (target && target instanceof Chest) {
      return target.addItem(itemType, 1);
    }
    return false;
  }

  public isValidPlacement(tile: Tile): boolean {
    return !tile.isStone() && !tile.isWater();
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
