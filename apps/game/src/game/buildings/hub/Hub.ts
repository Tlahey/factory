import { BuildingEntity } from "../../entities/BuildingEntity";
import { IPowered, IIOBuilding, PowerConfig } from "../BuildingConfig";
import { HubConfigType } from "./HubConfig";
import { skillTreeManager } from "./skill-tree/SkillTreeManager";
import { createActor } from "xstate";
import { hubMachine } from "./HubMachine";

export class Hub extends BuildingEntity implements IPowered, IIOBuilding {
  constructor(x: number, y: number) {
    super(x, y, "hub");
    this.width = 2;
    this.height = 2;
    this.powerStatus = "active"; // Always active
    this.actor = createActor(hubMachine, {
      input: { building: this },
    });
    this.actor.start();
  }

  public statsHistory: {
    time: number;
    production: number;
    consumption: number;
  }[] = [];
  private currentFluctuation: number = 0;

  /** Breaker state - when false, hub stops generating power */
  public isEnabled: boolean = true;

  public tick(delta: number): void {
    this.actor?.send({ type: "TICK", delta });
  }

  public updateFluctuation(): void {
    // Solar Fluctuation logic
    const time = Date.now() / 1000;
    this.currentFluctuation = Math.sin(time * 0.5) * 5 + Math.sin(time * 2) * 2;
  }

  // --- Traits Implementation ---

  public get powerConfig(): PowerConfig {
    return (this.getConfig() as HubConfigType).powerConfig;
  }

  public get io() {
    return (this.getConfig() as HubConfigType).io;
  }

  // --- IPowered ---
  public getPowerDemand(): number {
    return 0;
  }

  public getPowerGeneration(): number {
    // Return 0 if breaker is off
    if (!this.isEnabled) return 0;

    const baseRate = this.powerConfig?.rate ?? 60;
    // Apply skill tree multiplier
    const multiplier = skillTreeManager.getStatMultiplier("hub", "powerRate");
    return Math.max(0, baseRate * multiplier + this.currentFluctuation);
  }

  /** Toggle the hub breaker on/off */
  public toggleBreaker(): void {
    this.isEnabled = !this.isEnabled;
  }

  public updatePowerStatus(
    satisfaction: number,
    hasSource: boolean,
    gridId: number,
  ): void {
    this.powerSatisfaction = satisfaction;
    this.hasPowerSource = hasSource;
    this.currentGridId = gridId;
    // Hub is always active as a producer
    this.powerStatus = "active";
    this.currentPowerSatisfied = this.getPowerGeneration();
  }

  // --- IIOBuilding ---
  public getInputPosition(): { x: number; y: number } | null {
    // Hub doesn't have a single canonical input position,
    // it accepts from any tile that points to it.
    return null;
  }

  public getOutputPosition(): { x: number; y: number } | null {
    return null;
  }

  public canInput(): boolean {
    // The Hub is a power/base building: HUB_CONFIG declares `hasInput: false`
    // and it has no item storage. Claiming otherwise made belts pointing at it
    // hide their output arrow and count as "resolved" while items piled up
    // forever at the end of the belt.
    return false;
  }

  public canOutput(): boolean {
    return false; // Hub doesn't output automatically for now
  }

  public tryOutput(): boolean {
    return false;
  }

  public getColor(): number {
    return 0xffaa00; // Orange/Gold
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public serialize(): any {
    return {
      isEnabled: this.isEnabled,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public deserialize(data: any): void {
    if (data.isEnabled !== undefined) this.isEnabled = data.isEnabled;
  }
}
