import { Tile } from "../Tile";
import { TileType } from "../../constants";

export class Grass extends Tile {
  constructor() {
    super();
  }

  public getType(): TileType {
    return TileType.GRASS;
  }
}
