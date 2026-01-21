import { ResourceTile } from "../../core/ResourceTile";
import { ResourceRarity, TileType } from "../../constants";
import { Tile } from "../../core/Tile";
import { Grass } from "../grass/Grass";
import { IWorld } from "../../entities/types";

/**
 * Tree resource tile providing wood.
 * Trees are common resources with high yield that deplete progressively.
 */
export class Tree extends ResourceTile {
  public readonly rarity: ResourceRarity = ResourceRarity.COMMON;

  /** Number of trees in this cluster (1-3) */
  public readonly treeCount: number;

  constructor(resourceAmount: number = 500, treeCount?: number) {
    super(resourceAmount);
    // Default tree count: random 1-3 if not specified
    this.treeCount = treeCount ?? Math.floor(Math.random() * 3) + 1;
  }

  public getType(): TileType {
    return TileType.TREE;
  }

  public getResourceType(): string {
    return "wood";
  }

  /**
   * Returns visual scale based on remaining resources.
   * Trees shrink from top as they're depleted.
   */
  public getVisualScale(): number {
    return 0.2 + (this.resourceAmount / this.initialResourceAmount) * 0.8;
  }

  public isVisualVisible(): boolean {
    return this.resourceAmount > 0;
  }

  /**
   * Tick logic - transforms to Grass when depleted.
   */
  public onTick(_x: number, _y: number, _world: IWorld): Tile {
    if (this.resourceAmount <= 0) {
      return new Grass();
    }
    return this;
  }
}
