import { BuildingEntity } from "../../entities/BuildingEntity";
import { IWorld, Direction } from "../../entities/types";
import { IIOBuilding, IPowered, PowerConfig } from "../BuildingConfig";
import { BiomassPlantConfigType } from "./BiomassPlantConfig";
import {
  canInputFromConfig,
  getConfiguredInputPosition,
  getConfiguredInputPositions,
} from "../BuildingIOHelper";
import { skillTreeManager } from "../hub/skill-tree/SkillTreeManager";
import { ResourceType } from "../../data/Items";
import { createActor } from "xstate";
import { biomassPlantMachine } from "./BiomassPlantMachine";

/**
 * Biomass Power Plant
 *
 * Generates electricity by burning wood/biomass.
 * - Consumes 1 wood every 5 seconds (configurable)
 * - Generates ~20 power (with fluctuation)
 * - Has on/off breaker control
 * - Accepts wood input from conveyors
 */
export class BiomassPlant
  extends BuildingEntity
  implements IPowered, IIOBuilding
{
  public active: boolean = false;
  /** Current wood fuel storage */
  public fuelAmount: number = 0;

  /** Size of current power network (nodes count) */
  public networkSize: number = 0;

  /** Combustion progress (0 to 1) for current unit */
  public combustionProgress: number = 0;

  /** Whether the plant is enabled (breaker on/off) */
  public isEnabled: boolean = true;

  /** Whether the plant is actively burning fuel */
  public isBurning: boolean = false;

  /** Current power fluctuation offset */
  private currentFluctuation: number = 0;

  /** Stats history for power display (like Hub) */
  public statsHistory: {
    time: number;
    production: number;
    consumption: number;
  }[] = [];

  constructor(x: number, y: number, direction: Direction = "north") {
    super(x, y, "biomass_plant", direction);
    this.actor = createActor(biomassPlantMachine, {
      input: { building: this },
    });
    this.actor.start();
  }

  public tick(delta: number, world?: IWorld): void {
    if (!world) return;
    this.actor?.send({ type: "TICK", delta, world });
  }

  public updateFluctuation(): void {
    const time = Date.now() / 1000;
    const fluctuationRange = this.getFluctuationRange();
    this.currentFluctuation =
      Math.sin(time * 0.7) * fluctuationRange * 0.6 +
      Math.sin(time * 1.5) * fluctuationRange * 0.4;
  }

  // --- Configuration Getters with Upgrades ---

  public getConsumptionTime(): number {
    const config = this.getConfig() as BiomassPlantConfigType;
    const base = config.consumptionTime;
    const multiplier = skillTreeManager.getStatMultiplier(
      "biomass_plant",
      "consumptionTime",
    );
    return base * multiplier;
  }

  public getBasePowerRate(): number {
    const config = this.getConfig() as BiomassPlantConfigType;
    const base = config.basePowerRate;
    const multiplier = skillTreeManager.getStatMultiplier(
      "biomass_plant",
      "basePowerRate",
    );
    return base * multiplier;
  }

  public getFluctuationRange(): number {
    return (this.getConfig() as BiomassPlantConfigType).powerFluctuation;
  }

  public getFuelCapacity(): number {
    const config = this.getConfig() as BiomassPlantConfigType;
    const base = config.fuelCapacity;
    const extra = skillTreeManager.getStatAdditive(
      "biomass_plant",
      "fuelCapacity",
    );
    return base + extra;
  }

  // --- IPowered ---

  public get powerConfig(): PowerConfig {
    return (this.getConfig() as BiomassPlantConfigType).powerConfig;
  }

  public getPowerDemand(): number {
    return 0; // Producers don't demand power
  }

  public getPowerGeneration(): number {
    if (!this.isEnabled || !this.isBurning) return 0;
    return Math.max(0, this.getBasePowerRate() + this.currentFluctuation);
  }

  /** Toggle the breaker on/off */
  public toggleBreaker(): void {
    this.isEnabled = !this.isEnabled;
  }

  public updatePowerStatus(
    satisfaction: number,
    hasSource: boolean,
    gridId: number,
    networkSize: number = 0,
  ): void {
    this.powerSatisfaction = satisfaction;
    this.hasPowerSource = hasSource;
    this.currentGridId = gridId;
    this.networkSize = networkSize;
    // Producer: status based on burning state
    this.powerStatus = this.isBurning ? "active" : "idle";
    this.currentPowerSatisfied = this.getPowerGeneration();
  }

  // --- IIOBuilding ---

  public get io() {
    return (this.getConfig() as BiomassPlantConfigType).io;
  }

  public getInputPosition(): { x: number; y: number } | null {
    return getConfiguredInputPosition(this);
  }

  public getInputPositions(): { x: number; y: number }[] {
    return getConfiguredInputPositions(this);
  }

  public getOutputPosition(): { x: number; y: number } | null {
    return null; // No output
  }

  /** Structural check only — capacity is answered by hasSpaceFor(). */
  public canInput(fromX: number, fromY: number): boolean {
    return canInputFromConfig(this, fromX, fromY);
  }

  /** Capacity check used by the shared transfer layer (ItemTransfer). */
  public hasSpaceFor(type: string, amount: number = 1): boolean {
    if (type !== "wood") return false;
    return this.fuelAmount + amount <= this.getFuelCapacity();
  }

  /**
   * Add fuel (wood) to the plant
   * @param type - Resource type (should be "wood")
   * @param amount - Amount to add
   * @param fromX - Source X coordinate (optional)
   * @param fromY - Source Y coordinate (optional)
   */
  public addItem(
    type: ResourceType,
    amount: number = 1,
    fromX?: number,
    fromY?: number,
  ): boolean {
    // 1. Validate source position if provided
    if (fromX !== undefined && fromY !== undefined) {
      if (!this.canInput(fromX, fromY)) return false;
    }

    // 2. Only accept wood
    if (type !== "wood") return false;

    // 3. Check capacity
    if (this.fuelAmount + amount > this.getFuelCapacity()) return false;

    // 4. Add fuel
    this.fuelAmount += amount;
    return true;
  }

  public canOutput(): boolean {
    return false;
  }

  public tryOutput(): boolean {
    return false;
  }

  public getColor(): number {
    return 0x8b4513; // SaddleBrown for biomass/wood theme
  }

  // --- Serialization ---

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public serialize(): any {
    return {
      fuelAmount: this.fuelAmount,
      combustionProgress: this.combustionProgress,
      isEnabled: this.isEnabled,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public deserialize(data: any): void {
    if (data.fuelAmount !== undefined) this.fuelAmount = data.fuelAmount;
    if (data.combustionProgress !== undefined)
      this.combustionProgress = data.combustionProgress;
    if (data.isEnabled !== undefined) this.isEnabled = data.isEnabled;
  }
}
