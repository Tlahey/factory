import { ResourceTile } from '../../core/ResourceTile';
import { TileType } from '../../constants';
import { Tile } from '../../core/Tile';
import { Grass } from '../grass/Grass';
import { IWorld } from '../../entities/types';

export class Rock extends ResourceTile {
  constructor(resourceAmount: number = 100) {
    super(resourceAmount);
  }

  public getType(): TileType {
    return TileType.STONE;
  }

  public getResourceType(): string {
    return 'stone';
  }

  public getVisualScale(): number {
    return 0.2 + (this.resourceAmount / this.initialResourceAmount) * 0.8;
  }

  public isVisualVisible(): boolean {
    return this.resourceAmount > 0;
  }

  public override onTick(x: number, y: number, world: IWorld): Tile {
    if (this.resourceAmount <= 0) {
      return new Grass();
    }
    return this;
  }
}
