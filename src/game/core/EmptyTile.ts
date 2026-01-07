import { Tile } from '../core/Tile';
import { TileType } from '../constants';

export class EmptyTile extends Tile {
  constructor() {
    super();
  }

  public getType(): TileType {
    return TileType.EMPTY;
  }
}
