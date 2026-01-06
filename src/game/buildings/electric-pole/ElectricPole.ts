import { BuildingEntity } from '../../entities/BuildingEntity';
import { Tile } from '../../core/Tile';

export class ElectricPole extends BuildingEntity {
  constructor(x: number, y: number) {
    super(x, y, 'electric_pole');
    this.powerConfig = {
      type: 'relay',
      rate: 0,
      range: 8, // Max connection distance
    };
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
