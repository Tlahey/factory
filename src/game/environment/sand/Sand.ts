import { Tile } from "../../core/Tile";
import { TileType } from "../../constants";

export class Sand extends Tile {
  constructor() {
    super();
  }

  public getType(): TileType {
    return TileType.SAND;
  }
}
