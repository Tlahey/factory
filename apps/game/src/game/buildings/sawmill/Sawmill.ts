import { BuildingEntity } from "../../entities/BuildingEntity";
import { IWorld, Direction } from "../../entities/types";
import {
  IExtractable,
  IPowered,
  IIOBuilding,
  PowerConfig,
} from "../BuildingConfig";
import { SawmillConfigType } from "./SawmillConfig";
import {
  getConfiguredOutputPosition,
  getConfiguredOutputPositions,
  hasInputPortAt,
} from "../BuildingIOHelper";
import { canPushItemToOutput, pushItemToOutput } from "../ItemTransfer";
import { skillTreeManager } from "../hub/skill-tree/SkillTreeManager";
import { createActor } from "xstate";
import { sawmillMachine } from "./SawmillMachine";

export class Sawmill
  extends BuildingEntity
  implements IExtractable, IPowered, IIOBuilding
{
  public active: boolean = false;
  public speedMultiplier: number = 1.0;
  public accumTime: number = 0;

  // Buffer System
  public slots: { type: string; count: number }[] = [];
  public readonly BUFFER_CAPACITY = 20;

  constructor(x: number, y: number, direction: Direction = "north") {
    super(x, y, "sawmill", direction);
    this.actor = createActor(sawmillMachine, {
      input: { building: this },
    });
    this.actor.start();
  }

  public tick(delta: number, world?: IWorld): void {
    if (!world) return;
    this.actor?.send({ type: "TICK", delta, world });
  }

  // --- Buffer Helpers ---

  public addToBuffer(type: string, amount: number): void {
    if (this.slots.length === 0) {
      this.slots.push({ type, count: amount });
    } else if (this.slots[0].type === type) {
      this.slots[0].count = Math.min(
        this.slots[0].count + amount,
        this.BUFFER_CAPACITY,
      );
    }
  }

  public removeFromBuffer(amount: number): void {
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
    return getConfiguredOutputPosition(this);
  }

  public getOutputPositions(): { x: number; y: number }[] {
    return getConfiguredOutputPositions(this);
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

  public checkOutputClear(world: IWorld): boolean {
    const itemToOutput = this.slots[0]?.type;
    if (!itemToOutput) return false;
    return canPushItemToOutput(world, this, itemToOutput);
  }

  public upgradeSpeed(): void {
    this.speedMultiplier += 0.5;
  }

  /**
   * Point the sawmill at the first adjacent building that would actually
   * accept items from this tile (belt, chest, furnace, merger, ...).
   */
  public autoOrient(world: IWorld): void {
    const dirs: { dx: number; dy: number; dir: Direction }[] = [
      { dx: 0, dy: -1, dir: "north" },
      { dx: 0, dy: 1, dir: "south" },
      { dx: 1, dy: 0, dir: "east" },
      { dx: -1, dy: 0, dir: "west" },
    ];

    for (const d of dirs) {
      const nb = world.getBuilding(this.x + d.dx, this.y + d.dy);
      if (!nb) continue;
      if (hasInputPortAt(nb as BuildingEntity & IIOBuilding, this.x, this.y)) {
        this.direction = d.dir;
        this.syncFootprint();
        return;
      }
    }
  }

  private tryOutputResource(world: IWorld): boolean {
    if (this.slots.length === 0) return false;
    return pushItemToOutput(world, this, this.slots[0].type);
  }

  public getColor(): number {
    return 0x8b4513; // Saddle Brown
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
