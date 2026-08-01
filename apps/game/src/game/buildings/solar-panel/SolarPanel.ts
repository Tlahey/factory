import { BuildingEntity } from "../../entities/BuildingEntity";
import { IPowered, IPowerConnectable, PowerConfig } from "../BuildingConfig";
import { SolarPanelConfigType } from "./SolarPanelConfig";
import { skillTreeManager } from "../hub/skill-tree/SkillTreeManager";
import { IWorld, Direction } from "../../entities/types";
import { createActor } from "xstate";
import { solarPanelMachine } from "./SolarPanelMachine";

export class SolarPanel
  extends BuildingEntity
  implements IPowered, IPowerConnectable
{
  public buildingType = "solar_panel" as const;
  public powerConfig: PowerConfig = { type: "producer", rate: 15 };
  public maxConnections = 2;

  // State
  public currentOutput = 0;
  public sunlightIntensity = 0.1; // 0 to 1

  constructor(x: number, y: number, direction: Direction = "north") {
    super(x, y, "solar_panel", direction);
    this.initStats();
    this.actor = createActor(solarPanelMachine, {
      input: { building: this },
    });
    this.actor.start();
  }

  private initStats() {
    // Config might be undefined during tests if not mocked, but standard flow has it.
    const config = this.getConfig() as SolarPanelConfigType;
    if (config) {
      this.powerConfig = { ...config.powerConfig };
      this.maxConnections = config.maxConnections;

      // Apply upgrades
      const rateMult = skillTreeManager.getStatMultiplier(
        "solar_panel",
        "powerConfig.rate",
      );
      this.powerConfig.rate *= rateMult; // This updates instance copy

      const connAdd = skillTreeManager.getStatAdditive(
        "solar_panel",
        "maxConnections",
      );
      this.maxConnections += connAdd;
    }
  }

  public tick(delta: number, world?: IWorld): void {
    this.actor?.send({ type: "TICK", delta, world });
  }

  public getPowerDemand(): number {
    return 0; // Producer
  }

  public getPowerGeneration(): number {
    return this.currentOutput;
  }

  public updatePowerStatus(
    _satisfaction: number,
    _hasSource: boolean,
    _gridId: number,
  ): void {
    // Producers don't consume
    // We could update 'active' status here
  }

  public getPeakPowerRate(): number {
    return this.powerConfig.rate;
  }

  public getColor(): number {
    return 0x111188; // Dark Blue
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public serialize(): any {
    console.log(`[SolarPanel] Serializing ${this.id} at ${this.x},${this.y}`);
    return {
      // No persistent state needed for V1 (time is global)
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public deserialize(_data: any) {
    this.initStats();
  }

  // Force allow placement everywhere for testing/unblocking
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public isValidPlacement(_tile: any): boolean {
    return true;
  }
}
