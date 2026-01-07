import { BuildingEntity } from '../../entities/BuildingEntity';
import { Tile } from '../../core/Tile';
import { IPowered, ElectricPoleConfigType, PowerConfig } from '../BuildingConfig';

export class ElectricPole extends BuildingEntity implements IPowered {
  constructor(x: number, y: number) {
    super(x, y, 'electric_pole');
  }

  // --- Trait Properties ---

  public get powerConfig(): PowerConfig {
    return (this.getConfig() as ElectricPoleConfigType).powerConfig;
  }

  // --- IPowered ---
  public getPowerDemand(): number {
    return 0;
  }

  public getPowerGeneration(): number {
    return 0;
  }

  public updatePowerStatus(satisfaction: number, hasSource: boolean, gridId: number): void {
    this.powerSatisfaction = satisfaction;
    this.hasPowerSource = hasSource;
    this.currentGridId = gridId;
    this.powerStatus = satisfaction >= 0.99 ? 'active' : 'warn';
  }

  public getColor(): number {
    return 0x888888; // Grey
  }

  public isValidPlacement(tile: Tile): boolean {
    return !tile.isWater() && !tile.isStone();
  }

  public getHeight(): number {
    return 2; // Taller
  }
}
