import { Tile } from "../../core/Tile";
import { TileType } from "../../constants";

export class Grass extends Tile {
  constructor() {
    super();
  }

  public getType(): TileType {
    return TileType.GRASS;
  }
}
