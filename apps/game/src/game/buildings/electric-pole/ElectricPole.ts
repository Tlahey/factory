import { BuildingEntity } from "../../entities/BuildingEntity";
import { Tile } from "../../core/Tile";
import { IPowered, PowerConfig } from "../BuildingConfig";
import { ElectricPoleConfigType } from "./ElectricPoleConfig";
import { skillTreeManager } from "../hub/skill-tree/SkillTreeManager";

export class ElectricPole extends BuildingEntity implements IPowered {
  constructor(x: number, y: number) {
    super(x, y, "electric_pole");
  }

  // --- Trait Properties ---

  public get powerConfig(): PowerConfig {
    return (this.getConfig() as ElectricPoleConfigType).powerConfig;
  }

  public get maxConnections(): number {
    const config = this.getConfig() as ElectricPoleConfigType;
    // Additive upgrade support
    const additive = skillTreeManager.getStatAdditive(
      this.getType(),
      "maxConnections",
    );
    return (config.maxConnections || 3) + additive;
  }

  // --- IPowered ---
  public getPowerDemand(): number {
    return 0;
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
    this.powerStatus = satisfaction >= 0.99 ? "active" : "warn";
  }

  public getColor(): number {
    return 0x888888; // Grey
  }

  public isValidPlacement(tile: Tile): boolean {
    return !tile.isWater();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public serialize(): any {
    return {};
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public deserialize(_data: any): void {}

  public getHeight(): number {
    return 2; // Taller
  }
}
