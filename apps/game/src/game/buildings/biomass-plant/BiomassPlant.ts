import { BuildingEntity } from "../../entities/BuildingEntity";
import { IWorld, Direction } from "../../entities/types";
import { IIOBuilding, IPowered, PowerConfig } from "../BuildingConfig";
import { BiomassPlantConfigType } from "./BiomassPlantConfig";
import { updateBuildingConnectivity, getIOOffset } from "../BuildingIOHelper";
import { skillTreeManager } from "../hub/skill-tree/SkillTreeManager";
import { ResourceType } from "../../data/Items";

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
  }

  public tick(delta: number, world?: IWorld): void {
    if (!world) return;

    // 1. Update Connectivity
    updateBuildingConnectivity(this, world);

    // 2. Update fluctuation
    this.updateFluctuation();

    // 3. Determine operational status
    let logicalStatus: typeof this.operationStatus = "idle";

    if (!this.isEnabled) {
      logicalStatus = "idle";
      this.isBurning = false;
    } else if (this.networkSize <= 1) {
      // Not connected to any power grid (isolated building)
      logicalStatus = "idle";
      this.isBurning = false;
    } else if (this.fuelAmount <= 0 && this.combustionProgress <= 0) {
      logicalStatus = "no_resources";
      this.isBurning = false;
    } else {
      logicalStatus = "working";
      this.isBurning = true;

      // 4. Process combustion
      if (this.combustionProgress > 0 || this.fuelAmount > 0) {
        // Start new combustion if not already burning
        if (this.combustionProgress <= 0 && this.fuelAmount > 0) {
          this.fuelAmount--;
          this.combustionProgress = 1.0;
        }

        // Advance combustion
        const consumptionTime = this.getConsumptionTime();
        const progressStep = delta / consumptionTime;
        this.combustionProgress = Math.max(
          0,
          this.combustionProgress - progressStep,
        );
      }
    }

    this.operationStatus = logicalStatus;

    // 5. Update power status for the grid
    // Power is generated only when burning
    if (this.isBurning) {
      this.powerStatus = "active";
      this.currentPowerSatisfied = this.getPowerGeneration();
    } else {
      this.powerStatus = "idle";
      this.currentPowerSatisfied = 0;
    }
  }

  private updateFluctuation(): void {
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
    if (!this.io.hasInput) return null;
    const inputSide = this.io.inputSide || "back";
    const config = this.getConfig() as BiomassPlantConfigType;
    const offset = getIOOffset(
      inputSide,
      this.direction,
      config.width,
      config.height,
    );
    return { x: this.x + offset.dx, y: this.y + offset.dy };
  }

  public getOutputPosition(): { x: number; y: number } | null {
    return null; // No output
  }

  public canInput(fromX: number, fromY: number): boolean {
    // 1. Check if the input is coming from the correct side/position
    const inputPos = this.getInputPosition();
    if (!inputPos || fromX !== inputPos.x || fromY !== inputPos.y) return false;

    // 2. Check if fuel storage is full
    if (this.fuelAmount >= this.getFuelCapacity()) return false;

    return true;
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
