import { TileType } from "./constants";
import { Tile } from "./core/Tile";
import { Grass } from "./environment/grass/Grass";
import { Rock } from "./environment/rock/Rock";
import { Water } from "./environment/water/Water";
import { Sand } from "./environment/sand/Sand";
import { Tree } from "./environment/tree/Tree";
import { EmptyTile } from "./core/EmptyTile";

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
