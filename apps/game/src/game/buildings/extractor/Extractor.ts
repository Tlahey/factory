import { Tile } from "../../core/Tile";
import { BuildingEntity, Direction4 } from "../../entities/BuildingEntity";
import { IWorld } from "../../entities/types";
import { Conveyor } from "../conveyor/Conveyor";
import { Chest } from "../chest/Chest";
import { ResourceTile } from "../../core/ResourceTile";
import {
  IExtractable,
  IPowered,
  IIOBuilding,
  ExtractorConfigType,
  PowerConfig,
} from "../BuildingConfig";
import { updateBuildingConnectivity } from "../BuildingIOHelper";
import { skillTreeManager } from "../hub/skill-tree/SkillTreeManager";
import { gameEventManager } from "../../events/GameEventManager";

export class Extractor
  extends BuildingEntity
  implements IExtractable, IPowered, IIOBuilding
{
  public active: boolean = false;
  public isInputConnected: boolean = false;
  public isOutputConnected: boolean = false;

  public speedMultiplier: number = 1.0;
  private accumTime: number = 0;

  // Stability Timers
  private blockStabilityTimer: number = 0;
  private readonly STABILITY_THRESHOLD = 1.5; // Seconds to wait before switching to 'blocked'

  public internalStorage: number = 0;
  private readonly STORAGE_CAPACITY = 10;

  constructor(x: number, y: number, direction: Direction4 = "north") {
    super(x, y, "extractor", direction);
  }

  public tick(delta: number, world?: IWorld): void {
    if (!world) return;

    const tile = world.getTile(this.x, this.y);
    const hasResources =
      tile instanceof ResourceTile && tile.resourceAmount > 0;
    const canOutput = this.canOutput(world);
    const interval = this.getExtractionInterval();
    const _isReadyToOutput = this.accumTime >= interval;

    // Update connectivity visuals
    updateBuildingConnectivity(this, world);

    // STABLE DEMAND: We demand power as long as we have resources to work on.
    this.hasDemand = hasResources;

    // Determine "Logical" Status
    let logicalStatus: typeof this.operationStatus = "working";
    const isBufferFull = this.internalStorage >= this.STORAGE_CAPACITY;
    const isBufferEmpty = this.internalStorage <= 0;

    if (!hasResources && isBufferEmpty) {
      logicalStatus = "no_resources";
    } else if (isBufferFull && !canOutput) {
      logicalStatus = "blocked";
    } else if (!this.hasPowerSource) {
      logicalStatus = "no_power";
    }

    // Status Debouncing:
    if (logicalStatus === "blocked") {
      this.blockStabilityTimer += delta;
    } else {
      this.blockStabilityTimer = 0;
    }

    const oldStatus = this.operationStatus;
    if (
      logicalStatus !== "blocked" ||
      this.blockStabilityTimer >= this.STABILITY_THRESHOLD
    ) {
      this.operationStatus = logicalStatus;
    }

    if (this.operationStatus !== oldStatus) {
      console.log(
        `[Extractor] machine at ${this.x},${this.y} status change: ${oldStatus} -> ${this.operationStatus} (Timer: ${this.blockStabilityTimer.toFixed(2)})`,
      );
    }

    // 2. Check Power Status
    const powerFactor = this.hasPowerSource ? this.powerSatisfaction : 0;
    const oldActive = this.active;

    // ACTIVE flag logic
    // Working if we are mining OR outputting
    // Mining condition: hasResources AND !isBufferFull
    // We update accumTime if we have power and are effectively working
    const canMine = hasResources && !isBufferFull;

    // We consider it "active" (animating) if it's processing or moving items.
    // If it's blocked, it stops.
    // If it's no_resources but has items to output, it might still active?
    // Usually drill animation is linked to mining.
    const isWorking = canMine && powerFactor > 0;

    if (isWorking) {
      this.accumTime += delta * powerFactor;
      this.active = true;
    } else {
      this.active = false;
    }

    if (this.active !== oldActive) {
      console.log(
        `[Extractor] machine at ${this.x},${this.y} active flag change: ${oldActive} -> ${this.active} (Factor: ${powerFactor.toFixed(3)}, Status: ${this.operationStatus})`,
      );
    }

    // Mining Step
    if (canMine && this.accumTime >= interval) {
      if (tile instanceof ResourceTile) {
        tile.deplete(1);
        gameEventManager.emit("RESOURCE_MINED", {
          resource: tile.getResourceType(),
          amount: 1,
          position: { x: this.x, y: this.y },
        });
      }
      this.internalStorage += 1;
      this.accumTime -= interval;
    }

    // Output Step (Independent of mining interval, but dependent on checkOutputClear which we called earlier)
    // We try to output every tick if we have items.
    // However, usually machines output at a specific rate or instantly?
    // Let's assume it attempts output every tick if there is storage.
    if (this.internalStorage > 0) {
      if (this.tryOutput(world)) {
        this.internalStorage -= 1;
      }
    }
  }

  // --- Trait Properties ---

  public get extractionRate(): number {
    return (this.getConfig() as ExtractorConfigType)?.extractionRate ?? 1.0;
  }

  public get io() {
    return (this.getConfig() as ExtractorConfigType).io;
  }

  public get powerConfig(): PowerConfig {
    return (this.getConfig() as ExtractorConfigType).powerConfig;
  }

  // --- IExtractable ---
  public getExtractionRate(): number {
    const baseRate = (this.extractionRate / 60) * this.speedMultiplier;
    // Apply skill tree multiplier
    const multiplier = skillTreeManager.getStatMultiplier(
      "extractor",
      "extractionRate",
    );
    return baseRate * multiplier;
  }

  public getExtractionInterval(): number {
    return 1.0 / this.getExtractionRate();
  }

  // --- IPowered ---
  public getPowerDemand(): number {
    if (
      !this.powerConfig ||
      this.operationStatus === "no_resources" ||
      this.operationStatus === "blocked"
    )
      return 0;
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

    if (this.powerStatus === "active") {
      if (satisfaction < 0.95) this.powerStatus = "warn";
    } else {
      if (satisfaction >= 0.99) this.powerStatus = "active";
    }

    if (this.powerConfig) {
      this.currentPowerDraw = this.getPowerDemand();
      this.currentPowerSatisfied = this.currentPowerDraw * satisfaction;
    }
  }

  // --- IIOBuilding ---
  public getInputPosition(): { x: number; y: number } | null {
    // Extractor has no input
    return null;
  }

  public getOutputPosition(): { x: number; y: number } | null {
    if (!this.io.hasOutput) return null;
    // Output is in the direction the extractor faces (front)
    const offset = this.getIOOffset("front");
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

  public canInput(): boolean {
    return false;
  }

  public canOutput(world: IWorld): boolean {
    return this.checkOutputClear(world);
  }

  public tryOutput(world: IWorld): boolean {
    return this.tryOutputResource(world);
  }

  private checkOutputClear(world: IWorld): boolean {
    let tx = this.x;
    let ty = this.y;

    if (this.direction === "north") ty -= 1;
    else if (this.direction === "south") ty += 1;
    else if (this.direction === "east") tx += 1;
    else if (this.direction === "west") tx -= 1;

    const target = world.getBuilding(tx, ty);
    if (!target) return false;

    if (target instanceof Conveyor) {
      // Conveyor has space if currentItem is null
      return !target.currentItem;
    } else if (target instanceof Chest) {
      // Chest has space if not full
      return !target.isFull();
    }

    return false;
  }

  public upgradeSpeed(): void {
    this.speedMultiplier += 0.5;
  }

  public autoOrient(world: IWorld): void {
    const dirs: {
      dx: number;
      dy: number;
      dir: "north" | "south" | "east" | "west";
    }[] = [
      { dx: 0, dy: -1, dir: "north" },
      { dx: 0, dy: 1, dir: "south" },
      { dx: 1, dy: 0, dir: "east" },
      { dx: -1, dy: 0, dir: "west" },
    ];

    for (const d of dirs) {
      const nb = world.getBuilding(this.x + d.dx, this.y + d.dy);
      if (nb && (nb.getType() === "conveyor" || nb.getType() === "chest")) {
        this.direction = d.dir;
        return;
      }
    }
  }

  private tryOutputResource(world: IWorld): boolean {
    let tx = this.x;
    let ty = this.y;

    if (this.direction === "north") ty -= 1;
    else if (this.direction === "south") ty += 1;
    else if (this.direction === "east") tx += 1;
    else if (this.direction === "west") tx -= 1;

    const target = world.getBuilding(tx, ty);
    if (target && target instanceof Conveyor) {
      if (!target.currentItem) {
        target.currentItem = "stone";
        // Generate unique ID for visual persistence
        target.itemId = Math.floor(Math.random() * 1000000);
        target.transportProgress = 0;
        return true;
      }
    } else if (target && target instanceof Chest) {
      // Return result of addItem (true if added, false if full)
      return target.addItem("stone");
    }
    return false;
  }

  public getColor(): number {
    return 0xff0000; // Red
  }

  public isValidPlacement(tile: Tile): boolean {
    return tile.isStone();
  }
}
