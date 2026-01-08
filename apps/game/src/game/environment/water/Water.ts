import { Tile } from "../../core/Tile";
import { TileType } from "../../constants";

export class Water extends Tile {
  constructor() {
    super();
  }

  public getType(): TileType {
    return TileType.WATER;
  }
}
