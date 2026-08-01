import { BuildingEntity } from "../../entities/BuildingEntity";
import { IWorld, Direction } from "../../entities/types";
import { BATTERY_CONFIG, BatteryConfigType, IBattery } from "./BatteryConfig";
import { IPowered, IIOBuilding } from "../BuildingConfig";
import {
  getConfiguredInputPosition,
  getConfiguredOutputPosition,
} from "../BuildingIOHelper";
import { createActor } from "xstate";
import { batteryMachine } from "./BatteryMachine";

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
  public currentFlow: number = 0;

  /**
   * The current power flow rate (kW).
   * Positive = charging (consuming from grid)
   * Negative = discharging (providing to grid)
   */
  public lastFlowRate: number = 0;

  /** Flow history for graph display (positive=charge, negative=discharge) */
  public flowHistory: { time: number; flow: number }[] = [];
  public flowHistoryTimer: number = 0;

  constructor(x: number, y: number, direction: Direction = "north") {
    super(x, y, "battery", direction);
    this.capacity = BATTERY_CONFIG.capacity;
    this.maxChargeRate = BATTERY_CONFIG.maxChargeRate;
    this.maxDischargeRate = BATTERY_CONFIG.maxDischargeRate;
    this.width = BATTERY_CONFIG.width || 1;
    this.height = BATTERY_CONFIG.height || 1;
    this.actor = createActor(batteryMachine, {
      input: { building: this },
    });
    this.actor.start();
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
    this.actor?.send({ type: "TICK", delta, world });
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
  // Power-only ports; positions come from BatteryConfig.io like every other
  // building, so no rotation maths lives here.
  public getInputPosition(): { x: number; y: number } | null {
    return getConfiguredInputPosition(this);
  }

  public getOutputPosition(): { x: number; y: number } | null {
    return getConfiguredOutputPosition(this);
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
