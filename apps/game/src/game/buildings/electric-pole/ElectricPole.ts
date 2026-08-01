import { BuildingEntity } from "../../entities/BuildingEntity";
import { IPowered, PowerConfig } from "../BuildingConfig";
import { ElectricPoleConfigType } from "./ElectricPoleConfig";
import { skillTreeManager } from "../hub/skill-tree/SkillTreeManager";
import { createActor } from "xstate";
import { electricPoleMachine } from "./ElectricPoleMachine";

export class ElectricPole extends BuildingEntity implements IPowered {
  constructor(x: number, y: number) {
    super(x, y, "electric_pole");
    this.actor = createActor(electricPoleMachine, {
      input: { building: this },
    });
    this.actor.start();
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
    this.actor?.send({
      type: "UPDATE_POWER",
      satisfaction,
      hasSource,
      gridId,
    });
  }

  public getColor(): number {
    return 0x888888; // Grey
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
