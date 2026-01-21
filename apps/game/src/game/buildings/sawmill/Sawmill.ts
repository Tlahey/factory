import { Tile } from "../../core/Tile";
import { BuildingEntity } from "../../entities/BuildingEntity";
import { IWorld, Direction } from "../../entities/types";
import { Conveyor } from "../conveyor/Conveyor";
import { Chest } from "../chest/Chest";
import { ResourceTile } from "../../core/ResourceTile";
import {
  IExtractable,
  IPowered,
  IIOBuilding,
  PowerConfig,
} from "../BuildingConfig";
import { SawmillConfigType } from "./SawmillConfig";
import { updateBuildingConnectivity, getIOOffset } from "../BuildingIOHelper";
import { skillTreeManager } from "../hub/skill-tree/SkillTreeManager";
import { gameEventManager } from "../../events/GameEventManager";
import { TileType } from "../../constants";

export class Sawmill
  extends BuildingEntity
  implements IExtractable, IPowered, IIOBuilding
{
  public active: boolean = false;

  public speedMultiplier: number = 1.0;
  private accumTime: number = 0;

  // Stability Timers
  private blockStabilityTimer: number = 0;
  private readonly STABILITY_THRESHOLD = 1.5;

  // Buffer System
  public slots: { type: string; count: number }[] = [];
  public readonly BUFFER_CAPACITY = 20;

  constructor(x: number, y: number, direction: Direction = "north") {
    super(x, y, "sawmill", direction);
  }

  public tick(delta: number, world?: IWorld): void {
    if (!world) return;

    const tile = world.getTile(this.x, this.y);
    const hasResources =
      tile instanceof ResourceTile &&
      tile.resourceAmount > 0 &&
      tile.getType() === TileType.TREE;
    const canOutput = this.canOutput(world);
    const interval = this.getExtractionInterval();

    // Update connectivity visuals
    updateBuildingConnectivity(this, world);

    // STABLE DEMAND: We demand power as long as we have resources
    this.hasDemand = hasResources;

    // Determine "Logical" Status
    let logicalStatus: typeof this.operationStatus = "working";

    let currentStored = 0;
    if (this.slots.length > 0) {
      currentStored = this.slots[0].count;
    }

    const isBufferFull = currentStored >= this.BUFFER_CAPACITY;
    const isBufferEmpty = currentStored <= 0;

    if (!hasResources && isBufferEmpty) {
      logicalStatus = "no_resources";
    } else if (isBufferFull && !canOutput) {
      logicalStatus = "blocked";
    } else if (!this.hasPowerSource) {
      logicalStatus = "no_power";
    }

    // Status Debouncing
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
        `[Sawmill] machine at ${this.x},${this.y} status change: ${oldStatus} -> ${this.operationStatus}`,
      );
    }

    // Check Power Status
    const powerFactor = this.hasPowerSource ? this.powerSatisfaction : 0;
    const oldActive = this.active;

    const canMine = hasResources && !isBufferFull;
    const isWorking = canMine && powerFactor > 0;

    if (isWorking) {
      this.accumTime += delta * powerFactor;
      this.active = true;
    } else {
      this.active = false;
    }

    if (this.active !== oldActive) {
      console.log(
        `[Sawmill] machine at ${this.x},${this.y} active flag change: ${oldActive} -> ${this.active}`,
      );
    }

    // Harvesting Step
    if (canMine && this.accumTime >= interval) {
      if (tile instanceof ResourceTile) {
        tile.deplete(1);
        const resourceType = tile.getResourceType(); // "wood"

        this.addToBuffer(resourceType, 1);

        gameEventManager.emit("RESOURCE_MINED", {
          resource: resourceType,
          amount: 1,
          position: { x: this.x, y: this.y },
        });
      }
      this.accumTime -= interval;
    }

    // Output Step
    if (this.slots.length > 0 && this.slots[0].count > 0) {
      if (this.tryOutput(world)) {
        this.removeFromBuffer(1);
      }
    }
  }

  // --- Buffer Helpers ---

  private addToBuffer(type: string, amount: number): void {
    if (this.slots.length === 0) {
      this.slots.push({ type, count: amount });
    } else if (this.slots[0].type === type) {
      this.slots[0].count = Math.min(
        this.slots[0].count + amount,
        this.BUFFER_CAPACITY,
      );
    }
  }

  private removeFromBuffer(amount: number): void {
    if (this.slots.length > 0) {
      this.slots[0].count -= amount;
      if (this.slots[0].count <= 0) {
        this.slots = [];
      }
    }
  }

  public removeSlot(index: number): void {
    if (index === 0) {
      this.slots = [];
    }
  }

  // --- Trait Properties ---

  public get extractionRate(): number {
    return (this.getConfig() as SawmillConfigType)?.extractionRate ?? 1.0;
  }

  public get io() {
    return (this.getConfig() as SawmillConfigType).io;
  }

  public get powerConfig(): PowerConfig {
    return (this.getConfig() as SawmillConfigType).powerConfig;
  }

  // --- IExtractable ---
  public getExtractionRate(): number {
    const baseRate = (this.extractionRate / 60) * this.speedMultiplier;
    const multiplier = skillTreeManager.getStatMultiplier(
      "sawmill",
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
    return null;
  }

  public getOutputPosition(): { x: number; y: number } | null {
    if (!this.io.hasOutput) return null;
    const offset = getIOOffset("front", this.direction);
    return { x: this.x + offset.dx, y: this.y + offset.dy };
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
      return !target.currentItem;
    } else if (target instanceof Chest) {
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
    if (this.slots.length === 0) return false;
    const itemToOutput = this.slots[0].type;

    let tx = this.x;
    let ty = this.y;

    if (this.direction === "north") ty -= 1;
    else if (this.direction === "south") ty += 1;
    else if (this.direction === "east") tx += 1;
    else if (this.direction === "west") tx -= 1;

    const target = world.getBuilding(tx, ty);
    if (target && target instanceof Conveyor) {
      if (!target.currentItem) {
        target.currentItem = itemToOutput;
        target.itemId = Math.floor(Math.random() * 1000000);
        target.transportProgress = 0;
        return true;
      }
    } else if (target && target instanceof Chest) {
      return target.addItem(itemToOutput);
    }
    return false;
  }

  public getColor(): number {
    return 0x8b4513; // Saddle Brown
  }

  public isValidPlacement(tile: Tile): boolean {
    return tile.isTree();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public serialize(): any {
    return {
      speedMultiplier: this.speedMultiplier,
      slots: this.slots,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public deserialize(data: any): void {
    if (data.speedMultiplier) this.speedMultiplier = data.speedMultiplier;
    if (data.slots) this.slots = data.slots;
  }
}
