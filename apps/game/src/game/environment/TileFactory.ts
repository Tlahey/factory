import { TileType } from "../constants";
import { Tile } from "./Tile";
import { Grass } from "./grass/Grass";
import { Rock } from "./rock/Rock";
import { Water } from "./water/Water";
import { Sand } from "./sand/Sand";
import { Tree } from "./tree/Tree";
import { EmptyTile } from "./EmptyTile";

export class TileFactory {
  public static createTile(type: TileType, resourceAmount?: number): Tile {
    switch (type) {
      case TileType.GRASS:
        return new Grass();
      case TileType.STONE:
        return new Rock(resourceAmount);
      case TileType.WATER:
        return new Water();
      case TileType.SAND:
        return new Sand();
      case TileType.TREE:
        return new Tree(resourceAmount);
      case TileType.EMPTY:
      default:
        return new EmptyTile();
    }
  }
}
