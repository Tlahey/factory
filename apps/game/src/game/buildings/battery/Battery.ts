import { BuildingEntity } from "../../entities/BuildingEntity";
import { IWorld, Direction } from "../../entities/types";
import { BATTERY_CONFIG, BatteryConfigType, IBattery } from "./BatteryConfig";
import { IPowered, IIOBuilding } from "../BuildingConfig";
import { skillTreeManager } from "../hub/skill-tree/SkillTreeManager";
import { updateBuildingConnectivity, getIOOffset } from "../BuildingIOHelper";

export class Battery
  extends BuildingEntity
  implements IBattery, IPowered, IIOBuilding
{
  public currentCharge: number = 0;
  public capacity: number;
  public maxChargeRate: number;
  public maxDischargeRate: number;

  // Breaker functionality
  public isEnabled: boolean = true;

  public active: boolean = false;
  private currentFlow: number = 0;

  /**
   * The current power flow rate (kW).
   * Positive = charging (consuming from grid)
   * Negative = discharging (providing to grid)
   */
  public lastFlowRate: number = 0;

  /** Flow history for graph display (positive=charge, negative=discharge) */
  public flowHistory: { time: number; flow: number }[] = [];
  private flowHistoryTimer: number = 0;

  constructor(x: number, y: number, direction: Direction = "north") {
    super(x, y, "battery", direction);
    this.capacity = BATTERY_CONFIG.capacity;
    this.maxChargeRate = BATTERY_CONFIG.maxChargeRate;
    this.maxDischargeRate = BATTERY_CONFIG.maxDischargeRate;
    this.width = BATTERY_CONFIG.width || 1;
    this.height = BATTERY_CONFIG.height || 1;
  }

  public getConfig(): BatteryConfigType {
    return BATTERY_CONFIG;
  }

  public get powerConfig() {
    return BATTERY_CONFIG.powerConfig;
  }

  public get io() {
    return BATTERY_CONFIG.io;
  }

  public getPowerDemand(): number {
    return 0; // Handled dynamically
  }

  public getPowerGeneration(): number {
    return 0; // Handled dynamically
  }

  public updatePowerStatus(
    satisfaction: number,
    hasSource: boolean,
    gridId: number,
  ): void {
    this.powerSatisfaction = satisfaction;
    this.hasPowerSource = hasSource;
    this.currentGridId = gridId;
  }

  public override tick(delta: number, world?: IWorld): void {
    super.tick(delta, world);

    // Calculate flow rate from accumulated flow (flow is energy, rate is power)
    // currentFlow is energy (kWh in this frame), divide by delta to get rate (kW)
    if (delta > 0) {
      this.lastFlowRate = this.currentFlow / delta;
    }

    // Determine active state based on previous frame flow
    this.active = Math.abs(this.currentFlow) > 0.001;
    this.currentFlow = 0; // Reset for next accumulated frame

    if (world) {
      updateBuildingConnectivity(this, world);
    }

    // Update flow history (every 1 second)
    this.flowHistoryTimer += delta;
    if (this.flowHistoryTimer >= 1.0) {
      this.flowHistoryTimer = 0;
      this.flowHistory.push({
        time: Date.now(),
        flow: this.lastFlowRate, // Positive = charging, Negative = discharging
      });
      // Keep last 60 seconds
      if (this.flowHistory.length > 60) {
        this.flowHistory.shift();
      }
    }

    // Apply upgrades
    const upgradeLevel = skillTreeManager.getBuildingUpgradeLevel("battery");
    if (upgradeLevel > 0) {
      let cap = BATTERY_CONFIG.capacity;
      let cRate = BATTERY_CONFIG.maxChargeRate;
      let dRate = BATTERY_CONFIG.maxDischargeRate;

      const config = this.getConfig();
      config.upgrades.forEach((u) => {
        if (u.level <= upgradeLevel) {
          u.effects.forEach((e) => {
            if (e.type === "multiplier") {
              if (e.stat === "capacity") cap *= e.value;
              if (e.stat === "maxChargeRate") cRate *= e.value;
              if (e.stat === "maxDischargeRate") dRate *= e.value;
            }
          });
        }
      });

      this.capacity = cap;
      this.maxChargeRate = cRate;
      this.maxDischargeRate = dRate;
    }
  }

  public toggleBreaker(): void {
    this.isEnabled = !this.isEnabled;
  }

  public charge(amount: number): number {
    if (!this.isEnabled) return 0;
    const room = this.capacity - this.currentCharge;
    const canTake = Math.min(amount, room, this.maxChargeRate);
    this.currentCharge += canTake;
    this.currentFlow += canTake;
    return canTake;
  }

  public discharge(demand: number): number {
    if (!this.isEnabled) return 0;
    const canGive = Math.min(demand, this.currentCharge, this.maxDischargeRate);
    this.currentCharge -= canGive;
    this.currentFlow -= canGive;
    return canGive;
  }

  // --- Abstract Methods ---
  public getColor(): number {
    return 0x00ff00; // Greenish
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public serialize(): any {
    return {
      currentCharge: this.currentCharge,
      isEnabled: this.isEnabled,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public deserialize(data: any): void {
    if (data.currentCharge !== undefined)
      this.currentCharge = data.currentCharge;
    if (data.isEnabled !== undefined) this.isEnabled = data.isEnabled;
  }

  // --- IIOBuilding ---
  public getInputPosition(): { x: number; y: number } | null {
    if (!this.io.hasInput) return null;
    const offset = getIOOffset("left", this.direction, this.width, this.height);
    return { x: this.x + offset.dx, y: this.y + offset.dy };
  }

  public getOutputPosition(): { x: number; y: number } | null {
    if (!this.io.hasOutput) return null;
    const offset = getIOOffset(
      "right",
      this.direction,
      this.width,
      this.height,
    );
    return { x: this.x + offset.dx, y: this.y + offset.dy };
  }

  public canInput(_fromX: number, _fromY: number): boolean {
    // Only accept connection logic, not items
    return true;
  }

  public canOutput(_world: IWorld): boolean {
    return true;
  }

  public tryOutput(_world: IWorld): boolean {
    return false; // Does not output items
  }
}
