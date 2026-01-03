import { TileType } from '../constants';

export class Tile {
  constructor(public type: TileType = TileType.EMPTY, public resourceAmount: number = 100) {}

  public getType(): TileType {
    return this.type;
  }

  public isEmpty(): boolean {
    return this.type === TileType.EMPTY;
  }

  public isWater(): boolean {
    return this.type === TileType.WATER;
  }

  public isStone(): boolean {
      return this.type === TileType.STONE;
  }

  public isSand(): boolean {
      return this.type === TileType.SAND;
  }

  public isGrass(): boolean {
      return this.type === TileType.GRASS;
  }



  public deplete(amount: number): void {
    if (this.isStone()) {
      this.resourceAmount = Math.max(0, this.resourceAmount - amount);
    }
  }
}
